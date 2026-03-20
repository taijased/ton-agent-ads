import type {
  CampaignRepository,
  ChannelRepository,
  DealApprovalRequestRepository,
  DealExternalThreadRepository,
  DealMessageRepository,
  DealRepository,
} from "@repo/db";
import type {
  Channel,
  CreateDealApprovalRequestInput,
  Deal,
  DealApprovalRequest,
  DealMessage,
  NegotiationDecision,
} from "@repo/types";
import { TelegramAdminClient } from "../infrastructure/telegram-admin-client.js";
import { TelegramBotNotifier } from "../infrastructure/telegram-bot-notifier.js";
import { NegotiationLlmService } from "./negotiation-llm-service.js";
import {
  extractPriceTon,
  type PriceExtractionResult,
} from "./price-extractor.js";

export interface IncomingAdminMessageInput {
  platform: "telegram";
  chatId: string;
  externalMessageId?: string;
  text: string;
  contactValue?: string;
}

export interface IncomingAdminMessageResult {
  matched: boolean;
  dealId?: string;
  action?: NegotiationDecision["action"];
  approvalRequestId?: string;
}

export interface ApprovalActionResult {
  deal: Deal;
  approvalRequest: DealApprovalRequest;
}

/**
 * Build a reply asking the admin for missing negotiation terms.
 * Selects language-appropriate copy for RU and EN.
 */
export function buildMissingTermsReply(
  missingTerms: string[],
  mentionedNonTonCurrency: boolean | undefined,
  language: "RU" | "EN" = "RU",
): string {
  const uniqueMissingTerms = Array.from(new Set(missingTerms));

  if (uniqueMissingTerms.length === 0) {
    return language === "EN"
      ? "Thank you, the main terms look clear. I will pass them on for internal confirmation and come back with a final answer."
      : "Спасибо, основные условия выглядят понятными. Я передам их на внутреннее подтверждение и вернусь с финальным ответом.";
  }

  if (uniqueMissingTerms.includes("price")) {
    if (mentionedNonTonCurrency === true) {
      return language === "EN"
        ? "Thank you! We work in TON — could you tell us how much that would be in TON?"
        : "Спасибо! Мы работаем в TON — подскажите, пожалуйста, сколько это будет в TON?";
    }
    return language === "EN"
      ? "Could you tell us the price per advertising post?"
      : "Подскажите, пожалуйста, сколько стоит одна рекламная публикация?";
  }

  if (uniqueMissingTerms.includes("format")) {
    return language === "EN"
      ? "Thank you! What format should the post be in?"
      : "Спасибо! А в каком формате должен быть пост?";
  }

  if (uniqueMissingTerms.includes("date")) {
    return language === "EN"
      ? "Great! When could you publish the post?"
      : "Отлично! Когда вы могли бы разместить публикацию?";
  }

  return language === "EN"
    ? "Thank you, the main terms look clear. I will pass them on for internal confirmation and come back with a final answer."
    : "Спасибо, основные условия выглядят понятными. Я передам их на внутреннее подтверждение и вернусь с финальным ответом.";
}

/**
 * Build an approval confirmation message to send back to the channel admin.
 * Selects language-appropriate copy for RU and EN.
 */
export function buildApprovalConfirmationMessage(
  approvalRequest: DealApprovalRequest,
  language: "RU" | "EN" = "RU",
): string {
  const parts =
    language === "EN" ? ["We confirm the placement."] : ["Подтверждаем размещение."];

  if (approvalRequest.proposedPriceTon !== null) {
    parts.push(
      language === "EN"
        ? `We agree to ${approvalRequest.proposedPriceTon} TON.`
        : `Согласны на ${approvalRequest.proposedPriceTon} TON.`,
    );
  }

  if (approvalRequest.proposedFormat !== null) {
    parts.push(
      language === "EN"
        ? `Format: ${approvalRequest.proposedFormat}.`
        : `Формат: ${approvalRequest.proposedFormat}.`,
    );
  }

  if (approvalRequest.proposedDateText !== null) {
    parts.push(
      language === "EN"
        ? `Date: ${approvalRequest.proposedDateText}.`
        : `Дата: ${approvalRequest.proposedDateText}.`,
    );
  }

  return parts.join(" ");
}

interface KnownNegotiationTerms {
  offeredPriceTon?: number;
  format?: string;
  dateText?: string;
  wallet?: string;
}

