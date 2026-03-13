import { Bot } from "grammy";
import { createCampaign } from "./api.js";
import { botState } from "./state.js";

const botToken = process.env.BOT_TOKEN;

if (botToken === undefined || botToken.trim().length === 0) {
  throw new Error("BOT_TOKEN is required");
}

export const bot = new Bot(botToken);

bot.command("start", async (context) => {
  const userId = context.from?.id;

  if (userId !== undefined) {
    botState.finishCampaignCreation(String(userId));
  }

  await context.reply(
    "Welcome to ton-adagent bot. Use /new to create a campaign."
  );
});

bot.command("new", async (context) => {
  if (context.from === undefined) {
    await context.reply("Unable to identify user for campaign creation.");
    return;
  }

  botState.startCampaignCreation(String(context.from.id));

  await context.reply("Send post text");
});

bot.on("message:text", async (context) => {
  if (context.msg.text.startsWith("/")) {
    return;
  }

  if (context.from === undefined) {
    await context.reply("Unable to identify user for campaign creation.");
    return;
  }

  const userId = String(context.from.id);

  if (!botState.isCreatingCampaign(userId)) {
    return;
  }

  try {
    const campaign = await createCampaign({
      userId,
      text: context.msg.text,
      budget: 10
    });

    botState.finishCampaignCreation(userId);
    await context.reply(`Campaign created: ${campaign.id}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await context.reply(`Failed to create campaign: ${message}`);
  }
});
