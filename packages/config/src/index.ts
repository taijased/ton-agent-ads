import type { EnvConfig } from "@repo/types";

export const createEnv = (env: NodeJS.ProcessEnv): EnvConfig => ({
  BOT_TOKEN: env.PROD_BOT_TOKEN ?? env.BOT_TOKEN ?? "",
  API_BASE_URL: env.API_BASE_URL ?? "",
  TON_NETWORK: env.TON_NETWORK ?? "testnet",
  DEV_AUTH_BYPASS_ENABLED: env.DEV_AUTH_BYPASS_ENABLED ?? "",
  HOST: env.HOST ?? "",
  PORT: env.PORT ?? "",
  NODE_ENV: env.NODE_ENV ?? "",
  POSTGRES_USER: env.POSTGRES_USER ?? "",
  POSTGRES_PASSWORD: env.POSTGRES_PASSWORD ?? "",
  POSTGRES_DB: env.POSTGRES_DB ?? "",
  DATABASE_URL: env.DATABASE_URL ?? "",
  TG_API_ID: env.TG_API_ID ?? "",
  TG_API_HASH: env.TG_API_HASH ?? "",
  TG_SESSION_STRING: env.TG_SESSION_STRING ?? "",
  OPEN_AI_TOKEN: env.OPEN_AI_TOKEN ?? "",
  OPEN_AI_MODEL: env.OPEN_AI_MODEL ?? "",
});
