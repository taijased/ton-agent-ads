import type { DealApprovalRequest } from "@repo/types";

export class TelegramBotNotifier {
  public async sendApprovalRequestNotification(input: {
    chatId: string;
    channelTitle: string;
    channelUsername: string;
    contactValue: string | null;
    approvalRequest: DealApprovalRequest;
  }): Promise<void> {
    const token = (process.env.TEST_BOT_TOKEN || process.env.PROD_BOT_TOKEN)?.trim();

    if (token === undefined || token.length === 0) {
      throw new Error("TEST_BOT_TOKEN or PROD_BOT_TOKEN is required for approval notifications");
    }

    const text = [
      "Approval required",
      "",
      `Channel: ${input.channelTitle} (${input.channelUsername})`,
      input.contactValue ? `Contact: ${input.contactValue}` : null,
      input.approvalRequest.proposedPriceTon !== null
        ? `Proposed price: ${input.approvalRequest.proposedPriceTon} TON`
        : null,
      `Summary: ${input.approvalRequest.summary}`,
    ]
      .filter((value): value is string => value !== null)
      .join("\n");

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chat_id: input.chatId,
          text,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Approve",
                  callback_data: `approval:approve:${input.approvalRequest.id}`,
                },
                {
                  text: "Reject",
                  callback_data: `approval:reject:${input.approvalRequest.id}`,
                },
                {
                  text: "Counter",
                  callback_data: `approval:counter:${input.approvalRequest.id}`,
                },
              ],
            ],
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Telegram bot notification failed with status ${response.status}`,
      );
    }
  }
}
