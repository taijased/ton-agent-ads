import type { DealRepository } from "@repo/db";
import type { CreateDealInput, Deal, DealStatus } from "@repo/types";

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
    return this.transitionDeal(id, "approved", "approved");
  }

  public async rejectDeal(id: string): Promise<DealActionResult> {
    return this.transitionDeal(id, "rejected", "rejected");
  }

  private async transitionDeal(
    id: string,
    nextStatus: DealStatus,
    action: "approved" | "rejected"
  ): Promise<DealActionResult> {
    const deal = await this.dealRepository.getDealById(id);

    if (deal === undefined) {
      return {
        success: false,
        message: "Deal not found",
        statusCode: 404
      };
    }

    if (deal.status !== "negotiating") {
      return {
        success: false,
        message: `Deal cannot be ${action} from current status`,
        statusCode: 400
      };
    }

    const updatedDeal = await this.dealRepository.updateDealStatus(id, nextStatus);

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
