import type {
  CreateDealInput,
  Deal,
  UpdateCreatorNotificationStateInput,
  UpdateDealStatusInput,
} from "@repo/types";

export interface DealRepository {
  getDeals(): Promise<Deal[]>;
  getDealById(id: string): Promise<Deal | undefined>;
  getDealsByCampaignId(campaignId: string): Promise<Deal[]>;
  createDeal(input: CreateDealInput): Promise<Deal>;
  updateDealStatus(
    id: string,
    input: UpdateDealStatusInput,
  ): Promise<Deal | undefined>;
  updateCreatorNotificationState(
    id: string,
    input: UpdateCreatorNotificationStateInput,
  ): Promise<Deal | undefined>;
}
