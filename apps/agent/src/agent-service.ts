import type {
  CampaignRepository,
  ChannelRepository,
  DealRepository
} from "@repo/db";
import type { AgentRunResult, Channel } from "@repo/types";

export class AgentService {
  public constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly dealRepository: DealRepository
  ) {}

  public async run(campaignId: string): Promise<AgentRunResult> {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (campaign === null) {
      return {
        success: false,
        campaignId,
        error: "Campaign not found"
      };
    }

    const channel = this.pickChannel(
      await this.channelRepository.getChannels(),
      campaign.budget
    );

    if (channel === undefined) {
      return {
        success: false,
        campaignId,
        error: "No channel matches campaign budget"
      };
    }

    const deal = await this.dealRepository.createDeal({
      campaignId: campaign.id,
      channelId: channel.id,
      price: channel.price
    });

    return {
      success: true,
      campaignId: campaign.id,
      deal
    };
  }

  private pickChannel(channels: Channel[], budget: number): Channel | undefined {
    return channels
      .filter((channel) => channel.price <= budget)
      .sort((left, right) => left.price - right.price)[0];
  }
}
