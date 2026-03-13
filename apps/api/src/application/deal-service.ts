import type {
  CampaignRepository,
  ChannelRepository,
  DealRepository
} from "@repo/db";
import type { CreateDealInput, Deal, DealStatus, UpdateDealStatusInput } from "@repo/types";
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
    private readonly telegramAdminClient: TelegramAdminClient
  ) {}

  public getDealsByCampaignId(campaignId: string): Promise<Deal[]> {
    return this.dealRepository.getDealsByCampaignId(campaignId);
  }

  public createDeal(input: CreateDealInput): Promise<Deal> {
    return this.dealRepository.createDeal(input);
  }

  public async approveDeal(id: string): Promise<DealActionResult> {
    return this.transitionDeal(id, { status: "approved" }, "approved", ["negotiating"]);
  }

  public async rejectDeal(id: string): Promise<DealActionResult> {
    return this.transitionDeal(id, { status: "rejected" }, "rejected", ["negotiating"]);
  }

  public async updateDealStatus(
    id: string,
    input: UpdateDealStatusInput
  ): Promise<DealActionResult> {
    const allowedTransitions: Record<DealStatus, DealStatus[]> = {
      pending: ["failed"],
      negotiating: ["approved", "rejected", "failed"],
      waiting_user: ["failed"],
      approved: ["admin_outreach_pending", "failed"],
      rejected: [],
      admin_outreach_pending: ["admin_contacted", "terms_agreed", "failed"],
      admin_contacted: ["terms_agreed", "failed"],
      terms_agreed: ["payment_pending", "failed"],
      payment_pending: ["paid", "failed"],
      paid: ["proof_pending", "failed"],
      proof_pending: ["completed", "failed"],
      completed: [],
      published: [],
      failed: []
    };

    const deal = await this.dealRepository.getDealById(id);

    if (deal === undefined) {
      return {
        success: false,
        message: "Deal not found",
        statusCode: 404
      };
    }

    const allowedNextStatuses = allowedTransitions[deal.status] ?? [];

    if (!allowedNextStatuses.includes(input.status)) {
      return {
        success: false,
        message: `Deal cannot transition from ${deal.status} to ${input.status}`,
        statusCode: 400
      };
    }

    if (input.status === "admin_outreach_pending") {
      return this.startAdminOutreach(deal);
    }

    if (input.status === "proof_pending") {
      const hasProofText = typeof input.proofText === "string" && input.proofText.trim().length > 0;
      const hasProofUrl = typeof input.proofUrl === "string" && input.proofUrl.trim().length > 0;

      if (!hasProofText && !hasProofUrl) {
        return {
          success: false,
          message: "Proof text or proof URL is required",
          statusCode: 400
        };
      }
    }

    const updatedDeal = await this.dealRepository.updateDealStatus(id, input);

    if (updatedDeal === undefined) {
      return {
        success: false,
        message: "Deal not found",
        statusCode: 404
      };
    }

    return {
      success: true,
      deal: updatedDeal
    };
  }

  private async startAdminOutreach(deal: Deal): Promise<DealActionResult> {
    const campaign = await this.campaignRepository.findById(deal.campaignId);

    if (campaign === null) {
      return {
        success: false,
        message: "Campaign not found for deal",
        statusCode: 404
      };
    }

    const channel = await this.channelRepository.getChannelById(deal.channelId);

    if (channel === undefined) {
      return {
        success: false,
        message: "Channel not found for deal",
        statusCode: 404
      };
    }

    if (channel.adminUsername === null || channel.adminUsername.trim().length === 0) {
      await this.dealRepository.updateDealStatus(deal.id, {
        status: deal.status,
        outreachError: "Channel admin username is not configured",
        adminOutboundMessageId: null
      });

      return {
        success: false,
        message: "Channel admin username is not configured",
        statusCode: 500
      };
    }

    const outreachMessage = this.buildOutreachMessage({
      campaignId: campaign.id,
      text: campaign.text,
      theme: campaign.theme,
      language: campaign.language,
      goal: campaign.goal,
      budgetAmount: campaign.budgetAmount,
      budgetCurrency: campaign.budgetCurrency,
      channelTitle: channel.title,
      channelUsername: channel.username,
      proposedPrice: deal.price
    });

    try {
      const result = await this.telegramAdminClient.sendAdminMessage(
        channel.adminUsername,
        outreachMessage
      );

      const updatedDeal = await this.dealRepository.updateDealStatus(deal.id, {
        status: "admin_contacted",
        adminOutboundMessageId: result.messageId ?? null,
        outreachError: null
      });

      if (updatedDeal === undefined) {
        return {
          success: false,
          message: "Deal not found",
          statusCode: 404
        };
      }

      return {
        success: true,
        deal: updatedDeal
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send Telegram outreach message";

      await this.dealRepository.updateDealStatus(deal.id, {
        status: deal.status,
        outreachError: message,
        adminOutboundMessageId: null
      });

      return {
        success: false,
        message,
        statusCode: 500
      };
    }
  }

  private buildOutreachMessage(input: {
    campaignId: string;
    text: string;
    theme: string | null;
    language: string | null;
    goal: string | null;
    budgetAmount: string;
    budgetCurrency: string;
    channelTitle: string;
    channelUsername: string;
    proposedPrice: number;
  }): string {
    return [
      "Hello!",
      "",
      "We are reaching out regarding a potential ad placement.",
      `Campaign ID: ${input.campaignId}`,
      `Requested channel: ${input.channelTitle} (${input.channelUsername})`,
      `Campaign text: ${input.text}`,
      input.theme ? `Theme: ${input.theme}` : null,
      input.language ? `Language: ${input.language}` : null,
      input.goal ? `Goal: ${input.goal}` : null,
      `Campaign budget: ${input.budgetAmount} ${input.budgetCurrency}`,
      `Proposed placement price: ${input.proposedPrice} TON`,
      "",
      "Please confirm whether this placement can be arranged."
    ]
      .filter((value): value is string => value !== null)
      .join("\n");
  }

  private async transitionDeal(
    id: string,
    input: UpdateDealStatusInput,
    action: "approved" | "rejected",
    fromStatuses: DealStatus[]
  ): Promise<DealActionResult> {
    const deal = await this.dealRepository.getDealById(id);

    if (deal === undefined) {
      return {
        success: false,
        message: "Deal not found",
        statusCode: 404
      };
    }

    if (!fromStatuses.includes(deal.status)) {
      return {
        success: false,
        message: `Deal cannot be ${action} from current status`,
        statusCode: 400
      };
    }

    const updatedDeal = await this.dealRepository.updateDealStatus(id, input);

    if (updatedDeal === undefined) {
      return {
        success: false,
        message: "Deal not found",
        statusCode: 404
      };
    }

    return {
      success: true,
      deal: updatedDeal
    };
  }
}
