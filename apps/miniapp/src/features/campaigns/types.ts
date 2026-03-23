import type {
  Campaign,
  CampaignGoal,
  CampaignWorkspaceCounts,
  CampaignWorkspaceResponse,
  DealMessageSenderType,
  DealStatus,
} from "@repo/types";
import type {
  CampaignDraft,
  RecommendedChannel,
} from "../create-campaign/types";

export type CampaignDisplayStatus =
  | "Draft"
  | "Recommended"
  | "In negotiation"
  | "Awaiting payment"
  | "Paid"
  | "Published"
  | "Failed";

export type CampaignPreviewKind = "image" | "video";

export type CampaignPreviewTone = "ocean" | "sunset" | "mint" | "night";

export interface CampaignRecord extends CampaignDraft {
  id: string;
  status: CampaignDisplayStatus;
  createdAt: string;
  updatedAt: string;
  source: "mock" | "api";
}

export interface CampaignSummary {
  id: string;
  title: string;
  description: string;
  goal: CampaignGoal | null;
  status: CampaignDisplayStatus;
  selectedChannelLabel: string;
  amountTon: number;
  amountKind: "budget" | "agreed";
  metricLabel: string;
  metricValue: string;
  previewUrl: string | null;
  previewKind: CampaignPreviewKind;
  previewLabel: string;
  previewTone: CampaignPreviewTone;
  createdAt: string;
  updatedAt: string;
  source: "mock" | "api";
}

export interface CampaignDetailsView extends CampaignRecord {
  previewKind: CampaignPreviewKind;
  previewTone: CampaignPreviewTone;
  primaryMediaUrl: string | null;
  selectedChannelLabel: string;
  shortlistedChannels: RecommendedChannel[];
}

export type CampaignWorkspaceTabId = "overview" | "chats" | "analytics";

export type CampaignWorkspaceStatusBucket =
  | "negotiations"
  | "refused"
  | "waiting_payment"
  | "waiting_publication"
  | "completed";

export interface CampaignWorkspaceMessagePreview {
  text: string;
  senderType: DealMessageSenderType;
  senderLabel: string;
  createdAt: string;
}

export interface CampaignWorkspacePendingApproval {
  id: string;
  status: "pending" | "approved" | "rejected" | "expired";
  summary: string;
  proposedPriceTon: number | null;
  proposedDateText: string | null;
}

export interface CampaignWorkspaceChatCard {
  id: string;
  dealId: string | null;
  channelId: string | null;
  channelName: string;
  channelUsername: string | null;
  channelAvatarUrl: string | null;
  status: DealStatus | string;
  bucket: CampaignWorkspaceStatusBucket;
  priceTon: number | null;
  latestMessage: CampaignWorkspaceMessagePreview | null;
  pendingApproval: CampaignWorkspacePendingApproval | null;
  updatedAt: string;
  source: "mock" | "api";
}

export interface CampaignWorkspace {
  campaignId: string;
  chatCards: CampaignWorkspaceChatCard[];
  counts: CampaignWorkspaceCounts;
  analyticsState: "soon";
  source: "mock" | "api";
}

type CampaignStatusValue =
  | Campaign["status"]
  | "cancelled"
  | "channel_pending"
  | "channel_resolved";

export const mapCampaignStatus = (
  status: CampaignStatusValue,
): CampaignDisplayStatus => {
  switch (status) {
    case "draft":
      return "Draft";
    case "negotiating":
      return "In negotiation";
    case "paused":
      return "Awaiting payment";
    case "done":
      return "Published";
    case "cancelled":
    case "failed":
      return "Failed";
    case "active":
    case "channel_pending":
    case "channel_resolved":
    default:
      return "Recommended";
  }
};

const dealSenderLabelMap: Record<DealMessageSenderType, string> = {
  admin: "Admin",
  agent: "Agent",
  system: "System",
  user: "You",
};

