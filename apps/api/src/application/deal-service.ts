import type { DealRepository } from "@repo/db";
import type { CreateDealInput, Deal } from "@repo/types";

export class DealService {
  public constructor(private readonly dealRepository: DealRepository) {}

  public getDealsByCampaignId(campaignId: string): Promise<Deal[]> {
    return this.dealRepository.getDealsByCampaignId(campaignId);
  }

  public createDeal(input: CreateDealInput): Promise<Deal> {
    return this.dealRepository.createDeal(input);
  }
}
