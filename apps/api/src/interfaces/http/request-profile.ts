import type { FastifyRequest } from "fastify";
import type { ProfileSummary } from "@repo/types";
import { requireRequestAuthProfile } from "./telegram-auth.js";

export const getRequestProfile = (request: FastifyRequest): ProfileSummary => {
  return requireRequestAuthProfile(request);
};
