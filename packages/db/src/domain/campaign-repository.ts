import type {
  Campaign,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignNegotiationStateInput,
  UpdateCampaignInput,
} from "@repo/types";

export interface CampaignRepository {
  list(): Promise<Campaign[]>;
  findById(id: string): Promise<Campaign | null>;
  create(input: CreateCampaignInput): Promise<Campaign>;
  update(id: string, input: UpdateCampaignInput): Promise<Campaign | null>;
  updateStatus(id: string, status: CampaignStatus): Promise<Campaign | null>;
  updateNegotiationState(
    id: string,
    input: UpdateCampaignNegotiationStateInput,
  ): Promise<Campaign | null>;
}
