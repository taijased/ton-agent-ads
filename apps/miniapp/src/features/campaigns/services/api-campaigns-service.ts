import type { Campaign, CreateCampaignInput } from "@repo/types";
import type { CampaignsService } from "./campaigns-service";
import type { CampaignRecord } from "../types";
import { mapCampaignStatus, sortCampaignRecords } from "../types";
import type { CampaignDraft } from "../../create-campaign/types";
import type { ProfileSummary } from "../../profile/types";
import { normalizeCampaignDraft } from "../../create-campaign/validators";

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
): CampaignRecord => ({
  ...draft,
  id: campaign.id,
  status: mapCampaignStatus(campaign.status),
  createdAt: campaign.createdAt,
  updatedAt: campaign.createdAt,
  source: "api",
});

export const apiCampaignsService: CampaignsService = {
  async list() {
    const campaigns = await request<Campaign[]>("/api/campaigns");

    return sortCampaignRecords(campaigns.map(mapCampaignToRecord));
  },

  async create(draft: CampaignDraft, profile: ProfileSummary) {
    if (!profile.isTelegramVerified) {
      throw new Error(
        "Telegram identity is not connected yet. Stay in mock mode until the Mini App bridge is ready.",
      );
    }

    const normalizedDraft = normalizeCampaignDraft(draft);

    // TODO(phase-2): replace this temporary title bridge when API exposes a first-class campaign title field.
    const payload: CreateCampaignInput = {
      userId: profile.telegramId,
      text: normalizedDraft.text,
      budgetAmount: normalizedDraft.budget,
      budgetCurrency: "TON",
      theme: normalizedDraft.title || null,
      tags: normalizedDraft.tags,
      language: normalizedDraft.language,
      goal: normalizedDraft.goal,
      ctaUrl: normalizedDraft.ctaUrl || null,
      buttonText: normalizedDraft.buttonText || null,
      mediaUrl: normalizedDraft.media[0] ?? null,
      targetAudience: normalizedDraft.targetAudience || null,
    };

    const campaign = await request<Campaign>("/api/campaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return mergeCampaignWithDraft(campaign, normalizedDraft);
  },

  async getById(id: string) {
    try {
      const campaign = await request<Campaign>(`/api/campaigns/${id}`);
      return mapCampaignToRecord(campaign);
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
