import type { CampaignGoal } from "@repo/types";

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
