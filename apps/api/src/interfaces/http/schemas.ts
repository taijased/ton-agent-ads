import type { FastifyInstance } from "fastify";

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
      items: { type: "string" }
    },
    language: { type: ["string", "null"], enum: ["RU", "EN", "OTHER", null] },
    goal: {
      type: ["string", "null"],
      enum: ["AWARENESS", "TRAFFIC", "SUBSCRIBERS", "SALES", null]
    },
    ctaUrl: { type: ["string", "null"] },
    buttonText: { type: ["string", "null"] },
    mediaUrl: { type: ["string", "null"] },
    targetAudience: { type: ["string", "null"] },
    spent: { type: "number" },
    status: { type: "string" },
    createdAt: { type: "string", format: "date-time" }
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
    "createdAt"
  ]
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
      items: { $ref: "ChannelContact#" }
    }
  },
  required: [
    "id",
    "username",
    "description",
    "title",
    "category",
    "price",
    "avgViews",
    "contacts"
  ]
} as const;

const channelContactSchema = {
  $id: "ChannelContact",
  type: "object",
  properties: {
    id: { type: "string" },
    channelId: { type: "string" },
    type: { type: "string", enum: ["username", "link"] },
    value: { type: "string" },
    source: { type: "string", enum: ["extracted_username", "extracted_link", "manual"] },
    isAdsContact: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" }
  },
  required: ["id", "channelId", "type", "value", "source", "isAdsContact", "createdAt"]
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
    createdAt: { type: "string", format: "date-time" }
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
    "createdAt"
  ]
} as const;

const dealMessageSchema = {
  $id: "DealMessage",
  type: "object",
  properties: {
    id: { type: "string" },
    dealId: { type: "string" },
    direction: { type: "string", enum: ["inbound", "outbound", "internal"] },
    senderType: { type: "string", enum: ["admin", "agent", "user", "system"] },
    contactValue: { type: ["string", "null"] },
    text: { type: "string" },
    externalMessageId: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" }
  },
  required: [
    "id",
    "dealId",
    "direction",
    "senderType",
    "contactValue",
    "text",
    "externalMessageId",
    "createdAt"
  ]
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
    status: { type: "string", enum: ["pending", "approved", "rejected", "expired"] },
    createdAt: { type: "string", format: "date-time" },
    resolvedAt: { type: ["string", "null"], format: "date-time" }
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
    "resolvedAt"
  ]
} as const;

const approvalActionResultSchema = {
  $id: "ApprovalActionResult",
  type: "object",
  properties: {
    deal: { $ref: "Deal#" },
    approvalRequest: { $ref: "DealApprovalRequest#" }
  },
  required: ["deal", "approvalRequest"]
} as const;

const incomingNegotiationBodySchema = {
  $id: "IncomingNegotiationBody",
  type: "object",
  properties: {
    platform: { type: "string", enum: ["telegram"] },
    chatId: { type: "string" },
    externalMessageId: { type: ["string", "null"] },
    text: { type: "string" },
    contactValue: { type: ["string", "null"] }
  },
  required: ["platform", "chatId", "text"]
} as const;

const incomingNegotiationResultSchema = {
  $id: "IncomingNegotiationResult",
  type: "object",
  properties: {
    matched: { type: "boolean" },
    dealId: { type: "string" },
    action: {
      type: "string",
      enum: ["reply", "request_user_approval", "decline", "handoff_to_human", "wait"]
    },
    approvalRequestId: { type: "string" }
  },
  required: ["matched"]
} as const;

const approvalCounterBodySchema = {
  $id: "ApprovalCounterBody",
  type: "object",
  properties: {
    text: { type: "string" }
  },
  required: ["text"]
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
      items: { type: "string" }
    },
    language: { type: ["string", "null"], enum: ["RU", "EN", "OTHER", null] },
    goal: {
      type: ["string", "null"],
      enum: ["AWARENESS", "TRAFFIC", "SUBSCRIBERS", "SALES", null]
    },
    ctaUrl: { type: ["string", "null"] },
    buttonText: { type: ["string", "null"] },
    mediaUrl: { type: ["string", "null"] },
    targetAudience: { type: ["string", "null"] }
  },
  required: ["userId", "text", "budgetAmount", "budgetCurrency"]
} as const;

const createDealBodySchema = {
  $id: "CreateDealBody",
  type: "object",
  properties: {
    campaignId: { type: "string" },
    channelId: { type: "string" },
    price: { type: "number" }
  },
  required: ["campaignId", "channelId", "price"]
} as const;

const updateDealStatusBodySchema = {
  $id: "UpdateDealStatusBody",
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: [
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
        "failed"
      ]
    },
    proofText: { type: ["string", "null"] },
    proofUrl: { type: ["string", "null"] }
  },
  required: ["status"]
} as const;

const agentRunBodySchema = {
  $id: "AgentRunBody",
  type: "object",
  properties: {
    campaignId: { type: "string" }
  },
  required: ["campaignId"]
} as const;

const submitTargetChannelBodySchema = {
  $id: "SubmitTargetChannelBody",
  type: "object",
  properties: {
    reference: { type: "string" }
  },
  required: ["reference"]
} as const;

const parsedChannelDataSchema = {
  $id: "ParsedChannelData",
  type: "object",
  properties: {
    description: { type: "string" },
    usernames: {
      type: "array",
      items: { type: "string" }
    },
    links: {
      type: "array",
      items: { type: "string" }
    },
    adsContact: { type: "boolean" }
  },
  required: ["description", "usernames", "links", "adsContact"]
} as const;

const submitTargetChannelResultSchema = {
  $id: "SubmitTargetChannelResult",
  type: "object",
  properties: {
    campaignId: { type: "string" },
    deal: { $ref: "Deal#" },
    channel: { $ref: "Channel#" },
    parsed: { $ref: "ParsedChannelData#" },
    selectedContact: { type: ["string", "null"] }
  },
  required: ["campaignId", "deal", "channel", "parsed", "selectedContact"]
} as const;

const agentChannelEvaluationSchema = {
  $id: "AgentChannelEvaluation",
  type: "object",
  properties: {
    channelId: { type: "string" },
    username: { type: "string" },
    price: { type: "number" },
    eligible: { type: "boolean" },
    reason: { type: "string" }
  },
  required: ["channelId", "username", "price", "eligible", "reason"]
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
      items: { $ref: "AgentChannelEvaluation#" }
    }
  },
  required: ["success", "campaignId"]
} as const;

const messageErrorSchema = {
  $id: "MessageError",
  type: "object",
  properties: {
    message: { type: "string" }
  },
  required: ["message"]
} as const;

const campaignParamsSchema = {
  $id: "CampaignIdParams",
  type: "object",
  properties: {
    id: { type: "string" }
  },
  required: ["id"]
} as const;

const dealParamsSchema = {
  $id: "DealIdParams",
  type: "object",
  properties: {
    id: { type: "string" }
  },
  required: ["id"]
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
  app.addSchema(incomingNegotiationBodySchema);
  app.addSchema(incomingNegotiationResultSchema);
  app.addSchema(approvalCounterBodySchema);
  app.addSchema(agentChannelEvaluationSchema);
  app.addSchema(agentRunResultSchema);
  app.addSchema(messageErrorSchema);
  app.addSchema(campaignParamsSchema);
  app.addSchema(dealParamsSchema);
};
