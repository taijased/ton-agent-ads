import { bot } from "./bot.js";

const start = async (): Promise<void> => {
  await bot.start();
};

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
