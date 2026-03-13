import type {
  CampaignRepository,
  ChannelRepository,
  DealRepository
} from "@repo/db";
import type {
  AgentChannelEvaluation,
  AgentRunResult,
  Channel
} from "@repo/types";

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
        error: "Campaign not found",
        reason: "Campaign could not be loaded"
      };
    }

    const channels = await this.channelRepository.getChannels();
    const evaluation = this.evaluateChannels(channels, campaign.budget);

    const channel = this.pickChannel(channels, campaign.budget);

    if (channel === undefined) {
      return {
        success: false,
        campaignId,
        error: "No channel matches campaign budget",
        reason: "No available channel fits within the current budget",
        evaluation
      };
    }

    const deal = await this.dealRepository.createDeal({
      campaignId: campaign.id,
      channelId: channel.id,
      price: channel.price,
      status: "negotiating"
    });

    return {
      success: true,
      campaignId: campaign.id,
      selectedChannel: channel,
      deal,
      reason: "Selected the cheapest channel within campaign budget",
      evaluation
    };
  }

  private evaluateChannels(
    channels: Channel[],
    budget: number
  ): AgentChannelEvaluation[] {
    return channels.map((channel) => ({
      channelId: channel.id,
      username: channel.username,
      price: channel.price,
      eligible: channel.price <= budget,
      reason:
        channel.price <= budget
          ? "price is within campaign budget"
          : "price exceeds campaign budget"
    }));
  }

  private pickChannel(channels: Channel[], budget: number): Channel | undefined {
    return channels
      .filter((channel) => channel.price <= budget)
      .sort((left, right) => left.price - right.price)[0];
  }
}
