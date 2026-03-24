import type { FastifyInstance } from "fastify";
import type { CampaignService } from "../../application/campaign-service.js";
import type { CampaignNegotiationService } from "../../application/campaign-negotiation-service.js";
import {
  validateCreateCampaignInput,
  validateUpdateCampaignInput,
  validateUpdateCampaignStatusInput,
} from "./validators.js";
import { getRequestProfile } from "./request-profile.js";

export const registerCampaignRoutes = (
  app: FastifyInstance,
  campaignService: CampaignService,
  campaignNegotiationService: CampaignNegotiationService,
): void => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["health"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
            },
            required: ["status"],
          },
        },
      },
    },
    async () => ({ status: "ok" }),
  );

  app.get(
    "/campaigns",
    {
      schema: {
        tags: ["campaigns"],
        response: {
          200: {
            type: "array",
            items: { $ref: "Campaign#" },
          },
        },
      },
    },
    async (request, reply) => {
      const campaigns = await campaignService.listCampaigns(
        getRequestProfile(request).telegramId,
      );
      return reply.send(campaigns);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/campaigns/:id",
    {
      schema: {
        tags: ["campaigns"],
        params: { $ref: "CampaignIdParams#" },
        response: {
          200: { $ref: "Campaign#" },
          404: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const campaign = await campaignService.getCampaignById(
        request.params.id,
        getRequestProfile(request).telegramId,
      );

      if (campaign === null) {
        return reply.code(404).send({ message: "Campaign not found" });
      }

      return reply.send(campaign);
    },
  );

  app.post(
    "/campaigns",
    {
      schema: {
        tags: ["campaigns"],
        body: { $ref: "CreateCampaignBody#" },
        response: {
          201: { $ref: "Campaign#" },
          400: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const result = validateCreateCampaignInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      const campaign = await campaignService.createCampaign({
        userId: getRequestProfile(request).telegramId,
        ...result.data,
      });

      return reply.code(201).send(campaign);
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/campaigns/:id",
    {
      schema: {
        tags: ["campaigns"],
        params: { $ref: "CampaignIdParams#" },
        body: { $ref: "UpdateCampaignBody#" },
        response: {
          200: { $ref: "Campaign#" },
          400: { $ref: "MessageError#" },
          404: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const result = validateUpdateCampaignInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      const updateResult = await campaignService.updateCampaign(
        request.params.id,
        getRequestProfile(request).telegramId,
        result.data,
      );

      if (!updateResult.success) {
        return reply
          .code(updateResult.statusCode ?? 400)
          .send({ message: updateResult.message });
      }

      return reply.send(updateResult.campaign);
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/campaigns/:id/status",
    {
      schema: {
        tags: ["campaigns"],
        params: { $ref: "CampaignIdParams#" },
        body: {
          type: "object",
          properties: {
            status: { type: "string" },
          },
          required: ["status"],
        },
        response: {
          200: { $ref: "Campaign#" },
          400: { $ref: "MessageError#" },
          404: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const result = validateUpdateCampaignStatusInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      const updateResult = await campaignService.updateStatus(
        request.params.id,
        getRequestProfile(request).telegramId,
        result.data.status,
      );

      if (!updateResult.success) {
        return reply
          .code(updateResult.statusCode ?? 400)
          .send({ message: updateResult.message });
      }

      return reply.send(updateResult.campaign);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/campaigns/:id/negotiation/start",
    {
      schema: {
        tags: ["campaigns"],
        params: { $ref: "CampaignIdParams#" },
        response: {
          200: { $ref: "CampaignNegotiationStartResult#" },
          404: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const result = await campaignNegotiationService.startCampaignNegotiation(
        request.params.id,
        getRequestProfile(request).telegramId,
      );

      if (!result.success) {
        return reply
          .code(result.statusCode ?? 400)
          .send({ message: result.message });
      }

      return reply.send(result.result);
    },
  );
};
