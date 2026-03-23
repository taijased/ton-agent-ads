import type {
  ResolveChannelByUsernameRequest,
  ResolveChannelByUsernameResult,
} from "@repo/types";
import type { RecommendedChannel } from "../types";

const telegramUsernamePattern = /^[A-Za-z0-9_]{5,32}$/;

const parseErrorMessage = async (response: Response): Promise<string> => {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    error?: string;
    reason?: string;
  } | null;

  return (
    body?.message ??
    body?.reason ??
    body?.error ??
    `API request failed with status ${response.status}`
  );
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, init);

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
};

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
  const result = await request<ResolveChannelByUsernameResult>(
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
