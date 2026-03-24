import type { Campaign, UpdateCampaignInput } from "@repo/types";
import type { CampaignsService } from "./campaigns-service";
import type { CampaignRecord } from "../types";
import { mapCampaignStatus, sortCampaignRecords } from "../types";
import type { CampaignDraft } from "../../create-campaign/types";
import type { ProfileSummary } from "../../profile/types";
import { normalizeCampaignDraft } from "../../create-campaign/validators";
import { apiRequest } from "../../../lib/api";
import {
  applyCampaignDraftOverlay,
  applyCampaignDraftOverlays,
  saveCampaignDraftOverlay,
} from "./campaign-draft-overlay-storage";

const getCampaignTitle = (campaign: Campaign): string => {
  if (campaign.theme && campaign.theme.trim().length > 0) {
    return campaign.theme.trim();
  }

  const firstLine = campaign.text
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 0);

  return firstLine ?? "Untitled campaign";
};

const toApiCampaignPayload = (draft: CampaignDraft): UpdateCampaignInput => ({
  text: draft.text,
  budgetAmount: draft.budget,
  budgetCurrency: "TON",
  theme: draft.title || null,
  tags: draft.tags,
  language: draft.language,
  goal: draft.goal,
  ctaUrl: draft.ctaUrl || null,
  buttonText: draft.buttonText || null,
  mediaUrl: draft.media[0] ?? null,
  targetAudience: draft.targetAudience || null,
});

const mapCampaignToRecord = (campaign: Campaign): CampaignRecord => {
  return {
    id: campaign.id,
    title: getCampaignTitle(campaign),
    text: campaign.text,
    theme: campaign.theme?.trim() ?? "",
    tags: [...campaign.tags],
    language: campaign.language,
    goal: campaign.goal,
    targetAudience: campaign.targetAudience ?? "",
    media: campaign.mediaUrl ? [campaign.mediaUrl] : [],
    budget: campaign.budgetAmount,
    ctaUrl: campaign.ctaUrl ?? "",
    buttonText: campaign.buttonText ?? "",
    shortlistedChannelIds: [],
    status: mapCampaignStatus(campaign.status, campaign.negotiationStatus),
    negotiationStartedAt: campaign.negotiationStartedAt,
    negotiationStatus: campaign.negotiationStatus,
    createdAt: campaign.createdAt,
    updatedAt: campaign.createdAt,
    source: "api",
  };
};

const mergeCampaignWithDraft = (
  campaign: Campaign,
  draft: CampaignDraft,
  updatedAt: string,
): CampaignRecord => ({
  ...draft,
  id: campaign.id,
  status: mapCampaignStatus(campaign.status, campaign.negotiationStatus),
  negotiationStartedAt: campaign.negotiationStartedAt,
  negotiationStatus: campaign.negotiationStatus,
  createdAt: campaign.createdAt,
  updatedAt,
  source: "api",
});

export const apiCampaignsService: CampaignsService = {
  async list() {
    const campaigns = await apiRequest<Campaign[]>("/api/campaigns");

    return sortCampaignRecords(
      applyCampaignDraftOverlays(campaigns.map(mapCampaignToRecord)),
    );
  },

  async create(draft: CampaignDraft, _profile: ProfileSummary) {
    const normalizedDraft = normalizeCampaignDraft(draft);
    const campaign = await apiRequest<Campaign>("/api/campaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(toApiCampaignPayload(normalizedDraft)),
    });

    saveCampaignDraftOverlay(campaign.id, normalizedDraft, campaign.createdAt);

    return applyCampaignDraftOverlay(
      mergeCampaignWithDraft(campaign, normalizedDraft, campaign.createdAt),
    );
  },

  async update(id: string, draft: CampaignDraft) {
    const normalizedDraft = normalizeCampaignDraft(draft);
    const updatedAt = new Date().toISOString();
    const campaign = await apiRequest<Campaign>(`/api/campaigns/${id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(toApiCampaignPayload(normalizedDraft)),
    });

    saveCampaignDraftOverlay(id, normalizedDraft, updatedAt);

    return applyCampaignDraftOverlay(
      mergeCampaignWithDraft(campaign, normalizedDraft, updatedAt),
    );
  },

  async getById(id: string) {
    try {
      const campaign = await apiRequest<Campaign>(`/api/campaigns/${id}`);
      return applyCampaignDraftOverlay(mapCampaignToRecord(campaign));
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("not found")
      ) {
        return null;
      }

      throw error;
    }
  },
};
