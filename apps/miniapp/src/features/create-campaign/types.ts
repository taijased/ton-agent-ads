import type { CampaignGoal, CampaignLanguage } from "@repo/types";

export type CampaignFormGoal = Extract<
  CampaignGoal,
  "AWARENESS" | "TRAFFIC" | "SUBSCRIBERS"
>;

export type WizardStepId =
  | "basic"
  | "targeting"
  | "creative"
  | "budget"
  | "channels"
  | "finish";

export interface CampaignDraft {
  title: string;
  text: string;
  theme: string;
  tags: string[];
  language: CampaignLanguage | null;
  goal: CampaignGoal | null;
  targetAudience: string;
  media: string[];
  budget: string;
  ctaUrl: string;
  buttonText: string;
  shortlistedChannelIds: string[];
}

export interface CampaignDraftErrors {
  title?: string;
  text?: string;
  theme?: string;
  tags?: string;
  language?: string;
  goal?: string;
  targetAudience?: string;
  media?: string;
  budget?: string;
  ctaUrl?: string;
  buttonText?: string;
  shortlistedChannelIds?: string;
}

export interface CampaignDraftState {
  draft: CampaignDraft;
  step: WizardStepId;
  submitError: string | null;
  submitStatus: "idle" | "submitting";
}

export interface RecommendedChannel {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  description: string;
  tags: string[];
  avgViews: number | null;
  expectedPrice: number | null;
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

export const campaignWizardSteps: Array<{
  id: WizardStepId;
  label: string;
  shortLabel: string;
}> = [
  {
    id: "basic",
    label: "Basic",
    shortLabel: "Basic",
  },
  {
    id: "targeting",
    label: "Targeting",
    shortLabel: "Target",
  },
  {
    id: "creative",
    label: "Creative",
    shortLabel: "Creative",
  },
  {
    id: "budget",
    label: "Budget",
    shortLabel: "Budget",
  },
  {
    id: "channels",
    label: "Channels",
    shortLabel: "Channels",
  },
  {
    id: "finish",
    label: "Finish",
    shortLabel: "Finish",
  },
];

export const themeOptions: Array<{
  description: string;
  value: string;
}> = [
  {
    description: "Position the launch, offer, or announcement clearly.",
    value: "Product launch",
  },
  {
    description: "Build broad awareness with a simple branded message.",
    value: "Brand awareness",
  },
  {
    description: "Grow a Telegram audience with a community-first angle.",
    value: "Community growth",
  },
  {
    description: "Promote a feature, demo, or waitlist with a direct CTA.",
    value: "Conversion push",
  },
];

export const campaignTagSuggestions = [
  "TON",
  "Web3",
  "Crypto",
  "AI",
  "Founders",
  "Investors",
  "Growth",
  "Startups",
  "Mini App",
  "Trading",
  "DeFi",
  "Community",
] as const;

export const campaignLanguageOptions: Array<{
  label: string;
  value: CampaignLanguage | null;
}> = [
  {
    label: "English",
    value: "EN",
  },
  {
    label: "Russian",
    value: "RU",
  },
  {
    label: "Other",
    value: "OTHER",
  },
  {
    label: "No preference",
    value: null,
  },
];

export const createEmptyCampaignDraft = (): CampaignDraft => ({
  title: "",
  text: "",
  theme: "",
  tags: [],
  language: "EN",
  goal: null,
  targetAudience: "",
  media: [],
  budget: "",
  ctaUrl: "",
  buttonText: "",
  shortlistedChannelIds: [],
});

export const createEmptyCampaignDraftState = (): CampaignDraftState => ({
  draft: createEmptyCampaignDraft(),
  step: "basic",
  submitError: null,
  submitStatus: "idle",
});
