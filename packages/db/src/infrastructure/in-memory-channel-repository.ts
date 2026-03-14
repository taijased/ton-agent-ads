import { randomUUID } from "node:crypto";
import type { Channel, SaveParsedChannelInput } from "@repo/types";
import type { ChannelRepository } from "../domain/channel-repository.js";

const seedChannels: Channel[] = [
  {
    id: "channel-1",
    username: "@tonnewsdaily",
    description: null,
    title: "TON News Daily",
    category: "crypto",
    price: 12,
    avgViews: 18000,
    contacts: []
  },
  {
    id: "channel-2",
    username: "@web3foundershub",
    description: null,
    title: "Web3 Founders Hub",
    category: "startups",
    price: 20,
    avgViews: 26000,
    contacts: []
  },
  {
    id: "channel-3",
    username: "@telegramgrowthlab",
    description: null,
    title: "Telegram Growth Lab",
    category: "marketing",
    price: 8,
    avgViews: 11000,
    contacts: []
  }
];

export class InMemoryChannelRepository implements ChannelRepository {
  private readonly channels = seedChannels.map((channel) => ({ ...channel }));

  private cloneChannel(channel: Channel): Channel {
    return {
      ...channel,
      contacts: channel.contacts.map((contact) => ({ ...contact }))
    };
  }

  public async getChannels(): Promise<Channel[]> {
    return this.channels.map((channel) => this.cloneChannel(channel));
  }

  public async getChannelById(id: string): Promise<Channel | undefined> {
    const channel = this.channels.find((entry) => entry.id === id);

    return channel === undefined ? undefined : this.cloneChannel(channel);
  }

  public async saveParsedChannel(input: SaveParsedChannelInput): Promise<Channel> {
    const nextChannel: Channel = {
      id: input.id,
      username: input.username,
      description: input.description,
      title: input.title,
      category: input.category ?? "telegram",
      price: input.price ?? 1,
      avgViews: input.avgViews ?? 0,
      contacts: input.contacts.map((contact: SaveParsedChannelInput["contacts"][number]) => ({
        id: randomUUID(),
        channelId: input.id,
        type: contact.type,
        value: contact.value,
        source: contact.source,
        isAdsContact: contact.isAdsContact,
        createdAt: new Date().toISOString()
      }))
    };

    const existingIndex = this.channels.findIndex((channel) => channel.id === input.id);

    if (existingIndex >= 0) {
      this.channels[existingIndex] = nextChannel;
      return this.cloneChannel(nextChannel);
    }

    this.channels.push(nextChannel);

    return this.cloneChannel(nextChannel);
  }
}
