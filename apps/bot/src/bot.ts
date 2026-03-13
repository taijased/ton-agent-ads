import { Bot, Context, InlineKeyboard } from "grammy";
import {
  campaignGoals,
  campaignLanguages,
  type Deal,
  type DealStatus,
  type CampaignGoal,
  type CampaignLanguage,
  type CreateCampaignInput
} from "@repo/types";
import {
  approveDeal,
  createCampaign,
  rejectDeal,
  runAgent,
  updateDealStatus
} from "./api.js";
import { botState } from "./state.js";

const botToken = process.env.BOT_TOKEN;

if (botToken === undefined || botToken.trim().length === 0) {
  throw new Error("BOT_TOKEN is required");
}

export const bot = new Bot(botToken);

const positiveDecimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

const dealStatusCallbackCodes: Record<
  | "admin_outreach_pending"
  | "admin_contacted"
  | "terms_agreed"
  | "payment_pending"
  | "paid"
  | "proof_pending"
  | "completed"
  | "failed",
  string
> = {
  admin_outreach_pending: "aop",
  admin_contacted: "ac",
  terms_agreed: "ta",
  payment_pending: "pp",
  paid: "pd",
  proof_pending: "pr",
  completed: "cm",
  failed: "fl"
};

const dealStatusFromCallbackCode: Record<string, DealStatus> = Object.fromEntries(
  Object.entries(dealStatusCallbackCodes).map(([status, code]) => [code, status])
) as Record<string, DealStatus>;

const createDealStatusCallbackData = (dealId: string, status: keyof typeof dealStatusCallbackCodes): string =>
  `ds:${dealId}:${dealStatusCallbackCodes[status]}`;

const createRecommendationKeyboard = (
  dealId: string
): InlineKeyboard =>
  new InlineKeyboard()
    .text("Approve", `approve:${dealId}`)
    .text("Reject", `reject:${dealId}`);

