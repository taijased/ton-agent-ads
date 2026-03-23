import type {
  CampaignRepository,
  ChannelRepository,
  DealRepository,
} from "@repo/db";
import type { SubmitTargetChannelResult } from "@repo/types";
import { ChannelParserService } from "./channel-parser-service.js";

export interface TargetChannelActionResult {
  success: boolean;
  result?: SubmitTargetChannelResult;
  message?: string;
  statusCode?: number;
}

export class TargetChannelService {
  public constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly dealRepository: DealRepository,
    private readonly channelParserService: ChannelParserService,
  ) {}

  public async submit(
    campaignId: string,
    reference: string,
  ): Promise<TargetChannelActionResult> {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (campaign === null) {
      return {
        success: false,
        message: "Campaign not found",
        statusCode: 404,
      };
    }

    if (campaign.status !== "draft" && campaign.status !== "channel_pending") {
      return {
        success: false,
        message: "Campaign must be in draft or channel_pending status",
        statusCode: 400,
      };
    }

    if (campaign.status === "draft") {
      await this.campaignRepository.updateStatus(campaignId, "channel_pending");
    }

    const parsedChannel = await this.channelParserService.parse(reference);
    const budgetAmount = Number(campaign.budgetAmount);
    const dealPrice = Number.isFinite(budgetAmount)
      ? Math.max(1, Math.round(budgetAmount))
      : 1;
    const channel = await this.channelRepository.saveParsedChannel({
      id: parsedChannel.channel.id,
      username: parsedChannel.channel.username,
      title: parsedChannel.channel.title,
      description: parsedChannel.parsed.description || null,
      category: "telegram",
      price: dealPrice,
      avgViews: 0,
      contacts: parsedChannel.contacts,
    });

    let deal = await this.dealRepository.findByCampaignAndChannel(
      campaign.id,
      channel.id,
    );

    if (deal === null) {
      deal = await this.dealRepository.createDeal({
        campaignId: campaign.id,
        channelId: channel.id,
        price: dealPrice,
        status: "negotiating",
      });
    }

    await this.campaignRepository.updateStatus(campaignId, "channel_resolved");

    return {
      success: true,
      result: {
        campaignId: campaign.id,
        deal,
        channel,
        parsed: parsedChannel.parsed,
        selectedContact: parsedChannel.selectedContact,
      },
    };
  }
}
