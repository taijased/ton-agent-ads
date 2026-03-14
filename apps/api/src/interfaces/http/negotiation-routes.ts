import type { FastifyInstance } from "fastify";
import type { DealNegotiationService } from "../../application/deal-negotiation-service.js";
import {
  validateApprovalCounterInput,
  validateIncomingNegotiationMessageInput
} from "./validators.js";

export const registerNegotiationRoutes = (
  app: FastifyInstance,
  dealNegotiationService: DealNegotiationService
): void => {
  app.get<{ Params: { id: string } }>(
    "/deals/:id/messages",
    {
      schema: {
        tags: ["deals"],
        params: { $ref: "DealIdParams#" },
        response: {
          200: {
            type: "array",
            items: { $ref: "DealMessage#" }
          }
        }
      }
    },
    async (request, reply) => reply.send(await dealNegotiationService.listDealMessages(request.params.id))
  );

  app.post(
    "/negotiation/telegram/incoming",
    {
      schema: {
        tags: ["negotiation"],
        body: { $ref: "IncomingNegotiationBody#" },
        response: {
          200: { $ref: "IncomingNegotiationResult#" },
          400: { $ref: "MessageError#" }
        }
      }
    },
    async (request, reply) => {
      const result = validateIncomingNegotiationMessageInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      return reply.send(await dealNegotiationService.handleIncomingAdminMessage(result.data));
    }
  );

  app.post<{ Params: { id: string } }>(
    "/approval-requests/:id/approve",
    {
      schema: {
        tags: ["negotiation"],
        params: { $ref: "DealIdParams#" },
        response: {
          200: { $ref: "ApprovalActionResult#" },
          400: { $ref: "MessageError#" }
        }
      }
    },
    async (request, reply) => {
      try {
        return reply.send(await dealNegotiationService.approveApprovalRequest(request.params.id));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Approval request failed";
        return reply.code(400).send({ message });
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    "/approval-requests/:id/reject",
    {
      schema: {
        tags: ["negotiation"],
        params: { $ref: "DealIdParams#" },
        response: {
          200: { $ref: "ApprovalActionResult#" },
          400: { $ref: "MessageError#" }
        }
      }
    },
    async (request, reply) => {
      try {
        return reply.send(await dealNegotiationService.rejectApprovalRequest(request.params.id));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Approval request failed";
        return reply.code(400).send({ message });
      }
    }
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
          400: { $ref: "MessageError#" }
        }
      }
    },
    async (request, reply) => {
      const result = validateApprovalCounterInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      try {
        return reply.send(
          await dealNegotiationService.counterApprovalRequest(request.params.id, result.data.text)
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Counter offer failed";
        return reply.code(400).send({ message });
      }
    }
  );
};
