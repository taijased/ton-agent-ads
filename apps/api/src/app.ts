import Fastify, { type FastifyInstance } from "fastify";
import { InMemoryCampaignRepository } from "@repo/db";
import { CampaignService } from "./application/campaign-service.js";
import { registerCampaignRoutes } from "./interfaces/http/campaign-routes.js";

export const createApp = (): FastifyInstance => {
  const app = Fastify({ logger: true });
  const campaignRepository = new InMemoryCampaignRepository();
  const campaignService = new CampaignService(campaignRepository);

  registerCampaignRoutes(app, campaignService);

  return app;
};
