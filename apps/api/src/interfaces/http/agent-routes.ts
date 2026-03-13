import type { FastifyInstance } from "fastify";
import type { AgentService } from "@repo/agent";
import { validateAgentRunInput } from "./validators.js";

export const registerAgentRoutes = (
  app: FastifyInstance,
  agentService: AgentService
): void => {
  app.post("/agent/run", async (request, reply) => {
    const result = validateAgentRunInput(request.body);

    if (!result.success) {
      return reply.code(400).send({ message: result.error });
    }

    const agentRunResult = await agentService.run(result.data.campaignId);

    if (!agentRunResult.success) {
      return reply.code(400).send(agentRunResult);
    }

    return reply.code(200).send(agentRunResult);
  });
};
