import type { FastifyInstance } from "fastify";
import type { AgentService } from "@repo/agent";
import { validateAgentRunInput } from "./validators.js";

export const registerAgentRoutes = (
  app: FastifyInstance,
  agentService: AgentService
): void => {
  app.post(
    "/agent/run",
    {
      schema: {
        tags: ["agent"],
        body: { $ref: "AgentRunBody#" },
        response: {
          200: { $ref: "AgentRunResult#" },
          400: {
            oneOf: [{ $ref: "MessageError#" }, { $ref: "AgentRunResult#" }]
          }
        }
      }
    },
    async (request, reply) => {
      const result = validateAgentRunInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      const agentRunResult = await agentService.run(result.data.campaignId);

      if (!agentRunResult.success) {
        return reply.code(400).send(agentRunResult);
      }

      return reply.code(200).send(agentRunResult);
    }
  );
};
