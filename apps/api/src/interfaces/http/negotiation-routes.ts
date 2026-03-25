import type { FastifyInstance } from "fastify";
import type { DealRepository, DealApprovalRequestRepository } from "@repo/db";
import type { ConversationThreadService } from "../../application/conversation-thread-service.js";
import type { DealNegotiationService } from "../../application/deal-negotiation-service.js";
import {
  validateApprovalCounterInput,
  validateIncomingNegotiationMessageInput,
} from "./validators.js";
import { getRequestProfile } from "./request-profile.js";

export const registerNegotiationRoutes = (
  app: FastifyInstance,
  conversationThreadService: ConversationThreadService,
  dealNegotiationService: DealNegotiationService,
  dealRepository: DealRepository,
  dealApprovalRequestRepository: DealApprovalRequestRepository,
): void => {
  app.get<{ Params: { id: string } }>(
    "/campaigns/:id/threads",
    {
      schema: {
        tags: ["negotiation"],
        params: { $ref: "CampaignIdParams#" },
        response: {
          200: { $ref: "CampaignThreadListResponse#" },
          404: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const result = await conversationThreadService.listByCampaignId(
        request.params.id,
        getRequestProfile(request).telegramId,
      );

      if (result === null) {
        return reply.code(404).send({ message: "Campaign not found" });
      }

      return reply.send(result);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/threads/:id",
    {
      schema: {
        tags: ["negotiation"],
        params: { $ref: "ThreadIdParams#" },
        response: {
          200: { $ref: "ConversationThreadDetailsResponse#" },
          404: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const result = await conversationThreadService.getThreadById(
        request.params.id,
      );

      if (result === null) {
        return reply.code(404).send({ message: "Thread not found" });
      }

      return reply.send(result);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/threads/:id/negotiation",
    {
      schema: {
        tags: ["negotiation"],
        params: { $ref: "ThreadIdParams#" },
        response: {
          200: { $ref: "ThreadNegotiationResponse#" },
          404: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const threadDetails = await conversationThreadService.getThreadById(
        request.params.id,
      );

      if (threadDetails === null) {
        return reply.code(404).send({ message: "Thread not found" });
      }

      const { thread } = threadDetails;

      const threadResponse = {
        id: thread.id,
        campaignId: thread.campaignId,
        channelId: thread.channel.id,
        status: thread.status,
        dealId: thread.dealId,
        lastMessageAt: thread.lastMessageAt,
        lastDirection: thread.lastDirection,
      };

      if (thread.dealId === null) {
        return reply.send({
          thread: threadResponse,
          deal: null,
          messages: [],
          pendingApproval: null,
        });
      }

      const dealId = thread.dealId;
      const [deal, messages, pendingApproval] = await Promise.all([
        dealRepository.getDealById(dealId),
        dealNegotiationService.listDealMessages(dealId),
        dealApprovalRequestRepository.getPendingByDealId(dealId),
      ]);

      return reply.send({
        thread: threadResponse,
        deal: deal
          ? {
              id: deal.id,
              status: deal.status,
              price: deal.price,
              createdAt: deal.createdAt,
            }
          : null,
        messages,
        pendingApproval: pendingApproval ?? null,
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/deals/:id/messages",
    {
      schema: {
        tags: ["deals"],
        params: { $ref: "DealIdParams#" },
        response: {
          200: {
            type: "array",
            items: { $ref: "DealMessage#" },
          },
        },
      },
    },
    async (request, reply) =>
      reply.send(
        await dealNegotiationService.listDealMessages(request.params.id),
      ),
  );

  app.post(
    "/negotiation/telegram/incoming",
    {
      schema: {
        tags: ["negotiation"],
        body: { $ref: "IncomingNegotiationBody#" },
        response: {
          200: { $ref: "IncomingNegotiationResult#" },
          400: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const result = validateIncomingNegotiationMessageInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      return reply.send(
        await dealNegotiationService.handleIncomingAdminMessage(result.data),
      );
    },
  );

  app.post<{ Params: { id: string } }>(
    "/approval-requests/:id/approve",
    {
      schema: {
        tags: ["negotiation"],
        params: { $ref: "DealIdParams#" },
        response: {
          200: { $ref: "ApprovalActionResult#" },
          400: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      try {
        return reply.send(
          await dealNegotiationService.approveApprovalRequest(
            request.params.id,
          ),
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Approval request failed";
        return reply.code(400).send({ message });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/approval-requests/:id/reject",
    {
      schema: {
        tags: ["negotiation"],
        params: { $ref: "DealIdParams#" },
        response: {
          200: { $ref: "ApprovalActionResult#" },
          400: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      try {
        return reply.send(
          await dealNegotiationService.rejectApprovalRequest(request.params.id),
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Approval request failed";
        return reply.code(400).send({ message });
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/approval-requests/:id/counter",
    {
      schema: {
        tags: ["negotiation"],
        params: { $ref: "DealIdParams#" },
        body: { $ref: "ApprovalCounterBody#" },
        response: {
          200: { $ref: "ApprovalActionResult#" },
          400: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const result = validateApprovalCounterInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      try {
        return reply.send(
          await dealNegotiationService.counterApprovalRequest(
            request.params.id,
            result.data.text,
          ),
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Counter offer failed";
        return reply.code(400).send({ message });
      }
    },
  );
};
