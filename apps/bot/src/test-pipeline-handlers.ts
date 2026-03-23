import type { Bot } from "grammy";
import { TestPipelineSession } from "./test-pipeline-session.js";
import { botState } from "./state.js";

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

    const chatId = context.chat.id;
    const sendReply = async (text: string): Promise<void> => {
      await context.api.sendMessage(chatId, text);
    };

    const pipeline = new TestPipelineSession(userId, sendReply, {
      fullPipeline: false,
      realNegotiation: true,
      creatorChatId: chatId,
      channelUsername: "tontestyshmestyhackaton",
    });
    botState.startPipelineMode(userId, pipeline);

    await context.reply(
      [
        "Let's create a campaign and negotiate with @tontestyshmestyhackaton!",
        "",
        "Steps: description \u2192 budget \u2192 post \u2192 real negotiation",
        "",
        "Describe what you want to advertise:",
        "(What topics would interest your target audience?)",
      ].join("\n"),
    );
  });
}
