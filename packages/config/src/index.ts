import type { EnvConfig } from "@repo/types";

export const createEnv = (env: NodeJS.ProcessEnv): EnvConfig => ({
  BOT_TOKEN: env.BOT_TOKEN ?? "",
  API_ID: env.API_ID ?? "",
  API_HASH: env.API_HASH ?? "",
  TON_RPC: env.TON_RPC ?? "",
  DATABASE_URL: env.DATABASE_URL ?? "",
  OPEN_AI_TOKEN: env.OPEN_AI_TOKEN ?? "",
  OPEN_AI_MODEL: env.OPEN_AI_MODEL ?? ""
});
