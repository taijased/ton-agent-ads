import type { FastifyInstance } from "fastify";
import {
  dealMessageAudiences,
  dealMessageDirections,
  dealMessageSenderTypes,
  dealMessageTransports,
  dealWritableStatuses,
  messageDeliveryStatuses,
} from "@repo/types";

const campaignSchema = {
  $id: "Campaign",
  type: "object",
  properties: {
    id: { type: "string" },
    userId: { type: "string" },
    text: { type: "string" },
    budgetAmount: { type: "string" },
    budgetCurrency: { type: "string", enum: ["TON"] },
    theme: { type: ["string", "null"] },
    tags: {
      type: "array",
      items: { type: "string" },
    },
    language: { type: ["string", "null"], enum: ["RU", "EN", "OTHER", null] },
    goal: {
      type: ["string", "null"],
      enum: ["AWARENESS", "TRAFFIC", "SUBSCRIBERS", "SALES", null],
    },
    ctaUrl: { type: ["string", "null"] },
    buttonText: { type: ["string", "null"] },
    mediaUrl: { type: ["string", "null"] },
    targetAudience: { type: ["string", "null"] },
    spent: { type: "number" },
    status: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "userId",
    "text",
    "budgetAmount",
    "budgetCurrency",
    "theme",
    "tags",
    "language",
    "goal",
    "ctaUrl",
    "buttonText",
    "mediaUrl",
    "targetAudience",
    "spent",
    "status",
    "createdAt",
  ],
} as const;

const channelSchema = {
  $id: "Channel",
  type: "object",
  properties: {
    id: { type: "string" },
    username: { type: "string" },
    description: { type: ["string", "null"] },
    title: { type: "string" },
    category: { type: "string" },
    price: { type: "number" },
    avgViews: { type: "number" },
    contacts: {
      type: "array",
      items: { $ref: "ChannelContact#" },
    },
  },
  required: [
    "id",
    "username",
    "description",
    "title",
    "category",
    "price",
    "avgViews",
    "contacts",
  ],
} as const;

const channelContactSchema = {
  $id: "ChannelContact",
  type: "object",
  properties: {
    id: { type: "string" },
    channelId: { type: "string" },
    type: { type: "string", enum: ["username", "link"] },
    value: { type: "string" },
    source: {
      type: "string",
      enum: ["extracted_username", "extracted_link", "manual"],
    },
    isAdsContact: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "channelId",
    "type",
    "value",
    "source",
    "isAdsContact",
    "createdAt",
  ],
} as const;

const dealSchema = {
  $id: "Deal",
  type: "object",
  properties: {
    id: { type: "string" },
    campaignId: { type: "string" },
    channelId: { type: "string" },
    price: { type: "number" },
    status: { type: "string" },
    adminContactedAt: { type: ["string", "null"], format: "date-time" },
    adminOutboundMessageId: { type: ["string", "null"] },
    outreachError: { type: ["string", "null"] },
    termsAgreedAt: { type: ["string", "null"], format: "date-time" },
    paidAt: { type: ["string", "null"], format: "date-time" },
    proofText: { type: ["string", "null"] },
    proofUrl: { type: ["string", "null"] },
    completedAt: { type: ["string", "null"], format: "date-time" },
    failedAt: { type: ["string", "null"], format: "date-time" },
    lastCreatorNotificationAt: {
      type: ["string", "null"],
      format: "date-time",
    },
    lastCreatorNotificationKey: { type: ["string", "null"] },
    lastCreatorNotificationError: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "campaignId",
    "channelId",
    "price",
    "status",
    "adminContactedAt",
    "adminOutboundMessageId",
    "outreachError",
    "termsAgreedAt",
    "paidAt",
    "proofText",
    "proofUrl",
    "completedAt",
    "failedAt",
    "lastCreatorNotificationAt",
    "lastCreatorNotificationKey",
    "lastCreatorNotificationError",
    "createdAt",
  ],
} as const;

