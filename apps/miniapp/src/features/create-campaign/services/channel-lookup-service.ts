import type {
  Channel,
  ResolveChannelByUsernameRequest,
  ResolveChannelByUsernameResult,
} from "@repo/types";
import type { RecommendedChannel } from "../types";
import { apiRequest } from "../../../lib/api";

const telegramUsernamePattern = /^[A-Za-z0-9_]{5,32}$/;

export const normalizeTelegramUsername = (value: string): string =>
  value.trim().replace(/^@+/, "");

export const validateTelegramUsername = (value: string): string | null => {
  const normalizedUsername = normalizeTelegramUsername(value);

  if (normalizedUsername.length === 0) {
    return "Enter a public Telegram channel username.";
  }

  if (!telegramUsernamePattern.test(normalizedUsername)) {
    return "Use a public Telegram username with 5-32 letters, numbers, or underscores.";
  }

  return null;
};

const mapResolvedChannelToRecommended = (
  channel: ResolveChannelByUsernameResult,
): RecommendedChannel => ({
  id: channel.id,
  name: channel.title,
  username: channel.username,
  avatar: channel.avatarUrl,
  description: channel.description ?? "No public channel description yet.",
  tags: ["Manual add"],
  avgViews: channel.subscriberCount,
  expectedPrice: null,
});

const mapChannelToRecommended = (channel: Channel): RecommendedChannel => ({
  id: channel.id,
  name: channel.title,
  username: channel.username,
  avatar: null,
  description: channel.description ?? "No public channel description yet.",
  tags: [],
  avgViews: channel.avgViews,
  expectedPrice: channel.price,
});

export const lookupChannelByUsername = async (
  username: string,
): Promise<RecommendedChannel> => {
  const normalizedUsername = normalizeTelegramUsername(username);
  const validationError = validateTelegramUsername(normalizedUsername);

  if (validationError) {
    throw new Error(validationError);
  }

  const payload: ResolveChannelByUsernameRequest = {
    username: normalizedUsername,
  };
  const result = await apiRequest<ResolveChannelByUsernameResult>(
    "/api/search/channels/resolve",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return mapResolvedChannelToRecommended(result);
};

export const listRecommendedChannels = async (): Promise<
  RecommendedChannel[]
> =>
  (await apiRequest<Channel[]>("/api/channels")).map(mapChannelToRecommended);
