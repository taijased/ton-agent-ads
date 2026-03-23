import type { Campaign, CampaignStatus, CreateCampaignInput } from "@repo/types";

export interface CampaignRepository {
  list(): Promise<Campaign[]>;
  findById(id: string): Promise<Campaign | null>;
  create(input: CreateCampaignInput): Promise<Campaign>;
  updateStatus(id: string, status: CampaignStatus): Promise<Campaign | null>;
}
