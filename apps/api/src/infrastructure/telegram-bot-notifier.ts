import type { CreatorNotificationPayload } from "@repo/types";
import type { CreatorNotificationPort } from "../application/creator-notification-service.js";

export class TelegramBotNotifier implements CreatorNotificationPort {
  public async send(
    payload: CreatorNotificationPayload,
  ): Promise<{ providerMessageId: string | null }> {
    const token = process.env.BOT_TOKEN?.trim();

    if (token === undefined || token.length === 0) {
      throw new Error("BOT_TOKEN is required for creator notifications");
    }

    const callbackData = this.buildCallbackData(payload);

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: payload.chatId,
          text: payload.text,
          reply_markup:
            callbackData === null
              ? undefined
              : {
                  inline_keyboard: [callbackData],
                },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Telegram bot notification failed with status ${response.status}`,
      );
    }

    const body = (await response.json()) as {
      result?: { message_id?: number };
    };

    return {
      providerMessageId:
        typeof body.result?.message_id === "number"
          ? String(body.result.message_id)
          : null,
    };
  }

  private buildCallbackData(
    payload: CreatorNotificationPayload,
  ): Array<{ text: string; callback_data: string }> | null {
    if (payload.actionTargetId === null) {
      return null;
    }

    if (payload.action === "approve_approval") {
      return [
        {
          text: "Approve",
          callback_data: `approval:approve:${payload.actionTargetId}`,
        },
        {
          text: "Reject",
          callback_data: `approval:reject:${payload.actionTargetId}`,
        },
        {
          text: "Counter",
          callback_data: `approval:counter:${payload.actionTargetId}`,
        },
      ];
    }

    if (payload.action === "approve_deal") {
      return [
        {
          text: "Approve",
          callback_data: `approve:${payload.actionTargetId}`,
        },
      ];
    }

    if (payload.action === "reject_deal") {
      return [
        {
          text: "Reject",
          callback_data: `reject:${payload.actionTargetId}`,
        },
      ];
    }

    if (payload.action === "update_status") {
      return [
        {
          text: "Open deal",
          callback_data: `ds:${payload.actionTargetId}:${payload.status}`,
        },
      ];
    }

    return null;
  }
}
