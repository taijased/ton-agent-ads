import type { CreateDealInput, Deal } from "@repo/types";

export interface DealRepository {
  getDeals(): Deal[];
  getDealsByCampaignId(campaignId: string): Deal[];
  createDeal(input: CreateDealInput): Deal;
}
