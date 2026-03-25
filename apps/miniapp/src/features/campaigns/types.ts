import type {
  AdminContact,
  Campaign,
  CampaignNegotiationStartResult,
  CampaignGoal,
  CampaignThreadListResponse,
  ChannelAdminParseStatus,
  ChannelReadinessStatus,
  CampaignWorkspaceCounts,
  CampaignWorkspaceResponse,
  ConversationDirection,
  ConversationThreadStatus,
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
  negotiationStartedAt: string | null;
  negotiationStatus: Campaign["negotiationStatus"];
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

export interface CampaignWishlistCard {
  id: string;
  channelId: string | null;
  channelName: string;
  channelUsername: string | null;
  channelAvatarUrl: string | null;
  adminParseStatus: ChannelAdminParseStatus;
  readinessStatus: ChannelReadinessStatus;
  adminCount: number;
  lastParsedAt: string | null;
  adminContacts: AdminContact[];
  updatedAt: string;
  source: "mock" | "api";
}

export interface CampaignWorkspaceChatCard {
  id: string;
  adminContactId: string;
  adminHandle: string;
  adminStatus: AdminContact["status"];
  channelId: string | null;
  channelName: string;
  channelUsername: string | null;
  channelAvatarUrl: string | null;
  status: ConversationThreadStatus;
  lastMessagePreview: string | null;
  lastDirection: ConversationDirection | null;
  lastMessageAt: string | null;
  updatedAt: string;
  startedAt: string | null;
  outreachAttemptCount: number;
  dealId: string | null;
  source: "mock" | "api";
}

export interface CampaignWorkspace {
  campaignId: string;
  wishlistCards: CampaignWishlistCard[];
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
  negotiationStatus: Campaign["negotiationStatus"] = "idle",
): CampaignDisplayStatus => {
  let displayStatus: CampaignDisplayStatus;

  switch (status) {
    case "draft":
      displayStatus = "Draft";
      break;
    case "negotiating":
      displayStatus = "In negotiation";
      break;
    case "paused":
      displayStatus = "Awaiting payment";
      break;
    case "done":
      displayStatus = "Published";
      break;
    case "cancelled":
    case "failed":
      displayStatus = "Failed";
      break;
    case "active":
    case "channel_pending":
    case "channel_resolved":
    default:
      displayStatus = "Recommended";
      break;
  }

  if (
    negotiationStatus === "active" &&
    (displayStatus === "Draft" || displayStatus === "Recommended")
  ) {
    return "In negotiation";
  }

  return displayStatus;
};

export const createCampaignWorkspaceCounts = (
  total: number,
  negotiationCount = 0,
): CampaignWorkspaceCounts => ({
  total,
  negotiations: negotiationCount,
  refused: 0,
  waitingPayment: 0,
  waitingPublication: 0,
  completed: 0,
});

export const createEmptyCampaignWorkspace = (
  campaignId: string,
  source: CampaignWorkspace["source"],
): CampaignWorkspace => ({
  campaignId,
  wishlistCards: [],
  chatCards: [],
  counts: createCampaignWorkspaceCounts(0),
  analyticsState: "soon",
  source,
});

export const toCampaignWorkspace = (
  workspaceResponse: CampaignWorkspaceResponse,
  threadResponse: CampaignThreadListResponse,
): CampaignWorkspace => ({
  campaignId: workspaceResponse.campaignId,
  wishlistCards: workspaceResponse.chatCards.map(toCampaignWishlistCard),
  chatCards: threadResponse.threads.map(toCampaignWorkspaceChatCard),
  counts: workspaceResponse.counts,
  analyticsState: workspaceResponse.analyticsState,
  source: "api",
});

export const toCampaignWishlistCard = (
  card: CampaignWorkspaceResponse["chatCards"][number],
): CampaignWishlistCard => ({
  id: card.id,
  channelId: card.channel.id,
  channelName: card.channel.title,
  channelUsername: card.channel.username,
  channelAvatarUrl: card.channel.avatarUrl,
  adminParseStatus: card.adminParseStatus,
  readinessStatus: card.readinessStatus,
  adminCount: card.adminCount,
  lastParsedAt: card.lastParsedAt,
  adminContacts: card.adminContacts,
  updatedAt: card.updatedAt,
  source: "api",
});

export const toCampaignWorkspaceChatCard = (
  thread: CampaignThreadListResponse["threads"][number],
): CampaignWorkspaceChatCard => ({
  id: thread.id,
  adminContactId: thread.admin.id,
  adminHandle: thread.admin.telegramHandle,
  adminStatus: thread.admin.status,
  channelId: thread.channel.id,
  channelName: thread.channel.title,
  channelUsername: thread.channel.username,
  channelAvatarUrl: null,
  status: thread.status,
  lastMessagePreview: thread.lastMessagePreview,
  lastDirection: thread.lastDirection,
  lastMessageAt: thread.lastMessageAt,
  updatedAt: thread.updatedAt,
  startedAt: thread.startedAt,
  outreachAttemptCount: thread.outreachAttemptCount,
  dealId: thread.dealId,
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
