import type {
  CampaignNegotiationStartResult,
  CampaignThreadListResponse,
  CampaignWorkspaceBootstrapResult,
  CampaignWorkspaceResponse,
} from "@repo/types";
import type { RecommendedChannel } from "../../create-campaign/types";
import type { CampaignWorkspaceService } from "./campaign-workspace-service";
import { toCampaignWishlistCard, toCampaignWorkspace } from "../types";
import { apiRequest } from "../../../lib/api";

export const apiCampaignWorkspaceService: CampaignWorkspaceService = {
  async getByCampaignId(campaignId) {
    const [workspaceResponse, threadResponse] = await Promise.all([
      apiRequest<CampaignWorkspaceResponse>(
        `/api/campaigns/${campaignId}/workspace`,
      ),
      apiRequest<CampaignThreadListResponse>(
        `/api/campaigns/${campaignId}/threads`,
      ),
    ]);

    return toCampaignWorkspace(workspaceResponse, threadResponse);
  },

  async bootstrapShortlist(campaignId, channels) {
    if (channels.length === 0) {
      return {
        campaignId,
        items: [],
      };
    }

    return apiRequest<CampaignWorkspaceBootstrapResult>(
      `/api/campaigns/${campaignId}/workspace/bootstrap-shortlist`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          channels: channels.map((channel: RecommendedChannel) => ({
            username: channel.username,
            title: channel.name,
            source: "wizard_shortlist",
          })),
        }),
      },
    );
  },

  async retryAdminParse(campaignId, channelId) {
    const response = await apiRequest<
      CampaignWorkspaceResponse["chatCards"][number]
    >(
      `/api/campaigns/${campaignId}/workspace/channels/${channelId}/retry-admin-parse`,
      {
        method: "POST",
      },
    );

    return toCampaignWishlistCard(response);
  },

  async startNegotiation(campaignId) {
    return apiRequest<CampaignNegotiationStartResult>(
      `/api/campaigns/${campaignId}/negotiation/start`,
      {
        method: "POST",
      },
    );
  },
};
