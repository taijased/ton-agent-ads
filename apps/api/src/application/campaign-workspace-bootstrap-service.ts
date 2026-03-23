import type {
  CampaignRepository,
  ChannelRepository,
  DealRepository,
} from "@repo/db";
import type {
  CampaignWorkspaceBootstrapChannelInput,
  CampaignWorkspaceBootstrapResult,
} from "@repo/types";
import type { ChannelLookupService } from "./channel-lookup-service.js";
import type { ChannelParserService } from "./channel-parser-service.js";
import { normalizeChannelReference } from "./channel-reference.js";

export interface CampaignWorkspaceBootstrapActionResult {
  success: boolean;
  result?: CampaignWorkspaceBootstrapResult;
  message?: string;
  statusCode?: number;
}

const isResolvableLookupMiss = (error: unknown): boolean =>
  error instanceof Error &&
  [
    "USERNAME_INVALID",
    "USERNAME_NOT_OCCUPIED",
    "Could not find the input entity",
    "No user has",
  ].some((message) => error.message.includes(message));

export class CampaignWorkspaceBootstrapService {
  public constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly dealRepository: DealRepository,
    private readonly channelLookupService: ChannelLookupService,
    private readonly channelParserService: ChannelParserService,
  ) {}

  public async bootstrap(
    campaignId: string,
    channels: CampaignWorkspaceBootstrapChannelInput[],
  ): Promise<CampaignWorkspaceBootstrapActionResult> {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (campaign === null) {
      return {
        success: false,
        message: "Campaign not found",
        statusCode: 404,
      };
    }

    const items: CampaignWorkspaceBootstrapResult["items"] = [];

    for (const input of channels) {
      const reference = normalizeChannelReference(input.username);

      if (reference === null) {
        items.push({
          username: input.username,
          outcome: "unresolved",
          dealId: null,
          channelId: null,
          message: "Channel username could not be normalized.",
        });
        continue;
      }

      try {
        const lookup =
          await this.channelLookupService.resolveByUsername(reference);

        if (lookup === null) {
          items.push({
            username: reference,
            outcome: "unresolved",
            dealId: null,
            channelId: null,
            message: "Channel could not be resolved by exact username.",
          });
          continue;
        }

        let parsedContacts: Awaited<
          ReturnType<ChannelParserService["parse"]>
        > | null = null;

        try {
          parsedContacts = await this.channelParserService.parse(reference);
        } catch (error: unknown) {
          if (!isResolvableLookupMiss(error)) {
            parsedContacts = null;
          }
        }

        const budgetAmount = Number(campaign.budgetAmount);
        const placeholderPrice = Number.isFinite(budgetAmount)
          ? Math.max(1, Math.round(budgetAmount))
          : 1;

        const savedChannel = await this.channelRepository.saveParsedChannel({
          id: lookup.id,
          username: lookup.username,
          title: lookup.title || input.title || reference,
          description:
            parsedContacts?.parsed.description || lookup.description || null,
          category: "telegram",
          price: placeholderPrice,
          avgViews: lookup.subscriberCount ?? 0,
          contacts: parsedContacts?.contacts ?? [],
        });

        const existingDeal = await this.dealRepository.findByCampaignAndChannel(
          campaignId,
          savedChannel.id,
        );

        if (existingDeal !== null) {
          items.push({
            username: savedChannel.username,
            outcome: "already_exists",
            dealId: existingDeal.id,
            channelId: savedChannel.id,
          });
          continue;
        }

        const deal = await this.dealRepository.createDeal({
          campaignId,
          channelId: savedChannel.id,
          price: placeholderPrice,
          status: "negotiating",
        });

        items.push({
          username: savedChannel.username,
          outcome: "created",
          dealId: deal.id,
          channelId: savedChannel.id,
        });
      } catch (error: unknown) {
        items.push({
          username: reference,
          outcome: isResolvableLookupMiss(error) ? "unresolved" : "failed",
          dealId: null,
          channelId: null,
          message:
            error instanceof Error
              ? error.message
              : "Workspace bootstrap failed for this channel.",
        });
      }
    }

    const hasPersistedRows = items.some(
      (item) => item.outcome === "created" || item.outcome === "already_exists",
    );

    if (hasPersistedRows) {
      if (campaign.status === "draft") {
        await this.campaignRepository.updateStatus(
          campaignId,
          "channel_pending",
        );
        await this.campaignRepository.updateStatus(
          campaignId,
          "channel_resolved",
        );
      } else if (campaign.status === "channel_pending") {
        await this.campaignRepository.updateStatus(
          campaignId,
          "channel_resolved",
        );
      }
    }

    return {
      success: true,
      result: {
        campaignId,
        items,
      },
    };
  }
}
