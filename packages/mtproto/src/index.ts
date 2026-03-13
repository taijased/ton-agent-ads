import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

export interface MtprotoClientConfig {
  apiId: number;
  apiHash: string;
  session?: string;
}

export const createMtprotoClient = (config: MtprotoClientConfig): TelegramClient =>
  new TelegramClient(
    new StringSession(config.session ?? ""),
    config.apiId,
    config.apiHash,
    {
      connectionRetries: 3
    }
  );
