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
    const deal = await this.dealRepository.createDeal({
      campaignId: campaign.id,
      channelId: channel.id,
      price: dealPrice,
      status: "negotiating",
    });

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
