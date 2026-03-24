import type {
  CampaignNegotiationStartResult,
  CampaignWorkspaceBootstrapResult,
} from "@repo/types";
import type { RecommendedChannel } from "../../create-campaign/types";
import type { CampaignWorkspaceService } from "./campaign-workspace-service";
import type { CampaignRecord } from "../types";
import {
  createCampaignWorkspaceCounts,
  createEmptyCampaignWorkspace,
  type CampaignWishlistCard,
  type CampaignWorkspaceChatCard,
} from "../types";

const adsKeywords = [
  "ads",
  "advert",
  "adv",
  "contact",
  "promo",
  "реклама",
  "сотрудничество",
] as const;
const usernamePattern = /@[A-Za-z0-9_]+/g;
const telegramUsernamePattern = /^[A-Za-z0-9_]{5,32}$/;

const getSyntheticThreadStatus = (
  campaign: CampaignRecord,
): Pick<CampaignWorkspaceChatCard, "status"> & {
  message: string;
} => {
  switch (campaign.status) {
    case "Failed":
      return {
        status: "failed",
        message: "The placement did not move forward after shortlist review.",
      };
    case "Published":
      return {
        status: "closed",
        message: "Publication was confirmed and the channel thread is closed.",
      };
    case "Awaiting payment":
    case "Paid":
      return {
        status: "in_negotiation",
        message: "Conversation is active and the channel admin already replied.",
      };
    case "In negotiation":
      return {
        status: "awaiting_reply",
        message: "Intro was sent and the thread is waiting for the admin reply.",
      };
    case "Recommended":
    case "Draft":
    default:
      return {
        status: "message_queued",
        message: "Shortlist is ready for outreach once negotiation starts.",
      };
  }
};

const isNegotiationActive = (campaign: CampaignRecord): boolean =>
  campaign.negotiationStatus === "active" ||
  campaign.status === "In negotiation" ||
  campaign.status === "Awaiting payment" ||
  campaign.status === "Paid" ||
  campaign.status === "Published";

const normalizeTelegramHandle = (value: string): string | null => {
  const normalizedValue = value.trim().replace(/^@+/, "");

  if (!telegramUsernamePattern.test(normalizedValue)) {
    return null;
  }

  return `@${normalizedValue}`;
};

const hasAdsKeyword = (value: string): boolean => {
  const normalizedValue = value.toLowerCase();

  return adsKeywords.some((keyword) => normalizedValue.includes(keyword));
};

const extractAdminHandles = (
  channel: RecommendedChannel,
): Array<{ handle: string; isAdsContact: boolean }> => {
  const normalizedChannelUsername = normalizeTelegramHandle(channel.username);
  const description = channel.description.trim();
  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const handles = new Map<string, boolean>();

  for (const line of lines) {
    const lineMatches = line.match(usernamePattern) ?? [];
    const isAdsContact = hasAdsKeyword(line);

    for (const match of lineMatches) {
      const normalizedHandle = normalizeTelegramHandle(match);

      if (
        normalizedHandle === null ||
        normalizedHandle === normalizedChannelUsername
      ) {
        continue;
      }

      handles.set(
        normalizedHandle,
        Boolean(handles.get(normalizedHandle)) || isAdsContact,
      );
    }
  }

  return Array.from(handles.entries())
    .sort((left, right) => {
      if (left[1] !== right[1]) {
        return Number(right[1]) - Number(left[1]);
      }

      return left[0].localeCompare(right[0]);
    })
    .map(([handle, isAdsContact]) => ({
      handle,
      isAdsContact,
    }));
};

const buildMockAdminContacts = (
  campaign: CampaignRecord,
  channel: RecommendedChannel,
) =>
  extractAdminHandles(channel).map(({ handle, isAdsContact }, index) => ({
    id: `${campaign.id}:${channel.id}:admin:${handle.replace(/^@/, "")}`,
    channelId: channel.id,
    telegramHandle: handle,
    telegramUserId: null,
    source: "channel_description" as const,
    confidenceScore: isAdsContact ? 0.92 : 0.58,
    status: "found" as const,
    createdAt: campaign.updatedAt,
    updatedAt: campaign.updatedAt,
  }));

