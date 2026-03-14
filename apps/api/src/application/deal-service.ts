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
  DealStatus,
  UpdateDealStatusInput,
} from "@repo/types";
import type { TelegramAdminClient } from "../infrastructure/telegram-admin-client.js";

export interface DealActionResult {
  success: boolean;
  deal?: Deal;
  message?: string;
  statusCode?: number;
}

export class DealService {
  public constructor(
    private readonly dealRepository: DealRepository,
    private readonly campaignRepository: CampaignRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly dealMessageRepository: DealMessageRepository,
    private readonly dealExternalThreadRepository: DealExternalThreadRepository,
    private readonly telegramAdminClient: TelegramAdminClient,
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
      paid: ["proof_pending", "failed"],
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

    if (input.status === "proof_pending") {
      const hasProofText =
        typeof input.proofText === "string" &&
        input.proofText.trim().length > 0;
      const hasProofUrl =
        typeof input.proofUrl === "string" && input.proofUrl.trim().length > 0;

      if (!hasProofText && !hasProofUrl) {
        return {
          success: false,
          message: "Proof text or proof URL is required",
          statusCode: 400,
        };
      }
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

    const outreachMessage = this.buildOutreachMessage({
      campaignId: campaign.id,
      text: campaign.text,
      theme: campaign.theme,
      language: campaign.language,
      goal: campaign.goal,
      channelTitle: channel.title,
      channelUsername: channel.username,
      channelDescription: channel.description,
      proposedPrice: deal.price,
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
        contactValue: adminContact,
        text: outreachMessage,
        externalMessageId: result.messageId ?? null,
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

  private buildOutreachMessage(input: {
    campaignId: string;
    text: string;
    theme: string | null;
    language: string | null;
    goal: string | null;
    channelTitle: string;
    channelUsername: string;
    channelDescription: string | null;
    proposedPrice: number;
  }): string {
    const normalizedDescription = input.channelDescription?.toLowerCase() ?? "";
    const intro =
      normalizedDescription.includes("ads") ||
      normalizedDescription.includes("реклама")
        ? `Hello! We found ${input.channelTitle} and saw that advertising requests are handled here.`
        : normalizedDescription.includes("promo") ||
            normalizedDescription.includes("collab") ||
            normalizedDescription.includes("сотруднич")
          ? `Hello! We are reaching out about a possible collaboration with ${input.channelTitle}.`
          : `Hello! We would like to discuss a potential ad placement in ${input.channelTitle}.`;

    return [
      intro,
      "",
      `Campaign ID: ${input.campaignId}`,
      `Requested channel: ${input.channelTitle} (${input.channelUsername})`,
      `Campaign text: ${input.text}`,
      input.theme ? `Theme: ${input.theme}` : null,
      input.language ? `Language: ${input.language}` : null,
      input.goal ? `Goal: ${input.goal}` : null,
      `Proposed placement price: ${input.proposedPrice} TON`,
      "",
      "Could you please share your available ad formats, conditions, and your current rate for this placement?",
    ]
      .filter((value): value is string => value !== null)
      .join("\n");
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
