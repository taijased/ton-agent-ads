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
  Deal,
  DealApprovalRequest,
  DealMessage,
  NegotiationDecision,
} from "@repo/types";
import { convertToTon } from "@ton-adagent/ton";
import type { SchedulerPort } from "../infrastructure/publication-scheduler.js";
import { TelegramAdminClient } from "../infrastructure/telegram-admin-client.js";
import { CreatorNotificationService } from "./creator-notification-service.js";
import { parseDateText } from "./date-parser.js";
import { detectMessageLanguage } from "./language-detector.js";
import { NegotiationLlmService } from "./negotiation-llm-service.js";
import { extractPriceTon } from "./price-extractor.js";
import type { ConversationLogger } from "./conversation-logger.js";
import { buildConversationSummary } from "./conversation-summary-builder.js";
import {
  computeTextSimilarity,
  SIMILARITY_THRESHOLD,
} from "./text-similarity.js";

export interface IncomingAdminMessageInput {
  platform: "telegram";
  chatId: string;
  externalMessageId?: string;
  text: string;
  contactValue?: string;
  detectedLanguage?: "RU" | "EN";
  isForwarded?: boolean;
  /** PeerChannel.channelId as string from GramJS fwdFrom.fromId */
  forwardedFromChannelId?: string;
  /** fwdFrom.channelPost — the message ID within the source channel */
  forwardedChannelPost?: number;
  /** fwdFrom.date — unix timestamp of original post */
  forwardedDate?: number;
}

export interface IncomingAdminMessageResult {
  matched: boolean;
  dealId?: string;
  action?: NegotiationDecision["action"];
  approvalRequestId?: string;
  conversionNote?: string;
  extractedPriceTon?: number;
  extractedDateText?: string;
  extractedWallet?: string;
}

export interface ApprovalActionResult {
  deal: Deal;
  approvalRequest: DealApprovalRequest;
}

const getTonviewerBaseUrl = (): string =>
  process.env.TON_NETWORK?.trim().toLowerCase() === "mainnet"
    ? "https://tonviewer.com"
    : "https://testnet.tonviewer.com";

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
    language === "EN"
      ? ["We confirm the placement."]
      : ["Подтверждаем размещение."];

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

export function buildManagerConfirmationMessage(
  language: "RU" | "EN" = "RU",
): string {
  return language === "EN"
    ? "Thank you for the details! I need to confirm everything with my manager. I'll get back to you shortly!"
    : "Спасибо за информацию! Мне нужно согласовать детали с руководителем. Я вернусь к вам в ближайшее время!";
}

export function buildPostApprovalWalletAskMessage(
  language: "RU" | "EN" = "RU",
): string {
  return language === "EN"
    ? "Great news! My manager has confirmed the placement. Could you please share your TON wallet address for payment?"
    : "Отличные новости! Руководитель подтвердил размещение. Подскажите, пожалуйста, адрес вашего TON-кошелька для оплаты?";
}

interface KnownNegotiationTerms {
  offeredPriceTon?: number;
  format?: string;
  dateText?: string;
  wallet?: string;
}

