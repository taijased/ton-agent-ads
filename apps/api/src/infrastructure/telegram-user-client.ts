import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

export class TelegramUserClient {
  private client: TelegramClient | null = null;

  public async getClient(): Promise<TelegramClient> {
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

    const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
      connectionRetries: 3
    });

    await client.connect();
    await client.getMe();
    this.client = client;

    return client;
  }

  public async disconnect(): Promise<void> {
    if (this.client === null) {
      return;
    }

    await this.client.disconnect();
    this.client = null;
  }
}