export const mapWorkspaceStatusToBucket = (
  status: DealStatus | string,
): CampaignWorkspaceStatusBucket => {
  switch (status) {
    case "rejected":
    case "failed":
      return "refused";
    case "terms_agreed":
    case "payment_pending":
      return "waiting_payment";
    case "paid":
    case "proof_pending":
      return "waiting_publication";
    case "completed":
    case "published":
      return "completed";
    case "pending":
    case "negotiating":
    case "waiting_user":
    case "awaiting_user_approval":
    case "approved":
    case "admin_outreach_pending":
    case "admin_contacted":
    default:
      return "negotiations";
  }
};

export const createCampaignWorkspaceCounts = (
  chatCards: Array<Pick<CampaignWorkspaceChatCard, "bucket">>,
): CampaignWorkspaceCounts =>
  chatCards.reduce<CampaignWorkspaceCounts>(
    (counts, card) => {
      counts.total += 1;

      switch (card.bucket) {
        case "refused":
          counts.refused += 1;
          break;
        case "waiting_payment":
          counts.waitingPayment += 1;
          break;
        case "waiting_publication":
          counts.waitingPublication += 1;
          break;
        case "completed":
          counts.completed += 1;
          break;
        case "negotiations":
        default:
          counts.negotiations += 1;
          break;
      }

      return counts;
    },
    {
      total: 0,
      negotiations: 0,
      refused: 0,
      waitingPayment: 0,
      waitingPublication: 0,
      completed: 0,
    },
  );

export const createEmptyCampaignWorkspace = (
  campaignId: string,
  source: CampaignWorkspace["source"],
): CampaignWorkspace => ({
  campaignId,
  chatCards: [],
  counts: {
    total: 0,
    negotiations: 0,
    refused: 0,
    waitingPayment: 0,
    waitingPublication: 0,
    completed: 0,
  },
  analyticsState: "soon",
  source,
});

export const toCampaignWorkspace = (
  response: CampaignWorkspaceResponse,
): CampaignWorkspace => ({
  campaignId: response.campaignId,
  chatCards: response.chatCards.map((card) => ({
    id: card.id,
    dealId: card.dealId,
    channelId: card.channel.id,
    channelName: card.channel.title,
    channelUsername: card.channel.username,
    channelAvatarUrl: card.channel.avatarUrl,
    status: card.status,
    bucket: mapWorkspaceStatusToBucket(card.status),
    priceTon: card.priceTon,
    latestMessage:
      card.latestMessage === null
        ? null
        : {
            text: card.latestMessage.text,
            senderType: card.latestMessage.senderType,
            senderLabel: dealSenderLabelMap[card.latestMessage.senderType],
            createdAt: card.latestMessage.createdAt,
          },
    pendingApproval:
      card.pendingApproval === null
        ? null
        : {
            id: card.pendingApproval.id,
            status: card.pendingApproval.status,
            summary: card.pendingApproval.summary,
            proposedPriceTon: card.pendingApproval.proposedPriceTon,
            proposedDateText: card.pendingApproval.proposedDateText,
          },
    updatedAt: card.updatedAt,
    source: "api",
  })),
  counts: response.counts,
  analyticsState: response.analyticsState,
  source: "api",
});

const getPrimaryMediaUrl = (media: string[]): string | null =>
  media.find((value) => value.trim().length > 0) ?? null;

const inferPreviewKind = (media: string[]): CampaignPreviewKind => {
  const primaryMedia = getPrimaryMediaUrl(media);

  if (primaryMedia === null) {
    return "image";
  }

  const normalizedValue = primaryMedia.toLowerCase();
  if (
    normalizedValue.endsWith(".mp4") ||
    normalizedValue.endsWith(".mov") ||
    normalizedValue.includes("video")
  ) {
    return "video";
  }

  return "image";
};