const dealMessageSchema = {
  $id: "DealMessage",
  type: "object",
  properties: {
    id: { type: "string" },
    dealId: { type: "string" },
    direction: { type: "string", enum: [...dealMessageDirections] },
    senderType: { type: "string", enum: [...dealMessageSenderTypes] },
    audience: { type: "string", enum: [...dealMessageAudiences] },
    transport: { type: "string", enum: [...dealMessageTransports] },
    contactValue: { type: ["string", "null"] },
    text: { type: "string" },
    externalMessageId: { type: ["string", "null"] },
    deliveryStatus: {
      type: ["string", "null"],
      enum: [...messageDeliveryStatuses, null],
    },
    notificationKey: { type: ["string", "null"] },
    failureReason: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "dealId",
    "direction",
    "senderType",
    "audience",
    "transport",
    "contactValue",
    "text",
    "externalMessageId",
    "deliveryStatus",
    "notificationKey",
    "failureReason",
    "createdAt",
  ],
} as const;

const dealApprovalRequestSchema = {
  $id: "DealApprovalRequest",
  type: "object",
  properties: {
    id: { type: "string" },
    dealId: { type: "string" },
    proposedPriceTon: { type: ["number", "null"] },
    proposedFormat: { type: ["string", "null"] },
    proposedDateText: { type: ["string", "null"] },
    summary: { type: "string" },
    status: {
      type: "string",
      enum: ["pending", "approved", "rejected", "expired"],
    },
    createdAt: { type: "string", format: "date-time" },
    resolvedAt: { type: ["string", "null"], format: "date-time" },
  },
  required: [
    "id",
    "dealId",
    "proposedPriceTon",
    "proposedFormat",
    "proposedDateText",
    "summary",
    "status",
    "createdAt",
    "resolvedAt",
  ],
} as const;

const approvalActionResultSchema = {
  $id: "ApprovalActionResult",
  type: "object",
  properties: {
    deal: { $ref: "Deal#" },
    approvalRequest: { $ref: "DealApprovalRequest#" },
  },
  required: ["deal", "approvalRequest"],
} as const;

const incomingNegotiationBodySchema = {
  $id: "IncomingNegotiationBody",
  type: "object",
  properties: {
    platform: { type: "string", enum: ["telegram"] },
    chatId: { type: "string" },
    externalMessageId: { type: ["string", "null"] },
    text: { type: "string" },
    contactValue: { type: ["string", "null"] },
  },
  required: ["platform", "chatId", "text"],
} as const;

const incomingNegotiationResultSchema = {
  $id: "IncomingNegotiationResult",
  type: "object",
  properties: {
    matched: { type: "boolean" },
    dealId: { type: "string" },
    action: {
      type: "string",
      enum: [
        "reply",
        "request_user_approval",
        "decline",
        "handoff_to_human",
        "wait",
      ],
    },
    approvalRequestId: { type: "string" },
  },
  required: ["matched"],
} as const;

const approvalCounterBodySchema = {
  $id: "ApprovalCounterBody",
  type: "object",
  properties: {
    text: { type: "string" },
  },
  required: ["text"],
} as const;

const createCampaignBodySchema = {
  $id: "CreateCampaignBody",
  type: "object",
  properties: {
    userId: { type: "string" },
    text: { type: "string" },
    budgetAmount: { type: "string" },
    budgetCurrency: { type: "string", enum: ["TON"] },
    theme: { type: ["string", "null"] },
    tags: {
      type: "array",
      items: { type: "string" },
    },
    language: { type: ["string", "null"], enum: ["RU", "EN", "OTHER", null] },
    goal: {
      type: ["string", "null"],
      enum: ["AWARENESS", "TRAFFIC", "SUBSCRIBERS", "SALES", null],
    },
    ctaUrl: { type: ["string", "null"] },
    buttonText: { type: ["string", "null"] },
    mediaUrl: { type: ["string", "null"] },
    targetAudience: { type: ["string", "null"] },
  },
  required: ["userId", "text", "budgetAmount", "budgetCurrency"],
} as const;

const createDealBodySchema = {
  $id: "CreateDealBody",
  type: "object",
  properties: {
    campaignId: { type: "string" },
    channelId: { type: "string" },
    price: { type: "number" },
  },
  required: ["campaignId", "channelId", "price"],
} as const;

const updateDealStatusBodySchema = {
  $id: "UpdateDealStatusBody",
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: [...dealWritableStatuses],
    },
    proofText: { type: ["string", "null"] },
    proofUrl: { type: ["string", "null"] },
  },
  required: ["status"],
} as const;

const agentRunBodySchema = {
  $id: "AgentRunBody",
  type: "object",
  properties: {
    campaignId: { type: "string" },
  },
  required: ["campaignId"],
} as const;

