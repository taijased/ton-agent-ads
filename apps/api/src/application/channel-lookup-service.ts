import type { ResolveChannelByUsernameResult } from "@repo/types";

export interface ChannelLookupClient {
  resolveChannelByUsername(
    username: string,
  ): Promise<ResolveChannelByUsernameResult | null>;
}

const telegramUsernamePattern = /^[A-Za-z0-9_]{5,32}$/;

export const normalizeTelegramUsername = (value: string): string =>
  value.trim().replace(/^@+/, "");

export class ChannelLookupService {
  constructor(private readonly lookupClient: ChannelLookupClient) {}

  async resolveByUsername(
    username: string,
  ): Promise<ResolveChannelByUsernameResult | null> {
    const normalizedUsername = normalizeTelegramUsername(username);

    if (!telegramUsernamePattern.test(normalizedUsername)) {
      throw new Error(
        "Username must be a public Telegram handle with 5-32 letters, numbers, or underscores.",
      );
    }

    return this.lookupClient.resolveChannelByUsername(normalizedUsername);
  }
}
