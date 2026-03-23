import type { CampaignFormDraft } from "../../create-campaign/types";
import type { ProfileSummary } from "../../profile/types";
import type { CampaignSummary } from "../types";

export interface CampaignsService {
  list(): Promise<CampaignSummary[]>;
  create(
    draft: CampaignFormDraft,
    profile: ProfileSummary,
  ): Promise<CampaignSummary>;
  getById(id: string): Promise<CampaignSummary | null>;
}
