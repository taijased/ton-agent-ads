import type { FastifyInstance } from "fastify";
import type { DealService } from "../../application/deal-service.js";
import { validateCreateDealInput } from "./validators.js";

export const registerDealRoutes = (
  app: FastifyInstance,
  dealService: DealService
): void => {
  app.get<{ Params: { id: string } }>("/campaigns/:id/deals", async (request, reply) => {
    return reply.send(await dealService.getDealsByCampaignId(request.params.id));
  });

  app.post("/deals", async (request, reply) => {
    const result = validateCreateDealInput(request.body);

    if (!result.success) {
      return reply.code(400).send({ message: result.error });
    }

    const deal = await dealService.createDeal(result.data);

    return reply.code(201).send(deal);
  });
};
