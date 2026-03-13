export const campaignStatuses = [
  "draft",
  "active",
  "negotiating",
  "paused",
  "done",
  "failed"
] as const;

export const dealStatuses = [
  "pending",
  "negotiating",
  "waiting_user",
  "approved",
  "rejected",
  "paid",
  "published",
  "failed"
] as const;

export const campaignLanguages = ["RU", "EN", "OTHER"] as const;

export const campaignGoals = [
  "AWARENESS",
  "TRAFFIC",
  "SUBSCRIBERS",
  "SALES"
] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];

export type DealStatus = (typeof dealStatuses)[number];

export type CampaignLanguage = (typeof campaignLanguages)[number];

export type CampaignGoal = (typeof campaignGoals)[number];

export interface Campaign {
  id: string;
  userId: string;
  text: string;
  budgetAmount: string;
  budgetCurrency: "TON";
  theme: string | null;
  tags: string[];
  language: CampaignLanguage | null;
  goal: CampaignGoal | null;
  ctaUrl: string | null;
  buttonText: string | null;
  mediaUrl: string | null;
  targetAudience: string | null;
  spent: number;
  status: CampaignStatus;
  createdAt: string;
}

export interface CreateCampaignInput {
  userId: string;
  text: string;
  budgetAmount: string;
  budgetCurrency: "TON";
  theme?: string | null;
  tags?: string[];
  language?: CampaignLanguage | null;
  goal?: CampaignGoal | null;
  ctaUrl?: string | null;
  buttonText?: string | null;
  mediaUrl?: string | null;
  targetAudience?: string | null;
}

export interface Channel {
  id: string;
  username: string;
  title: string;
  category: string;
  price: number;
  avgViews: number;
}

export interface Deal {
  id: string;
  campaignId: string;
  channelId: string;
  price: number;
  status: DealStatus;
  createdAt: string;
}

export interface CreateDealInput {
  campaignId: string;
  channelId: string;
  price: number;
  status?: DealStatus;
}

export interface AgentChannelEvaluation {
  channelId: string;
  username: string;
  price: number;
  eligible: boolean;
  reason: string;
}

export interface AgentRunInput {
  campaignId: string;
}

export interface AgentRunResult {
  success: boolean;
  campaignId: string;
  deal?: Deal;
  error?: string;
  reason?: string;
  selectedChannel?: Channel;
  evaluation?: AgentChannelEvaluation[];
}

export interface EnvConfig {
  BOT_TOKEN: string;
  API_ID: string;
  API_HASH: string;
  TON_RPC: string;
  DATABASE_URL: string;
}
