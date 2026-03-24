import type {
  AdminOutreachTransport,
  SendIntroMessageInput,
  SendIntroMessageResult,
} from "../application/admin-outreach-transport.js";
import type { TelegramAdminClient } from "./telegram-admin-client.js";

export class TelegramAdminOutreachTransport implements AdminOutreachTransport {
  public constructor(
    private readonly telegramAdminClient: TelegramAdminClient,
  ) {}

  public async sendIntroMessage(
    input: SendIntroMessageInput,
  ): Promise<SendIntroMessageResult> {
    const result = await this.telegramAdminClient.sendAdminMessage(
      input.adminHandle,
      input.text,
    );

    return {
      telegramMessageId: result.messageId ?? null,
      telegramChatId: result.chatId ?? null,
    };
  }
}
