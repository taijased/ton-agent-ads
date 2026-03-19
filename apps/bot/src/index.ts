import "dotenv/config";
import { bot } from "./bot.js";

const start = async (): Promise<void> => {
  await bot.api.setMyCommands([
    { command: "start", description: "Reset bot and show welcome message" },
    { command: "new", description: "Create a new ad campaign" },
    { command: "test", description: "Full test pipeline (create \u2192 search \u2192 negotiate \u2192 pay)" },
    { command: "test_new", description: "Test campaign creation only" },
    { command: "test_search", description: "Search Telegram channels by keywords" },
    { command: "test_negotiation", description: "Test negotiation only (1-5)" },
    { command: "stop", description: "Exit test mode" },
  ]);
  await bot.start();
};

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
