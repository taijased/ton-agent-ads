import type { FastifyInstance } from "fastify";
import type { CampaignService } from "../../application/campaign-service.js";
import { validateCreateCampaignInput } from "./validators.js";

export const registerCampaignRoutes = (
  app: FastifyInstance,
  campaignService: CampaignService,
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
    async (_request, reply) => {
      const campaigns = await campaignService.listCampaigns();
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
      const campaign = await campaignService.getCampaignById(request.params.id);

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

      const campaign = await campaignService.createCampaign(result.data);

      return reply.code(201).send(campaign);
    },
  );
};
