import type { FastifyInstance } from "fastify";
import type { ChannelService } from "../../application/channel-service.js";

export const registerChannelRoutes = (
  app: FastifyInstance,
  channelService: ChannelService
): void => {
  app.get(
    "/channels",
    {
      schema: {
        tags: ["channels"],
        response: {
          200: {
            type: "array",
            items: { $ref: "Channel#" }
          }
        }
      }
    },
    async (_request, reply) => {
      return reply.send(await channelService.getChannels());
    }
  );
};
