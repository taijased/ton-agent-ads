import type { CreateDealInput, Deal, DealStatus } from "@repo/types";

export interface DealRepository {
  getDeals(): Promise<Deal[]>;
  getDealById(id: string): Promise<Deal | undefined>;
  getDealsByCampaignId(campaignId: string): Promise<Deal[]>;
  createDeal(input: CreateDealInput): Promise<Deal>;
  updateDealStatus(id: string, status: DealStatus): Promise<Deal | undefined>;
}
