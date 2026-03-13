import { Bot, Context, InlineKeyboard } from "grammy";
import {
  campaignGoals,
  campaignLanguages,
  type CampaignGoal,
  type CampaignLanguage,
  type CreateCampaignInput
} from "@repo/types";
import { approveDeal, createCampaign, rejectDeal, runAgent } from "./api.js";
import { botState } from "./state.js";

const botToken = process.env.BOT_TOKEN;

if (botToken === undefined || botToken.trim().length === 0) {
  throw new Error("BOT_TOKEN is required");
}

export const bot = new Bot(botToken);

const positiveDecimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

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

const normalizeLanguage = (value: string): CampaignLanguage | null => {
  const normalized = value.trim().toUpperCase();

  return campaignLanguages.includes(normalized as CampaignLanguage)
    ? (normalized as CampaignLanguage)
    : null;
};

const normalizeGoal = (value: string): CampaignGoal | null => {
  const normalized = value.trim().toUpperCase();

  return campaignGoals.includes(normalized as CampaignGoal)
    ? (normalized as CampaignGoal)
    : null;
};

const isPositiveBudgetAmount = (value: string): boolean =>
  positiveDecimalPattern.test(value.trim()) && Number(value) > 0;

const promptForStep = async (
  context: Context,
  step: "text" | "budgetAmount" | "theme" | "language" | "goal"
): Promise<void> => {
  if (step === "text") {
    await context.reply("Send campaign text");
    return;
  }

  if (step === "budgetAmount") {
    await context.reply("Send budget amount in TON, for example: 10 or 10.5");
    return;
  }

  if (step === "theme") {
    await context.reply("Send campaign theme or - to skip");
    return;
  }

  if (step === "language") {
    await context.reply("Send language: RU, EN, or OTHER");
    return;
  }

  await context.reply("Send goal: AWARENESS, TRAFFIC, SUBSCRIBERS, or SALES");
};

const createCampaignPayload = (input: {
  userId: string;
  text: string;
  budgetAmount: string;
  theme: string | null;
  language: CampaignLanguage;
  goal: CampaignGoal;
}): CreateCampaignInput => ({
  userId: input.userId,
  text: input.text,
  budgetAmount: input.budgetAmount,
  budgetCurrency: "TON",
  theme: input.theme,
  language: input.language,
  goal: input.goal
});

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

  await promptForStep(context, "text");
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

  const state = botState.getCampaignCreation(userId);

  if (state === undefined) {
    return;
  }

  const text = context.msg.text.trim();

  if (state.step === "text") {
    if (text.length === 0) {
      await context.reply("Campaign text cannot be empty. Send campaign text.");
      return;
    }

    botState.updateCampaignCreation(userId, {
      step: "budgetAmount",
      draft: {
        ...state.draft,
        text
      }
    });

    await promptForStep(context, "budgetAmount");
    return;
  }

  if (state.step === "budgetAmount") {
    if (!isPositiveBudgetAmount(text)) {
      await context.reply("Budget must be a positive number like 10 or 10.5");
      return;
    }

    botState.updateCampaignCreation(userId, {
      step: "theme",
      draft: {
        ...state.draft,
        budgetAmount: text,
        budgetCurrency: "TON"
      }
    });

    await promptForStep(context, "theme");
    return;
  }

  if (state.step === "theme") {
    botState.updateCampaignCreation(userId, {
      step: "language",
      draft: {
        ...state.draft,
        theme: text === "-" ? null : text
      }
    });

    await promptForStep(context, "language");
    return;
  }

  if (state.step === "language") {
    const language = normalizeLanguage(text);

    if (language === null) {
      await context.reply("Language must be RU, EN, or OTHER");
      return;
    }

    botState.updateCampaignCreation(userId, {
      step: "goal",
      draft: {
        ...state.draft,
        language
      }
    });

    await promptForStep(context, "goal");
    return;
  }

  const goal = normalizeGoal(text);

  if (goal === null) {
    await context.reply("Goal must be AWARENESS, TRAFFIC, SUBSCRIBERS, or SALES");
    return;
  }

  const payload = createCampaignPayload({
    userId,
    text: state.draft.text ?? "",
    budgetAmount: state.draft.budgetAmount ?? "",
    theme: state.draft.theme ?? null,
    language: state.draft.language ?? "OTHER",
    goal
  });

  try {
    const campaign = await createCampaign(payload);

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
