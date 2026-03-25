import type {
  ApprovalActionResult,
  CampaignNegotiationStartResult,
  CampaignThreadListResponse,
  CampaignWorkspaceBootstrapResult,
  CampaignWorkspaceResponse,
  DealPaymentResponse,
  ThreadNegotiationResponse,
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

export function getThreadNegotiation(
  threadId: string,
): Promise<ThreadNegotiationResponse> {
  return apiRequest<ThreadNegotiationResponse>(
    `/api/threads/${threadId}/negotiation`,
  );
}

export function approveApprovalRequest(
  approvalRequestId: string,
): Promise<ApprovalActionResult> {
  return apiRequest<ApprovalActionResult>(
    `/api/approval-requests/${approvalRequestId}/approve`,
    { method: "POST" },
  );
}

export function rejectApprovalRequest(
  approvalRequestId: string,
): Promise<ApprovalActionResult> {
  return apiRequest<ApprovalActionResult>(
    `/api/approval-requests/${approvalRequestId}/reject`,
    { method: "POST" },
  );
}

export function counterApprovalRequest(
  approvalRequestId: string,
  text: string,
): Promise<ApprovalActionResult> {
  return apiRequest<ApprovalActionResult>(
    `/api/approval-requests/${approvalRequestId}/counter`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    },
  );
}

export function payDeal(
  dealId: string,
  boc: string,
): Promise<DealPaymentResponse> {
  return apiRequest<DealPaymentResponse>(`/api/deals/${dealId}/pay`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ boc }),
  });
}

export function confirmPayment(dealId: string): Promise<DealPaymentResponse> {
  return apiRequest<DealPaymentResponse>(
    `/api/deals/${dealId}/confirm-payment`,
    { method: "POST" },
  );
}
