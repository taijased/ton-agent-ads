import { Bot, Context, InlineKeyboard } from "grammy";
import {
  campaignGoals,
  campaignLanguages,
  type Deal,
  type DealStatus,
  type DealWritableStatus,
  type CampaignGoal,
  type CampaignLanguage,
  type CreateCampaignInput,
} from "@repo/types";
import {
  approveDeal,
  approveApprovalRequest,
  counterApprovalRequest,
  createCampaign,
  rejectDeal,
  rejectApprovalRequest,
  searchChannels,
  submitTargetChannel,
  updateDealStatus,
} from "./api.js";
import { botState } from "./state.js";
import { TestSession } from "./test-session.js";
import { registerPipelineHandlers } from "./test-pipeline-handlers.js";
import { mockChannels, type MockChannel } from "./mock-channels.js";

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
  failed: "fl",
};

const dealStatusFromCallbackCode: Record<string, DealWritableStatus> =
  Object.fromEntries(
    Object.entries(dealStatusCallbackCodes).map(([status, code]) => [
      code,
      status,
    ]),
  ) as Record<string, DealWritableStatus>;

const createDealStatusCallbackData = (
  dealId: string,
  status: keyof typeof dealStatusCallbackCodes,
): string => `ds:${dealId}:${dealStatusCallbackCodes[status]}`;

const createRecommendationKeyboard = (dealId: string): InlineKeyboard =>
  new InlineKeyboard()
    .text("Approve", `approve:${dealId}`)
    .text("Reject", `reject:${dealId}`);

