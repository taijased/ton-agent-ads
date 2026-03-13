import type { FastifyInstance } from "fastify";

const campaignSchema = {
  $id: "Campaign",
  type: "object",
  properties: {
    id: { type: "string" },
    userId: { type: "string" },
    text: { type: "string" },
    budget: { type: "number" },
    spent: { type: "number" },
    status: { type: "string" },
    createdAt: { type: "string", format: "date-time" }
  },
  required: ["id", "userId", "text", "budget", "spent", "status", "createdAt"]
} as const;

const channelSchema = {
  $id: "Channel",
  type: "object",
  properties: {
    id: { type: "string" },
    username: { type: "string" },
    title: { type: "string" },
    category: { type: "string" },
    price: { type: "number" },
    avgViews: { type: "number" }
  },
  required: ["id", "username", "title", "category", "price", "avgViews"]
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
    createdAt: { type: "string", format: "date-time" }
  },
  required: ["id", "campaignId", "channelId", "price", "status", "createdAt"]
} as const;

const createCampaignBodySchema = {
  $id: "CreateCampaignBody",
  type: "object",
  properties: {
    userId: { type: "string" },
    text: { type: "string" },
    budget: { type: "number" }
  },
  required: ["userId", "text", "budget"]
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

const agentRunBodySchema = {
  $id: "AgentRunBody",
  type: "object",
  properties: {
    campaignId: { type: "string" }
  },
  required: ["campaignId"]
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
  app.addSchema(channelSchema);
  app.addSchema(dealSchema);
  app.addSchema(createCampaignBodySchema);
  app.addSchema(createDealBodySchema);
  app.addSchema(agentRunBodySchema);
  app.addSchema(agentChannelEvaluationSchema);
  app.addSchema(agentRunResultSchema);
  app.addSchema(messageErrorSchema);
  app.addSchema(campaignParamsSchema);
  app.addSchema(dealParamsSchema);
};
