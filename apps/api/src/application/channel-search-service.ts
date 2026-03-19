import type {
  ChannelSearchResponse,
  ChannelSearchResultItem,
  ChannelSearchResultContact,
} from "@repo/types";
import type {
  TelegramSearchClient,
  SearchedChannel,
} from "../infrastructure/telegram-search-client.js";
import type { ChannelParserService } from "./channel-parser-service.js";
import type { ContactAnalysisLlmService } from "./contact-analysis-llm-service.js";
import type { KeywordExpansionLlmService } from "./keyword-expansion-llm-service.js";
import { isBlockedContact } from "./contact-analysis-llm-service.js";

const MAX_RESOLVE_ATTEMPTS = 15;
const MAX_RESULTS = 10;
const CONCURRENCY = 3;
const PER_CHANNEL_TIMEOUT_MS = 5000;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);

export class ChannelSearchService {
  constructor(
    private readonly searchClient: TelegramSearchClient,
    private readonly parserService: ChannelParserService,
    private readonly contactAnalysisService: ContactAnalysisLlmService,
    private readonly keywordExpansionService: KeywordExpansionLlmService,
  ) {}

  async search(keywords: string[]): Promise<ChannelSearchResponse> {
    const sanitized = [
      ...new Set(
        keywords
          .map((k) => k.toLowerCase().trim())
          .filter((k) => k.length >= 2),
      ),
    ];

    const expansion =
      await this.keywordExpansionService.expandKeywords(sanitized);
    const searchKeywords = expansion.all;

    console.log(
      `[search] keywords: original=${JSON.stringify(expansion.original)} expanded=${JSON.stringify(expansion.expanded)}`,
    );

    const channelMap = new Map<string, SearchedChannel>();

    for (const keyword of searchKeywords) {
      const [byName, byContent] = await Promise.all([
        this.searchClient.searchByKeyword(keyword),
        this.searchClient.searchGlobalChannels(keyword),
      ]);

      for (const channel of byName) {
        if (!channelMap.has(channel.id)) {
          channelMap.set(channel.id, channel);
        }
      }

      for (const channel of byContent) {
        if (!channelMap.has(channel.id)) {
          channelMap.set(channel.id, channel);
        }
      }

      if (searchKeywords.indexOf(keyword) < searchKeywords.length - 1) {
        await delay(200);
      }
    }

    const totalFound = channelMap.size;
    const topChannels = Array.from(channelMap.values()).slice(
      0,
      MAX_RESOLVE_ATTEMPTS,
    );

    const results = await this.processChannelsWithConcurrency(
      topChannels,
      CONCURRENCY,
      sanitized,
    );

    const filteredResults = results
      .filter(
        (r): r is ChannelSearchResultItem => r !== null && r.contact !== null,
      )
      .sort((a, b) => (b.subscriberCount ?? 0) - (a.subscriberCount ?? 0))
      .slice(0, MAX_RESULTS);

    return {
      results: filteredResults,
      totalFound,
      keywords: sanitized,
      expandedKeywords: expansion.expanded,
    };
  }

  private async processChannelsWithConcurrency(
    channels: SearchedChannel[],
    concurrency: number,
    keywords: string[],
  ): Promise<(ChannelSearchResultItem | null)[]> {
    const results: (ChannelSearchResultItem | null)[] = [];
    const queue = [...channels];

    const worker = async (): Promise<void> => {
      while (queue.length > 0) {
        const channel = queue.shift();
        if (channel === undefined) break;
        const result = await withTimeout(
          this.processChannel(channel, keywords),
          PER_CHANNEL_TIMEOUT_MS,
        );
        results.push(result);
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, channels.length) },
      () => worker(),
    );
    await Promise.all(workers);

    return results;
  }

  private async processChannel(
    channel: SearchedChannel,
    keywords: string[],
  ): Promise<ChannelSearchResultItem | null> {
    try {
      const parsed = await this.parserService.parse(channel.username);

      if (parsed.contacts.length === 0) {
        return null;
      }

      const analysis = await this.contactAnalysisService.analyzeContacts(
        channel.username,
        channel.title,
        parsed.channel.description,
        parsed.contacts,
        keywords,
      );

      console.log(
        `[search] ${channel.username}: LLM=${analysis.selectedContact} relevant=${analysis.isRelevant} reason="${analysis.reason}" regex=${parsed.selectedContact}`,
      );

      if (!analysis.isRelevant) {
        return null;
      }

      let contact: ChannelSearchResultContact | null = null;

      if (analysis.selectedContact !== null) {
        const matchingContact = parsed.contacts.find(
          (c) => c.value === analysis.selectedContact,
        );
        contact = {
          type: matchingContact?.type ?? "username",
          value: analysis.selectedContact,
          isAdsContact: matchingContact?.isAdsContact ?? true,
        };
      } else {
        // LLM returned null — try regex fallback (with blocklist check)
        if (
          parsed.selectedContact !== null &&
          !isBlockedContact(parsed.selectedContact)
        ) {
          const matchingContact = parsed.contacts.find(
            (c) => c.value === parsed.selectedContact,
          );
          contact = {
            type: matchingContact?.type ?? "username",
            value: parsed.selectedContact,
            isAdsContact: matchingContact?.isAdsContact ?? false,
          };
        }
      }

      if (contact === null) {
        return null;
      }

      return {
        id: channel.id,
        title: channel.title,
        username: channel.username,
        subscriberCount: channel.subscriberCount,
        description: parsed.channel.description || null,
        contact,
      };
    } catch {
      return null;
    }
  }
}
