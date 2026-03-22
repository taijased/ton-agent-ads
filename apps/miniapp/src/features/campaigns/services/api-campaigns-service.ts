import type { Campaign, CreateCampaignInput } from "@repo/types";
import type { CampaignsService } from "./campaigns-service";
import type { CampaignSummary } from "../types";
import type { CampaignFormDraft } from "../../create-campaign/types";
import type { ProfileSummary } from "../../profile/types";

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

const inferPreviewKind = (
  mediaUrl: string | null,
): CampaignSummary["previewKind"] => {
  if (mediaUrl === null) {
    return "image";
  }

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
  goal: Campaign["goal"],
): CampaignSummary["previewTone"] => {
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

const mapCampaignStatus = (
  status: Campaign["status"],
): CampaignSummary["status"] => {
  switch (status) {
    case "draft":
      return "Draft";
    case "negotiating":
      return "In negotiation";
    case "paused":
      return "Awaiting payment";
    case "done":
      return "Published";
    case "failed":
      return "Failed";
    case "active":
    default:
      return "Recommended";
  }
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

const mapCampaignToSummary = (campaign: Campaign): CampaignSummary => {
  const previewKind = inferPreviewKind(campaign.mediaUrl);

  return {
    id: campaign.id,
    title: getCampaignTitle(campaign),
    description: campaign.text,
    goal: campaign.goal,
    status: mapCampaignStatus(campaign.status),
    selectedChannelLabel: "Not assigned yet",
    amountTon: Number(campaign.budgetAmount),
    amountKind: "budget",
    metricLabel: "Views",
    metricValue: "No data yet",
    previewUrl: campaign.mediaUrl,
    previewKind,
    previewLabel:
      previewKind === "video" ? "Video creative" : "Creative preview",
    previewTone: normalizePreviewTone(campaign.goal),
    createdAt: campaign.createdAt,
    updatedAt: campaign.createdAt,
    source: "api",
  };
};

export const apiCampaignsService: CampaignsService = {
  async list() {
    const campaigns = await request<Campaign[]>("/api/campaigns");

    return campaigns
      .map(mapCampaignToSummary)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  },

  async create(draft: CampaignFormDraft, profile: ProfileSummary) {
    if (!profile.isTelegramVerified) {
      throw new Error(
        "Telegram identity is not connected yet. Stay in mock mode until the Mini App bridge is ready.",
      );
    }

    // TODO(phase-2): replace this temporary theme bridge when API exposes a first-class campaign title field.
    const payload: CreateCampaignInput = {
      userId: profile.telegramId,
      text: draft.description.trim(),
      budgetAmount: draft.budget.trim(),
      budgetCurrency: "TON",
      theme: draft.title.trim(),
      goal: draft.goal || null,
      ctaUrl: draft.ctaUrl.trim() || null,
      buttonText: draft.buttonText.trim() || null,
      mediaUrl: draft.mediaUrl.trim() || null,
    };

    const campaign = await request<Campaign>("/api/campaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return mapCampaignToSummary(campaign);
  },

  async getById(id: string) {
    try {
      const campaign = await request<Campaign>(`/api/campaigns/${id}`);
      return mapCampaignToSummary(campaign);
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
