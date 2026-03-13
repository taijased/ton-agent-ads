import type { Campaign, CreateCampaignInput } from "@repo/types";

export interface CampaignRepository {
  list(): Promise<Campaign[]>;
  findById(id: string): Promise<Campaign | null>;
  create(input: CreateCampaignInput): Promise<Campaign>;
}
