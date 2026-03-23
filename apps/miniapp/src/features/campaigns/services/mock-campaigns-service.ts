import type { CampaignsService } from "./campaigns-service";
import { buildMockCampaigns } from "../mocks/campaigns";
import type { CampaignRecord } from "../types";
import type { CampaignDraft } from "../../create-campaign/types";
import type { ProfileSummary } from "../../profile/types";
import { normalizeCampaignDraft } from "../../create-campaign/validators";

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

const cloneCampaign = (campaign: CampaignRecord): CampaignRecord => ({
  ...campaign,
  tags: [...campaign.tags],
  media: [...campaign.media],
  shortlistedChannelIds: [...campaign.shortlistedChannelIds],
});

const sortCampaigns = (campaigns: CampaignRecord[]): CampaignRecord[] =>
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

export const mockCampaignsService: CampaignsService = {
  async list() {
    await delay(280);

    if (shouldThrowMockError()) {
      throw new Error("Mock service is simulating a failed campaign load.");
    }

    return sortCampaigns(mockCampaignsStore).map(cloneCampaign);
  },

  async create(draft: CampaignDraft, _profile: ProfileSummary) {
    await delay(420);

    const now = new Date().toISOString();
    const normalizedDraft = normalizeCampaignDraft(draft);
    const createdCampaign: CampaignRecord = {
      id: createMockCampaignId(),
      ...normalizedDraft,
      status: "Draft",
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
