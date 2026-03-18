import { Api } from "telegram";
import { TelegramUserClient } from "./telegram-user-client.js";

export interface SearchedChannel {
  id: string;
  title: string;
  username: string;
  subscriberCount: number | null;
}

export class TelegramSearchClient {
  constructor(private readonly telegramUserClient: TelegramUserClient) {}

  async searchByKeyword(
    query: string,
    limit: number = 20,
  ): Promise<SearchedChannel[]> {
    try {
      const client = await this.telegramUserClient.getClient();
      const result = await client.invoke(
        new Api.contacts.Search({ q: query, limit }),
      );

      return result.chats
        .filter(
          (chat): chat is Api.Channel =>
            chat instanceof Api.Channel &&
            chat.broadcast === true &&
            typeof chat.username === "string" && chat.username.length > 0 && chat.username !== "null",
        )
        .map((channel) => ({
          id: String(channel.id),
          title: channel.title,
          username: `@${channel.username}`,
          subscriberCount: channel.participantsCount ?? null,
        }));
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("QUERY_TOO_SHORT")
      ) {
        return [];
      }
      throw error;
    }
  }

  async searchGlobalChannels(
    query: string,
    limit: number = 20,
  ): Promise<SearchedChannel[]> {
    try {
      const client = await this.telegramUserClient.getClient();
      const result = await client.invoke(
        new Api.messages.SearchGlobal({
          q: query,
          filter: new Api.InputMessagesFilterEmpty(),
          offsetRate: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          offsetId: 0,
          limit,
        }),
      );

      if (!("chats" in result)) {
        return [];
      }

      return result.chats
        .filter(
          (chat): chat is Api.Channel =>
            chat instanceof Api.Channel &&
            chat.broadcast === true &&
            typeof chat.username === "string" && chat.username.length > 0 && chat.username !== "null",
        )
        .map((channel) => ({
          id: String(channel.id),
          title: channel.title,
          username: `@${channel.username}`,
          subscriberCount: channel.participantsCount ?? null,
        }));
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("FloodWait")) {
        console.warn(`SearchGlobal rate limited for query "${query}"`);
        return [];
      }
      throw error;
    }
  }
}
