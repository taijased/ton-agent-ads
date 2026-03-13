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
}

export interface EnvConfig {
  BOT_TOKEN: string;
  API_ID: string;
  API_HASH: string;
  TON_RPC: string;
  DATABASE_URL: string;
}
