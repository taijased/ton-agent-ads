import type {
  CampaignRepository,
  ChannelRepository,
  DealExternalThreadRepository,
  DealMessageRepository,
  DealRepository,
} from "@repo/db";
import type {
  Channel,
  CreateDealInput,
  Deal,
  DealPaymentResponse,
  DealStatus,
  UpdateDealStatusInput,
} from "@repo/types";
import { extractTxHashFromBoc, resolveTransactionHash } from "@ton-adagent/ton";
import { CreatorNotificationService } from "./creator-notification-service.js";
import type { TelegramAdminClient } from "../infrastructure/telegram-admin-client.js";
import { buildOutreachMessage } from "./outreach-message-builder.js";

export interface DealActionResult {
  success: boolean;
  deal?: Deal;
  message?: string;
  statusCode?: number;
}

const isTonTestnet = (): boolean =>
  process.env.TON_NETWORK?.trim().toLowerCase() !== "mainnet";

export class DealService {
  public constructor(
    private readonly dealRepository: DealRepository,
    private readonly campaignRepository: CampaignRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly dealMessageRepository: DealMessageRepository,
    private readonly dealExternalThreadRepository: DealExternalThreadRepository,
    private readonly telegramAdminClient: TelegramAdminClient,
    private readonly creatorNotificationService: CreatorNotificationService,
  ) {}

  public getDealsByCampaignId(campaignId: string): Promise<Deal[]> {
    return this.dealRepository.getDealsByCampaignId(campaignId);
  }

  private selectAdminContact(channel: Channel): string | null {
    const usernameContacts = channel.contacts.filter(
      (contact: Channel["contacts"][number]) => contact.type === "username",
    );
    const preferredUsername = usernameContacts.find(
      (contact: Channel["contacts"][number]) => contact.isAdsContact,
    );

    if (preferredUsername !== undefined) {
      return preferredUsername.value;
    }

    if (usernameContacts[0] !== undefined) {
      return usernameContacts[0].value;
    }

    const preferredLink =
      channel.contacts.find(
        (contact: Channel["contacts"][number]) =>
          contact.type === "link" && contact.isAdsContact,
      ) ??
      channel.contacts.find(
        (contact: Channel["contacts"][number]) => contact.type === "link",
      );

    if (preferredLink === undefined) {
      return null;
    }

    const linkMatch = preferredLink.value.match(
      /(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{5,})/i,
    );

    return linkMatch === null ? null : `@${linkMatch[1]}`;
  }

  public createDeal(input: CreateDealInput): Promise<Deal> {
    return this.dealRepository.createDeal(input);
  }

  public async approveDeal(id: string): Promise<DealActionResult> {
    return this.transitionDeal(id, { status: "approved" }, "approved", [
      "negotiating",
    ]);
  }

  public async rejectDeal(id: string): Promise<DealActionResult> {
    return this.transitionDeal(id, { status: "rejected" }, "rejected", [
      "negotiating",
    ]);
  }

  public async updateDealStatus(
    id: string,
    input: UpdateDealStatusInput,
  ): Promise<DealActionResult> {
    const allowedTransitions: Record<DealStatus, DealStatus[]> = {
      pending: ["failed"],
      negotiating: ["approved", "rejected", "awaiting_user_approval", "failed"],
      waiting_user: ["failed"],
      awaiting_user_approval: ["terms_agreed", "negotiating", "failed"],
      approved: ["admin_outreach_pending", "failed"],
      rejected: [],
      admin_outreach_pending: [
        "admin_contacted",
        "negotiating",
        "terms_agreed",
        "awaiting_user_approval",
        "failed",
      ],
      admin_contacted: [
        "admin_outreach_pending",
        "negotiating",
        "terms_agreed",
        "awaiting_user_approval",
        "failed",
      ],
      terms_agreed: ["payment_pending", "failed"],
      payment_pending: ["paid", "failed"],
      paid: ["proof_pending", "completed", "failed"],
      proof_pending: ["completed", "failed"],
      completed: [],
      published: [],
      failed: [],
    };

    const deal = await this.dealRepository.getDealById(id);

    if (deal === undefined) {
      return {
        success: false,
        message: "Deal not found",
        statusCode: 404,
      };
    }

    const allowedNextStatuses = allowedTransitions[deal.status] ?? [];

    if (!allowedNextStatuses.includes(input.status)) {
      return {
        success: false,
        message: `Deal cannot transition from ${deal.status} to ${input.status}`,
        statusCode: 400,
      };
    }

    if (input.status === "admin_outreach_pending") {
      return this.startAdminOutreach(deal);
    }

    const updatedDeal = await this.dealRepository.updateDealStatus(id, input);

    if (updatedDeal === undefined) {
      return {
        success: false,
        message: "Deal not found",
        statusCode: 404,
      };
    }

    return {
      success: true,
      deal: updatedDeal,
    };
  }