export class DealNegotiationService {
  public constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly dealRepository: DealRepository,
    private readonly dealMessageRepository: DealMessageRepository,
    private readonly dealApprovalRequestRepository: DealApprovalRequestRepository,
    private readonly dealExternalThreadRepository: DealExternalThreadRepository,
    private readonly negotiationLlmService: NegotiationLlmService,
    private readonly telegramAdminClient: TelegramAdminClient,
    private readonly telegramBotNotifier: TelegramBotNotifier,
  ) {}

  public listDealMessages(dealId: string): Promise<DealMessage[]> {
    return this.dealMessageRepository.listByDealId(dealId);
  }

  private extractTonWallet(text: string): string | null {
    const match = text.match(/\b(?:EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{40,80}\b/);
    return match === null ? null : match[0];
  }

  private findKnownTonWallet(
    recentMessages: DealMessage[],
    inboundText: string,
  ): string | null {
    const inboundWallet = this.extractTonWallet(inboundText);

    if (inboundWallet !== null) {
      return inboundWallet;
    }

    for (const message of recentMessages.slice().reverse()) {
      const wallet = this.extractTonWallet(message.text);

      if (wallet !== null) {
        return wallet;
      }
    }

    return null;
  }

  private extractKnownTerms(
    recentMessages: DealMessage[],
    inboundText: string,
  ): KnownNegotiationTerms {
    const known: KnownNegotiationTerms = {};
    const messages = [...recentMessages, { text: inboundText } as DealMessage];

    for (const message of messages) {
      if (known.offeredPriceTon === undefined) {
        known.offeredPriceTon = extractPriceTon(message.text).offeredPriceTon;
      }

      if (known.wallet === undefined) {
        known.wallet = this.extractTonWallet(message.text) ?? undefined;
      }

      if (known.format === undefined) {
        const lower = message.text.toLowerCase();

        if (
          /(video|ролик|видео)/i.test(lower) &&
          /(10\s*seconds|10\s*sec|10\s*сек|10\s*секунд)/i.test(lower)
        ) {
          known.format = "video up to 10 seconds";
        } else if (/(video|ролик|видео)/i.test(lower)) {
          known.format = "video placement";
        } else if (/(post|пост)/i.test(lower)) {
          known.format = "1 post";
        } else if (
          /\b(any format|whatever)\b|без разницы|любой формат/i.test(lower)
        ) {
          known.format = "any format";
        }
      }

      if (known.dateText === undefined) {
        const lower = message.text.toLowerCase();

        if (/(tomorrow|завтра)/i.test(lower)) {
          known.dateText = "tomorrow";
        } else if (/(today|сегодня)/i.test(lower)) {
          known.dateText = "today";
        } else if (/(any time|любое время|в любое время)/i.test(lower)) {
          known.dateText = "any time";
        }
      }
    }

    return known;
  }

  private getMissingTerms(knownTerms: KnownNegotiationTerms): string[] {
    const missing: string[] = [];

    if (knownTerms.offeredPriceTon === undefined) {
      missing.push("price");
    }

    if (knownTerms.format === undefined) {
      missing.push("format");
    }

    if (knownTerms.dateText === undefined) {
      missing.push("date");
    }

    return missing;
  }

  public async handleIncomingAdminMessage(
    input: IncomingAdminMessageInput,
  ): Promise<IncomingAdminMessageResult> {
    const thread = await this.dealExternalThreadRepository.getByPlatformChatId(
      input.platform,
      input.chatId,
    );

    if (thread === undefined) {
      return { matched: false };
    }

    const deal = await this.dealRepository.getDealById(thread.dealId);

    if (deal === undefined) {
      return { matched: false };
    }

    const campaign = await this.campaignRepository.findById(deal.campaignId);

    if (campaign === null) {
      return { matched: false, dealId: deal.id };
    }

    const channel = await this.channelRepository.getChannelById(deal.channelId);

    if (channel === undefined) {
      return { matched: false, dealId: deal.id };
    }

    await this.dealMessageRepository.create({
      dealId: deal.id,
      direction: "inbound",
      senderType: "admin",
      contactValue: input.contactValue ?? thread.contactValue ?? null,
      text: input.text,
      externalMessageId: input.externalMessageId ?? null,
    });

    const extractedFacts = extractPriceTon(input.text);
    const recentMessages = await this.dealMessageRepository.listRecentByDealId(
      deal.id,
      12,
    );
    const knownTerms = this.extractKnownTerms(recentMessages, input.text);
    const missingTerms = this.getMissingTerms(knownTerms);
    const llmDecision = await this.negotiationLlmService.decide({
      campaign,
      deal,
      channelTitle: channel.title,
      recentMessages,
      extractedFacts,
      lastInboundMessage: input.text,
      knownTerms,
      missingTerms,
    });

    // Merge LLM-extracted terms into knownTerms
    if (
      llmDecision.extracted.format !== undefined &&
      knownTerms.format === undefined
    ) {
      knownTerms.format = llmDecision.extracted.format;
    }
    if (
      llmDecision.extracted.dateText !== undefined &&
      knownTerms.dateText === undefined
    ) {
      knownTerms.dateText = llmDecision.extracted.dateText;
    }
    if (
      llmDecision.extracted.offeredPriceTon !== undefined &&
      knownTerms.offeredPriceTon === undefined
    ) {
      knownTerms.offeredPriceTon = llmDecision.extracted.offeredPriceTon;
    }
    // Recompute missing terms with merged data
    const updatedMissingTerms = this.getMissingTerms(knownTerms);

    const maxBudgetTon = Number(campaign.budgetAmount);
    let effectiveDecision = this.applyBudgetGuards(
      llmDecision,
      maxBudgetTon,
      extractedFacts,
      recentMessages,
      input.text,
      knownTerms,
      updatedMissingTerms,
    );

    if (effectiveDecision.action === "request_user_approval") {
      const existingApproval =
        await this.dealApprovalRequestRepository.getPendingByDealId(deal.id);

      if (existingApproval !== undefined) {
        return {
          matched: true,
          dealId: deal.id,
          action: effectiveDecision.action,
          approvalRequestId: existingApproval.id,
        };
      }

      const approvalRequest = await this.dealApprovalRequestRepository.create({
        dealId: deal.id,
        proposedPriceTon:
          effectiveDecision.extracted.offeredPriceTon ??
          extractedFacts.offeredPriceTon ??
          null,
        proposedFormat: effectiveDecision.extracted.format,
        proposedDateText: effectiveDecision.extracted.dateText,
        summary:
          effectiveDecision.summary ??
          "Admin proposed terms that fit the current budget.",
        status: "pending",
      });
      const updatedDeal = await this.dealRepository.updateDealStatus(deal.id, {
        status: "awaiting_user_approval",
      });

      if (updatedDeal !== undefined) {
        await this.notifyCampaignCreator(
          campaign.userId,
          channel,
          thread.contactValue,
          approvalRequest,
        );
      }

      return {
        matched: true,
        dealId: deal.id,
        action: effectiveDecision.action,
        approvalRequestId: approvalRequest.id,
      };
    }

    // Duplicate message detection: never send the same outbound message twice in a row
    if (
      typeof effectiveDecision.replyText === "string" &&
      effectiveDecision.replyText.trim().length > 0
    ) {
      const lastOutbound = recentMessages
        .filter((m) => m.direction === "outbound")
        .at(-1);

      if (
        lastOutbound !== undefined &&
        lastOutbound.text === effectiveDecision.replyText
      ) {
        effectiveDecision = {
          ...effectiveDecision,
          replyText: extractedFacts.mentionedNonTonCurrency === true
            ? "Спасибо! Мы работаем в TON — подскажите, пожалуйста, сколько это будет в TON?"
            : "Будем рады продолжить обсуждение. Подскажите, пожалуйста, детали?",
        };
      }
    }

    if (
      (effectiveDecision.action === "reply" ||
        effectiveDecision.action === "decline") &&
      typeof effectiveDecision.replyText === "string" &&
      effectiveDecision.replyText.trim().length > 0
    ) {
      await this.sendNegotiationReply(
        deal,
        channel,
        thread.contactValue,
        effectiveDecision.replyText,
      );

      if (effectiveDecision.action === "decline") {
        await this.dealRepository.updateDealStatus(deal.id, {
          status: "failed",
        });
      }
    }

    return {
      matched: true,
      dealId: deal.id,
      action: effectiveDecision.action,
    };
  }

  public async approveApprovalRequest(
    id: string,
  ): Promise<ApprovalActionResult> {
    const approvalRequest =
      await this.dealApprovalRequestRepository.markApproved(id);

    if (approvalRequest === undefined) {
      throw new Error("Approval request not found");
    }

    const deal = await this.dealRepository.getDealById(approvalRequest.dealId);

    if (deal === undefined) {
      throw new Error("Deal not found");
    }

    const channel = await this.channelRepository.getChannelById(deal.channelId);

    if (channel === undefined) {
      throw new Error("Channel not found");
    }

    await this.sendNegotiationReply(
      deal,
      channel,
      (await this.dealExternalThreadRepository.getByDealId(deal.id))
        ?.contactValue ?? null,
      this.getApprovalConfirmationMessage(approvalRequest),
    );

    const updatedDeal = await this.dealRepository.updateDealStatus(deal.id, {
      status: "terms_agreed",
    });

    if (updatedDeal === undefined) {
      throw new Error("Deal not found");
    }

    return {
      deal: updatedDeal,
      approvalRequest,
    };
  }

  public async rejectApprovalRequest(
    id: string,
  ): Promise<ApprovalActionResult> {
    const approvalRequest =
      await this.dealApprovalRequestRepository.markRejected(id);

    if (approvalRequest === undefined) {
      throw new Error("Approval request not found");
    }

    const deal = await this.dealRepository.updateDealStatus(
      approvalRequest.dealId,
      {
        status: "negotiating",
      },
    );

    if (deal === undefined) {
      throw new Error("Deal not found");
    }

    return {
      deal,
      approvalRequest,
    };
  }

  public async counterApprovalRequest(
    id: string,
    text: string,
  ): Promise<ApprovalActionResult> {
    const approvalRequest =
      await this.dealApprovalRequestRepository.markRejected(id);

    if (approvalRequest === undefined) {
      throw new Error("Approval request not found");
    }

    const deal = await this.dealRepository.getDealById(approvalRequest.dealId);

    if (deal === undefined) {
      throw new Error("Deal not found");
    }

    const channel = await this.channelRepository.getChannelById(deal.channelId);

    if (channel === undefined) {
      throw new Error("Channel not found");
    }

    await this.dealMessageRepository.create({
      dealId: deal.id,
      direction: "internal",
      senderType: "user",
      text,
      contactValue: null,
    });

    await this.sendNegotiationReply(
      deal,
      channel,
      (await this.dealExternalThreadRepository.getByDealId(deal.id))
        ?.contactValue ?? null,
      text,
    );

    const updatedDeal = await this.dealRepository.updateDealStatus(deal.id, {
      status: "negotiating",
    });

    if (updatedDeal === undefined) {
      throw new Error("Deal not found");
    }

    return {
      deal: updatedDeal,
      approvalRequest,
    };
  }

  private applyBudgetGuards(
    decision: NegotiationDecision,
    maxBudgetTon: number,
    extractedFacts: PriceExtractionResult,
    recentMessages: DealMessage[],
    inboundText: string,
    knownTerms: KnownNegotiationTerms,
    missingTerms: string[],
  ): NegotiationDecision {
    const offeredPriceTon =
      decision.extracted.offeredPriceTon ?? extractedFacts.offeredPriceTon;
    const mentionedNonTonCurrency = extractedFacts.mentionedNonTonCurrency;
    const knownWallet =
      knownTerms.wallet ?? this.findKnownTonWallet(recentMessages, inboundText);

    if (
      decision.action === "handoff_to_human" &&
      typeof decision.replyText === "string"
    ) {
      return {
        action: "reply",
        replyText: decision.replyText,
        extracted: decision.extracted,
        summary: decision.summary,
      };
    }

    if (
      decision.action === "handoff_to_human" &&
      (offeredPriceTon === undefined || missingTerms.length > 0)
    ) {
      // If no price was ever discussed and LLM has no reply text,
      // the admin likely rejected outright → decline instead of asking about price
      if (offeredPriceTon === undefined && !decision.replyText?.trim()) {
        return {
          action: "decline",
          replyText: "Спасибо за ваше время! Хорошего дня!",
          extracted: decision.extracted,
          summary:
            decision.summary ?? "Admin showed no interest; ending negotiation.",
        };
      }

      return {
        action: "reply",
        replyText: decision.replyText?.trim()
          ? decision.replyText
          : this.getMissingTermsReply(missingTerms, mentionedNonTonCurrency),
        extracted: {
          ...decision.extracted,
          offeredPriceTon,
        },
        summary: decision.summary,
      };
    }

    if (decision.action === "wait" && missingTerms.length > 0) {
      return {
        action: "reply",
        replyText: decision.replyText?.trim()
          ? decision.replyText
          : this.getMissingTermsReply(missingTerms, mentionedNonTonCurrency),
        extracted: {
          ...decision.extracted,
          offeredPriceTon,
        },
        summary: decision.summary,
      };
    }

    if (
      offeredPriceTon !== undefined &&
      Number.isFinite(maxBudgetTon) &&
      offeredPriceTon <= maxBudgetTon
    ) {
      const hasFormat =
        typeof (decision.extracted.format ?? knownTerms.format) === "string";
      const hasDate =
        typeof (decision.extracted.dateText ?? knownTerms.dateText) ===
          "string";
      const hasAllTerms = hasFormat && hasDate; // price already confirmed <= budget

      if (decision.action === "request_user_approval" && !hasAllTerms) {
        return {
          action: "reply",
          replyText: decision.replyText?.trim()
            ? decision.replyText
            : this.getMissingTermsReply(missingTerms, mentionedNonTonCurrency),
          extracted: {
            ...decision.extracted,
            offeredPriceTon,
          },
          summary: decision.summary,
        };
      }

      if (
        decision.action !== "decline" &&
        decision.action !== "handoff_to_human" &&
        hasAllTerms &&
        missingTerms.length === 0
      ) {
        return {
          ...decision,
          action: "request_user_approval",
          extracted: {
            ...decision.extracted,
            offeredPriceTon,
          },
          summary:
            decision.summary ??
            `Admin proposed ${offeredPriceTon} TON, which fits the campaign budget.`,
        };
      }

      if (decision.action === "wait") {
        return {
          action: "reply",
          replyText: decision.replyText?.trim()
            ? decision.replyText
            : this.getMissingTermsReply(missingTerms, mentionedNonTonCurrency),
          extracted: {
            ...decision.extracted,
            offeredPriceTon,
          },
          summary: decision.summary,
        };
      }

      return {
        ...decision,
        extracted: {
          ...decision.extracted,
          offeredPriceTon,
        },
      };
    }

    if (
      offeredPriceTon !== undefined &&
      Number.isFinite(maxBudgetTon) &&
      offeredPriceTon > maxBudgetTon
    ) {
      return {
        ...decision,
        action: decision.action === "wait" ? "reply" : decision.action,
        replyText:
          decision.replyText ??
          `Спасибо! Это немного выше наших планов. Можете ли вы предложить более низкую цену?`,
        extracted: {
          ...decision.extracted,
          offeredPriceTon,
        },
      };
    }

    return decision;
  }

  private async sendNegotiationReply(
    deal: Deal,
    channel: Channel,
    contactValue: string | null,
    text: string,
  ): Promise<void> {
    const recipient = contactValue ?? this.selectContact(channel);

    if (recipient === null) {
      throw new Error("No contact available for negotiation reply");
    }

    const result = await this.telegramAdminClient.sendAdminMessage(
      recipient,
      text,
    );

    await this.dealMessageRepository.create({
      dealId: deal.id,
      direction: "outbound",
      senderType: "agent",
      contactValue: recipient,
      text,
      externalMessageId: result.messageId ?? null,
    });

    if (result.chatId !== undefined) {
      await this.dealExternalThreadRepository.create({
        dealId: deal.id,
        platform: "telegram",
        chatId: result.chatId,
        contactValue: recipient,
      });
    }
  }

  private getMissingTermsReply(
    missingTerms: string[],
    mentionedNonTonCurrency?: boolean,
    language: "RU" | "EN" = "RU",
  ): string {
    return buildMissingTermsReply(missingTerms, mentionedNonTonCurrency, language);
  }

  private async notifyCampaignCreator(
    chatId: string,
    channel: Channel,
    contactValue: string | null,
    approvalRequest: DealApprovalRequest,
  ): Promise<void> {
    await this.telegramBotNotifier.sendApprovalRequestNotification({
      chatId,
      channelTitle: channel.title,
      channelUsername: channel.username,
      contactValue,
      approvalRequest,
    });
  }

  private getApprovalConfirmationMessage(
    approvalRequest: DealApprovalRequest,
    language: "RU" | "EN" = "RU",
  ): string {
    return buildApprovalConfirmationMessage(approvalRequest, language);
  }

  private selectContact(channel: Channel): string | null {
    const usernameContact = channel.contacts.find(
      (contact) => contact.type === "username",
    );

    if (usernameContact !== undefined) {
      return usernameContact.value;
    }

    const linkContact = channel.contacts.find(
      (contact) => contact.type === "link",
    );

    if (linkContact === undefined) {
      return null;
    }

    const match = linkContact.value.match(
      /(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{5,})/i,
    );
    return match === null ? null : `@${match[1]}`;
  }
}
