import "dotenv/config";
import { bot } from "./bot.js";

const start = async (): Promise<void> => {
  await bot.api.setMyCommands([
    { command: "start", description: "Reset bot and show welcome message" },
    { command: "new", description: "Create a new ad campaign" },
    { command: "test", description: "Start test mode (simulate negotiation)" },
    {
      command: "test_search",
      description: "Search Telegram channels by keywords",
    },
    { command: "stop", description: "Exit test mode" },
  ]);
  await bot.start();
};

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
