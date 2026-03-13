import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

export interface SendAdminMessageResult {
  messageId?: string;
}

export class TelegramAdminClient {
  private client: TelegramClient | null = null;

  public async sendAdminMessage(
    username: string,
    text: string
  ): Promise<SendAdminMessageResult> {
    const client = await this.getClient();
    const message = await client.sendMessage(username, { message: text });

    return {
      messageId: "id" in message ? String(message.id) : undefined
    };
  }

  private async getClient(): Promise<TelegramClient> {
    if (this.client !== null) {
      return this.client;
    }

    const apiId = Number(process.env.TG_API_ID);
    const apiHash = process.env.TG_API_HASH;
    const sessionString = process.env.TG_SESSION_STRING;

    if (!Number.isInteger(apiId) || apiId <= 0) {
      throw new Error("TG_API_ID is required");
    }

    if (apiHash === undefined || apiHash.trim().length === 0) {
      throw new Error("TG_API_HASH is required");
    }

    if (sessionString === undefined || sessionString.trim().length === 0) {
      throw new Error("TG_SESSION_STRING is required");
    }

    const client = new TelegramClient(
      new StringSession(sessionString),
      apiId,
      apiHash,
      {
        connectionRetries: 3
      }
    );

    await client.connect();
    this.client = client;

    return client;
  }
}
