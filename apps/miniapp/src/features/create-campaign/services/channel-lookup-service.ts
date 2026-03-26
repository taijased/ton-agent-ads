import type {
  Channel,
  ChannelSearchResponse,
  ChannelSearchResultItem,
  GenerateKeywordsResult,
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

const mapSearchResultToRecommended = (
  item: ChannelSearchResultItem,
): RecommendedChannel => ({
  id: item.id,
  name: item.title,
  username: item.username,
  avatar: null,
  description: item.description ?? "",
  tags: ["Keyword match"],
  avgViews: item.subscriberCount,
  expectedPrice: null,
});

const fetchChannelSearch = async (
  keywords: string[],
): Promise<ChannelSearchResponse> =>
  apiRequest<ChannelSearchResponse>("/api/search/channels", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ keywords }),
  });

export async function searchChannelsByKeywords(
  keywords: string[],
): Promise<RecommendedChannel[]> {
  const response = await fetchChannelSearch(keywords);
  return response.results.map(mapSearchResultToRecommended);
}

export async function generateSearchKeywords(
  description: string,
  language?: string,
): Promise<string[]> {
  const result = await apiRequest<GenerateKeywordsResult>(
    "/api/search/channels/generate",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description, language }),
    },
  );
  return result.keywords;
}

export async function searchChannelsFromDescription(
  description: string,
  language?: string,
): Promise<{
  channels: RecommendedChannel[];
  keywords: string[];
  expandedKeywords: string[];
}> {
  const keywords = await generateSearchKeywords(description, language);
  const response = await fetchChannelSearch(keywords);
  const channels = response.results.map(mapSearchResultToRecommended);
  return { channels, keywords, expandedKeywords: response.expandedKeywords };
}
