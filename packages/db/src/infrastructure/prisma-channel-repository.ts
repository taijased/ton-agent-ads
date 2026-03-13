import type { Channel } from "@repo/types";
import type { ChannelRepository } from "../domain/channel-repository.js";
import { prisma } from "./prisma-client.js";

const toChannel = (channel: {
  id: string;
  username: string;
  adminUsername: string | null;
  title: string;
  category: string;
  price: number;
  avgViews: number;
}): Channel => ({
  id: channel.id,
  username: channel.username,
  adminUsername: channel.adminUsername,
  title: channel.title,
  category: channel.category,
  price: channel.price,
  avgViews: channel.avgViews
});

export class PrismaChannelRepository implements ChannelRepository {
  public async getChannels(): Promise<Channel[]> {
    const channels = await prisma.channel.findMany({
      orderBy: { price: "asc" }
    });

    return channels.map(toChannel);
  }

  public async getChannelById(id: string): Promise<Channel | undefined> {
    const channel = await prisma.channel.findUnique({
      where: { id }
    });

    return channel === null ? undefined : toChannel(channel);
  }
}
