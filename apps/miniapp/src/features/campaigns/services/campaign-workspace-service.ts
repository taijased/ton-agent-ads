import type { CampaignWorkspaceBootstrapResult } from "@repo/types";
import type { RecommendedChannel } from "../../create-campaign/types";
import type { CampaignWorkspace } from "../types";

export interface CampaignWorkspaceService {
  getByCampaignId(campaignId: string): Promise<CampaignWorkspace>;
  bootstrapShortlist(
    campaignId: string,
    channels: RecommendedChannel[],
  ): Promise<CampaignWorkspaceBootstrapResult>;
}
