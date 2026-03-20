import "dotenv/config";
import { bot } from "./bot.js";
import { BotStartupConflictError, startBotRuntime } from "./startup.js";

const start = async (): Promise<void> => {
  await startBotRuntime({ bot });
};

start().catch((error: unknown) => {
  if (error instanceof BotStartupConflictError) {
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});
