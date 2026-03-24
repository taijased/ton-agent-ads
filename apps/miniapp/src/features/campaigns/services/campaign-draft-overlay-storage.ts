import {
  cloneCampaignDraft,
  type CampaignDraft,
} from "../../create-campaign/types";
import type { CampaignRecord } from "../types";

interface CampaignDraftOverlay {
  draft: CampaignDraft;
  updatedAt: string;
}

type CampaignDraftOverlayMap = Record<string, CampaignDraftOverlay>;

const storageKey = "ton-adagent:miniapp:campaign-draft-overlays:v1";

const canUseStorage = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const cloneOverlay = (overlay: CampaignDraftOverlay): CampaignDraftOverlay => ({
  draft: cloneCampaignDraft(overlay.draft),
  updatedAt: overlay.updatedAt,
});

const readOverlayMap = (): CampaignDraftOverlayMap => {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue) as CampaignDraftOverlayMap | null;

    if (!parsedValue || typeof parsedValue !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter((entry) => {
        const [, overlay] = entry;

        return (
          overlay !== null &&
          typeof overlay === "object" &&
          typeof overlay.updatedAt === "string" &&
          typeof overlay.draft === "object" &&
          overlay.draft !== null
        );
      }),
    );
  } catch {
    return {};
  }
};

const writeOverlayMap = (value: CampaignDraftOverlayMap) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
};

const mergeCampaignRecordWithOverlay = (
  campaign: CampaignRecord,
  overlay: CampaignDraftOverlay,
): CampaignRecord => ({
  ...campaign,
  ...cloneCampaignDraft(overlay.draft),
  updatedAt: overlay.updatedAt,
});

export const applyCampaignDraftOverlay = (
  campaign: CampaignRecord,
): CampaignRecord => {
  const overlay = readOverlayMap()[campaign.id];

  if (!overlay) {
    return {
      ...campaign,
      tags: [...campaign.tags],
      media: [...campaign.media],
      shortlistedChannelIds: [...campaign.shortlistedChannelIds],
    };
  }

  return mergeCampaignRecordWithOverlay(campaign, overlay);
};

export const applyCampaignDraftOverlays = (
  campaigns: CampaignRecord[],
): CampaignRecord[] =>
  campaigns.map((campaign) => applyCampaignDraftOverlay(campaign));

export const saveCampaignDraftOverlay = (
  campaignId: string,
  draft: CampaignDraft,
  updatedAt: string,
) => {
  const nextOverlays = {
    ...readOverlayMap(),
    [campaignId]: cloneOverlay({
      draft,
      updatedAt,
    }),
  };

  writeOverlayMap(nextOverlays);
};