const createDealStatusKeyboard = (dealId: string, status: DealStatus): InlineKeyboard | undefined => {
  if (status === "approved") {
    return new InlineKeyboard()
      .text("Start Outreach", createDealStatusCallbackData(dealId, "admin_outreach_pending"))
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  if (status === "admin_outreach_pending" || status === "admin_contacted") {
    return new InlineKeyboard()
      .text("Mark Admin Contacted", createDealStatusCallbackData(dealId, "admin_contacted"))
      .text("Mark Terms Agreed", createDealStatusCallbackData(dealId, "terms_agreed"))
      .row()
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  if (status === "terms_agreed") {
    return new InlineKeyboard()
      .text("Request Payment", createDealStatusCallbackData(dealId, "payment_pending"))
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  if (status === "payment_pending") {
    return new InlineKeyboard()
      .text("Mark Paid", createDealStatusCallbackData(dealId, "paid"))
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  if (status === "paid") {
    return new InlineKeyboard()
      .text("Attach Proof", createDealStatusCallbackData(dealId, "proof_pending"))
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  if (status === "proof_pending") {
    return new InlineKeyboard()
      .text("Complete Deal", createDealStatusCallbackData(dealId, "completed"))
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  return undefined;
};

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

const formatDealStatusMessage = (deal: Deal): string =>
  formatDealStatusMessageWithContext(deal);

const formatDealStatusMessageWithContext = (
  deal: Deal,
  options?: {
    channelTitle?: string;
    channelUsername?: string;
    adminUsername?: string | null;
  }
): string =>
  [
    "Deal execution update",
    "",
    `Deal: ${deal.id}`,
    `Campaign: ${deal.campaignId}`,
    options?.channelTitle && options?.channelUsername
      ? `Channel: ${options.channelTitle} (${options.channelUsername})`
      : null,
    options?.adminUsername ? `Admin: ${options.adminUsername}` : null,
    `Status: ${deal.status}`,
    deal.outreachError ? `Outreach error: ${deal.outreachError}` : null,
    deal.adminOutboundMessageId ? `Outbound message ID: ${deal.adminOutboundMessageId}` : null,
    deal.proofUrl ? `Proof URL: ${deal.proofUrl}` : null,
    deal.proofText ? `Proof: ${deal.proofText}` : null
  ]
    .filter((value): value is string => value !== null)
    .join("\n");

const parseActionCallback = (
  data: string | undefined
):
  | { action: "approve" | "reject"; dealId: string }
  | { action: "deal_status"; dealId: string; status: DealStatus }
  | null => {
  if (data === undefined) {
    return null;
  }

  const [action, dealId, statusCode] = data.split(":");

  if (action === "ds") {
    if (dealId === undefined || dealId.length === 0 || statusCode === undefined || statusCode.length === 0) {
      return null;
    }

    const status = dealStatusFromCallbackCode[statusCode];

    if (status === undefined) {
      return null;
    }

    return {
      action: "deal_status",
      dealId,
      status
    };
  }

  if (
    (action !== "approve" && action !== "reject") ||
    dealId === undefined ||
    dealId.length === 0
  ) {
    return null;
  }

  return {
    action,
    dealId
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
    botState.finishProofCapture(String(userId));
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
    if (callback.action === "deal_status") {
      const dealContext = botState.getDealContext(callback.dealId);

      if (callback.status === "proof_pending") {
        if (context.from === undefined) {
          await context.answerCallbackQuery({ text: "Unable to identify user." });
          return;
        }

        botState.startProofCapture(String(context.from.id), callback.dealId);
        await context.answerCallbackQuery({ text: "Send proof text or URL" });
        await context.reply("Send proof text or URL for this deal.");
        return;
      }

      const deal = await updateDealStatus(callback.dealId, {
        status: callback.status
      });

      await context.answerCallbackQuery({ text: `Status updated: ${deal.status}` });

      if (context.callbackQuery.message !== undefined) {
        await context.editMessageReplyMarkup({ reply_markup: undefined });
      }

      await context.reply(
        formatDealStatusMessageWithContext(deal, {
          channelTitle: dealContext?.channelTitle,
          channelUsername: dealContext?.channelUsername,
          adminUsername: dealContext?.adminUsername
        }),
        {
          reply_markup: createDealStatusKeyboard(deal.id, deal.status)
        }
      );

      if (deal.status === "completed" || deal.status === "failed" || deal.status === "rejected") {
        botState.clearDealContext(deal.id);
      }

      return;
    }

    const dealContext = botState.getDealContext(callback.dealId);

    const deal =
      callback.action === "approve"
        ? await approveDeal(callback.dealId)
        : await rejectDeal(callback.dealId);

    await context.answerCallbackQuery({
      text: callback.action === "approve" ? "Deal approved" : "Deal rejected"
    });

    if (context.callbackQuery.message !== undefined) {
      await context.editMessageReplyMarkup({ reply_markup: undefined });
    }

    await context.reply(
      formatDealStatusMessageWithContext(deal, {
        channelTitle: dealContext?.channelTitle,
        channelUsername: dealContext?.channelUsername,
        adminUsername: dealContext?.adminUsername
      }),
      {
        reply_markup: createDealStatusKeyboard(deal.id, deal.status)
      }
    );

    if (deal.status === "rejected") {
      botState.clearDealContext(deal.id);
    }
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

  const proofCapture = botState.getProofCapture(userId);

  if (proofCapture !== undefined) {
    const proofValue = context.msg.text.trim();

    if (proofValue.length === 0) {
      await context.reply("Proof cannot be empty. Send proof text or URL.");
      return;
    }

    try {
      const normalizedUrl = (() => {
        try {
          const url = new URL(proofValue);
          return url.protocol === "http:" || url.protocol === "https:" ? proofValue : null;
        } catch {
          return null;
        }
      })();

      const deal = await updateDealStatus(proofCapture.dealId, {
        status: "proof_pending",
        proofText: normalizedUrl === null ? proofValue : null,
        proofUrl: normalizedUrl
      });

      const dealContext = botState.getDealContext(proofCapture.dealId);

      botState.finishProofCapture(userId);

      await context.reply(
        formatDealStatusMessageWithContext(deal, {
          channelTitle: dealContext?.channelTitle,
          channelUsername: dealContext?.channelUsername,
          adminUsername: dealContext?.adminUsername
        }),
        {
        reply_markup: createDealStatusKeyboard(deal.id, deal.status)
        }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await context.reply(`Failed to attach proof: ${message}`);
    }

    return;
  }

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

      botState.setDealContext(result.deal.id, {
        channelTitle: result.selectedChannel.title,
        channelUsername: result.selectedChannel.username,
        adminUsername: result.selectedChannel.adminUsername
      });

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
          reply_markup: createRecommendationKeyboard(result.deal.id)
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