const normalizePreviewTone = (
  goal: CampaignGoal | null,
): CampaignPreviewTone => {
  switch (goal) {
    case "TRAFFIC":
      return "ocean";
    case "SUBSCRIBERS":
      return "mint";
    case "SALES":
      return "night";
    case "AWARENESS":
    default:
      return "sunset";
  }
};

const getCampaignTitle = (
  campaign: Pick<CampaignRecord, "title" | "text">,
): string => {
  if (campaign.title.trim().length > 0) {
    return campaign.title.trim();
  }

  const firstLine = campaign.text
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 0);

  return firstLine ?? "Untitled campaign";
};

export const createRecommendedChannelLookup = (
  channels: RecommendedChannel[],
): Map<string, RecommendedChannel> =>
  new Map(channels.map((channel) => [channel.id, channel]));

const getShortlistedChannels = (
  campaign: CampaignRecord,
  channelLookup: Map<string, RecommendedChannel>,
): RecommendedChannel[] =>
  campaign.shortlistedChannelIds
    .map((channelId) => channelLookup.get(channelId) ?? null)
    .filter((channel): channel is RecommendedChannel => channel !== null);

const getSelectedChannelLabel = (
  shortlistedChannels: RecommendedChannel[],
): string => {
  if (shortlistedChannels.length === 0) {
    return "No shortlist yet";
  }

  if (shortlistedChannels.length === 1) {
    return shortlistedChannels[0]?.username ?? "1 shortlisted channel";
  }

  const firstChannel = shortlistedChannels[0];

  return `${firstChannel?.username ?? "Shortlist"} +${
    shortlistedChannels.length - 1
  } more`;
};

const getPreviewLabel = (
  media: string[],
  previewKind: CampaignPreviewKind,
): string => {
  const mediaCount = media.length;

  if (mediaCount === 0) {
    return "Creative pending";
  }

  if (mediaCount === 1) {
    return previewKind === "video" ? "Video creative" : "Creative preview";
  }

  return `${mediaCount} assets`;
};

export const toCampaignSummary = (
  campaign: CampaignRecord,
  channelLookup: Map<string, RecommendedChannel>,
): CampaignSummary => {
  const shortlistedChannels = getShortlistedChannels(campaign, channelLookup);
  const previewKind = inferPreviewKind(campaign.media);

  return {
    id: campaign.id,
    title: getCampaignTitle(campaign),
    description: campaign.text,
    goal: campaign.goal,
    status: campaign.status,
    selectedChannelLabel: getSelectedChannelLabel(shortlistedChannels),
    amountTon: Number(campaign.budget) || 0,
    amountKind: "budget",
    metricLabel: shortlistedChannels.length > 0 ? "Shortlist" : "Views",
    metricValue:
      shortlistedChannels.length > 0
        ? `${shortlistedChannels.length} channel${
            shortlistedChannels.length === 1 ? "" : "s"
          }`
        : "No data yet",
    previewUrl: getPrimaryMediaUrl(campaign.media),
    previewKind,
    previewLabel: getPreviewLabel(campaign.media, previewKind),
    previewTone: normalizePreviewTone(campaign.goal),
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    source: campaign.source,
  };
};

export const toCampaignDetailsView = (
  campaign: CampaignRecord,
  channelLookup: Map<string, RecommendedChannel>,
): CampaignDetailsView => {
  const shortlistedChannels = getShortlistedChannels(campaign, channelLookup);

  return {
    ...campaign,
    title: getCampaignTitle(campaign),
    previewKind: inferPreviewKind(campaign.media),
    previewTone: normalizePreviewTone(campaign.goal),
    primaryMediaUrl: getPrimaryMediaUrl(campaign.media),
    selectedChannelLabel: getSelectedChannelLabel(shortlistedChannels),
    shortlistedChannels,
  };
};

export const sortCampaignRecords = (
  campaigns: CampaignRecord[],
): CampaignRecord[] =>
  [...campaigns].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