const submitTargetChannelBodySchema = {
  $id: "SubmitTargetChannelBody",
  type: "object",
  properties: {
    reference: { type: "string" },
  },
  required: ["reference"],
} as const;

const parsedChannelDataSchema = {
  $id: "ParsedChannelData",
  type: "object",
  properties: {
    description: { type: "string" },
    usernames: {
      type: "array",
      items: { type: "string" },
    },
    links: {
      type: "array",
      items: { type: "string" },
    },
    adsContact: { type: "boolean" },
  },
  required: ["description", "usernames", "links", "adsContact"],
} as const;

const submitTargetChannelResultSchema = {
  $id: "SubmitTargetChannelResult",
  type: "object",
  properties: {
    campaignId: { type: "string" },
    deal: { $ref: "Deal#" },
    channel: { $ref: "Channel#" },
    parsed: { $ref: "ParsedChannelData#" },
    selectedContact: { type: ["string", "null"] },
  },
  required: ["campaignId", "deal", "channel", "parsed", "selectedContact"],
} as const;

const campaignWorkspaceLatestMessageSchema = {
  $id: "CampaignWorkspaceLatestMessage",
  type: "object",
  properties: {
    text: { type: "string" },
    senderType: { type: "string", enum: [...dealMessageSenderTypes] },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["text", "senderType", "createdAt"],
} as const;

const campaignWorkspacePendingApprovalSchema = {
  $id: "CampaignWorkspacePendingApproval",
  type: "object",
  properties: {
    id: { type: "string" },
    status: {
      type: "string",
      enum: ["pending", "approved", "rejected", "expired"],
    },
    summary: { type: "string" },
    proposedPriceTon: { type: ["number", "null"] },
    proposedDateText: { type: ["string", "null"] },
  },
  required: ["id", "status", "summary", "proposedPriceTon", "proposedDateText"],
} as const;

const campaignWorkspaceChannelSchema = {
  $id: "CampaignWorkspaceChannel",
  type: "object",
  properties: {
    id: { type: ["string", "null"] },
    title: { type: "string" },
    username: { type: ["string", "null"] },
    avatarUrl: { type: ["string", "null"] },
  },
  required: ["id", "title", "username", "avatarUrl"],
} as const;

const campaignWorkspaceChatCardSchema = {
  $id: "CampaignWorkspaceChatCard",
  type: "object",
  properties: {
    id: { type: "string" },
    dealId: { type: ["string", "null"] },
    channel: { $ref: "CampaignWorkspaceChannel#" },
    status: { type: "string" },
    priceTon: { type: ["number", "null"] },
    latestMessage: {
      anyOf: [{ $ref: "CampaignWorkspaceLatestMessage#" }, { type: "null" }],
    },
    pendingApproval: {
      anyOf: [{ $ref: "CampaignWorkspacePendingApproval#" }, { type: "null" }],
    },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "dealId",
    "channel",
    "status",
    "priceTon",
    "latestMessage",
    "pendingApproval",
    "updatedAt",
  ],
} as const;

const campaignWorkspaceCountsSchema = {
  $id: "CampaignWorkspaceCounts",
  type: "object",
  properties: {
    total: { type: "number" },
    negotiations: { type: "number" },
    refused: { type: "number" },
    waitingPayment: { type: "number" },
    waitingPublication: { type: "number" },
    completed: { type: "number" },
  },
  required: [
    "total",
    "negotiations",
    "refused",
    "waitingPayment",
    "waitingPublication",
    "completed",
  ],
} as const;

const campaignWorkspaceResponseSchema = {
  $id: "CampaignWorkspaceResponse",
  type: "object",
  properties: {
    campaignId: { type: "string" },
    chatCards: {
      type: "array",
      items: { $ref: "CampaignWorkspaceChatCard#" },
    },
    counts: { $ref: "CampaignWorkspaceCounts#" },
    analyticsState: { type: "string", enum: ["soon"] },
  },
  required: ["campaignId", "chatCards", "counts", "analyticsState"],
} as const;

const campaignWorkspaceBootstrapChannelInputSchema = {
  $id: "CampaignWorkspaceBootstrapChannelInput",
  type: "object",
  properties: {
    username: { type: "string" },
    title: { type: ["string", "null"] },
    source: { type: "string", enum: ["wizard_shortlist"] },
  },
  required: ["username", "source"],
} as const;

const campaignWorkspaceBootstrapBodySchema = {
  $id: "CampaignWorkspaceBootstrapBody",
  type: "object",
  properties: {
    channels: {
      type: "array",
      items: { $ref: "CampaignWorkspaceBootstrapChannelInput#" },
    },
  },
  required: ["channels"],
} as const;

const campaignWorkspaceBootstrapItemResultSchema = {
  $id: "CampaignWorkspaceBootstrapItemResult",
  type: "object",
  properties: {
    username: { type: "string" },
    outcome: {
      type: "string",
      enum: ["created", "already_exists", "unresolved", "failed"],
    },
    dealId: { type: ["string", "null"] },
    channelId: { type: ["string", "null"] },
    message: { type: "string" },
  },
  required: ["username", "outcome", "dealId", "channelId"],
} as const;

const campaignWorkspaceBootstrapResultSchema = {
  $id: "CampaignWorkspaceBootstrapResult",
  type: "object",
  properties: {
    campaignId: { type: "string" },
    items: {
      type: "array",
      items: { $ref: "CampaignWorkspaceBootstrapItemResult#" },
    },
  },
  required: ["campaignId", "items"],
} as const;

const agentChannelEvaluationSchema = {
  $id: "AgentChannelEvaluation",
  type: "object",
  properties: {
    channelId: { type: "string" },
    username: { type: "string" },
    price: { type: "number" },
    eligible: { type: "boolean" },
    reason: { type: "string" },
  },
  required: ["channelId", "username", "price", "eligible", "reason"],
} as const;

const agentRunResultSchema = {
  $id: "AgentRunResult",
  type: "object",
  properties: {
    success: { type: "boolean" },
    campaignId: { type: "string" },
    deal: { $ref: "Deal#" },
    error: { type: "string" },
    reason: { type: "string" },
    selectedChannel: { $ref: "Channel#" },
    evaluation: {
      type: "array",
      items: { $ref: "AgentChannelEvaluation#" },
    },
  },
  required: ["success", "campaignId"],
} as const;

const messageErrorSchema = {
  $id: "MessageError",
  type: "object",
  properties: {
    message: { type: "string" },
  },
  required: ["message"],
} as const;

const campaignParamsSchema = {
  $id: "CampaignIdParams",
  type: "object",
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
} as const;

const dealParamsSchema = {
  $id: "DealIdParams",
  type: "object",
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
} as const;

export const addApiSchemas = (app: FastifyInstance): void => {
  app.addSchema(campaignSchema);
  app.addSchema(channelContactSchema);
  app.addSchema(channelSchema);
  app.addSchema(dealSchema);
  app.addSchema(dealMessageSchema);
  app.addSchema(dealApprovalRequestSchema);
  app.addSchema(approvalActionResultSchema);
  app.addSchema(createCampaignBodySchema);
  app.addSchema(createDealBodySchema);
  app.addSchema(updateDealStatusBodySchema);
  app.addSchema(agentRunBodySchema);
  app.addSchema(submitTargetChannelBodySchema);
  app.addSchema(parsedChannelDataSchema);
  app.addSchema(submitTargetChannelResultSchema);
  app.addSchema(campaignWorkspaceLatestMessageSchema);
  app.addSchema(campaignWorkspacePendingApprovalSchema);
  app.addSchema(campaignWorkspaceChannelSchema);
  app.addSchema(campaignWorkspaceChatCardSchema);
  app.addSchema(campaignWorkspaceCountsSchema);
  app.addSchema(campaignWorkspaceResponseSchema);
  app.addSchema(campaignWorkspaceBootstrapChannelInputSchema);
  app.addSchema(campaignWorkspaceBootstrapBodySchema);
  app.addSchema(campaignWorkspaceBootstrapItemResultSchema);
  app.addSchema(campaignWorkspaceBootstrapResultSchema);
  app.addSchema(incomingNegotiationBodySchema);
  app.addSchema(incomingNegotiationResultSchema);
  app.addSchema(approvalCounterBodySchema);
  app.addSchema(agentChannelEvaluationSchema);
  app.addSchema(agentRunResultSchema);
  app.addSchema(messageErrorSchema);
  app.addSchema(campaignParamsSchema);
  app.addSchema(dealParamsSchema);
};
