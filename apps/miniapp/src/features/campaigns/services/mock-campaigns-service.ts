import type { CampaignsService } from "./campaigns-service";
import { buildMockCampaigns } from "../mocks/campaigns";
import type { CampaignSummary } from "../types";
import type { CampaignFormDraft } from "../../create-campaign/types";
import type { ProfileSummary } from "../../profile/types";

let mockCampaignsStore = buildMockCampaigns();

const delay = async (value: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, value);
  });

const shouldThrowMockError = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    new URLSearchParams(window.location.search).get("campaigns") === "error"
  );
};

const cloneCampaign = (campaign: CampaignSummary): CampaignSummary => ({
  ...campaign,
});

const sortCampaigns = (campaigns: CampaignSummary[]): CampaignSummary[] =>
  [...campaigns].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );

const createMockCampaignId = (): string => {
  const randomId = globalThis.crypto?.randomUUID();

  if (randomId) {
    return randomId;
  }

  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const inferPreviewKind = (mediaUrl: string): CampaignSummary["previewKind"] => {
  const normalizedValue = mediaUrl.toLowerCase();

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
  goal: CampaignFormDraft["goal"],
): CampaignSummary["previewTone"] => {
  switch (goal) {
    case "TRAFFIC":
      return "ocean";
    case "SUBSCRIBERS":
      return "mint";
    case "AWARENESS":
    default:
      return "sunset";
  }
};

export const mockCampaignsService: CampaignsService = {
  async list() {
    await delay(280);

    if (shouldThrowMockError()) {
      throw new Error("Mock service is simulating a failed campaign load.");
    }

    return sortCampaigns(mockCampaignsStore).map(cloneCampaign);
  },

  async create(draft: CampaignFormDraft, _profile: ProfileSummary) {
    await delay(420);

    const now = new Date().toISOString();
    const createdCampaign: CampaignSummary = {
      id: createMockCampaignId(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      goal: draft.goal || null,
      status: "Draft",
      selectedChannelLabel: "Not assigned yet",
      amountTon: Number(draft.budget),
      amountKind: "budget",
      metricLabel: "Views",
      metricValue: "No data yet",
      previewUrl: draft.mediaUrl.trim() || null,
      previewKind: inferPreviewKind(draft.mediaUrl.trim()),
      previewLabel: draft.mediaUrl.trim() ? "Uploaded media" : "Media pending",
      previewTone: normalizePreviewTone(draft.goal),
      createdAt: now,
      updatedAt: now,
      source: "mock",
    };

    mockCampaignsStore = [createdCampaign, ...mockCampaignsStore];

    return cloneCampaign(createdCampaign);
  },

  async getById(id: string) {
    await delay(160);

    const campaign = mockCampaignsStore.find(
      (candidate) => candidate.id === id,
    );

    return campaign ? cloneCampaign(campaign) : null;
  },
};
