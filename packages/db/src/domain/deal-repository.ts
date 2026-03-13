import type { CreateDealInput, Deal } from "@repo/types";

export interface DealRepository {
  getDeals(): Promise<Deal[]>;
  getDealsByCampaignId(campaignId: string): Promise<Deal[]>;
  createDeal(input: CreateDealInput): Promise<Deal>;
}
