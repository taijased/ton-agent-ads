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

export type CampaignStatus = (typeof campaignStatuses)[number];

export type DealStatus = (typeof dealStatuses)[number];

export interface Campaign {
  id: string;
  userId: string;
  text: string;
  budget: number;
  spent: number;
  status: CampaignStatus;
  createdAt: string;
}

export interface CreateCampaignInput {
  userId: string;
  text: string;
  budget: number;
}

export interface EnvConfig {
  BOT_TOKEN: string;
  API_ID: string;
  API_HASH: string;
  TON_RPC: string;
  DATABASE_URL: string;
}
