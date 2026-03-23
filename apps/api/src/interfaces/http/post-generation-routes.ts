import type { FastifyInstance } from "fastify";
import type { PostGenerationLlmService } from "../../application/post-generation-llm-service.js";
import { validateGeneratePostInput } from "./validators.js";

export const registerPostGenerationRoutes = (
  app: FastifyInstance,
  postGenerationLlmService: PostGenerationLlmService,
): void => {
  app.post("/posts/generate", {
    schema: {
      tags: ["posts"],
      body: {
        type: "object",
        required: ["description", "language", "goal"],
        properties: {
          description: { type: "string" },
          language: { type: "string", enum: ["RU", "EN", "OTHER"] },
          goal: {
            type: "string",
            enum: ["AWARENESS", "TRAFFIC", "SUBSCRIBERS", "SALES"],
          },
          channelDescription: { type: "string" },
          targetAudience: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            postText: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
          },
        },
        400: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        502: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const result = validateGeneratePostInput(request.body);
      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }
      const outcome = await postGenerationLlmService.generate(result.data);
      if (!outcome.ok) {
        return reply.code(502).send({ message: outcome.error });
      }
      return reply.code(200).send(outcome.data);
    },
  });
};
