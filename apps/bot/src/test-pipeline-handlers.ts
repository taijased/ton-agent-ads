import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { TestPipelineSession } from "./test-pipeline-session.js";
import { botState } from "./state.js";

/** Whitelisted channels for /test_new real negotiation */
const TEST_CHANNELS: Array<{ username: string; label: string }> = [
  { username: "t10t10t10t10", label: "@t10t10t10t10" },
  { username: "tontestyshmestyhackaton", label: "@tontestyshmestyhackaton" },
];

export function registerPipelineHandlers(bot: Bot): void {
  bot.command("test", async (context) => {
    const userId = context.from?.id;
    if (userId === undefined) {
      await context.reply("Unable to identify user.");
      return;
    }

    const userIdStr = String(userId);

    // Clear any existing session
    botState.finishTestMode(userIdStr);
    botState.finishCampaignCreation(userIdStr);
    botState.finishPipelineMode(userIdStr);
    botState.finishProofCapture(userIdStr);
    botState.finishApprovalCounter(userIdStr);

    // Validate OpenAI token
    if (!process.env.OPEN_AI_TOKEN?.trim()) {
      await context.reply("OPEN_AI_TOKEN is required for full test pipeline.");
      return;
    }

    const chatId = context.chat.id;
    const sendReply = async (text: string): Promise<void> => {
      await context.api.sendMessage(chatId, `[AGENT]: ${text}`);
    };

    const pipeline = new TestPipelineSession(userIdStr, sendReply, {
      fullPipeline: true,
    });
    botState.startPipelineMode(userIdStr, pipeline);

    await context.reply(
      [
        "\u{1F680} Full Test Pipeline",
        "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
        "This will simulate the complete ad-buying flow:",
        "1. Create campaign (description \u2192 budget \u2192 post)",
        "2. Search for channels",
        "3. Negotiate with channel admin (you play the admin)",
        "4. Approve post, agree on timing and wallet",
        "5. Review invoice and pay",
        "6. Receive published post confirmation",
        "",
        "You'll switch between BUYER and ADMIN roles.",
        "Send /stop at any time to exit.",
        "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550",
        "",
        "Let's start! Describe what you want to advertise:",
        "(What topics would interest your target audience?)",
      ].join("\n"),
    );
  });

  bot.command("test_new", async (context) => {
    if (context.from === undefined) {
      await context.reply("Unable to identify user.");
      return;
    }

    const userId = String(context.from.id);

    // Validate required env vars for real negotiation
    if (!process.env.OPEN_AI_TOKEN?.trim()) {
      await context.reply("OPEN_AI_TOKEN is required for real negotiation.");
      return;
    }
    if (!process.env.TG_SESSION_STRING?.trim()) {
      await context.reply("TG_SESSION_STRING is required for real negotiation.");
      return;
    }

    // Clear existing states
    botState.finishTestMode(userId);
    botState.finishCampaignCreation(userId);
    botState.finishPipelineMode(userId);

    // Check if a channel was provided as argument
    const arg = context.match?.toString().trim() ?? "";
    const directChannel = TEST_CHANNELS.find(
      (ch) => arg === ch.username || arg === ch.label || arg === `@${ch.username}`,
    );

    if (directChannel) {
      const chatId = context.chat.id;
      const sendReply = async (text: string): Promise<void> => {
        await context.api.sendMessage(chatId, text);
      };
      await startTestNewPipelineWithReply(
        userId,
        chatId,
        directChannel.username,
        sendReply,
        async (text: string) => {
          await context.reply(text);
        },
        async (text: string, keyboard: InlineKeyboard) => {
          await context.api.sendMessage(chatId, text, { reply_markup: keyboard });
        },
      );
      return;
    }

    // Show channel selection keyboard
    const keyboard = new InlineKeyboard();
    for (const ch of TEST_CHANNELS) {
      keyboard.text(ch.label, `test_new_ch:${ch.username}`).row();
    }

    await context.reply(
      [
        "Select a channel for real negotiation:",
        "",
        ...TEST_CHANNELS.map((ch) => `  ${ch.label}`),
        "",
        "Or use: /test_new <channel_username>",
      ].join("\n"),
      { reply_markup: keyboard },
    );
  });

  // Handle channel selection callback for /test_new
  bot.callbackQuery(/^test_new_ch:(.+)$/, async (context) => {
    if (context.from === undefined) {
      await context.answerCallbackQuery({ text: "Unable to identify user." });
      return;
    }

    const chatObj = context.chat;
    if (chatObj === undefined) {
      await context.answerCallbackQuery({ text: "Unable to identify chat." });
      return;
    }

    const userId = String(context.from.id);
    const channelUsername = context.match[1];

    // Validate the channel is in the whitelist
    const channel = TEST_CHANNELS.find((ch) => ch.username === channelUsername);
    if (!channel) {
      await context.answerCallbackQuery({ text: "Channel not in whitelist." });
      return;
    }

    await context.answerCallbackQuery({ text: `Selected ${channel.label}` });

    if (context.callbackQuery.message !== undefined) {
      await context.editMessageReplyMarkup({ reply_markup: undefined });
    }

    const chatId = chatObj.id;
    const sendReply = async (text: string): Promise<void> => {
      await context.api.sendMessage(chatId, text);
    };

    await startTestNewPipelineWithReply(
      userId,
      chatId,
      channelUsername,
      sendReply,
      async (text: string) => {
        await context.api.sendMessage(chatId, text);
      },
      async (text: string, keyboard: InlineKeyboard) => {
        await context.api.sendMessage(chatId, text, { reply_markup: keyboard });
      },
    );
  });
}

async function startTestNewPipelineWithReply(
  userId: string,
  chatId: number,
  channelUsername: string,
  sendReply: (text: string) => Promise<void>,
  reply: (text: string) => Promise<void>,
  sendWithKeyboard: (text: string, keyboard: InlineKeyboard) => Promise<void>,
): Promise<void> {
  // Clear existing states
  botState.finishTestMode(userId);
  botState.finishCampaignCreation(userId);
  botState.finishPipelineMode(userId);

  const pipeline = new TestPipelineSession(userId, sendReply, {
    fullPipeline: false,
    realNegotiation: true,
    creatorChatId: chatId,
    channelUsername,
  });

  pipeline.setOnConversionApproval(async (info) => {
    const keyboard = new InlineKeyboard()
      .text("Accept Price", info.approveCallbackData)
      .text("Decline", info.declineCallbackData);
    await sendWithKeyboard(info.text, keyboard);
  });

  botState.startPipelineMode(userId, pipeline);

  await reply(
    [
      `Let's create a campaign and negotiate with @${channelUsername}!`,
      "",
      "Steps: description \u2192 budget \u2192 post \u2192 real negotiation",
      "",
      "Describe what you want to advertise:",
      "(What topics would interest your target audience?)",
    ].join("\n"),
  );
}
