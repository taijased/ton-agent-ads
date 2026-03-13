import Fastify, { type FastifyInstance } from "fastify";
import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealRepository
} from "@repo/db";
import { CampaignService } from "./application/campaign-service.js";
import { ChannelService } from "./application/channel-service.js";
import { DealService } from "./application/deal-service.js";
import { registerChannelRoutes } from "./interfaces/http/channel-routes.js";
import { registerCampaignRoutes } from "./interfaces/http/campaign-routes.js";
import { registerDealRoutes } from "./interfaces/http/deal-routes.js";

export const createApp = (): FastifyInstance => {
  const app = Fastify({ logger: true });
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const campaignService = new CampaignService(campaignRepository);
  const channelService = new ChannelService(channelRepository);
  const dealService = new DealService(dealRepository);

  registerCampaignRoutes(app, campaignService);
  registerChannelRoutes(app, channelService);
  registerDealRoutes(app, dealService);

  return app;
};
