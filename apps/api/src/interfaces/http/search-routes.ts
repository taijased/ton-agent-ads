import type { FastifyInstance } from "fastify";
import type { ChannelSearchService } from "../../application/channel-search-service.js";

export const registerSearchRoutes = (
  app: FastifyInstance,
  channelSearchService: ChannelSearchService,
): void => {
  app.post("/search/channels", async (request, reply) => {
    const body = request.body as { keywords?: unknown } | null;

    if (
      body === null ||
      body === undefined ||
      !Array.isArray(body.keywords) ||
      body.keywords.length === 0
    ) {
      return reply
        .code(400)
        .send({ message: "keywords must be a non-empty array of strings" });
    }

    const keywords = body.keywords as unknown[];

    if (keywords.length > 5) {
      return reply.code(400).send({ message: "Maximum 5 keywords allowed" });
    }

    for (const keyword of keywords) {
      if (typeof keyword !== "string" || keyword.trim().length < 2) {
        return reply.code(400).send({
          message: "Each keyword must be a string of at least 2 characters",
        });
      }
    }

    try {
      const result = await channelSearchService.search(keywords as string[]);
      return reply.send(result);
    } catch (error: unknown) {
      app.log.error(error, "Channel search failed");
      return reply.code(503).send({ message: "Telegram search unavailable" });
    }
  });
};
