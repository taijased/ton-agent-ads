import type { ChannelRepository } from "@repo/db";
import {
  calculateChannelReadiness,
  type Channel,
  type ChannelAdminParseStatus,
} from "@repo/types";
import type {
  ChannelParserService,
  ParsedChannelResult,
} from "./channel-parser-service.js";
import { normalizeChannelReference } from "./channel-reference.js";

const highConfidenceThreshold = 0.8;

const toConfidenceScore = (
  contact: ParsedChannelResult["contacts"][number],
): number => {
  if (contact.type === "username") {
    return contact.isAdsContact ? 0.92 : 0.58;
  }

  return contact.isAdsContact ? 0.82 : 0.45;
};

const resolveParseStatus = (
  confidenceScores: number[],
): ChannelAdminParseStatus => {
  if (confidenceScores.length === 0) {
    return "admins_not_found";
  }

  if (confidenceScores.some((score) => score >= highConfidenceThreshold)) {
    return "admins_found";
  }

  return "needs_review";
};

export class ChannelAdminService {
  public constructor(
    private readonly channelRepository: ChannelRepository,
    private readonly channelParserService: ChannelParserService,
  ) {}

  public async parseChannel(channelId: string): Promise<Channel | null> {
    const channel = await this.channelRepository.getChannelById(channelId);

    if (channel === undefined) {
      return null;
    }

    await this.channelRepository.setAdminParsingState({
      channelId,
      adminParseStatus: "parsing",
      readinessStatus: "unknown",
    });

    try {
      const parsedChannel = await this.channelParserService.parse(
        channel.username,
      );

      return await this.persistParsedResult(channel, parsedChannel);
    } catch {
      return (
        (await this.channelRepository.saveAdminParsingResult({
          channelId,
          adminParseStatus: "failed",
          readinessStatus: calculateChannelReadiness("failed"),
          adminCount: 0,
          lastParsedAt: new Date().toISOString(),
          adminContacts: [],
        })) ?? null
      );
    }
  }

  public async applyParsedChannelResult(
    channelId: string,
    parsedChannel: ParsedChannelResult,
  ): Promise<Channel | null> {
    const channel = await this.channelRepository.getChannelById(channelId);

    if (channel === undefined) {
      return null;
    }

    await this.channelRepository.setAdminParsingState({
      channelId,
      adminParseStatus: "parsing",
      readinessStatus: "unknown",
    });

    return this.persistParsedResult(channel, parsedChannel);
  }

  private async persistParsedResult(
    channel: Channel,
    parsedChannel: ParsedChannelResult,
  ): Promise<Channel | null> {
    await this.channelRepository.saveParsedChannel({
      id: channel.id,
      username: parsedChannel.channel.username,
      title: parsedChannel.channel.title,
      description: parsedChannel.parsed.description || null,
      category: channel.category,
      price: channel.price,
      avgViews: channel.avgViews,
      contacts: parsedChannel.contacts,
    });

    const dedupedAdminContacts = Array.from(
      parsedChannel.contacts
        .reduce(
          (
            contacts,
            contact,
          ): Map<
            string,
            {
              telegramHandle: string;
              telegramUserId: string | null;
              source: "channel_description";
              confidenceScore: number;
              status: "found";
            }
          > => {
            const normalizedHandle = normalizeChannelReference(contact.value);

            if (
              normalizedHandle === null ||
              normalizedHandle.toLowerCase() === channel.username.toLowerCase()
            ) {
              return contacts;
            }

            const nextContact = {
              telegramHandle: normalizedHandle,
              telegramUserId: null,
              source: "channel_description" as const,
              confidenceScore: toConfidenceScore(contact),
              status: "found" as const,
            };
            const existingContact = contacts.get(normalizedHandle);

            if (
              existingContact === undefined ||
              nextContact.confidenceScore > existingContact.confidenceScore
            ) {
              contacts.set(normalizedHandle, nextContact);
            }

            return contacts;
          },
          new Map(),
        )
        .values(),
    ).sort((left, right) => {
      if (right.confidenceScore !== left.confidenceScore) {
        return right.confidenceScore - left.confidenceScore;
      }

      return left.telegramHandle.localeCompare(right.telegramHandle);
    });
    const parseStatus = resolveParseStatus(
      dedupedAdminContacts.map((contact) => contact.confidenceScore),
    );

    return (
      (await this.channelRepository.saveAdminParsingResult({
        channelId: channel.id,
        adminParseStatus: parseStatus,
        readinessStatus: calculateChannelReadiness(parseStatus),
        adminCount: dedupedAdminContacts.length,
        lastParsedAt: new Date().toISOString(),
        adminContacts: dedupedAdminContacts,
      })) ?? null
    );
  }
}