  private async startAdminOutreach(deal: Deal): Promise<DealActionResult> {
    const campaign = await this.campaignRepository.findById(deal.campaignId);

    if (campaign === null) {
      return {
        success: false,
        message: "Campaign not found for deal",
        statusCode: 404,
      };
    }

    const channel = await this.channelRepository.getChannelById(deal.channelId);

    if (channel === undefined) {
      return {
        success: false,
        message: "Channel not found for deal",
        statusCode: 404,
      };
    }

    const adminContact = this.selectAdminContact(channel);

    if (adminContact === null || adminContact.trim().length === 0) {
      await this.dealRepository.updateDealStatus(deal.id, {
        status: deal.status,
        outreachError:
          "Channel contact could not be determined from parsed data",
        adminOutboundMessageId: null,
      });

      return {
        success: false,
        message: "Channel contact could not be determined from parsed data",
        statusCode: 500,
      };
    }

    const outreachMessage = buildOutreachMessage({
      channelTitle: channel.title,
      channelUsername: channel.username,
      language: campaign.language,
    });

    try {
      const result = await this.telegramAdminClient.sendAdminMessage(
        adminContact,
        outreachMessage,
      );

      await this.dealMessageRepository.create({
        dealId: deal.id,
        direction: "outbound",
        senderType: "agent",
        audience: "admin",
        transport: "telegram_mtproto",
        contactValue: adminContact,
        text: outreachMessage,
        externalMessageId: result.messageId ?? null,
        deliveryStatus: "sent",
      });

      if (result.chatId !== undefined) {
        await this.dealExternalThreadRepository.create({
          dealId: deal.id,
          platform: "telegram",
          chatId: result.chatId,
          contactValue: adminContact,
        });
      }

      const updatedDeal = await this.dealRepository.updateDealStatus(deal.id, {
        status: "admin_contacted",
        adminOutboundMessageId: result.messageId ?? null,
        outreachError: null,
      });

      if (updatedDeal === undefined) {
        return {
          success: false,
          message: "Deal not found",
          statusCode: 404,
        };
      }

      await this.creatorNotificationService.notifyOutreachStarted({
        deal: updatedDeal,
        campaignId: campaign.id,
        chatId: campaign.userId,
        channelTitle: channel.title,
        channelUsername: channel.username,
        contactValue: adminContact,
      });

      return {
        success: true,
        deal: updatedDeal,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to send Telegram outreach message";

      await this.dealRepository.updateDealStatus(deal.id, {
        status: deal.status,
        outreachError: message,
        adminOutboundMessageId: null,
      });

      return {
        success: false,
        message,
        statusCode: 500,
      };
    }
  }

  public async payDeal(
    dealId: string,
    boc: string,
  ): Promise<DealPaymentResponse> {
    const deal = await this.dealRepository.getDealById(dealId);
    if (!deal) {
      throw { statusCode: 404, message: "Deal not found" };
    }
    if (deal.status !== "terms_agreed") {
      throw {
        statusCode: 400,
        message: `Cannot pay deal in status "${deal.status}". Deal must be in "terms_agreed" status.`,
      };
    }
    if (!boc || boc.trim().length === 0) {
      throw { statusCode: 400, message: "BOC is required" };
    }

    await this.dealRepository.updateDealStatus(dealId, {
      status: "payment_pending",
      paymentBoc: boc,
    });

    return {
      id: dealId,
      status: "payment_pending",
      paymentBoc: boc,
      txHash: null,
      paidAt: null,
    };
  }

  public async confirmPayment(dealId: string): Promise<DealPaymentResponse> {
    const deal = await this.dealRepository.getDealById(dealId);
    if (!deal) {
      throw { statusCode: 404, message: "Deal not found" };
    }

    // Idempotent: if already paid, return current state
    if (
      deal.status === "paid" ||
      deal.status === "proof_pending" ||
      deal.status === "completed"
    ) {
      return {
        id: deal.id,
        status: deal.status,
        paymentBoc: deal.paymentBoc,
        paidAt: deal.paidAt,
        txHash: deal.txHash,
      };
    }

    if (deal.status !== "payment_pending") {
      throw {
        statusCode: 400,
        message: "Deal is not in payment_pending status",
      };
    }

    // Extract tx hash from stored BOC
    let txHash: string | null = null;
    if (deal.paymentBoc) {
      txHash = extractTxHashFromBoc(deal.paymentBoc);
    }

    const updatedDeal = await this.dealRepository.updateDealStatus(dealId, {
      status: "paid",
      txHash,
    });

    if (!updatedDeal) {
      throw { statusCode: 404, message: "Deal not found" };
    }

    // Fire-and-forget: resolve real on-chain tx hash in background
    if (txHash !== null) {
      void resolveTransactionHash(txHash, { testnet: isTonTestnet() }).then(
        async (realTxHash) => {
          if (realTxHash !== null) {
            await this.dealRepository.updateDealStatus(dealId, {
              status: updatedDeal.status,
              txHash: realTxHash,
            });
          }
        },
      );
    }

    return {
      id: updatedDeal.id,
      status: updatedDeal.status,
      paymentBoc: updatedDeal.paymentBoc,
      paidAt: updatedDeal.paidAt,
      txHash: updatedDeal.txHash,
    };
  }

  private async transitionDeal(
    id: string,
    input: UpdateDealStatusInput,
    action: "approved" | "rejected",
    fromStatuses: DealStatus[],
  ): Promise<DealActionResult> {
    const deal = await this.dealRepository.getDealById(id);

    if (deal === undefined) {
      return {
        success: false,
        message: "Deal not found",
        statusCode: 404,
      };
    }

    if (!fromStatuses.includes(deal.status)) {
      return {
        success: false,
        message: `Deal cannot be ${action} from current status`,
        statusCode: 400,
      };
    }

    const updatedDeal = await this.dealRepository.updateDealStatus(id, input);

    if (updatedDeal === undefined) {
      return {
        success: false,
        message: "Deal not found",
        statusCode: 404,
      };
    }

    return {
      success: true,
      deal: updatedDeal,
    };
  }
}
