import { Api, TelegramClient } from "telegram";
import { TelegramUserClient } from "./telegram-user-client.js";

export interface SendAdminMessageResult {
  messageId?: string;
  chatId?: string;
}

export class TelegramAdminClient {
  public constructor(private readonly telegramUserClient: TelegramUserClient) {}

  public async sendAdminMessage(
    username: string,
    text: string
  ): Promise<SendAdminMessageResult> {
    const client = await this.getClient();
    const me = await client.getMe();
    const inputEntity = await client.getInputEntity(username);
    const message = await client.sendMessage(username, { message: text });
    const resolvedChatId = await client.getPeerId(inputEntity, false);

    console.info(
      JSON.stringify({
        level: 30,
        source: "telegram-admin-client",
        msg: "Telegram admin message sent",
        authUserId: String(me.id),
        authUsername: me.username ? `@${me.username}` : null,
        recipient: username,
        resolvedChatId,
        messageId: "id" in message ? String(message.id) : undefined,
        peerId:
          "peerId" in message &&
          typeof message.peerId === "object" &&
          message.peerId !== null &&
          message.peerId instanceof Api.PeerUser
            ? String(message.peerId.userId)
            : "peerId" in message &&
                typeof message.peerId === "object" &&
                message.peerId !== null &&
                message.peerId instanceof Api.PeerChat
              ? String(message.peerId.chatId)
              : "peerId" in message &&
                    typeof message.peerId === "object" &&
                    message.peerId !== null &&
                    message.peerId instanceof Api.PeerChannel
                  ? String(message.peerId.channelId)
                  : undefined
      })
    );

    return {
      messageId: "id" in message ? String(message.id) : undefined,
      chatId: resolvedChatId
    };
  }

  private async getClient(): Promise<TelegramClient> {
    return this.telegramUserClient.getClient();
  }
}