const toWishlistCard = (
  campaign: CampaignRecord,
  channel: RecommendedChannel,
): CampaignWishlistCard => {
  const adminContacts = buildMockAdminContacts(campaign, channel);

  return {
    id: `${campaign.id}:${channel.id}:wishlist`,
    channelId: channel.id,
    channelName: channel.name,
    channelUsername: channel.username,
    channelAvatarUrl: channel.avatar,
    adminParseStatus:
      adminContacts.length > 0 ? "admins_found" : "admins_not_found",
    readinessStatus: adminContacts.length > 0 ? "ready" : "not_ready",
    adminCount: adminContacts.length,
    lastParsedAt: campaign.updatedAt,
    adminContacts,
    updatedAt: campaign.updatedAt,
    source: "mock",
  };
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

    const wishlistCards: Array<CampaignWishlistCard | null> =
      campaign.shortlistedChannelIds.map((channelId, index) => {
        const channel = channelLookup.get(channelId);

        if (channel === undefined) {
          return null;
        }

        return toWishlistCard(campaign, channel);
      });
    const resolvedWishlistCards = wishlistCards.filter(
      (card): card is CampaignWishlistCard => card !== null,
    );
    const chatCards: Array<CampaignWorkspaceChatCard | null> =
      !isNegotiationActive(campaign)
        ? []
        : resolvedWishlistCards.flatMap((card, index) => {
            const syntheticStatus = getSyntheticThreadStatus(campaign);

            return card.adminContacts.map((contact, contactIndex) => ({
              id: `${campaign.id}:${card.channelId}:${contact.id}`,
              adminContactId: contact.id,
              adminHandle: contact.telegramHandle,
              adminStatus: contact.status,
              channelId: card.channelId,
              channelName: card.channelName,
              channelUsername: card.channelUsername,
              channelAvatarUrl: card.channelAvatarUrl,
              status: syntheticStatus.status,
              lastMessagePreview:
                index === 0 && contactIndex === 0
                  ? syntheticStatus.message
                  : "Selected channel was included in the negotiation launch.",
              lastDirection: "system",
              lastMessageAt: campaign.updatedAt,
              updatedAt: campaign.updatedAt,
              startedAt: campaign.negotiationStartedAt ?? campaign.updatedAt,
              outreachAttemptCount: 1,
              source: "mock" as const,
            }));
          });
    const resolvedChatCards = chatCards.filter(
      (card): card is CampaignWorkspaceChatCard => {
        return card !== null;
      },
    );

    return {
      campaignId,
      wishlistCards: resolvedWishlistCards,
      chatCards: resolvedChatCards,
      counts: createCampaignWorkspaceCounts(
        resolvedWishlistCards.length,
        resolvedChatCards.length,
      ),
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

  async retryAdminParse(campaignId, channelId) {
    const workspace = await this.getByCampaignId(campaignId);
    const card = workspace.wishlistCards.find(
      (candidate) => candidate.channelId === channelId,
    );

    if (card === undefined) {
      throw new Error("Campaign channel not found");
    }

    return {
      channelId: card.channelId,
      channelName: card.channelName,
      channelUsername: card.channelUsername,
      channelAvatarUrl: card.channelAvatarUrl,
      id: card.id,
      adminParseStatus: "parsing",
      readinessStatus: "unknown",
      adminCount: card.adminCount,
      lastParsedAt: card.lastParsedAt,
      adminContacts: card.adminContacts,
      updatedAt: card.updatedAt,
      source: "mock",
    };
  },

  async startNegotiation(campaignId): Promise<CampaignNegotiationStartResult> {
    const campaign =
      campaigns.find((candidate) => candidate.id === campaignId) ?? null;
    const shortlistedChannels = (campaign?.shortlistedChannelIds ?? [])
      .map((channelId) => channelLookup.get(channelId) ?? null)
      .filter((channel): channel is RecommendedChannel => channel !== null);
    const readyChannels = shortlistedChannels.filter(
      (channel) => extractAdminHandles(channel).length > 0,
    );
    const createdThreadCount = readyChannels.reduce(
      (count, channel) => count + extractAdminHandles(channel).length,
      0,
    );
    const negotiationStartedAt = new Date().toISOString();

    return {
      campaignId,
      negotiationStatus: "active",
      negotiationStartedAt,
      readyChannelCount: readyChannels.length,
      createdThreadCount,
      existingThreadCount: 0,
      failedThreadCount: 0,
    };
  },
});
