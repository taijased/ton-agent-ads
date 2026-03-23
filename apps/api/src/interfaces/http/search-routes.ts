import type { FastifyInstance } from "fastify";
import type { ChannelLookupService } from "../../application/channel-lookup-service.js";
import type { ChannelSearchService } from "../../application/channel-search-service.js";

export const registerSearchRoutes = (
  app: FastifyInstance,
  channelSearchService: ChannelSearchService,
  channelLookupService: ChannelLookupService,
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

  app.post(
    "/search/channels/resolve",
    {
      schema: {
        tags: ["search"],
        body: {
          type: "object",
          properties: {
            username: { type: "string" },
          },
          required: ["username"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              username: { type: "string" },
              description: { type: ["string", "null"] },
              avatarUrl: { type: ["string", "null"] },
              subscriberCount: { type: ["number", "null"] },
            },
            required: [
              "id",
              "title",
              "username",
              "description",
              "avatarUrl",
              "subscriberCount",
            ],
          },
          400: { $ref: "MessageError#" },
          404: { $ref: "MessageError#" },
          503: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { username?: unknown } | null;

      if (
        body === null ||
        body === undefined ||
        typeof body.username !== "string"
      ) {
        return reply
          .code(400)
          .send({ message: "username must be a non-empty string" });
      }

      try {
        const channel = await channelLookupService.resolveByUsername(
          body.username,
        );

        if (channel === null) {
          return reply.code(404).send({ message: "Channel not found" });
        }

        return reply.send(channel);
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          error.message.includes("public Telegram handle")
        ) {
          return reply.code(400).send({ message: error.message });
        }

        app.log.error(error, "Channel exact lookup failed");
        return reply.code(503).send({ message: "Telegram lookup unavailable" });
      }
    },
  );
};
