import type { FastifyInstance } from "fastify";
import { getRequestProfile } from "./request-profile.js";

export const registerProfileRoutes = (app: FastifyInstance): void => {
  app.get(
    "/profile",
    {
      schema: {
        tags: ["profile"],
        response: {
          200: { $ref: "ProfileSummary#" },
        },
      },
    },
    async (request, reply) => reply.send(getRequestProfile(request)),
  );
};
