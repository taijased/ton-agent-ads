import type {
  AdminContact,
  Channel,
  ChannelContact,
  SaveChannelAdminParsingResultInput,
  SaveParsedChannelInput,
  SetChannelAdminParsingStateInput,
} from "@repo/types";
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
  createdAt: contact.createdAt.toISOString(),
});

const toAdminContact = (contact: {
  id: string;
  channelId: string;
  telegramHandle: string;
  telegramUserId: string | null;
  source: string;
  confidenceScore: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): AdminContact => ({
  id: contact.id,
  channelId: contact.channelId,
  telegramHandle: contact.telegramHandle,
  telegramUserId: contact.telegramUserId,
  source: contact.source as AdminContact["source"],
  confidenceScore: contact.confidenceScore,
  status: contact.status as AdminContact["status"],
  createdAt: contact.createdAt.toISOString(),
  updatedAt: contact.updatedAt.toISOString(),
});

const toChannel = (channel: {
  id: string;
  username: string;
  description: string | null;
  title: string;
  category: string;
  price: number;
  avgViews: number;
  adminParseStatus: string;
  readinessStatus: string;
  adminCount: number;
  lastParsedAt: Date | null;
  adminContacts: Array<{
    id: string;
    channelId: string;
    telegramHandle: string;
    telegramUserId: string | null;
    source: string;
    confidenceScore: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
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
  subscriberCount:
    typeof (channel as Record<string, unknown>).subscriberCount === "number"
      ? ((channel as Record<string, unknown>).subscriberCount as number)
      : null,
  adminParseStatus: channel.adminParseStatus as Channel["adminParseStatus"],
  readinessStatus: channel.readinessStatus as Channel["readinessStatus"],
  adminCount: channel.adminCount,
  lastParsedAt: channel.lastParsedAt?.toISOString() ?? null,
  adminContacts: channel.adminContacts
    .slice()
    .sort((left, right) => {
      if (right.confidenceScore !== left.confidenceScore) {
        return right.confidenceScore - left.confidenceScore;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    })
    .map(toAdminContact),
  contacts: channel.contacts
    .slice()
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map(toChannelContact),
});

export class PrismaChannelRepository implements ChannelRepository {
  public async getChannels(): Promise<Channel[]> {
    const channels = await prisma.channel.findMany({
      orderBy: { price: "asc" },
      include: { adminContacts: true, contacts: true },
    });

    return channels.map(toChannel);
  }

  public async getChannelById(id: string): Promise<Channel | undefined> {
    const channel = await prisma.channel.findUnique({
      where: { id },
      include: { adminContacts: true, contacts: true },
    });

    return channel === null ? undefined : toChannel(channel);
  }

  public async saveParsedChannel(
    input: SaveParsedChannelInput,
  ): Promise<Channel> {
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
          create: input.contacts.map(
            (contact: SaveParsedChannelInput["contacts"][number]) => ({
              type: contact.type,
              value: contact.value,
              source: contact.source,
              isAdsContact: contact.isAdsContact,
            }),
          ),
        },
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
          create: input.contacts.map(
            (contact: SaveParsedChannelInput["contacts"][number]) => ({
              type: contact.type,
              value: contact.value,
              source: contact.source,
              isAdsContact: contact.isAdsContact,
            }),
          ),
        },
      },
      include: { adminContacts: true, contacts: true },
    });

    return toChannel(channel);
  }

  public async setAdminParsingState(
    input: SetChannelAdminParsingStateInput,
  ): Promise<Channel | undefined> {
    const existing = await prisma.channel.findUnique({
      where: { id: input.channelId },
    });

    if (existing === null) {
      return undefined;
    }

    const channel = await prisma.channel.update({
      where: { id: input.channelId },
      data: {
        adminParseStatus: input.adminParseStatus,
        readinessStatus: input.readinessStatus,
      },
      include: { adminContacts: true, contacts: true },
    });

    return toChannel(channel);
  }

  public async saveAdminParsingResult(
    input: SaveChannelAdminParsingResultInput,
  ): Promise<Channel | undefined> {
    const existing = await prisma.channel.findUnique({
      where: { id: input.channelId },
    });

    if (existing === null) {
      return undefined;
    }

    const channel = await prisma.channel.update({
      where: { id: input.channelId },
      data: {
        adminParseStatus: input.adminParseStatus,
        readinessStatus: input.readinessStatus,
        adminCount: input.adminCount,
        lastParsedAt: new Date(input.lastParsedAt),
        adminContacts: {
          deleteMany: {},
          create: input.adminContacts.map((contact) => ({
            telegramHandle: contact.telegramHandle,
            telegramUserId: contact.telegramUserId ?? null,
            source: contact.source,
            confidenceScore: contact.confidenceScore,
            status: contact.status,
          })),
        },
      },
      include: { adminContacts: true, contacts: true },
    });

    return toChannel(channel);
  }
}
