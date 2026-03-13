import Fastify, { type FastifyInstance } from "fastify";
import { AgentService } from "@repo/agent";
import { createPrismaRepositories } from "@repo/db";
import { CampaignService } from "./application/campaign-service.js";
import { ChannelService } from "./application/channel-service.js";
import { DealService } from "./application/deal-service.js";
import { registerAgentRoutes } from "./interfaces/http/agent-routes.js";
import { registerChannelRoutes } from "./interfaces/http/channel-routes.js";
import { registerCampaignRoutes } from "./interfaces/http/campaign-routes.js";
import { registerDealRoutes } from "./interfaces/http/deal-routes.js";

export const createApp = (): FastifyInstance => {
  const app = Fastify({ logger: true });
  const { campaignRepository, channelRepository, dealRepository } =
    createPrismaRepositories();
  const campaignService = new CampaignService(campaignRepository);
  const channelService = new ChannelService(channelRepository);
  const dealService = new DealService(dealRepository);
  const agentService = new AgentService(
    campaignRepository,
    channelRepository,
    dealRepository
  );

  registerCampaignRoutes(app, campaignService);
  registerChannelRoutes(app, channelService);
  registerDealRoutes(app, dealService);
  registerAgentRoutes(app, agentService);

  return app;
};
