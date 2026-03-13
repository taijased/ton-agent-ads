import type { Channel } from "@repo/types";
import type { ChannelRepository } from "../domain/channel-repository.js";

const seedChannels: Channel[] = [
  {
    id: "channel-1",
    username: "@tonnewsdaily",
    adminUsername: null,
    title: "TON News Daily",
    category: "crypto",
    price: 12,
    avgViews: 18000
  },
  {
    id: "channel-2",
    username: "@web3foundershub",
    adminUsername: null,
    title: "Web3 Founders Hub",
    category: "startups",
    price: 20,
    avgViews: 26000
  },
  {
    id: "channel-3",
    username: "@telegramgrowthlab",
    adminUsername: null,
    title: "Telegram Growth Lab",
    category: "marketing",
    price: 8,
    avgViews: 11000
  }
];

export class InMemoryChannelRepository implements ChannelRepository {
  private readonly channels = seedChannels.map((channel) => ({ ...channel }));

  public async getChannels(): Promise<Channel[]> {
    return this.channels.map((channel) => ({ ...channel }));
  }

  public async getChannelById(id: string): Promise<Channel | undefined> {
    const channel = this.channels.find((entry) => entry.id === id);

    return channel === undefined ? undefined : { ...channel };
  }
}
