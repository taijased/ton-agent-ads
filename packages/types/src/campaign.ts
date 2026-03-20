export const campaignStatuses = [
  "draft",
  "active",
  "negotiating",
  "paused",
  "done",
  "failed",
] as const;

export const dealStatuses = [
  "pending",
  "negotiating",
  "waiting_user",
  "awaiting_user_approval",
  "approved",
  "rejected",
  "admin_outreach_pending",
  "admin_contacted",
  "terms_agreed",
  "payment_pending",
  "paid",
  "proof_pending",
  "completed",
  "published",
  "failed",
] as const;

export const campaignLanguages = ["RU", "EN", "OTHER"] as const;

export const campaignGoals = [
  "AWARENESS",
  "TRAFFIC",
  "SUBSCRIBERS",
  "SALES",
] as const;

export const channelContactTypes = ["username", "link"] as const;

export const channelContactSources = [
  "extracted_username",
  "extracted_link",
  "manual",
] as const;

export const dealMessageDirections = [
  "inbound",
  "outbound",
  "internal",
] as const;

export const dealMessageSenderTypes = [
  "admin",
  "agent",
  "user",
  "system",
] as const;

export const approvalRequestStatuses = [
  "pending",
  "approved",
  "rejected",
  "expired",
] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];

export type DealStatus = (typeof dealStatuses)[number];

export type CampaignLanguage = (typeof campaignLanguages)[number];

export type CampaignGoal = (typeof campaignGoals)[number];

export type ChannelContactType = (typeof channelContactTypes)[number];

export type ChannelContactSource = (typeof channelContactSources)[number];

export type DealMessageDirection = (typeof dealMessageDirections)[number];

export type DealMessageSenderType = (typeof dealMessageSenderTypes)[number];

export type ApprovalRequestStatus = (typeof approvalRequestStatuses)[number];

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
  description: string | null;
  title: string;
  category: string;
  price: number;
  avgViews: number;
  contacts: ChannelContact[];
}

export interface ChannelContact {
  id: string;
  channelId: string;
  type: ChannelContactType;
  value: string;
  source: ChannelContactSource;
  isAdsContact: boolean;
  createdAt: string;
}

export interface Deal {
  id: string;
  campaignId: string;
  channelId: string;
  price: number;
  status: DealStatus;
  adminContactedAt: string | null;
  adminOutboundMessageId: string | null;
  outreachError: string | null;
  termsAgreedAt: string | null;
  paidAt: string | null;
  proofText: string | null;
  proofUrl: string | null;
  completedAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

export interface DealMessage {
  id: string;
  dealId: string;
  direction: DealMessageDirection;
  senderType: DealMessageSenderType;
  contactValue: string | null;
  text: string;
  externalMessageId: string | null;
  createdAt: string;
}

export interface CreateDealMessageInput {
  dealId: string;
  direction: DealMessageDirection;
  senderType: DealMessageSenderType;
  contactValue?: string | null;
  text: string;
  externalMessageId?: string | null;
}

export interface DealApprovalRequest {
  id: string;
  dealId: string;
  proposedPriceTon: number | null;
  proposedFormat: string | null;
  proposedDateText: string | null;
  proposedWallet: string | null;
  summary: string;
  status: ApprovalRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CreateDealApprovalRequestInput {
  dealId: string;
  proposedPriceTon?: number | null;
  proposedFormat?: string | null;
  proposedDateText?: string | null;
  proposedWallet?: string | null;
  summary: string;
  status?: ApprovalRequestStatus;
}

export interface DealExternalThread {
  id: string;
  dealId: string;
  platform: string;
  chatId: string;
  contactValue: string | null;
  createdAt: string;
}

export interface CreateDealExternalThreadInput {
  dealId: string;
  platform: string;
  chatId: string;
  contactValue?: string | null;
}

export interface CreateDealInput {
  campaignId: string;
  channelId: string;
  price: number;
  status?: DealStatus;
}

export interface UpdateDealStatusInput {
  status: DealStatus;
  proofText?: string | null;
  proofUrl?: string | null;
  adminOutboundMessageId?: string | null;
  outreachError?: string | null;
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

export interface ParsedChannelData {
  description: string;
  usernames: string[];
  links: string[];
  adsContact: boolean;
}

export interface SaveParsedChannelInput {
  id: string;
  username: string;
  title: string;
  description: string | null;
  category?: string;
  price?: number;
  avgViews?: number;
  contacts: Array<{
    type: ChannelContactType;
    value: string;
    source: ChannelContactSource;
    isAdsContact: boolean;
  }>;
}

export interface SubmitTargetChannelInput {
  campaignId: string;
  reference: string;
}

export interface SubmitTargetChannelResult {
  campaignId: string;
  deal: Deal;
  channel: Channel;
  parsed: ParsedChannelData;
  selectedContact: string | null;
}

export interface NegotiationDecision {
  action:
    | "reply"
    | "request_user_approval"
    | "decline"
    | "handoff_to_human"
    | "wait";
  replyText?: string;
  extracted: {
    offeredPriceTon?: number;
    format?: string;
    dateText?: string;
    wallet?: string;
  };
  summary?: string;
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
  API_BASE_URL: string;
  HOST: string;
  PORT: string;
  NODE_ENV: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  DATABASE_URL: string;
  TG_API_ID: string;
  TG_API_HASH: string;
  TG_SESSION_STRING: string;
  OPEN_AI_TOKEN: string;
  OPEN_AI_MODEL: string;
}
