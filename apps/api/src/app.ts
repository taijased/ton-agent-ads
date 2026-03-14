import Fastify, { type FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { AgentService } from "@repo/agent";
import { createPrismaRepositories } from "@repo/db";
import { CampaignService } from "./application/campaign-service.js";
import { DealNegotiationService } from "./application/deal-negotiation-service.js";
import { ChannelParserService } from "./application/channel-parser-service.js";
import { ChannelService } from "./application/channel-service.js";
import { DealService } from "./application/deal-service.js";
import { NegotiationLlmService } from "./application/negotiation-llm-service.js";
import { TargetChannelService } from "./application/target-channel-service.js";
import { TelegramAdminClient } from "./infrastructure/telegram-admin-client.js";
import { TelegramBotNotifier } from "./infrastructure/telegram-bot-notifier.js";
import { TelegramChannelClient } from "./infrastructure/telegram-channel-client.js";
import { TelegramNegotiationListener } from "./infrastructure/telegram-negotiation-listener.js";
import { TelegramUserClient } from "./infrastructure/telegram-user-client.js";
import { addApiSchemas } from "./interfaces/http/schemas.js";
import { registerAgentRoutes } from "./interfaces/http/agent-routes.js";
import { registerChannelRoutes } from "./interfaces/http/channel-routes.js";
import { registerCampaignRoutes } from "./interfaces/http/campaign-routes.js";
import { registerDealRoutes } from "./interfaces/http/deal-routes.js";
import { registerHealthRoutes } from "./interfaces/http/health-routes.js";
import { registerNegotiationRoutes } from "./interfaces/http/negotiation-routes.js";

export const createApp = (): FastifyInstance => {
  const app = Fastify({ logger: true });

  void app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "TON AdAgent API",
        description:
          "API for campaigns, deals, channels, and agent orchestration",
        version: "0.1.0",
      },
    },
  });

  void app.register(swaggerUi, {
    routePrefix: "/documentation",
  });

  addApiSchemas(app);

  const {
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
  } = createPrismaRepositories();
  const telegramUserClient = new TelegramUserClient();
  const telegramAdminClient = new TelegramAdminClient(telegramUserClient);
  const telegramChannelClient = new TelegramChannelClient(telegramUserClient);
  const telegramBotNotifier = new TelegramBotNotifier();
  const channelParserService = new ChannelParserService(telegramChannelClient);
  const negotiationLlmService = new NegotiationLlmService();
  const campaignService = new CampaignService(campaignRepository);
  const channelService = new ChannelService(channelRepository);
  const dealService = new DealService(
    dealRepository,
    campaignRepository,
    channelRepository,
    dealMessageRepository,
    dealExternalThreadRepository,
    telegramAdminClient,
  );
  const dealNegotiationService = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    negotiationLlmService,
    telegramAdminClient,
    telegramBotNotifier,
  );
  const telegramNegotiationListener = new TelegramNegotiationListener(
    dealNegotiationService,
    app.log,
    telegramUserClient,
  );
  const targetChannelService = new TargetChannelService(
    campaignRepository,
    channelRepository,
    dealRepository,
    channelParserService,
  );
  const agentService = new AgentService(
    campaignRepository,
    channelRepository,
    dealRepository,
  );

  registerCampaignRoutes(app, campaignService);
  registerChannelRoutes(app, channelService);
  registerDealRoutes(app, dealService, targetChannelService);
  registerHealthRoutes(app, negotiationLlmService);
  registerNegotiationRoutes(app, dealNegotiationService);
  registerAgentRoutes(app, agentService);

  app.addHook("onReady", async () => {
    const openAiHealth = await negotiationLlmService.checkHealth();

    if (openAiHealth.ok) {
      app.log.info(
        { model: openAiHealth.model },
        "OpenAI negotiation health check passed",
      );
    } else {
      app.log.error(
        { model: openAiHealth.model, error: openAiHealth.error },
        "OpenAI negotiation health check failed",
      );
    }

    await telegramNegotiationListener.start();
  });

  app.addHook("onClose", async () => {
    await telegramNegotiationListener.stop();
    await telegramUserClient.disconnect();
  });

  return app;
};
