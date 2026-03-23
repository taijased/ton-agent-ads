import type { CampaignWorkspaceBootstrapResult } from "@repo/types";
import type { RecommendedChannel } from "../../create-campaign/types";
import type { CampaignWorkspaceService } from "./campaign-workspace-service";
import type { CampaignRecord } from "../types";
import {
  createCampaignWorkspaceCounts,
  createEmptyCampaignWorkspace,
  type CampaignWorkspaceChatCard,
} from "../types";

const getSyntheticStatus = (
  campaign: CampaignRecord,
): Pick<CampaignWorkspaceChatCard, "bucket" | "status" | "priceTon"> & {
  message: string;
} => {
  switch (campaign.status) {
    case "Failed":
      return {
        bucket: "refused",
        status: "failed",
        priceTon: null,
        message: "The placement did not move forward after shortlist review.",
      };
    case "Awaiting payment":
      return {
        bucket: "waiting_payment",
        status: "payment_pending",
        priceTon: Number(campaign.budget) || null,
        message: "Terms are aligned and payment confirmation is pending.",
      };
    case "Paid":
      return {
        bucket: "waiting_publication",
        status: "paid",
        priceTon: Number(campaign.budget) || null,
        message: "Payment is confirmed and publication proof is pending.",
      };
    case "Published":
      return {
        bucket: "completed",
        status: "completed",
        priceTon: Number(campaign.budget) || null,
        message: "Publication was confirmed and the channel thread is closed.",
      };
    case "In negotiation":
      return {
        bucket: "negotiations",
        status: "admin_contacted",
        priceTon: null,
        message: "Agent is discussing placement terms with the channel admin.",
      };
    case "Recommended":
    case "Draft":
    default:
      return {
        bucket: "negotiations",
        status: "negotiating",
        priceTon: null,
        message:
          "Shortlist prepared for outreach once the campaign moves live.",
      };
  }
};

export const createMockCampaignWorkspaceService = (
  campaigns: CampaignRecord[],
  channelLookup: Map<string, RecommendedChannel>,
): CampaignWorkspaceService => ({
  async getByCampaignId(campaignId) {
    const campaign =
      campaigns.find((candidate) => candidate.id === campaignId) ?? null;

    if (campaign === null) {
      return createEmptyCampaignWorkspace(campaignId, "mock");
    }

    const chatCards: Array<CampaignWorkspaceChatCard | null> =
      campaign.shortlistedChannelIds.map((channelId, index) => {
        const channel = channelLookup.get(channelId);

        if (channel === undefined) {
          return null;
        }

        const syntheticStatus = getSyntheticStatus(campaign);

        return {
          id: `${campaign.id}:${channel.id}`,
          dealId: null,
          channelId: channel.id,
          channelName: channel.name,
          channelUsername: channel.username,
          channelAvatarUrl: channel.avatar,
          status: syntheticStatus.status,
          bucket: syntheticStatus.bucket,
          priceTon: syntheticStatus.priceTon ?? channel.expectedPrice,
          latestMessage: {
            text:
              index === 0
                ? syntheticStatus.message
                : "Selected channel is queued inside the campaign workspace.",
            senderType: "system",
            senderLabel: "System",
            createdAt: campaign.updatedAt,
          },
          pendingApproval: null,
          updatedAt: campaign.updatedAt,
          source: "mock" as const,
        };
      });
    const resolvedChatCards = chatCards.filter(
      (card): card is CampaignWorkspaceChatCard => {
        return card !== null;
      },
    );

    return {
      campaignId,
      chatCards: resolvedChatCards,
      counts: createCampaignWorkspaceCounts(resolvedChatCards),
      analyticsState: "soon",
      source: "mock",
    };
  },

  async bootstrapShortlist(
    campaignId,
    channels,
  ): Promise<CampaignWorkspaceBootstrapResult> {
    const campaign =
      campaigns.find((candidate) => candidate.id === campaignId) ?? null;

    return {
      campaignId,
      items: channels.map((channel) => ({
        username: channel.username,
        outcome:
          campaign?.shortlistedChannelIds.includes(channel.id) === true
            ? "already_exists"
            : "created",
        dealId: null,
        channelId: channel.id,
      })),
    };
  },
});
