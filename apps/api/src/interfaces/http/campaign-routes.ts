import type { FastifyInstance } from "fastify";
import type { CampaignService } from "../../application/campaign-service.js";
import { validateCreateCampaignInput } from "./validators.js";

export const registerCampaignRoutes = (
  app: FastifyInstance,
  campaignService: CampaignService
): void => {
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/campaigns", async (_request, reply) => {
    const campaigns = await campaignService.listCampaigns();
    return reply.send(campaigns);
  });

  app.get<{ Params: { id: string } }>("/campaigns/:id", async (request, reply) => {
    const campaign = await campaignService.getCampaignById(request.params.id);

    if (campaign === null) {
      return reply.code(404).send({ message: "Campaign not found" });
    }

    return reply.send(campaign);
  });

  app.post("/campaigns", async (request, reply) => {
    const result = validateCreateCampaignInput(request.body);

    if (!result.success) {
      return reply.code(400).send({ message: result.error });
    }

    const campaign = await campaignService.createCampaign(result.data);

    return reply.code(201).send(campaign);
  });
};
