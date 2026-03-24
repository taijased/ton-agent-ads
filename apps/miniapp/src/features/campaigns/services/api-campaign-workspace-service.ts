import type {
  CampaignNegotiationStartResult,
  CampaignThreadListResponse,
  CampaignWorkspaceBootstrapResult,
  CampaignWorkspaceResponse,
} from "@repo/types";
import type { RecommendedChannel } from "../../create-campaign/types";
import type { CampaignWorkspaceService } from "./campaign-workspace-service";
import { toCampaignWishlistCard, toCampaignWorkspace } from "../types";

const parseErrorMessage = async (response: Response): Promise<string> => {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    error?: string;
    reason?: string;
  } | null;

  return (
    body?.message ??
    body?.reason ??
    body?.error ??
    `API request failed with status ${response.status}`
  );
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, init);

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
};

export const apiCampaignWorkspaceService: CampaignWorkspaceService = {
  async getByCampaignId(campaignId) {
    const [workspaceResponse, threadResponse] = await Promise.all([
      request<CampaignWorkspaceResponse>(`/api/campaigns/${campaignId}/workspace`),
      request<CampaignThreadListResponse>(`/api/campaigns/${campaignId}/threads`),
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

    return request<CampaignWorkspaceBootstrapResult>(
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
    const response = await request<CampaignWorkspaceResponse["chatCards"][number]>(
      `/api/campaigns/${campaignId}/workspace/channels/${channelId}/retry-admin-parse`,
      {
        method: "POST",
      },
    );

    return toCampaignWishlistCard(response);
  },

  async startNegotiation(campaignId) {
    return request<CampaignNegotiationStartResult>(
      `/api/campaigns/${campaignId}/negotiation/start`,
      {
        method: "POST",
      },
    );
  },
};
