import Fastify, { type FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { AgentService } from "@repo/agent";
import { createPrismaRepositories } from "@repo/db";
import { CampaignNegotiationService } from "./application/campaign-negotiation-service.js";
import { CampaignService } from "./application/campaign-service.js";
import {
  DeterministicAdminOutreachTransport,
  type AdminOutreachTransport,
} from "./application/admin-outreach-transport.js";
import { ConversationThreadService } from "./application/conversation-thread-service.js";
import { CreatorNotificationService } from "./application/creator-notification-service.js";
import { DealNegotiationService } from "./application/deal-negotiation-service.js";
import { ChannelParserService } from "./application/channel-parser-service.js";
import { ChannelAdminService } from "./application/channel-admin-service.js";
import { ChannelService } from "./application/channel-service.js";
import { DealService } from "./application/deal-service.js";
import { NegotiationLlmService } from "./application/negotiation-llm-service.js";
import { TargetChannelService } from "./application/target-channel-service.js";
import { TelegramAdminOutreachTransport } from "./infrastructure/telegram-admin-outreach-transport.js";
import { TelegramAdminClient } from "./infrastructure/telegram-admin-client.js";
import { TelegramBotNotifier } from "./infrastructure/telegram-bot-notifier.js";
import { TelegramChannelClient } from "./infrastructure/telegram-channel-client.js";
import { TelegramNegotiationListener } from "./infrastructure/telegram-negotiation-listener.js";
import { TelegramUserClient } from "./infrastructure/telegram-user-client.js";
import { TelegramSearchClient } from "./infrastructure/telegram-search-client.js";
import { ChannelSearchService } from "./application/channel-search-service.js";
import { ChannelLookupService } from "./application/channel-lookup-service.js";
import { CampaignWorkspaceBootstrapService } from "./application/campaign-workspace-bootstrap-service.js";
import { CampaignWorkspaceService } from "./application/campaign-workspace-service.js";
import { ContactAnalysisLlmService } from "./application/contact-analysis-llm-service.js";
import { KeywordExpansionLlmService } from "./application/keyword-expansion-llm-service.js";
import { PostGenerationLlmService } from "./application/post-generation-llm-service.js";
import { addApiSchemas } from "./interfaces/http/schemas.js";
import { registerAuthRoutes } from "./interfaces/http/auth-routes.js";
import { registerAgentRoutes } from "./interfaces/http/agent-routes.js";
import { registerSearchRoutes } from "./interfaces/http/search-routes.js";
import { registerChannelRoutes } from "./interfaces/http/channel-routes.js";
import { registerCampaignRoutes } from "./interfaces/http/campaign-routes.js";
import { registerDealRoutes } from "./interfaces/http/deal-routes.js";
import { registerHealthRoutes } from "./interfaces/http/health-routes.js";
import { registerNegotiationRoutes } from "./interfaces/http/negotiation-routes.js";
import { registerPostGenerationRoutes } from "./interfaces/http/post-generation-routes.js";
import { registerProfileRoutes } from "./interfaces/http/profile-routes.js";
import { registerWorkspaceRoutes } from "./interfaces/http/workspace-routes.js";
import {
  readBearerToken,
  TelegramAuthError,
  verifySessionToken,
} from "./interfaces/http/telegram-auth.js";

export const createApp = (): FastifyInstance => {
  const app = Fastify({ logger: true });
  const telegramRuntimeEnabled =
    process.env.ENABLE_TELEGRAM_RUNTIME?.toLowerCase() !== "false";

  app.setErrorHandler((error, _request, reply) => {
    const normalizedError = error as NodeJS.ErrnoException & {
      code?: string;
      name?: string;
      message?: string;
    };

    if (normalizedError.code === "ECONNREFUSED") {
      app.log.error(error, "Database connection refused");
      return reply.code(503).send({
        message:
          "Database is unavailable. Start Postgres and retry the request.",
      });
    }

    if (
      typeof normalizedError.message === "string" &&
      normalizedError.message.includes("prisma.") &&
      normalizedError.message.includes("invocation")
    ) {
      app.log.error(error, "Prisma request failed");
      return reply.code(503).send({
        message:
          "Database request failed. Check the local database connection and migrations.",
      });
    }

    app.log.error(error, "Unhandled API error");
    return reply.status(500).send({
      message: "Internal server error",
    });
  });

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

  app.addHook("preHandler", async (request, reply) => {
    const path = request.url.split("?")[0];

    if (
      path === "/auth/telegram" ||
      path === "/auth/dev" ||
      path === "/health" ||
      path.startsWith("/documentation")
    ) {
      return;
    }

    try {
      const token = readBearerToken(request);

      if (token === null) {
        throw new TelegramAuthError("Authentication is required.");
      }

      request.authProfile = verifySessionToken(token);
    } catch (error: unknown) {
      if (error instanceof TelegramAuthError) {
        return reply.code(401).send({ message: error.message });
      }

      throw error;
    }
  });

  const {
    campaignRepository,
    channelRepository,
    conversationThreadRepository,
    conversationMessageRepository,
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
  const telegramSearchClient = new TelegramSearchClient(telegramUserClient);
  const contactAnalysisLlmService = new ContactAnalysisLlmService(
    process.env.OPEN_AI_TOKEN ?? "",
    process.env.OPEN_AI_MODEL ?? "gpt-4o-mini",
  );
  const channelAdminService = new ChannelAdminService(
    channelRepository,
    channelParserService,
    contactAnalysisLlmService,
  );
  const keywordExpansionLlmService = new KeywordExpansionLlmService(
    process.env.OPEN_AI_TOKEN ?? "",
    process.env.OPEN_AI_MODEL ?? "gpt-4o-mini",
  );
  const postGenerationLlmService = new PostGenerationLlmService(
    process.env.OPEN_AI_TOKEN ?? "",
    process.env.OPEN_AI_MODEL ?? "gpt-4o-mini",
  );
  const channelSearchService = new ChannelSearchService(
    telegramSearchClient,
    channelParserService,
    contactAnalysisLlmService,
    keywordExpansionLlmService,
  );
  const channelLookupService = new ChannelLookupService(telegramSearchClient);
  const campaignWorkspaceService = new CampaignWorkspaceService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    channelAdminService,
  );
  const campaignWorkspaceBootstrapService =
    new CampaignWorkspaceBootstrapService(
      campaignRepository,
      channelRepository,
      dealRepository,
      channelLookupService,
      channelParserService,
      channelAdminService,
    );
  const negotiationLlmService = new NegotiationLlmService();
  const campaignService = new CampaignService(campaignRepository);
  const channelService = new ChannelService(channelRepository);
  const adminOutreachTransport: AdminOutreachTransport = telegramRuntimeEnabled
    ? new TelegramAdminOutreachTransport(telegramAdminClient)
    : new DeterministicAdminOutreachTransport();
  const conversationThreadService = new ConversationThreadService(
    campaignRepository,
    channelRepository,
    conversationThreadRepository,
    conversationMessageRepository,
  );
  const campaignNegotiationService = new CampaignNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    conversationThreadRepository,
    conversationMessageRepository,
    adminOutreachTransport,
  );
  const creatorNotificationService = new CreatorNotificationService(
    dealRepository,
    dealMessageRepository,
    telegramBotNotifier,
  );
  const dealService = new DealService(
    dealRepository,
    campaignRepository,
    channelRepository,
    dealMessageRepository,
    dealExternalThreadRepository,
    telegramAdminClient,
    creatorNotificationService,
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
    creatorNotificationService,
  );
  const telegramNegotiationListener = new TelegramNegotiationListener(
    conversationThreadService,
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

  registerCampaignRoutes(app, campaignService, campaignNegotiationService);
  registerChannelRoutes(app, channelService);
  registerAuthRoutes(app);
  registerProfileRoutes(app);
  registerDealRoutes(app, dealService, targetChannelService);
  registerHealthRoutes(app, negotiationLlmService);
  registerNegotiationRoutes(
    app,
    conversationThreadService,
    dealNegotiationService,
  );
  registerAgentRoutes(app, agentService);
  registerSearchRoutes(app, channelSearchService, channelLookupService);
  registerWorkspaceRoutes(
    app,
    campaignWorkspaceService,
    campaignWorkspaceBootstrapService,
  );
  registerPostGenerationRoutes(app, postGenerationLlmService);

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

    if (!telegramRuntimeEnabled) {
      app.log.info("Telegram runtime is disabled by ENABLE_TELEGRAM_RUNTIME");
      return;
    }

    await telegramNegotiationListener.start();
  });

  app.addHook("onClose", async () => {
    if (telegramRuntimeEnabled) {
      await telegramNegotiationListener.stop();
      await telegramUserClient.disconnect();
    }
  });

  return app;
};
