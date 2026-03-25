import type { FastifyInstance } from "fastify";
import { validateTelegramAuthInput } from "./validators.js";
import {
  authenticateTelegramInitData,
  createDevAuthSession,
  TelegramAuthError,
} from "./telegram-auth.js";

const isDevAuthBypassEnabled = (): boolean =>
  process.env.DEV_AUTH_BYPASS_ENABLED?.toLowerCase() === "true";

export const registerAuthRoutes = (app: FastifyInstance): void => {
  app.post(
    "/auth/telegram",
    {
      schema: {
        tags: ["auth"],
        body: { $ref: "TelegramAuthBody#" },
        response: {
          200: { $ref: "TelegramAuthResponse#" },
          400: { $ref: "MessageError#" },
          401: { $ref: "MessageError#" },
        },
      },
    },
    async (request, reply) => {
      const result = validateTelegramAuthInput(request.body);

      if (!result.success) {
        return reply.code(400).send({ message: result.error });
      }

      try {
        const { token } = authenticateTelegramInitData(result.data.initData);
        return reply.send({ token });
      } catch (error: unknown) {
        if (error instanceof TelegramAuthError) {
          if (error.statusCode === 400) {
            return reply.code(400).send({ message: error.message });
          }

          return reply.code(401).send({ message: error.message });
        }

        throw error;
      }
    },
  );

  app.post(
    "/auth/dev",
    {
      schema: {
        tags: ["auth"],
        response: {
          200: { $ref: "TelegramAuthResponse#" },
          403: { $ref: "MessageError#" },
        },
      },
    },
    async (_request, reply) => {
      if (!isDevAuthBypassEnabled()) {
        return reply.code(403).send({
          message: "Development auth bypass is disabled.",
        });
      }

      const { token } = createDevAuthSession();
      return reply.send({ token });
    },
  );
};
