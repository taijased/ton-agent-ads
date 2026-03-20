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
import { detectMessageLanguage } from "./language-detector.js";
import { NegotiationLlmService } from "./negotiation-llm-service.js";
import {
  extractPriceTon,
  type PriceExtractionResult,
} from "./price-extractor.js";
import type { ConversationLogger } from "./conversation-logger.js";

export interface IncomingAdminMessageInput {
  platform: "telegram";
  chatId: string;
  externalMessageId?: string;
  text: string;
  contactValue?: string;
  detectedLanguage?: "RU" | "EN";
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

  if (uniqueMissingTerms.includes("date")) {
    return language === "EN"
      ? "Great! When could you publish the post?"
      : "Отлично! Когда вы могли бы разместить публикацию?";
  }

  if (uniqueMissingTerms.includes("wallet")) {
    return language === "EN"
      ? "Great! Could you share your TON wallet address for payment?"
      : "Отлично! Подскажите, пожалуйста, адрес вашего TON-кошелька для оплаты?";
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

  if (approvalRequest.proposedWallet !== null) {
    parts.push(
      language === "EN"
        ? `Wallet: ${approvalRequest.proposedWallet}`
        : `Кошелёк: ${approvalRequest.proposedWallet}`,
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
    private readonly logger?: ConversationLogger,
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
          /\b(any format|any|whatever)\b|без разницы|любой формат|любой|любом/i.test(lower)
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
        } else if (/(any\s*time|any\s*day|whenever|anytime|любое\s*время|в любое\s*время|любое|любой день|когда угодно|в любое|в любой|в любом)/i.test(lower)) {
          known.dateText = "any time";
        } else if (/(?:через|after|in)\s+\d+\s*(?:дн|day|час|hour)/i.test(lower)) {
          const match = lower.match(/(?:через|after|in)\s+(\d+\s*(?:дн\S*|day\S*|час\S*|hour\S*))/i);
          known.dateText = match ? match[1].trim() : "flexible";
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

    if (knownTerms.dateText === undefined) {
      missing.push("date");
    }

    if (knownTerms.wallet === undefined) {
      missing.push("wallet");
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

    const language = input.detectedLanguage ?? detectMessageLanguage(input.text);

    this.logger?.log({
      timestamp: new Date().toISOString(),
      dealId: deal.id,
      direction: "inbound",
      senderType: "admin",
      text: input.text,
      language,
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
    if (
      llmDecision.extracted.wallet !== undefined &&
      knownTerms.wallet === undefined
    ) {
      knownTerms.wallet = llmDecision.extracted.wallet;
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
      language,
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

      const knownWallet =
        knownTerms.wallet ?? this.findKnownTonWallet(recentMessages, input.text);

      const approvalRequest = await this.dealApprovalRequestRepository.create({
        dealId: deal.id,
        proposedPriceTon:
          effectiveDecision.extracted.offeredPriceTon ??
          extractedFacts.offeredPriceTon ??
          null,
        proposedFormat: effectiveDecision.extracted.format ?? knownTerms.format ?? "1 post",
        proposedDateText: effectiveDecision.extracted.dateText ?? knownTerms.dateText,
        proposedWallet: effectiveDecision.extracted.wallet ?? knownWallet ?? null,
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

      this.logger?.log({
        timestamp: new Date().toISOString(),
        dealId: deal.id,
        direction: "internal",
        senderType: "system",
        text: `Approval request created: ${approvalRequest.id}`,
        action: "request_user_approval",
        language,
      });

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
            ? (language === "EN"
              ? "Thank you! We work in TON — could you tell us how much that would be in TON?"
              : "Спасибо! Мы работаем в TON — подскажите, пожалуйста, сколько это будет в TON?")
            : (language === "EN"
              ? "Let's continue the discussion. Could you share some details?"
              : "Будем рады продолжить обсуждение. Подскажите, пожалуйста, детали?"),
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

      this.logger?.log({
        timestamp: new Date().toISOString(),
        dealId: deal.id,
        direction: "outbound",
        senderType: "agent",
        text: effectiveDecision.replyText,
        action: effectiveDecision.action,
        language,
      });

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

    // Detect language from the most recent admin message for confirmation reply
    const recentMessages = await this.dealMessageRepository.listRecentByDealId(deal.id, 12);
    const lastAdminMsg = recentMessages.filter((m) => m.direction === "inbound").at(-1);
    const language: "RU" | "EN" = lastAdminMsg ? detectMessageLanguage(lastAdminMsg.text) : "RU";

    await this.sendNegotiationReply(
      deal,
      channel,
      (await this.dealExternalThreadRepository.getByDealId(deal.id))
        ?.contactValue ?? null,
      this.getApprovalConfirmationMessage(approvalRequest, language),
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
    language: "RU" | "EN",
  ): NegotiationDecision {
    const offeredPriceTon =
      decision.extracted.offeredPriceTon ?? extractedFacts.offeredPriceTon ?? knownTerms.offeredPriceTon;
    const mentionedNonTonCurrency = extractedFacts.mentionedNonTonCurrency;
    const knownWallet =
      knownTerms.wallet ?? this.findKnownTonWallet(recentMessages, inboundText);

    // Early escalation: when all terms are known and price fits budget,
    // always escalate to request_user_approval regardless of LLM action.
    // This prevents dead-ends from handoff_to_human, wait, or confused LLM replies.
    if (
      decision.action !== "decline" &&
      offeredPriceTon !== undefined &&
      Number.isFinite(maxBudgetTon) &&
      offeredPriceTon <= maxBudgetTon
    ) {
      const hasDate =
        typeof (decision.extracted.dateText ?? knownTerms.dateText) ===
          "string";

      if (hasDate && missingTerms.length === 0) {
        return {
          ...decision,
          action: "request_user_approval",
          extracted: {
            ...decision.extracted,
            offeredPriceTon,
            wallet: knownWallet ?? decision.extracted.wallet,
          },
          summary:
            decision.summary ??
            `Admin proposed ${offeredPriceTon} TON, which fits the campaign budget.`,
        };
      }
    }

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
      return {
        action: "reply",
        replyText: decision.replyText?.trim()
          ? decision.replyText
          : this.getMissingTermsReply(missingTerms, mentionedNonTonCurrency, language),
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
          : this.getMissingTermsReply(missingTerms, mentionedNonTonCurrency, language),
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
      const hasDate =
        typeof (decision.extracted.dateText ?? knownTerms.dateText) ===
          "string";
      const hasAllTerms = hasDate && missingTerms.length === 0;

      if (decision.action === "request_user_approval" && !hasAllTerms) {
        return {
          action: "reply",
          replyText: decision.replyText?.trim()
            ? decision.replyText
            : this.getMissingTermsReply(missingTerms, mentionedNonTonCurrency, language),
          extracted: {
            ...decision.extracted,
            offeredPriceTon,
          },
          summary: decision.summary,
        };
      }

      if (decision.action === "wait") {
        return {
          action: "reply",
          replyText: decision.replyText?.trim()
            ? decision.replyText
            : this.getMissingTermsReply(missingTerms, mentionedNonTonCurrency, language),
          extracted: {
            ...decision.extracted,
            offeredPriceTon,
          },
          summary: decision.summary,
        };
      }

      // Price is within budget but some terms are still missing —
      // override LLM reply to ask about them (prevents dead-end "I'll confirm" messages)
      if (missingTerms.length > 0) {
        return {
          ...decision,
          action: "reply",
          replyText: this.getMissingTermsReply(missingTerms, mentionedNonTonCurrency, language),
          extracted: {
            ...decision.extracted,
            offeredPriceTon,
          },
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
          (language === "EN"
            ? "Thank you! That's a bit above our plans. Could you offer a lower price?"
            : "Спасибо! Это немного выше наших планов. Можете ли вы предложить более низкую цену?"),
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
