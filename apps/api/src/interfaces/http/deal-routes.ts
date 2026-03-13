import type { FastifyInstance } from "fastify";
import type { DealService } from "../../application/deal-service.js";
import { validateCreateDealInput, validateUpdateDealStatusInput } from "./validators.js";

export const registerDealRoutes = (
  app: FastifyInstance,
  dealService: DealService
): void => {
  app.get<{ Params: { id: string } }>(
    "/campaigns/:id/deals",
    {
      schema: {
        tags: ["deals"],
        params: { $ref: "CampaignIdParams#" },
        response: {
          200: {
            type: "array",
            items: { $ref: "Deal#" }
          }
        }
      }
    },
    async (request, reply) => {
      return reply.send(await dealService.getDealsByCampaignId(request.params.id));
    }
  );

  app.post(
    "/deals",
    {
      schema: {
        tags: ["deals"],
        body: { $ref: "CreateDealBody#" },
        response: {
          201: { $ref: "Deal#" },
          400: { $ref: "MessageError#" }
        }
      }
    },
    async (request, reply) => {
      const result = validateCreateDealInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      const deal = await dealService.createDeal(result.data);

      return reply.code(201).send(deal);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/deals/:id/status",
    {
      schema: {
        tags: ["deals"],
        params: { $ref: "DealIdParams#" },
        body: { $ref: "UpdateDealStatusBody#" },
        response: {
          200: { $ref: "Deal#" },
          400: { $ref: "MessageError#" },
          404: { $ref: "MessageError#" }
        }
      }
    },
    async (request, reply) => {
      const result = validateUpdateDealStatusInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      const updateResult = await dealService.updateDealStatus(request.params.id, result.data);

      if (!updateResult.success) {
        return reply.code(updateResult.statusCode ?? 400).send({ message: updateResult.message });
      }

      return reply.send(updateResult.deal);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/deals/:id/approve",
    {
      schema: {
        tags: ["deals"],
        params: { $ref: "DealIdParams#" },
        response: {
          200: { $ref: "Deal#" },
          400: { $ref: "MessageError#" },
          404: { $ref: "MessageError#" }
        }
      }
    },
    async (request, reply) => {
      const result = await dealService.approveDeal(request.params.id);

      if (!result.success) {
        return reply.code(result.statusCode ?? 400).send({ message: result.message });
      }

      return reply.send(result.deal);
    }
  );

  app.post<{ Params: { id: string } }>(
    "/deals/:id/reject",
    {
      schema: {
        tags: ["deals"],
        params: { $ref: "DealIdParams#" },
        response: {
          200: { $ref: "Deal#" },
          400: { $ref: "MessageError#" },
          404: { $ref: "MessageError#" }
        }
      }
    },
    async (request, reply) => {
      const result = await dealService.rejectDeal(request.params.id);

      if (!result.success) {
        return reply.code(result.statusCode ?? 400).send({ message: result.message });
      }

      return reply.send(result.deal);
    }
  );
};
