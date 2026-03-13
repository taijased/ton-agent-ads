import { Bot, InlineKeyboard } from "grammy";
import { approveDeal, createCampaign, rejectDeal, runAgent } from "./api.js";
import { botState } from "./state.js";

const botToken = process.env.BOT_TOKEN;

if (botToken === undefined || botToken.trim().length === 0) {
  throw new Error("BOT_TOKEN is required");
}

export const bot = new Bot(botToken);

const createRecommendationKeyboard = (
  dealId: string,
  channelUsername: string
): InlineKeyboard =>
  new InlineKeyboard()
    .text("Approve", `approve:${dealId}:${channelUsername}`)
    .text("Reject", `reject:${dealId}:${channelUsername}`);

const formatRecommendationMessage = (input: {
  campaignId: string;
  title: string;
  username: string;
  price: number;
  status: string;
  reason: string;
}): string =>
  [
    "Recommended channel found",
    "",
    `Campaign: ${input.campaignId}`,
    `Channel: ${input.title} (${input.username})`,
    `Price: ${input.price} TON`,
    `Status: ${input.status}`,
    `Reason: ${input.reason}`
  ].join("\n");

const parseActionCallback = (
  data: string | undefined
): { action: "approve" | "reject"; dealId: string; channelUsername: string } | null => {
  if (data === undefined) {
    return null;
  }

  const [action, dealId, ...usernameParts] = data.split(":");

  if (
    (action !== "approve" && action !== "reject") ||
    dealId === undefined ||
    dealId.length === 0 ||
    usernameParts.length === 0
  ) {
    return null;
  }

  return {
    action,
    dealId,
    channelUsername: usernameParts.join(":")
  };
};

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

bot.on("callback_query:data", async (context) => {
  const callback = parseActionCallback(context.callbackQuery.data);

  if (callback === null) {
    await context.answerCallbackQuery({ text: "Unknown action." });
    return;
  }

  try {
    const deal =
      callback.action === "approve"
        ? await approveDeal(callback.dealId)
        : await rejectDeal(callback.dealId);

    await context.answerCallbackQuery({
      text: callback.action === "approve" ? "Deal approved" : "Deal rejected"
    });

    const confirmation =
      callback.action === "approve"
        ? `Deal approved for ${callback.channelUsername}. Status: ${deal.status}`
        : `Deal rejected for ${callback.channelUsername}. Status: ${deal.status}`;

    if (context.callbackQuery.message !== undefined) {
      await context.editMessageReplyMarkup({ reply_markup: undefined });
    }

    await context.reply(confirmation);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await context.answerCallbackQuery({ text: "Action failed" });
    await context.reply(`Failed to update deal: ${message}`);
  }
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

    try {
      const result = await runAgent(campaign.id);

      if (!result.success || result.selectedChannel === undefined || result.deal === undefined) {
        const message = result.reason ?? result.error ?? "Recommendation unavailable";
        await context.reply(`Recommendation could not be produced: ${message}`);
        return;
      }

      await context.reply(
        formatRecommendationMessage({
          campaignId: result.campaignId,
          title: result.selectedChannel.title,
          username: result.selectedChannel.username,
          price: result.selectedChannel.price,
          status: result.deal.status,
          reason: result.reason ?? "No reason provided"
        }),
        {
          reply_markup: createRecommendationKeyboard(
            result.deal.id,
            result.selectedChannel.username
          )
        }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await context.reply(`Recommendation could not be produced: ${message}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await context.reply(`Failed to create campaign: ${message}`);
  }
});
