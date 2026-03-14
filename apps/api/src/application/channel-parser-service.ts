import type { ChannelContact, ParsedChannelData } from "@repo/types";
import { normalizeChannelReference, normalizeTelegramLink } from "./channel-reference.js";

const adsKeywords = [
  "ads",
  "advert",
  "adv",
  "contact",
  "promo",
  "реклама",
  "сотрудничество"
] as const;

const usernamePattern = /@[A-Za-z0-9_]+/g;
const linkPattern = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[A-Za-z0-9_/?=&-]+/gi;

export interface ResolvedTelegramChannel {
  id: string;
  username: string;
  title: string;
  description: string;
}

export interface TelegramChannelResolver {
  resolveChannel(reference: string): Promise<ResolvedTelegramChannel>;
}

export interface ParsedChannelResult {
  channel: ResolvedTelegramChannel;
  parsed: ParsedChannelData;
  contacts: Array<Pick<ChannelContact, "type" | "value" | "source" | "isAdsContact">>;
  selectedContact: string | null;
}

const dedupe = (values: string[]): string[] => Array.from(new Set(values));

const lineHasAdsKeyword = (value: string): boolean => {
  const normalized = value.toLowerCase();
  return adsKeywords.some((keyword) => normalized.includes(keyword));
};

const extractUniqueMatches = (pattern: RegExp, value: string): string[] => dedupe(value.match(pattern) ?? []);

const normalizeExtractedUsername = (value: string): string | null => normalizeChannelReference(value);

const normalizeExtractedLink = (value: string): string | null => normalizeTelegramLink(value);

export class ChannelParserService {
  public constructor(private readonly resolver: TelegramChannelResolver) {}

  public async parse(reference: string): Promise<ParsedChannelResult> {
    const normalizedReference = normalizeChannelReference(reference);

    if (normalizedReference === null) {
      throw new Error("Channel reference must look like @example or https://t.me/example");
    }

    const channel = await this.resolver.resolveChannel(normalizedReference);
    const description = channel.description.trim();
    const lines = description
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const adsContact = lineHasAdsKeyword(description);

    const usernameContacts = new Map<string, boolean>();
    const linkContacts = new Map<string, boolean>();

    for (const match of extractUniqueMatches(usernamePattern, description)) {
      const normalized = normalizeExtractedUsername(match);

      if (normalized !== null) {
        usernameContacts.set(normalized, adsContact);
      }
    }

    for (const match of extractUniqueMatches(linkPattern, description)) {
      const normalized = normalizeExtractedLink(match);

      if (normalized !== null) {
        linkContacts.set(normalized, adsContact);
      }
    }

    for (const line of lines) {
      const hasAdsKeyword = lineHasAdsKeyword(line);

      for (const match of extractUniqueMatches(usernamePattern, line)) {
        const normalized = normalizeExtractedUsername(match);

        if (normalized !== null) {
          usernameContacts.set(normalized, Boolean(usernameContacts.get(normalized)) || hasAdsKeyword);
        }
      }

      for (const match of extractUniqueMatches(linkPattern, line)) {
        const normalized = normalizeExtractedLink(match);

        if (normalized !== null) {
          linkContacts.set(normalized, Boolean(linkContacts.get(normalized)) || hasAdsKeyword);
        }
      }
    }

    const usernames = Array.from(usernameContacts.keys());
    const links = Array.from(linkContacts.keys());
    const contacts = [
      ...usernames.map((value) => ({
        type: "username" as const,
        value,
        source: "extracted_username" as const,
        isAdsContact: usernameContacts.get(value) ?? false
      })),
      ...links.map((value) => ({
        type: "link" as const,
        value,
        source: "extracted_link" as const,
        isAdsContact: linkContacts.get(value) ?? false
      }))
    ];

    return {
      channel,
      parsed: {
        description,
        usernames,
        links,
        adsContact
      },
      contacts,
      selectedContact: this.selectPreferredContact(usernames, links, usernameContacts, linkContacts)
    };
  }

  private selectPreferredContact(
    usernames: string[],
    links: string[],
    usernameContacts: Map<string, boolean>,
    linkContacts: Map<string, boolean>
  ): string | null {
    const preferredUsername = usernames.find((username) => usernameContacts.get(username) === true);

    if (preferredUsername !== undefined) {
      return preferredUsername;
    }

    if (usernames[0] !== undefined) {
      return usernames[0];
    }

    const preferredLink = links.find((link) => linkContacts.get(link) === true) ?? links[0];

    if (preferredLink === undefined) {
      return null;
    }

    return normalizeChannelReference(preferredLink);
  }
}