const createDealStatusKeyboard = (
  dealId: string,
  status: DealStatus,
): InlineKeyboard | undefined => {
  if (status === "approved") {
    return new InlineKeyboard()
      .text(
        "Start Outreach",
        createDealStatusCallbackData(dealId, "admin_outreach_pending"),
      )
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  if (status === "admin_outreach_pending" || status === "admin_contacted") {
    const keyboard = new InlineKeyboard();

    if (status === "admin_contacted") {
      keyboard.text(
        "Send Follow-up",
        createDealStatusCallbackData(dealId, "admin_outreach_pending"),
      );
    } else {
      keyboard.text(
        "Mark Admin Contacted",
        createDealStatusCallbackData(dealId, "admin_contacted"),
      );
    }

    return keyboard
      .text(
        "Mark Terms Agreed",
        createDealStatusCallbackData(dealId, "terms_agreed"),
      )
      .row()
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  if (status === "terms_agreed") {
    return new InlineKeyboard()
      .text(
        "Request Payment",
        createDealStatusCallbackData(dealId, "payment_pending"),
      )
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  if (status === "payment_pending") {
    return new InlineKeyboard()
      .text("Mark Paid", createDealStatusCallbackData(dealId, "paid"))
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  if (status === "paid") {
    return new InlineKeyboard()
      .text(
        "Attach Proof",
        createDealStatusCallbackData(dealId, "proof_pending"),
      )
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  if (status === "proof_pending") {
    return new InlineKeyboard()
      .text("Complete Deal", createDealStatusCallbackData(dealId, "completed"))
      .text("Fail Deal", createDealStatusCallbackData(dealId, "failed"));
  }

  return undefined;
};

const formatParsedChannelMessage = (input: {
  campaignId: string;
  dealId: string;
  title: string;
  username: string;
  description: string;
  extractedUsernames: string[];
  extractedLinks: string[];
  adsContact: boolean;
  selectedContact: string | null;
  status: string;
}): string =>
  [
    "Target channel parsed",
    "",
    `Campaign: ${input.campaignId}`,
    `Deal: ${input.dealId}`,
    `Channel: ${input.title} (${input.username})`,
    input.description ? `About: ${input.description}` : null,
    input.extractedUsernames.length > 0
      ? `Usernames: ${input.extractedUsernames.join(", ")}`
      : "Usernames: none",
    input.extractedLinks.length > 0
      ? `Links: ${input.extractedLinks.join(", ")}`
      : "Links: none",
    `Ads/contact signal: ${input.adsContact ? "yes" : "no"}`,
    input.selectedContact
      ? `Selected contact: ${input.selectedContact}`
      : "Selected contact: none",
    `Status: ${input.status}`,
    "Review and approve the deal to start outreach.",
  ].join("\n");

const formatApprovalActionMessage = (input: {
  status: string;
  summary: string;
  proposedPriceTon: number | null;
}): string =>
  [
    "Approval request updated",
    "",
    `Status: ${input.status}`,
    input.proposedPriceTon !== null
      ? `Price: ${input.proposedPriceTon} TON`
      : null,
    `Summary: ${input.summary}`,
  ]
    .filter((value): value is string => value !== null)
    .join("\n");

const formatDealStatusMessage = (deal: Deal): string =>
  formatDealStatusMessageWithContext(deal);

const formatDealStatusMessageWithContext = (
  deal: Deal,
  options?: {
    channelTitle?: string;
    channelUsername?: string;
    contactValue?: string | null;
  },
): string =>
  [
    "Deal execution update",
    "",
    `Deal: ${deal.id}`,
    `Campaign: ${deal.campaignId}`,
    options?.channelTitle && options?.channelUsername
      ? `Channel: ${options.channelTitle} (${options.channelUsername})`
      : null,
    options?.contactValue ? `Contact: ${options.contactValue}` : null,
    `Status: ${deal.status}`,
    deal.outreachError ? `Outreach error: ${deal.outreachError}` : null,
    deal.adminOutboundMessageId
      ? `Outbound message ID: ${deal.adminOutboundMessageId}`
      : null,
    deal.proofUrl ? `Proof URL: ${deal.proofUrl}` : null,
    deal.proofText ? `Proof: ${deal.proofText}` : null,
  ]
    .filter((value): value is string => value !== null)
    .join("\n");

const parseActionCallback = (
  data: string | undefined,
):
  | { action: "approve" | "reject"; dealId: string }
  | { action: "deal_status"; dealId: string; status: DealWritableStatus }
  | {
      action: "approval_request";
      decision: "approve" | "reject" | "counter";
      approvalRequestId: string;
    }
  | null => {
  if (data === undefined) {
    return null;
  }

  const [action, dealId, statusCode] = data.split(":");

  if (action === "approval") {
    const decision = dealId;
    const approvalRequestId = statusCode;

    if (
      (decision !== "approve" &&
        decision !== "reject" &&
        decision !== "counter") ||
      approvalRequestId === undefined ||
      approvalRequestId.length === 0
    ) {
      return null;
    }

    return {
      action: "approval_request",
      decision,
      approvalRequestId,
    };
  }

  if (action === "ds") {
    if (
      dealId === undefined ||
      dealId.length === 0 ||
      statusCode === undefined ||
      statusCode.length === 0
    ) {
      return null;
    }

    const status = dealStatusFromCallbackCode[statusCode];

    if (status === undefined) {
      return null;
    }

    return {
      action: "deal_status",
      dealId,
      status,
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
    dealId,
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
  step:
    | "text"
    | "budgetAmount"
    | "theme"
    | "language"
    | "goal"
    | "targetChannel",
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

  if (step === "goal") {
    await context.reply("Send goal: AWARENESS, TRAFFIC, SUBSCRIBERS, or SALES");
    return;
  }

  await context.reply(
    "Send target Telegram channel: @example or https://t.me/example",
  );
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
  goal: input.goal,
});

bot.command("start", async (context) => {
  const userId = context.from?.id;

  if (userId !== undefined) {
    botState.finishCampaignCreation(String(userId));
    botState.finishProofCapture(String(userId));
    botState.finishApprovalCounter(String(userId));
    botState.finishTestMode(String(userId));
    botState.finishPipelineMode(String(userId));
  }

  await context.reply(
    "Welcome to ton-adagent bot. Use /new to create a campaign.",
  );
});

registerPipelineHandlers(bot);

bot.command("new", async (context) => {
  if (context.from === undefined) {
    await context.reply("Unable to identify user for campaign creation.");
    return;
  }

  botState.startCampaignCreation(String(context.from.id));

  await promptForStep(context, "text");
});

bot.command("test_negotiation", async (context) => {
  if (context.from === undefined) {
    await context.reply("Unable to identify user.");
    return;
  }

  const userId = String(context.from.id);

  if (botState.isInTestMode(userId)) {
    botState.finishTestMode(userId);
    await context.reply("[NEGOTIATION TEST] Previous test session ended.");
  }

  const args = context.match?.toString().trim() ?? "";
  let scenarioIndex = 0;
  if (args.length > 0) {
    const parsed = parseInt(args, 10);
    if (parsed >= 1 && parsed <= 5) {
      scenarioIndex = parsed - 1;
    } else {
      await context.reply("Scenario must be 1-5. Using scenario 1.");
    }
  }

  if (
    !process.env.OPEN_AI_TOKEN ||
    process.env.OPEN_AI_TOKEN.trim().length === 0
  ) {
    await context.reply("OPEN_AI_TOKEN is required for test mode.");
    return;
  }

  const chatId = context.chat.id;
  const sendReply = async (text: string): Promise<void> => {
    await context.api.sendMessage(chatId, `[AGENT]: ${text}`);
  };

  const session = new TestSession(userId, scenarioIndex, sendReply);

  try {
    const result = await session.start();
    botState.startTestMode(userId, session);
    botState.finishCampaignCreation(userId);
    botState.finishProofCapture(userId);
    botState.finishApprovalCounter(userId);

    await context.reply(
      [
        `[NEGOTIATION TEST] Scenario ${scenarioIndex + 1}: ${result.scenarioName}`,
        result.scenarioDescription,
        "",
        `Channel: ${result.channelTitle} (${result.channelUsername})`,
        `Campaign budget: ${result.campaignBudget} TON`,
        `Contact: ${result.contactValue}`,
        "",
        "--- Outreach message (what admin receives) ---",
        "",
        result.outreachMessage,
        "",
        "---",
        "Now type as the channel admin would reply.",
        "Send /stop to exit test mode.",
      ].join("\n"),
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await context.reply(`[NEGOTIATION TEST] Failed to start: ${message}`);
  }
});

bot.command("stop", async (context) => {
  if (context.from === undefined) return;
  const userId = String(context.from.id);

  const wasPipeline = botState.isInPipelineMode(userId);
  const wasTest = botState.isInTestMode(userId);

  if (!wasPipeline && !wasTest) {
    await context.reply("No active test session.");
    return;
  }

  botState.finishPipelineMode(userId);
  botState.finishTestMode(userId);

  if (wasPipeline) {
    await context.reply("Pipeline test session ended.");
  } else {
    await context.reply("[NEGOTIATION TEST] Test session ended.");
  }
});

bot.command("test_search", async (context) => {
  if (context.from === undefined) {
    await context.reply("Unable to identify user.");
    return;
  }

  const input = context.match?.toString().trim() ?? "";
  const keywords = input.split(/\s+/).filter((k) => k.length >= 2);

  if (keywords.length === 0) {
    await context.reply(
      "Usage: /test_search <keywords>\n" +
        "Example: /test_search crypto business news",
    );
    return;
  }

  if (keywords.length > 5) {
    await context.reply("Maximum 5 keywords allowed.");
    return;
  }

  await context.reply(`Searching for channels: ${keywords.join(", ")}...`);

  try {
    const result = await searchChannels(keywords);

    if (result.expandedKeywords && result.expandedKeywords.length > 0) {
      await context.reply(
        `Extended search keywords: ${result.expandedKeywords.join(", ")}`,
      );
    }

    if (result.results.length === 0) {
      await context.reply(`No channels found for: ${keywords.join(", ")}`);
      return;
    }

    const lines = result.results.map((ch, i) => {
      const parts = [`${i + 1}. ${ch.title}`, `   ${ch.username}`];

      if (ch.subscriberCount !== null) {
        parts.push(`   Subscribers: ${ch.subscriberCount.toLocaleString()}`);
      }

      if (ch.contact !== null) {
        const label = ch.contact.isAdsContact ? "Ads contact" : "Contact";
        parts.push(`   ${label}: ${ch.contact.value}`);
      }

      return parts.join("\n");
    });

    const header = `Found ${result.totalFound} channels, ${result.results.length} with contacts:\n`;

    let message = header;
    for (const line of lines) {
      if (message.length + line.length + 2 > 4000) {
        await context.reply(message);
        message = "";
      }
      message += "\n" + line;
    }

    if (message.length > 0) {
      await context.reply(message);
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await context.reply(`Search failed: ${errorMessage}`);
  }
});

bot.on("callback_query:data", async (context) => {
  const data = context.callbackQuery.data;

  if (data.startsWith("pch:")) {
    const parts = data.split(":");
    const channelIndex = parseInt(parts[1] ?? "", 10);
    const cbUserId = context.from ? String(context.from.id) : undefined;

    if (cbUserId === undefined) {
      await context.answerCallbackQuery({ text: "Unable to identify user." });
      return;
    }

    const pipeline = botState.getPipelineMode(cbUserId);
    if (pipeline === undefined) {
      await context.answerCallbackQuery({ text: "No active pipeline." });
      return;
    }

    await context.answerCallbackQuery({ text: "Starting negotiation..." });
    if (context.callbackQuery.message !== undefined) {
      await context.editMessageReplyMarkup({ reply_markup: undefined });
    }

    const result = await pipeline.selectChannel(channelIndex);
    if (result.replies) {
      for (const r of result.replies) {
        await context.reply(
          r.text,
          r.keyboard ? { reply_markup: r.keyboard } : undefined,
        );
      }
    } else if (result.reply) {
      await context.reply(
        result.reply,
        result.keyboard ? { reply_markup: result.keyboard } : undefined,
      );
    }
    return;
  }

  if (data.startsWith("pinv:")) {
    const parts = data.split(":");
    const action = parts[1];
    const userId = context.from ? String(context.from.id) : undefined;

    if (userId === undefined) {
      await context.answerCallbackQuery({ text: "Unable to identify user." });
      return;
    }

    const pipeline = botState.getPipelineMode(userId);
    if (pipeline === undefined) {
      await context.answerCallbackQuery({ text: "No active pipeline." });
      return;
    }

    if (action !== "approve" && action !== "decline") {
      await context.answerCallbackQuery({ text: "Invalid action." });
      return;
    }

    await context.answerCallbackQuery({
      text: action === "approve" ? "Payment processing..." : "Declining...",
    });

    if (context.callbackQuery.message !== undefined) {
      await context.editMessageReplyMarkup({ reply_markup: undefined });
    }

    const result = pipeline.handleInvoiceAction(action);

    if (result.replies) {
      for (const r of result.replies) {
        await context.reply(
          r.text,
          r.keyboard ? { reply_markup: r.keyboard } : undefined,
        );
      }
    } else if (result.reply) {
      await context.reply(
        result.reply,
        result.keyboard ? { reply_markup: result.keyboard } : undefined,
      );
    }

    if (result.done) {
      botState.finishPipelineMode(userId);
    }

    return;
  }

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
          await context.answerCallbackQuery({
            text: "Unable to identify user.",
          });
          return;
        }

        botState.startProofCapture(String(context.from.id), callback.dealId);
        await context.answerCallbackQuery({ text: "Send proof text or URL" });
        await context.reply("Send proof text or URL for this deal.");
        return;
      }

      const deal = await updateDealStatus(callback.dealId, {
        status: callback.status,
      });

      await context.answerCallbackQuery({
        text: `Status updated: ${deal.status}`,
      });

      if (context.callbackQuery.message !== undefined) {
        await context.editMessageReplyMarkup({ reply_markup: undefined });
      }

      await context.reply(
        formatDealStatusMessageWithContext(deal, {
          channelTitle: dealContext?.channelTitle,
          channelUsername: dealContext?.channelUsername,
          contactValue: dealContext?.contactValue,
        }),
        {
          reply_markup: createDealStatusKeyboard(deal.id, deal.status),
        },
      );

      if (
        deal.status === "completed" ||
        deal.status === "failed" ||
        deal.status === "rejected"
      ) {
        botState.clearDealContext(deal.id);
      }

      return;
    }

    if (callback.action === "approval_request") {
      if (context.from === undefined) {
        await context.answerCallbackQuery({ text: "Unable to identify user." });
        return;
      }

      if (botState.isInTestMode(String(context.from.id))) {
        const testMode = botState.getTestMode(String(context.from.id));
        if (testMode !== undefined) {
          if (callback.decision === "counter") {
            botState.startApprovalCounter(
              String(context.from.id),
              callback.approvalRequestId,
            );
            await context.answerCallbackQuery({
              text: "Send counter-offer text",
            });
            await context.reply("[TEST MODE] Send your counter-offer text.");
            return;
          }

          const testResult =
            callback.decision === "approve"
              ? await testMode.session.approveApproval(
                  callback.approvalRequestId,
                )
              : await testMode.session.rejectApproval(
                  callback.approvalRequestId,
                );

          await context.answerCallbackQuery({
            text: callback.decision === "approve" ? "Approved" : "Rejected",
          });

          if (context.callbackQuery.message !== undefined) {
            await context.editMessageReplyMarkup({ reply_markup: undefined });
          }

          await context.reply(`[TEST MODE] Deal ${testResult.dealStatus}`);
          return;
        }
      }

      if (callback.decision === "counter") {
        botState.startApprovalCounter(
          String(context.from.id),
          callback.approvalRequestId,
        );
        await context.answerCallbackQuery({
          text: "Send a counter-offer or short instruction",
        });
        await context.reply(
          "Send a new price or short instruction for the counter-offer.",
        );
        return;
      }

      const result =
        callback.decision === "approve"
          ? await approveApprovalRequest(callback.approvalRequestId)
          : await rejectApprovalRequest(callback.approvalRequestId);

      await context.answerCallbackQuery({
        text:
          callback.decision === "approve" ? "Offer approved" : "Offer rejected",
      });

      if (context.callbackQuery.message !== undefined) {
        await context.editMessageReplyMarkup({ reply_markup: undefined });
      }

      await context.reply(
        formatApprovalActionMessage({
          status: result.approvalRequest.status,
          summary: result.approvalRequest.summary,
          proposedPriceTon: result.approvalRequest.proposedPriceTon,
        }),
      );

      const dealContext = botState.getDealContext(result.deal.id);

      await context.reply(
        formatDealStatusMessageWithContext(result.deal, {
          channelTitle: dealContext?.channelTitle,
          channelUsername: dealContext?.channelUsername,
          contactValue: dealContext?.contactValue,
        }),
        {
          reply_markup: createDealStatusKeyboard(
            result.deal.id,
            result.deal.status,
          ),
        },
      );

      return;
    }

    const dealContext = botState.getDealContext(callback.dealId);

    const deal =
      callback.action === "approve"
        ? await approveDeal(callback.dealId)
        : await rejectDeal(callback.dealId);

    await context.answerCallbackQuery({
      text: callback.action === "approve" ? "Deal approved" : "Deal rejected",
    });

    if (context.callbackQuery.message !== undefined) {
      await context.editMessageReplyMarkup({ reply_markup: undefined });
    }

    await context.reply(
      formatDealStatusMessageWithContext(deal, {
        channelTitle: dealContext?.channelTitle,
        channelUsername: dealContext?.channelUsername,
        contactValue: dealContext?.contactValue,
      }),
      {
        reply_markup: createDealStatusKeyboard(deal.id, deal.status),
      },
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
          return url.protocol === "http:" || url.protocol === "https:"
            ? proofValue
            : null;
        } catch {
          return null;
        }
      })();

      const deal = await updateDealStatus(proofCapture.dealId, {
        status: "proof_pending",
        proofText: normalizedUrl === null ? proofValue : null,
        proofUrl: normalizedUrl,
      });

      const dealContext = botState.getDealContext(proofCapture.dealId);

      botState.finishProofCapture(userId);

      await context.reply(
        formatDealStatusMessageWithContext(deal, {
          channelTitle: dealContext?.channelTitle,
          channelUsername: dealContext?.channelUsername,
          contactValue: dealContext?.contactValue,
        }),
        {
          reply_markup: createDealStatusKeyboard(deal.id, deal.status),
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await context.reply(`Failed to attach proof: ${message}`);
    }

    return;
  }

  const approvalCounter = botState.getApprovalCounter(userId);

  if (approvalCounter !== undefined) {
    const counterText = context.msg.text.trim();

    if (counterText.length === 0) {
      await context.reply(
        "Counter-offer cannot be empty. Send a price or short instruction.",
      );
      return;
    }

    if (botState.isInTestMode(userId)) {
      const testMode = botState.getTestMode(userId);
      if (testMode !== undefined) {
        try {
          await testMode.session.counterApproval(
            approvalCounter.approvalRequestId,
            counterText,
          );
          botState.finishApprovalCounter(userId);
          await context.reply("[TEST MODE] Counter-offer sent.");
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          await context.reply(`[TEST MODE] Counter-offer failed: ${message}`);
        }
        return;
      }
    }

    try {
      const result = await counterApprovalRequest(
        approvalCounter.approvalRequestId,
        counterText,
      );

      botState.finishApprovalCounter(userId);

      await context.reply(
        formatApprovalActionMessage({
          status: result.approvalRequest.status,
          summary: result.approvalRequest.summary,
          proposedPriceTon: result.approvalRequest.proposedPriceTon,
        }),
      );

      const dealContext = botState.getDealContext(result.deal.id);

      await context.reply(
        formatDealStatusMessageWithContext(result.deal, {
          channelTitle: dealContext?.channelTitle,
          channelUsername: dealContext?.channelUsername,
          contactValue: dealContext?.contactValue,
        }),
        {
          reply_markup: createDealStatusKeyboard(
            result.deal.id,
            result.deal.status,
          ),
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await context.reply(`Failed to send counter-offer: ${message}`);
    }

    return;
  }

  const pipelineSession = botState.getPipelineMode(userId);
  if (pipelineSession !== undefined) {
    try {
      const result = await pipelineSession.handleMessage(context.msg.text);
      if (result.replies) {
        for (const r of result.replies) {
          await context.reply(
            r.text,
            r.keyboard ? { reply_markup: r.keyboard } : undefined,
          );
        }
      } else if (result.reply) {
        await context.reply(
          result.reply,
          result.keyboard ? { reply_markup: result.keyboard } : undefined,
        );
      }
      if (result.done) {
        botState.finishPipelineMode(userId);
      }

      if (
        result.triggerSearch &&
        pipelineSession.phase.kind === "searching"
      ) {
        const keywords = pipelineSession.getSearchKeywords();
        let channels: MockChannel[];

        try {
          const searchResult = await searchChannels(keywords);
          channels = searchResult.results.map((ch) => ({
            id: ch.username,
            username: ch.username,
            title: ch.title,
            description: ch.description ?? "",
            subscriberCount: ch.subscriberCount ?? 0,
            price: 0,
            contacts: ch.contact
              ? [
                  {
                    type: "username" as const,
                    value: ch.contact.value,
                    source: "extracted_username" as const,
                    isAdsContact: ch.contact.isAdsContact,
                  },
                ]
              : [],
          }));
        } catch {
          channels = mockChannels.slice(0, 5);
          await context.reply(
            "\u{1F4E1} Using simulated channels (no Telegram connection)",
          );
        }

        const searchResult =
          pipelineSession.setSearchResults(channels);
        if (searchResult.reply) {
          await context.reply(
            searchResult.reply,
            searchResult.keyboard
              ? { reply_markup: searchResult.keyboard }
              : undefined,
          );
        }
        if (searchResult.done) {
          botState.finishPipelineMode(userId);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await context.reply(`Pipeline error: ${message}`);
    }
    return;
  }

  const testMode = botState.getTestMode(userId);

  if (testMode !== undefined) {
    try {
      const testResult = await testMode.session.handleAdminMessage(
        context.msg.text,
      );

      if (
        testResult.action === "request_user_approval" &&
        testResult.approvalRequestId
      ) {
        const keyboard = new InlineKeyboard()
          .text("Approve", `approval:approve:${testResult.approvalRequestId}`)
          .text("Reject", `approval:reject:${testResult.approvalRequestId}`)
          .row()
          .text("Counter", `approval:counter:${testResult.approvalRequestId}`);

        await context.reply(
          [
            "[TEST MODE] Agent requests your approval",
            testResult.summary ? `Summary: ${testResult.summary}` : null,
          ]
            .filter((v): v is string => v !== null)
            .join("\n"),
          { reply_markup: keyboard },
        );
      } else if (testResult.action === "decline") {
        await context.reply("[TEST MODE] Agent declined the deal.");
      } else if (testResult.action === "wait") {
        await context.reply(
          "[TEST MODE] Agent decided to wait (no reply sent).",
        );
      } else if (testResult.action === "handoff_to_human") {
        await context.reply(
          `[TEST MODE] Handoff to human: ${testResult.summary ?? "Manual review needed"}`,
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await context.reply(`[TEST MODE] Error: ${message}`);
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
        text,
      },
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
        budgetCurrency: "TON",
      },
    });

    await promptForStep(context, "theme");
    return;
  }

  if (state.step === "theme") {
    botState.updateCampaignCreation(userId, {
      step: "language",
      draft: {
        ...state.draft,
        theme: text === "-" ? null : text,
      },
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
        language,
      },
    });

    await promptForStep(context, "goal");
    return;
  }

  if (state.step === "goal") {
    const goal = normalizeGoal(text);

    if (goal === null) {
      await context.reply(
        "Goal must be AWARENESS, TRAFFIC, SUBSCRIBERS, or SALES",
      );
      return;
    }

    botState.updateCampaignCreation(userId, {
      step: "targetChannel",
      draft: {
        ...state.draft,
        goal,
      },
    });

    await promptForStep(context, "targetChannel");
    return;
  }

  if (text.length === 0) {
    await context.reply(
      "Target channel cannot be empty. Send @example or https://t.me/example",
    );
    return;
  }

  const payload = createCampaignPayload({
    userId,
    text: state.draft.text ?? "",
    budgetAmount: state.draft.budgetAmount ?? "",
    theme: state.draft.theme ?? null,
    language: state.draft.language ?? "OTHER",
    goal: state.draft.goal ?? "AWARENESS",
  });

  try {
    let campaignId = state.draft.campaignId;

    if (campaignId === undefined) {
      const campaign = await createCampaign(payload);
      campaignId = campaign.id;

      botState.updateCampaignCreation(userId, {
        step: "targetChannel",
        draft: {
          ...state.draft,
          campaignId,
          targetChannelReference: text,
        },
      });

      await context.reply(`Campaign created: ${campaignId}`);
    } else {
      botState.updateCampaignCreation(userId, {
        step: "targetChannel",
        draft: {
          ...state.draft,
          targetChannelReference: text,
        },
      });
    }

    try {
      const result = await submitTargetChannel(campaignId, text);

      botState.finishCampaignCreation(userId);

      botState.setDealContext(result.deal.id, {
        channelTitle: result.channel.title,
        channelUsername: result.channel.username,
        contactValue: result.selectedContact,
      });

      await context.reply(
        formatParsedChannelMessage({
          campaignId: result.campaignId,
          dealId: result.deal.id,
          title: result.channel.title,
          username: result.channel.username,
          description: result.parsed.description,
          extractedUsernames: result.parsed.usernames,
          extractedLinks: result.parsed.links,
          adsContact: result.parsed.adsContact,
          selectedContact: result.selectedContact,
          status: result.deal.status,
        }),
        {
          reply_markup: createRecommendationKeyboard(result.deal.id),
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await context.reply(
        `Target channel could not be parsed: ${message}. Send another @username or t.me link.`,
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await context.reply(`Failed to create campaign: ${message}`);
  }
});
