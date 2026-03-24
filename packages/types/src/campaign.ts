export const campaignStatuses = [
  "draft",
  "channel_pending",
  "channel_resolved",
  "active",
  "negotiating",
  "paused",
  "done",
  "failed",
  "cancelled",
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

export const dealWritableStatuses = [
  "negotiating",
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

export const channelAdminParseStatuses = [
  "pending",
  "parsing",
  "admins_found",
  "admins_not_found",
  "needs_review",
  "failed",
] as const;

export const channelReadinessStatuses = [
  "unknown",
  "ready",
  "not_ready",
] as const;

export const adminContactStatuses = ["found", "verified", "invalid"] as const;

export const adminContactSources = [
  "channel_description",
  "linked_chat",
  "forwarded_messages",
  "manual",
  "unknown",
] as const;

export const campaignNegotiationStatuses = ["idle", "active"] as const;

export const conversationDirections = [
  "outbound",
  "inbound",
  "system",
] as const;

export const conversationMessageTypes = [
  "intro",
  "reply",
  "counter",
  "status",
  "error",
] as const;

export const conversationThreadStatuses = [
  "not_started",
  "message_queued",
  "message_sent",
  "awaiting_reply",
  "replied",
  "in_negotiation",
  "no_response",
  "failed",
  "closed",
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

export const dealMessageAudiences = ["creator", "admin", "internal"] as const;

export const dealMessageTransports = [
  "telegram_bot",
  "telegram_mtproto",
  "internal",
] as const;

export const messageDeliveryStatuses = ["pending", "sent", "failed"] as const;

export const approvalRequestStatuses = [
  "pending",
  "approved",
  "rejected",
  "expired",
] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];

export const allowedCampaignTransitions: Record<
  CampaignStatus,
  readonly CampaignStatus[]
> = {
  draft: ["channel_pending", "cancelled", "failed"],
  channel_pending: ["channel_resolved", "failed"],
  channel_resolved: ["active", "cancelled", "failed"],
  active: ["negotiating", "paused", "done", "cancelled", "failed"],
  negotiating: ["active", "paused", "done", "cancelled", "failed"],
  paused: ["active", "cancelled", "failed"],
  done: [],
  failed: [],
  cancelled: [],
};

export type DealStatus = (typeof dealStatuses)[number];

export type DealWritableStatus = (typeof dealWritableStatuses)[number];

export type CampaignLanguage = (typeof campaignLanguages)[number];

export type CampaignGoal = (typeof campaignGoals)[number];

export type ChannelContactType = (typeof channelContactTypes)[number];

export type ChannelContactSource = (typeof channelContactSources)[number];

export type ChannelAdminParseStatus =
  (typeof channelAdminParseStatuses)[number];

export type ChannelReadinessStatus = (typeof channelReadinessStatuses)[number];

export type AdminContactStatus = (typeof adminContactStatuses)[number];

export type AdminContactSource = (typeof adminContactSources)[number];

export type CampaignNegotiationStatus =
  (typeof campaignNegotiationStatuses)[number];

export type ConversationDirection = (typeof conversationDirections)[number];

export type ConversationMessageType =
  (typeof conversationMessageTypes)[number];

export type ConversationThreadStatus =
  (typeof conversationThreadStatuses)[number];

export type DealMessageDirection = (typeof dealMessageDirections)[number];

export type DealMessageSenderType = (typeof dealMessageSenderTypes)[number];

export type DealMessageAudience = (typeof dealMessageAudiences)[number];

export type DealMessageTransport = (typeof dealMessageTransports)[number];

export type MessageDeliveryStatus = (typeof messageDeliveryStatuses)[number];

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
  negotiationStartedAt: string | null;
  negotiationStatus: CampaignNegotiationStatus;
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

export interface UpdateCampaignInput {
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
  adminParseStatus: ChannelAdminParseStatus;
  readinessStatus: ChannelReadinessStatus;
  adminCount: number;
  lastParsedAt: string | null;
  adminContacts: AdminContact[];
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

export interface AdminContact {
  id: string;
  channelId: string;
  telegramHandle: string;
  telegramUserId: string | null;
  source: AdminContactSource;
  confidenceScore: number;
  status: AdminContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationThread {
  id: string;
  campaignId: string;
  channelId: string;
  adminContactId: string;
  status: ConversationThreadStatus;
  startedAt: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastDirection: ConversationDirection | null;
  outreachAttemptCount: number;
  telegramChatId: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationThreadInput {
  campaignId: string;
  channelId: string;
  adminContactId: string;
  status?: ConversationThreadStatus;
  startedAt?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastDirection?: ConversationDirection | null;
  outreachAttemptCount?: number;
  telegramChatId?: string | null;
  closedAt?: string | null;
}

export interface UpdateConversationThreadInput {
  status?: ConversationThreadStatus;
  startedAt?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastDirection?: ConversationDirection | null;
  outreachAttemptCount?: number;
  telegramChatId?: string | null;
  closedAt?: string | null;
}

export interface ConversationMessage {
  id: string;
  threadId: string;
  direction: ConversationDirection;
  messageType: ConversationMessageType;
  text: string;
  telegramMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationMessageInput {
  threadId: string;
  direction: ConversationDirection;
  messageType: ConversationMessageType;
  text: string;
  telegramMessageId?: string | null;
}

export interface UpdateConversationMessageInput {
  telegramMessageId?: string | null;
  text?: string;
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
  lastCreatorNotificationAt: string | null;
  lastCreatorNotificationKey: string | null;
  lastCreatorNotificationError: string | null;
  createdAt: string;
}

export interface DealMessage {
  id: string;
  dealId: string;
  direction: DealMessageDirection;
  senderType: DealMessageSenderType;
  audience: DealMessageAudience;
  transport: DealMessageTransport;
  contactValue: string | null;
  text: string;
  externalMessageId: string | null;
  deliveryStatus: MessageDeliveryStatus | null;
  notificationKey: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface CreateDealMessageInput {
  dealId: string;
  direction: DealMessageDirection;
  senderType: DealMessageSenderType;
  audience?: DealMessageAudience;
  transport?: DealMessageTransport;
  contactValue?: string | null;
  text: string;
  externalMessageId?: string | null;
  deliveryStatus?: MessageDeliveryStatus | null;
  notificationKey?: string | null;
  failureReason?: string | null;
}

export interface UpdateDealMessageDeliveryInput {
  deliveryStatus: MessageDeliveryStatus;
  externalMessageId?: string | null;
  failureReason?: string | null;
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

export interface UpdateCreatorNotificationStateInput {
  lastCreatorNotificationAt?: string | null;
  lastCreatorNotificationKey?: string | null;
  lastCreatorNotificationError?: string | null;
}

export const creatorNotificationEventTypes = [
  "campaign_created",
  "recommendation_ready",
  "outreach_started",
  "approval_required",
  "negotiation_update",
  "negotiation_result",
  "payment_requested",
  "payment_confirmed",
  "publication_requested",
  "publication_confirmed",
] as const;

export type CreatorNotificationEventType =
  (typeof creatorNotificationEventTypes)[number];

export type CreatorNotificationAction =
  | "none"
  | "approve_deal"
  | "reject_deal"
  | "update_status"
  | "approve_approval"
  | "reject_approval"
  | "counter_approval";

export interface CreatorNotificationPayload {
  dealId: string;
  campaignId: string;
  chatId: string;
  eventType: CreatorNotificationEventType;
  text: string;
  action: CreatorNotificationAction;
  actionTargetId: string | null;
  notificationKey: string;
  status: DealStatus;
}

export interface ApprovalActionResult {
  deal: Deal;
  approvalRequest: DealApprovalRequest;
}

export interface CampaignWorkspaceChannelSummary {
  id: string | null;
  title: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface CampaignWorkspaceLatestMessage {
  text: string;
  senderType: DealMessageSenderType;
  createdAt: string;
}

export interface CampaignWorkspacePendingApproval {
  id: string;
  status: ApprovalRequestStatus;
  summary: string;
  proposedPriceTon: number | null;
  proposedDateText: string | null;
}

export interface CampaignWorkspaceChatCard {
  id: string;
  dealId: string | null;
  channel: CampaignWorkspaceChannelSummary;
  status: DealStatus;
  priceTon: number | null;
  latestMessage: CampaignWorkspaceLatestMessage | null;
  pendingApproval: CampaignWorkspacePendingApproval | null;
  adminParseStatus: ChannelAdminParseStatus;
  readinessStatus: ChannelReadinessStatus;
  adminCount: number;
  lastParsedAt: string | null;
  adminContacts: AdminContact[];
  updatedAt: string;
}

export interface CampaignWorkspaceCounts {
  total: number;
  negotiations: number;
  refused: number;
  waitingPayment: number;
  waitingPublication: number;
  completed: number;
}

export interface CampaignWorkspaceResponse {
  campaignId: string;
  chatCards: CampaignWorkspaceChatCard[];
  counts: CampaignWorkspaceCounts;
  analyticsState: "soon";
}

export interface CampaignWorkspaceBootstrapChannelInput {
  username: string;
  title?: string | null;
  source: "wizard_shortlist";
}

export interface CampaignWorkspaceBootstrapRequest {
  channels: CampaignWorkspaceBootstrapChannelInput[];
}

export type CampaignWorkspaceBootstrapOutcome =
  | "created"
  | "already_exists"
  | "unresolved"
  | "failed";

export interface CampaignWorkspaceBootstrapItemResult {
  username: string;
  outcome: CampaignWorkspaceBootstrapOutcome;
  dealId: string | null;
  channelId: string | null;
  message?: string;
}

export interface CampaignWorkspaceBootstrapResult {
  campaignId: string;
  items: CampaignWorkspaceBootstrapItemResult[];
}

export interface ConversationThreadChannelSummary {
  id: string;
  title: string;
  username: string | null;
}

export interface ConversationThreadAdminSummary {
  id: string;
  telegramHandle: string;
  status: AdminContactStatus;
}

export interface ConversationThreadSummary {
  id: string;
  campaignId: string;
  channel: ConversationThreadChannelSummary;
  admin: ConversationThreadAdminSummary;
  status: ConversationThreadStatus;
  lastMessagePreview: string | null;
  lastDirection: ConversationDirection | null;
  lastMessageAt: string | null;
  updatedAt: string;
  startedAt: string | null;
  outreachAttemptCount: number;
  closedAt: string | null;
}

export interface CampaignThreadListResponse {
  campaignId: string;
  threads: ConversationThreadSummary[];
}

export interface ConversationThreadDetailsResponse {
  thread: ConversationThreadSummary;
  messages: ConversationMessage[];
}

export interface CampaignNegotiationStartResult {
  campaignId: string;
  negotiationStatus: CampaignNegotiationStatus;
  negotiationStartedAt: string | null;
  readyChannelCount: number;
  createdThreadCount: number;
  existingThreadCount: number;
  failedThreadCount: number;
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

export interface SetChannelAdminParsingStateInput {
  channelId: string;
  adminParseStatus: ChannelAdminParseStatus;
  readinessStatus: ChannelReadinessStatus;
}

export interface SaveChannelAdminParsingResultInput {
  channelId: string;
  adminParseStatus: ChannelAdminParseStatus;
  readinessStatus: ChannelReadinessStatus;
  adminCount: number;
  lastParsedAt: string;
  adminContacts: Array<{
    telegramHandle: string;
    telegramUserId?: string | null;
    source: AdminContactSource;
    confidenceScore: number;
    status: AdminContactStatus;
  }>;
}

export interface UpdateCampaignNegotiationStateInput {
  negotiationStatus: CampaignNegotiationStatus;
  negotiationStartedAt?: string | null;
}

export const calculateChannelReadiness = (
  parseStatus: ChannelAdminParseStatus,
): ChannelReadinessStatus => {
  switch (parseStatus) {
    case "admins_found":
      return "ready";
    case "admins_not_found":
    case "needs_review":
    case "failed":
      return "not_ready";
    case "pending":
    case "parsing":
    default:
      return "unknown";
  }
};

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
    mentionedNonTonCurrency?: boolean;
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

// --- Post Generation types ---

export interface GeneratePostInput {
  description: string;
  language: CampaignLanguage;
  goal: CampaignGoal;
  channelDescription?: string;
  targetAudience?: string;
}

export interface GeneratePostResult {
  postText: string;
  hashtags: string[];
}

export type PostGenerationOutcome =
  | { ok: true; data: GeneratePostResult }
  | { ok: false; error: string };

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
