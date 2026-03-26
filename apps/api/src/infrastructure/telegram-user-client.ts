import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

export class TelegramUserClient {
  private client: TelegramClient | null = null;
  private pendingClient: Promise<TelegramClient> | null = null;

  public async getClient(): Promise<TelegramClient> {
    if (this.client !== null) {
      return this.client;
    }

    if (this.pendingClient !== null) {
      return this.pendingClient;
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

    const client = this.createClient(sessionString, apiId, apiHash);
    this.pendingClient = this.initializeClient(client);

    return this.pendingClient;
  }

  protected createClient(
    sessionString: string,
    apiId: number,
    apiHash: string,
  ): TelegramClient {
    return new TelegramClient(
      new StringSession(sessionString),
      apiId,
      apiHash,
      {
        connectionRetries: 3,
      },
    );
  }

  private async initializeClient(
    client: TelegramClient,
  ): Promise<TelegramClient> {
    try {
      await client.connect();
      await client.getMe();
      this.client = client;

      return client;
    } catch (error: unknown) {
      try {
        await client.disconnect();
      } catch {
        // Ignore disconnect failures while unwinding a failed initialization.
      }

      throw error;
    } finally {
      this.pendingClient = null;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.pendingClient !== null) {
      await this.pendingClient.catch(() => undefined);
    }

    if (this.client === null) {
      return;
    }

    const client = this.client;
    this.client = null;
    await client.disconnect();
  }
}
