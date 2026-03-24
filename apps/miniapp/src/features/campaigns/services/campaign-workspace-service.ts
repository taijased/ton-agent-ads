import type {
  CampaignNegotiationStartResult,
  CampaignWorkspaceBootstrapResult,
} from "@repo/types";
import type { RecommendedChannel } from "../../create-campaign/types";
import type { CampaignWishlistCard, CampaignWorkspace } from "../types";

export interface CampaignWorkspaceService {
  getByCampaignId(campaignId: string): Promise<CampaignWorkspace>;
  bootstrapShortlist(
    campaignId: string,
    channels: RecommendedChannel[],
  ): Promise<CampaignWorkspaceBootstrapResult>;
  retryAdminParse(
    campaignId: string,
    channelId: string,
  ): Promise<CampaignWishlistCard>;
  startNegotiation(
    campaignId: string,
  ): Promise<CampaignNegotiationStartResult>;
}