export function applyBudgetGate(
  decision: NegotiationDecision,
  knownTerms: KnownNegotiationTerms,
  maxBudgetTon: number,
  language: "RU" | "EN",
): NegotiationDecision {
  // Decline always passes through
  if (decision.action === "decline") return decision;

  const price = knownTerms.offeredPriceTon;

  // Rule A: all terms known (price + date + wallet) + within budget → approve
  if (
    price != null &&
    price > 0 &&
    knownTerms.dateText != null &&
    knownTerms.wallet != null &&
    Number.isFinite(maxBudgetTon) &&
    price <= maxBudgetTon
  ) {
    return {
      ...decision,
      action: "request_user_approval",
      summary:
        decision.summary ??
        `Admin proposed ${price} TON, which fits the campaign budget.`,
    };
  }

  // Rule B: price exceeds budget → ask for lower
  if (
    price != null &&
    price > 0 &&
    Number.isFinite(maxBudgetTon) &&
    price > maxBudgetTon
  ) {
    return {
      ...decision,
      action: "reply",
      replyText:
        decision.replyText ??
        (language === "EN"
          ? "Thank you! That's a bit above our plans. Could you offer a lower price?"
          : "Спасибо! Это немного выше наших планов. Можете ли вы предложить более низкую цену?"),
    };
  }

  // Rule C: passthrough — trust the LLM
  return decision;
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
    private readonly creatorNotificationService: CreatorNotificationService,
    private readonly logger?: ConversationLogger,
  ) {}

  public listDealMessages(dealId: string): Promise<DealMessage[]> {
    return this.dealMessageRepository.listByDealId(dealId);
  }

  private extractTonWallet(text: string): string | null {
    const match = text.match(/\b(?:EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{40,80}\b/);
    return match === null ? null : match[0];
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

  /**
   * Scan inbound admin messages to find terms that were already provided.
   * Also converts non-TON prices to TON so the converted price persists across turns.
   */
  private static readonly TIMING_PATTERN =
    /\b(anytime|any\s?time|в любое время|когда угодно|tomorrow|завтра|today|сегодня|послезавтра|day after tomorrow|next week|на следующей неделе|через неделю|в понедельник|во вторник|в среду|в четверг|в пятницу|в субботу|в воскресенье|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

  private async extractKnownTermsFromHistory(
    messages: DealMessage[],
  ): Promise<KnownNegotiationTerms> {
    const terms: KnownNegotiationTerms = {};
    let pendingConversion:
      | { rawAmount: number; rawCurrency: string }
      | undefined;

    for (const msg of messages) {
      if (msg.direction !== "inbound" || msg.senderType !== "admin") continue;

      const priceResult = extractPriceTon(msg.text);
      if (priceResult.offeredPriceTon !== undefined) {
        terms.offeredPriceTon = priceResult.offeredPriceTon;
        pendingConversion = undefined;
      } else if (
        priceResult.mentionedNonTonCurrency &&
        priceResult.rawAmount !== undefined &&
        priceResult.rawCurrency !== undefined
      ) {
        pendingConversion = {
          rawAmount: priceResult.rawAmount,
          rawCurrency: priceResult.rawCurrency,
        };
      }

      // Extract timing from admin messages
      if (terms.dateText === undefined) {
        const timingMatch = msg.text.match(
          DealNegotiationService.TIMING_PATTERN,
        );
        if (timingMatch !== null) {
          terms.dateText = timingMatch[0];
        }
      }

      if (terms.wallet === undefined) {
        const wallet = this.extractTonWallet(msg.text);
        if (wallet !== null) {
          terms.wallet = wallet;
        }
      }
    }

    // Convert non-TON price from history if no direct TON price was found
    if (
      terms.offeredPriceTon === undefined &&
      pendingConversion !== undefined
    ) {
      const conversion = await convertToTon(
        pendingConversion.rawAmount,
        pendingConversion.rawCurrency,
      );
      if (conversion !== null) {
        terms.offeredPriceTon = conversion.tonAmount;
      }
    }

    return terms;
  }

  private detectAskedTerm(text: string): string | null {
    const lower = text.toLowerCase();

    if (/стоит|цен[аыу]|price|cost|сколько.*пост|how much|rate/i.test(lower)) {
      return "price";
    }

    if (
      /когда|дат[аыу]|when|date|publish|разместить|опубликовать/i.test(lower)
    ) {
      return "date";
    }

    if (/кошел[ёе]к|wallet|адрес.*ton|ton.*адрес|ton.*address/i.test(lower)) {
      return "wallet";
    }

    return null;
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

    if (typeof input.externalMessageId === "string") {
      const existingMessage =
        await this.dealMessageRepository.getByDealIdAndExternalMessageId(
          deal.id,
          "admin",
          input.externalMessageId,
        );

      if (existingMessage !== undefined) {
        return {
          matched: true,
          dealId: deal.id,
          action: "wait",
        };
      }
    }

    const campaign = await this.campaignRepository.findById(deal.campaignId);
    const channel = await this.channelRepository.getChannelById(deal.channelId);

    await this.dealMessageRepository.create({
      dealId: deal.id,
      direction: "inbound",
      senderType: "admin",
      audience: "admin",
      transport: "telegram_mtproto",
      contactValue: input.contactValue ?? thread.contactValue ?? null,
      text: input.text,
      externalMessageId: input.externalMessageId ?? null,
    });

    // Post-payment proof handling
    if (deal.status === "paid" || deal.status === "proof_pending") {
      if (input.isForwarded) {
        // Forwarded message — verify content before accepting as proof
        const proofText = input.text;

        // Reject media-only forwards (no text content)
        if (!proofText || proofText.trim().length === 0) {
          const mediaOnlyReply =
            "I received a forwarded message but it doesn't contain text. Could you please forward the published post that contains our advertisement text?";
          if (channel) {
            await this.sendNegotiationReply(
              deal,
              channel,
              thread.contactValue,
              mediaOnlyReply,
            );
          }
          return {
            matched: true,
            dealId: deal.id,
            action: "reply" as const,
          };
        }

        const campaignText = campaign?.text ?? "";

        if (campaign === null) {
          // Campaign not found — accept with warning log (Decision #7)
          this.logger?.log({
            timestamp: new Date().toISOString(),
            dealId: deal.id,
            direction: "internal",
            senderType: "system",
            text: `Campaign ${deal.campaignId} not found during proof verification; accepting proof anyway`,
          });
        } else if (campaignText.trim().length > 0) {
          // Content similarity check (skip if campaign text is empty — Decision #7)
          const similarity = computeTextSimilarity(campaignText, proofText);

          if (similarity < SIMILARITY_THRESHOLD) {
            const mismatchReply =
              "The forwarded post doesn't seem to match the agreed advertisement. Could you please forward the correct published post with our ad?";
            if (channel) {
              await this.sendNegotiationReply(
                deal,
                channel,
                thread.contactValue,
                mismatchReply,
              );
            }
            return {
              matched: true,
              dealId: deal.id,
              action: "reply" as const,
            };
          }
        }

        // Source channel check (secondary — log warning but still accept if content matches)
        if (
          input.forwardedFromChannelId &&
          input.forwardedFromChannelId !== deal.channelId
        ) {
          this.logger?.log({
            timestamp: new Date().toISOString(),
            dealId: deal.id,
            direction: "internal",
            senderType: "system",
            text: `Proof forwarded from channel ${input.forwardedFromChannelId} but deal channel is ${deal.channelId}; accepting based on content match`,
          });
        }

        // Accept proof — mark deal as completed
        await this.dealRepository.updateDealStatus(deal.id, {
          status: "completed",
          proofText,
          proofForwardedMessageId: input.externalMessageId ?? null,
        });

        const ackMessage =
          "Thank you! The publication has been confirmed. We appreciate your cooperation!";

        if (channel) {
          await this.sendNegotiationReply(
            deal,
            channel,
            thread.contactValue,
            ackMessage,
          );
        }

        // Notify creator
        if (campaign) {
          await this.creatorNotificationService.notifyPublicationComplete({
            deal,
            campaignId: campaign.id,
            chatId: campaign.userId,
            channelTitle: channel?.title ?? "Unknown",
            channelUsername: channel?.username ?? null,
            proofText,
          });
        }

        return {
          matched: true,
          dealId: deal.id,
          action: "reply" as const,
        };
      } else {
        // Plain text on paid deal - ask for forwarded post
        const askForwardMessage =
          "Could you please forward the actual published post from your channel? I need the forwarded message to confirm the publication.";

        if (channel) {
          await this.sendNegotiationReply(
            deal,
            channel,
            thread.contactValue,
            askForwardMessage,
          );
        }

        return {
          matched: true,
          dealId: deal.id,
          action: "reply" as const,
        };
      }
    }

    // Campaign and channel are required for LLM negotiation below
    if (campaign === null) {
      return { matched: false, dealId: deal.id };
    }

    if (channel === undefined) {
      return { matched: false, dealId: deal.id };
    }

    // Handle already-completed deals
    if (deal.status === "completed") {
      const completedChannel = await this.channelRepository.getChannelById(
        deal.channelId,
      );
      if (completedChannel) {
        await this.sendNegotiationReply(
          deal,
          completedChannel,
          thread.contactValue,
          "Already received, thanks!",
        );
      }
      return { matched: true, dealId: deal.id, action: "wait" as const };
    }

    const language =
      input.detectedLanguage ?? detectMessageLanguage(input.text);

    this.logger?.log({
      timestamp: new Date().toISOString(),
      dealId: deal.id,
      direction: "inbound",
      senderType: "admin",
      text: input.text,
      language,
    });

    const recentMessages = await this.dealMessageRepository.listRecentByDealId(
      deal.id,
      12,
    );

    // Accumulate known terms from conversation history so the LLM
    // doesn't re-ask questions the admin already answered.
    const priorTerms = await this.extractKnownTermsFromHistory(recentMessages);

    // Also extract from the current inbound message
    const currentExtraction = extractPriceTon(input.text);
    if (
      priorTerms.offeredPriceTon === undefined &&
      currentExtraction.offeredPriceTon !== undefined
    ) {
      priorTerms.offeredPriceTon = currentExtraction.offeredPriceTon;
    }
    const currentWallet = this.extractTonWallet(input.text);
    if (priorTerms.wallet === undefined && currentWallet !== null) {
      priorTerms.wallet = currentWallet;
    }

    const priorMissing = this.getMissingTerms(priorTerms);

    const llmDecision = await this.negotiationLlmService.decide({
      campaign,
      deal,
      channelTitle: channel.title,
      conversationLanguage: language,
      recentMessages,
      extractedFacts: {
        offeredPriceTon: currentExtraction.offeredPriceTon,
        mentionedNonTonCurrency: currentExtraction.mentionedNonTonCurrency,
        rawAmount: currentExtraction.rawAmount,
      },
      lastInboundMessage: input.text,
      knownTerms: priorTerms,
      missingTerms: priorMissing,
    });

    console.info(
      JSON.stringify({
        source: "deal-negotiation-service",
        msg: "LLM decision",
        dealId: deal.id,
        action: llmDecision.action,
        replyText: llmDecision.replyText?.slice(0, 100),
        extracted: llmDecision.extracted,
        summary: llmDecision.summary,
      }),
    );

    // Build knownTerms: LLM values take priority; priorTerms acts as safety net
    // Sanitize format: if LLM put a currency string, replace with "1 post"
    const rawFormat = llmDecision.extracted.format ?? priorTerms.format;
    const sanitizedFormat =
      rawFormat !== undefined &&
      /^(usd|usdt|usdc|eur|gbp|rub|ton|cny|\$|€|£|₽|рубл)/i.test(
        rawFormat.trim(),
      )
        ? "1 post"
        : rawFormat;

    const knownTerms: KnownNegotiationTerms = {
      offeredPriceTon:
        llmDecision.extracted.offeredPriceTon ?? priorTerms.offeredPriceTon,
      format: sanitizedFormat,
      dateText: llmDecision.extracted.dateText ?? priorTerms.dateText,
      wallet: llmDecision.extracted.wallet ?? priorTerms.wallet,
    };

    // Regex fallback: if LLM returned no price, try regex on current message only
    const regexResult = extractPriceTon(input.text);
    if (knownTerms.offeredPriceTon === undefined) {
      if (regexResult.offeredPriceTon !== undefined) {
        knownTerms.offeredPriceTon = regexResult.offeredPriceTon;
      }
    }

    // Check for non-TON currency (LLM primary, regex fallback)
    const mentionedNonTonCurrency =
      llmDecision.extracted.mentionedNonTonCurrency ??
      regexResult.mentionedNonTonCurrency;

    // Auto-convert non-TON currency to TON.
    // Always convert when regex detects a fiat amount — the LLM may incorrectly
    // set offeredPriceTon to the raw fiat value (e.g., 4 USDT → offeredPriceTon: 4).
    let conversionNote: string | undefined;
    if (mentionedNonTonCurrency) {
      const rawAmount = regexResult.rawAmount;
      const rawCurrency = regexResult.rawCurrency;
      if (rawAmount !== undefined && rawCurrency !== undefined) {
        const conversion = await convertToTon(rawAmount, rawCurrency);
        if (conversion !== null) {
          knownTerms.offeredPriceTon = conversion.tonAmount;
          conversionNote = `${rawAmount} ${conversion.fiatCurrency} ≈ ${conversion.tonAmount} TON`;
        }
      }
    }

    // Validate and sanitize wallet format (LLM may return extra chars)
    if (knownTerms.wallet !== undefined) {
      const cleanWallet = this.extractTonWallet(knownTerms.wallet);
      knownTerms.wallet = cleanWallet ?? undefined;
    }

    // Also check for wallet in current message if LLM didn't extract one
    if (knownTerms.wallet === undefined) {
      knownTerms.wallet = this.extractTonWallet(input.text) ?? undefined;
    }

    const maxBudgetTon = Number(campaign.budgetAmount);

    // If we auto-converted, re-run LLM with the converted price so Lumi can acknowledge it
    let effectiveLlmDecision = llmDecision;
    if (conversionNote !== undefined) {
      effectiveLlmDecision = await this.negotiationLlmService.decide({
        campaign,
        deal,
        channelTitle: channel.title,
        conversationLanguage: language,
        recentMessages,
        extractedFacts: {},
        lastInboundMessage: input.text,
        knownTerms,
        missingTerms: this.getMissingTerms(knownTerms),
        convertedPriceTon: knownTerms.offeredPriceTon,
        conversionNote,
      });
    }

    const preBudgetDecision = effectiveLlmDecision;
    let effectiveDecision = applyBudgetGate(
      effectiveLlmDecision,
      knownTerms,
      maxBudgetTon,
      language,
    );
    // Track whether budget gate injected a reply (vs the LLM's own reply text)
    const budgetGateInjectedReply =
      effectiveDecision.replyText !== preBudgetDecision.replyText;

    if (effectiveDecision.action === "request_user_approval") {
      // If there is already a pending approval, return early
      const existingPending =
        await this.dealApprovalRequestRepository.getPendingByDealId(deal.id);

      if (existingPending !== undefined) {
        return {
          matched: true,
          dealId: deal.id,
          action: effectiveDecision.action,
          approvalRequestId: existingPending.id,
        };
      }

      // Second-pass guard: if manager already approved and wallet is now known,
      // send final confirmation instead of creating a new approval
      const approvedRequest =
        await this.dealApprovalRequestRepository.getApprovedByDealId(deal.id);

      if (approvedRequest !== undefined && knownTerms.wallet !== undefined) {
        const confirmMsg = buildApprovalConfirmationMessage(
          { ...approvedRequest, proposedWallet: knownTerms.wallet },
          language,
        );
        await this.sendNegotiationReply(
          deal,
          channel,
          thread.contactValue,
          confirmMsg,
        );
        await this.dealRepository.updateDealStatus(deal.id, {
          status: "terms_agreed",
        });

        this.logger?.log({
          timestamp: new Date().toISOString(),
          dealId: deal.id,
          direction: "outbound",
          senderType: "agent",
          text: confirmMsg,
          action: "reply",
          language,
        });

        return {
          matched: true,
          dealId: deal.id,
          action: "request_user_approval",
        };
      }

      // Send "checking with manager" message to admin before creating approval
      const managerConfirmMsg = buildManagerConfirmationMessage(language);
      await this.sendNegotiationReply(
        deal,
        channel,
        thread.contactValue,
        managerConfirmMsg,
      );

      this.logger?.log({
        timestamp: new Date().toISOString(),
        dealId: deal.id,
        direction: "outbound",
        senderType: "agent",
        text: managerConfirmMsg,
        action: "reply",
        language,
      });

      const approvalRequest = await this.dealApprovalRequestRepository.create({
        dealId: deal.id,
        proposedPriceTon: knownTerms.offeredPriceTon ?? null,
        proposedFormat: knownTerms.format ?? "1 post",
        proposedDateText: knownTerms.dateText,
        proposedWallet: knownTerms.wallet ?? null,
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
          updatedDeal,
          campaign.id,
          campaign.userId,
          channel,
          thread.contactValue,
          approvalRequest,
          conversionNote,
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
        conversionNote,
        extractedPriceTon: knownTerms.offeredPriceTon,
        extractedDateText: knownTerms.dateText,
        extractedWallet: knownTerms.wallet,
      };
    }

    // Smart override: if LLM asks about a term that's already known,
    // advance to the next missing term instead.
    // Only fires when the reply text came from the LLM, not from budget gate injection.
    if (
      !budgetGateInjectedReply &&
      effectiveDecision.action === "reply" &&
      typeof effectiveDecision.replyText === "string" &&
      effectiveDecision.replyText.trim().length > 0
    ) {
      const askedTerm = this.detectAskedTerm(effectiveDecision.replyText);
      const termIsKnown =
        (askedTerm === "price" && knownTerms.offeredPriceTon !== undefined) ||
        (askedTerm === "date" && knownTerms.dateText !== undefined) ||
        (askedTerm === "wallet" && knownTerms.wallet !== undefined);

      if (askedTerm !== null && termIsKnown) {
        const remainingMissing = this.getMissingTerms(knownTerms);
        effectiveDecision = {
          ...effectiveDecision,
          replyText: buildMissingTermsReply(
            remainingMissing,
            mentionedNonTonCurrency,
            language,
          ),
        };
      }
    }

    // Semantic duplicate detection: compare which term is being asked about
    if (
      typeof effectiveDecision.replyText === "string" &&
      effectiveDecision.replyText.trim().length > 0 &&
      (effectiveDecision.action === "reply" ||
        effectiveDecision.action === "decline")
    ) {
      const lastOutbound = recentMessages
        .filter((m) => m.direction === "outbound")
        .at(-1);

      if (lastOutbound !== undefined) {
        const currentAskedTerm = this.detectAskedTerm(
          effectiveDecision.replyText,
        );
        const lastAskedTerm = this.detectAskedTerm(lastOutbound.text);

        if (
          currentAskedTerm !== null &&
          lastAskedTerm !== null &&
          currentAskedTerm === lastAskedTerm
        ) {
          // Same term being asked again — use canned reply (different phrasing)
          const cannedReply = buildMissingTermsReply(
            [currentAskedTerm],
            mentionedNonTonCurrency,
            language,
          );

          if (cannedReply === lastOutbound.text) {
            // Double-dedup: canned reply was already sent — use generic fallback
            effectiveDecision = {
              ...effectiveDecision,
              replyText:
                language === "EN"
                  ? "Could you clarify the details?"
                  : "Подскажите, пожалуйста, детали?",
            };
          } else {
            effectiveDecision = {
              ...effectiveDecision,
              replyText: cannedReply,
            };
          }
        }
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
      conversionNote,
      extractedPriceTon: knownTerms.offeredPriceTon,
      extractedDateText: knownTerms.dateText,
      extractedWallet: knownTerms.wallet,
    };
  }

  public async handlePostPayment(
    deal: Deal,
    scheduler?: SchedulerPort,
  ): Promise<void> {
    // 1. Look up external thread
    const externalThread = await this.dealExternalThreadRepository.getByDealId(
      deal.id,
    );
    if (!externalThread) return;

    // 2. Look up campaign
    const campaign = await this.campaignRepository.findById(deal.campaignId);
    if (!campaign) return;

    // 3. Look up channel
    const channel = await this.channelRepository.getChannelById(deal.channelId);
    if (!channel) return;

    // 4. Look up approved approval request for terms
    const approvedRequest =
      await this.dealApprovalRequestRepository.getApprovedByDealId(deal.id);

    const priceTon = approvedRequest?.proposedPriceTon ?? deal.price;

    // Re-fetch deal to get potentially resolved real tx hash
    const freshDeal = await this.dealRepository.getDealById(deal.id);
    const txHash = freshDeal?.txHash ?? deal.txHash ?? "unknown";

    // 5. Build and send payment proof message
    const proofMessage = [
      `Payment of ${priceTon} TON has been sent!`,
      txHash !== "unknown" ? `Transaction: ${txHash}` : "",
      txHash !== "unknown"
        ? `You can verify it here: ${getTonviewerBaseUrl()}/transaction/${encodeURIComponent(txHash)}`
        : "",
      "",
      "Please publish the ad and forward the published post to me so I can confirm the placement. Thank you!",
    ]
      .filter((line) => line.length > 0)
      .join("\n");

    await this.sendNegotiationReply(
      deal,
      channel,
      externalThread.contactValue,
      proofMessage,
    );

    // 6. Schedule reminder if date is in the future
    if (scheduler && approvedRequest?.proposedDateText) {
      const scheduledDate = parseDateText(approvedRequest.proposedDateText);
      if (scheduledDate && scheduledDate.getTime() > Date.now()) {
        scheduler.schedule(deal.id, scheduledDate, async () => {
          // Re-fetch deal to check current status
          const currentDeal = await this.dealRepository.getDealById(deal.id);
          if (
            !currentDeal ||
            currentDeal.status === "completed" ||
            currentDeal.status === "failed"
          ) {
            return; // Skip if already done
          }

          const reminderMessage = `Hi! Just a friendly reminder — the ad post was scheduled for ${approvedRequest.proposedDateText}.\nCould you please publish it and forward the post to me? Thank you!`;

          await this.sendNegotiationReply(
            currentDeal,
            channel,
            externalThread.contactValue,
            reminderMessage,
          );

          // Transition to proof_pending
          await this.dealRepository.updateDealStatus(deal.id, {
            status: "proof_pending",
          });
        });
      }
    }
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

    // Detect language from the most recent outbound agent message (already in the correct pinned language)
    const recentMessages = await this.dealMessageRepository.listRecentByDealId(
      deal.id,
      12,
    );
    const lastOutboundMsg = recentMessages
      .filter((m) => m.direction === "outbound" && m.senderType === "agent")
      .at(-1);
    const language: "RU" | "EN" = lastOutboundMsg
      ? detectMessageLanguage(lastOutboundMsg.text)
      : "RU";

    const contactValue =
      (await this.dealExternalThreadRepository.getByDealId(deal.id))
        ?.contactValue ?? null;

    if (approvalRequest.proposedWallet !== null) {
      // Wallet already known → send final confirmation, set terms_agreed
      await this.sendNegotiationReply(
        deal,
        channel,
        contactValue,
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
    } else {
      // Wallet unknown → ask for wallet, keep negotiating
      await this.sendNegotiationReply(
        deal,
        channel,
        contactValue,
        buildPostApprovalWalletAskMessage(language),
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
      audience: "internal",
      transport: "internal",
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
      audience: "admin",
      transport: "telegram_mtproto",
      contactValue: recipient,
      text,
      externalMessageId: result.messageId ?? null,
      deliveryStatus: "sent",
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
    return buildMissingTermsReply(
      missingTerms,
      mentionedNonTonCurrency,
      language,
    );
  }

  private async notifyCampaignCreator(
    deal: Deal,
    campaignId: string,
    chatId: string,
    channel: Channel,
    contactValue: string | null,
    approvalRequest: DealApprovalRequest,
    conversionNote?: string,
  ): Promise<void> {
    const messages = await this.dealMessageRepository.listByDealId(deal.id);
    const conversationSummary = buildConversationSummary(messages);

    await this.creatorNotificationService.notifyApprovalRequired({
      deal,
      campaignId,
      chatId,
      channelTitle: channel.title,
      channelUsername: channel.username,
      contactValue,
      approvalRequest,
      subscriberCount: channel.subscriberCount ?? null,
      conversationSummary,
      conversionNote: conversionNote ?? null,
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
