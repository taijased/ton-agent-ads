import type {
  CampaignRepository,
  ChannelRepository,
  DealRepository,
} from "@repo/db";
import type {
  AgentChannelEvaluation,
  AgentRunResult,
  Channel,
  Campaign,
} from "@repo/types";

export class AgentService {
  public constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly dealRepository: DealRepository,
  ) {}

  public async run(campaignId: string): Promise<AgentRunResult> {
    const campaign = await this.campaignRepository.findById(campaignId);

    if (campaign === null) {
      return {
        success: false,
        campaignId,
        error: "Campaign not found",
        reason: "Campaign could not be loaded",
      };
    }

    const budget = Number(campaign.budgetAmount);

    if (!Number.isFinite(budget) || budget <= 0) {
      return {
        success: false,
        campaignId,
        error: "Campaign budget is invalid",
        reason: "Campaign budget could not be interpreted",
      };
    }

    const channels = await this.channelRepository.getChannels();
    const evaluation = this.evaluateChannels(channels, budget, campaign);

    const channel = this.pickChannel(channels, budget);

    if (channel === undefined) {
      return {
        success: false,
        campaignId,
        error: "No channel matches campaign budget",
        reason: "No available channel fits within the current budget",
        evaluation,
      };
    }

    const deal = await this.dealRepository.createDeal({
      campaignId: campaign.id,
      channelId: channel.id,
      price: channel.price,
      status: "negotiating",
    });

    return {
      success: true,
      campaignId: campaign.id,
      selectedChannel: channel,
      deal,
      reason: `Selected the cheapest channel within campaign budget${this.getCampaignContextSuffix(campaign)}`,
      evaluation,
    };
  }

  private evaluateChannels(
    channels: Channel[],
    budget: number,
    campaign: Campaign,
  ): AgentChannelEvaluation[] {
    return channels.map((channel) => ({
      channelId: channel.id,
      username: channel.username,
      price: channel.price,
      eligible: channel.price <= budget,
      reason:
        channel.price <= budget
          ? `price is within campaign budget${this.getCampaignContextSuffix(campaign)}`
          : `price exceeds campaign budget${this.getCampaignContextSuffix(campaign)}`,
    }));
  }

  private getCampaignContextSuffix(campaign: Campaign): string {
    const details = [
      campaign.theme ? `theme: ${campaign.theme}` : null,
      campaign.language ? `language: ${campaign.language}` : null,
      campaign.goal ? `goal: ${campaign.goal}` : null,
    ].filter((value): value is string => value !== null);

    return details.length === 0 ? "" : `; ${details.join("; ")}`;
  }

  private pickChannel(
    channels: Channel[],
    budget: number,
  ): Channel | undefined {
    return channels
      .filter((channel) => channel.price <= budget)
      .sort((left, right) => left.price - right.price)[0];
  }
}
