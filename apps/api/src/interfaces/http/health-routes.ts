import type { FastifyInstance } from "fastify";
import type { NegotiationLlmService } from "../../application/negotiation-llm-service.js";

export const registerHealthRoutes = (
  app: FastifyInstance,
  negotiationLlmService: NegotiationLlmService,
): void => {
  app.get(
    "/health/openai",
    {
      schema: {
        tags: ["health"],
        response: {
          200: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              model: { type: "string" },
              error: { type: "string" },
            },
            required: ["ok", "model"],
          },
          503: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              model: { type: "string" },
              error: { type: "string" },
            },
            required: ["ok", "model", "error"],
          },
        },
      },
    },
    async (_request, reply) => {
      const result = await negotiationLlmService.checkHealth();
      return reply.code(result.ok ? 200 : 503).send(result);
    },
  );
};
