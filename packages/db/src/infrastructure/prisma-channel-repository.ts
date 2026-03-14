import type { Channel, ChannelContact, SaveParsedChannelInput } from "@repo/types";
import type { ChannelRepository } from "../domain/channel-repository.js";
import { prisma } from "./prisma-client.js";

const toChannelContact = (contact: {
  id: string;
  channelId: string;
  type: string;
  value: string;
  source: string;
  isAdsContact: boolean;
  createdAt: Date;
}): ChannelContact => ({
  id: contact.id,
  channelId: contact.channelId,
  type: contact.type as ChannelContact["type"],
  value: contact.value,
  source: contact.source as ChannelContact["source"],
  isAdsContact: contact.isAdsContact,
  createdAt: contact.createdAt.toISOString()
});

const toChannel = (channel: {
  id: string;
  username: string;
  description: string | null;
  title: string;
  category: string;
  price: number;
  avgViews: number;
  contacts: Array<{
    id: string;
    channelId: string;
    type: string;
    value: string;
    source: string;
    isAdsContact: boolean;
    createdAt: Date;
  }>;
}): Channel => ({
  id: channel.id,
  username: channel.username,
  description: channel.description,
  title: channel.title,
  category: channel.category,
  price: channel.price,
  avgViews: channel.avgViews,
  contacts: channel.contacts
    .slice()
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map(toChannelContact)
});

export class PrismaChannelRepository implements ChannelRepository {
  public async getChannels(): Promise<Channel[]> {
    const channels = await prisma.channel.findMany({
      orderBy: { price: "asc" },
      include: { contacts: true }
    });

    return channels.map(toChannel);
  }

  public async getChannelById(id: string): Promise<Channel | undefined> {
    const channel = await prisma.channel.findUnique({
      where: { id },
      include: { contacts: true }
    });

    return channel === null ? undefined : toChannel(channel);
  }

  public async saveParsedChannel(input: SaveParsedChannelInput): Promise<Channel> {
    const channel = await prisma.channel.upsert({
      where: { id: input.id },
      update: {
        username: input.username,
        description: input.description,
        title: input.title,
        category: input.category ?? "telegram",
        price: input.price ?? 1,
        avgViews: input.avgViews ?? 0,
        contacts: {
          deleteMany: {},
          create: input.contacts.map((contact: SaveParsedChannelInput["contacts"][number]) => ({
            type: contact.type,
            value: contact.value,
            source: contact.source,
            isAdsContact: contact.isAdsContact
          }))
        }
      },
      create: {
        id: input.id,
        username: input.username,
        description: input.description,
        title: input.title,
        category: input.category ?? "telegram",
        price: input.price ?? 1,
        avgViews: input.avgViews ?? 0,
        contacts: {
          create: input.contacts.map((contact: SaveParsedChannelInput["contacts"][number]) => ({
            type: contact.type,
            value: contact.value,
            source: contact.source,
            isAdsContact: contact.isAdsContact
          }))
        }
      },
      include: { contacts: true }
    });

    return toChannel(channel);
  }
}
