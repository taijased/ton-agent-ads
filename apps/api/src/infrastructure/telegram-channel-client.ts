import { Api, TelegramClient } from "telegram";
import type {
  ResolvedTelegramChannel,
  TelegramChannelResolver
} from "../application/channel-parser-service.js";
import { TelegramUserClient } from "./telegram-user-client.js";

export class TelegramChannelClient implements TelegramChannelResolver {
  public constructor(private readonly telegramUserClient: TelegramUserClient) {}

  private extractAbout(fullChat: unknown): string {
    if (
      typeof fullChat === "object" &&
      fullChat !== null &&
      "about" in fullChat &&
      typeof (fullChat as { about?: unknown }).about === "string"
    ) {
      return (fullChat as { about: string }).about;
    }

    return "";
  }

  public async resolveChannel(reference: string): Promise<ResolvedTelegramChannel> {
    const client = await this.getClient();
    const inputChannel = await client.getInputEntity(reference);
    const fullChannel = await client.invoke(
      new Api.channels.GetFullChannel({ channel: inputChannel })
    );
    const channel = fullChannel.chats.find(
      (entry): entry is Api.Channel => entry instanceof Api.Channel
    );

    if (channel === undefined) {
      throw new Error("Telegram channel could not be resolved");
    }

    return {
      id: String(channel.id),
      username: channel.username ? `@${channel.username}` : reference,
      title: channel.title,
      description: this.extractAbout(fullChannel.fullChat)
    };
  }

  private async getClient(): Promise<TelegramClient> {
    return this.telegramUserClient.getClient();
  }
}
