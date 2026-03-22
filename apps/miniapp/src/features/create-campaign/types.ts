import type { CampaignGoal } from "@repo/types";

export type CampaignFormGoal = Extract<
  CampaignGoal,
  "AWARENESS" | "TRAFFIC" | "SUBSCRIBERS"
>;

export interface CampaignFormDraft {
  title: string;
  description: string;
  goal: CampaignFormGoal | "";
  budget: string;
  ctaUrl: string;
  buttonText: string;
  mediaUrl: string;
}

export interface CampaignFormErrors {
  title?: string;
  description?: string;
  goal?: string;
  budget?: string;
  ctaUrl?: string;
}

export const campaignGoalOptions: Array<{
  label: string;
  value: CampaignFormGoal;
}> = [
  {
    label: "Awareness",
    value: "AWARENESS",
  },
  {
    label: "Traffic",
    value: "TRAFFIC",
  },
  {
    label: "Subscribers",
    value: "SUBSCRIBERS",
  },
];

export const emptyCampaignFormDraft: CampaignFormDraft = {
  title: "",
  description: "",
  goal: "",
  budget: "",
  ctaUrl: "",
  buttonText: "",
  mediaUrl: "",
};
