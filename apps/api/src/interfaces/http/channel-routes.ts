import type { FastifyInstance } from "fastify";
import type { ChannelService } from "../../application/channel-service.js";

export const registerChannelRoutes = (
  app: FastifyInstance,
  channelService: ChannelService
): void => {
  app.get("/channels", async (_request, reply) => {
    return reply.send(await channelService.getChannels());
  });
};
