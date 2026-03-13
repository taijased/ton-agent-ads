import type { DealRepository } from "@repo/db";
import type { CreateDealInput, Deal, DealStatus, UpdateDealStatusInput } from "@repo/types";

export interface DealActionResult {
  success: boolean;
  deal?: Deal;
  message?: string;
  statusCode?: number;
}

export class DealService {
  public constructor(private readonly dealRepository: DealRepository) {}

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
