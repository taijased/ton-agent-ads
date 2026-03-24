import type {
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@repo/types";
import type { CampaignsService } from "./campaigns-service";
import type { CampaignRecord } from "../types";
import { mapCampaignStatus, sortCampaignRecords } from "../types";
import type { CampaignDraft } from "../../create-campaign/types";
import type { ProfileSummary } from "../../profile/types";
import { normalizeCampaignDraft } from "../../create-campaign/validators";
import {
  applyCampaignDraftOverlay,
  applyCampaignDraftOverlays,
  saveCampaignDraftOverlay,
} from "./campaign-draft-overlay-storage";

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
    status: mapCampaignStatus(campaign.status),
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
  status: mapCampaignStatus(campaign.status),
  createdAt: campaign.createdAt,
  updatedAt,
  source: "api",
});

export const apiCampaignsService: CampaignsService = {
  async list() {
    const campaigns = await request<Campaign[]>("/api/campaigns");

    return sortCampaignRecords(
      applyCampaignDraftOverlays(campaigns.map(mapCampaignToRecord)),
    );
  },

  async create(draft: CampaignDraft, profile: ProfileSummary) {
    if (!profile.isTelegramVerified) {
      throw new Error(
        "Telegram identity is not connected yet. Stay in mock mode until the Mini App bridge is ready.",
      );
    }

    const normalizedDraft = normalizeCampaignDraft(draft);
    const payload: CreateCampaignInput = {
      userId: profile.telegramId,
      ...toApiCampaignPayload(normalizedDraft),
    };

    const campaign = await request<Campaign>("/api/campaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    saveCampaignDraftOverlay(campaign.id, normalizedDraft, campaign.createdAt);

    return applyCampaignDraftOverlay(
      mergeCampaignWithDraft(campaign, normalizedDraft, campaign.createdAt),
    );
  },

  async update(id: string, draft: CampaignDraft) {
    const normalizedDraft = normalizeCampaignDraft(draft);
    const updatedAt = new Date().toISOString();
    const campaign = await request<Campaign>(`/api/campaigns/${id}`, {
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
      const campaign = await request<Campaign>(`/api/campaigns/${id}`);
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
