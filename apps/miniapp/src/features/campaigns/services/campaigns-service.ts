import type { CampaignDraft } from "../../create-campaign/types";
import type { ProfileSummary } from "../../profile/types";
import type { CampaignRecord } from "../types";

export interface CampaignsService {
  list(): Promise<CampaignRecord[]>;
  create(
    draft: CampaignDraft,
    profile: ProfileSummary,
  ): Promise<CampaignRecord>;
  getById(id: string): Promise<CampaignRecord | null>;
}
