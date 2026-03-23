import { randomUUID } from "node:crypto";
import type {
  Campaign,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@repo/types";
import type { CampaignRepository } from "../domain/campaign-repository.js";

export class InMemoryCampaignRepository implements CampaignRepository {
  private readonly campaigns = new Map<string, Campaign>();

  public async list(): Promise<Campaign[]> {
    return [...this.campaigns.values()]
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((campaign) => ({ ...campaign }));
  }

  public async findById(id: string): Promise<Campaign | null> {
    const campaign = this.campaigns.get(id);

    return campaign === undefined ? null : { ...campaign };
  }

  public async create(input: CreateCampaignInput): Promise<Campaign> {
    const campaign: Campaign = {
      id: randomUUID(),
      userId: input.userId,
      text: input.text,
      budgetAmount: input.budgetAmount,
      budgetCurrency: input.budgetCurrency,
      theme: input.theme ?? null,
      tags: input.tags ?? [],
      language: input.language ?? null,
      goal: input.goal ?? null,
      ctaUrl: input.ctaUrl ?? null,
      buttonText: input.buttonText ?? null,
      mediaUrl: input.mediaUrl ?? null,
      targetAudience: input.targetAudience ?? null,
      spent: 0,
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    this.campaigns.set(campaign.id, campaign);

    return { ...campaign };
  }

  public async update(
    id: string,
    input: UpdateCampaignInput,
  ): Promise<Campaign | null> {
    const campaign = this.campaigns.get(id);

    if (campaign === undefined) {
      return null;
    }

    campaign.text = input.text;
    campaign.budgetAmount = input.budgetAmount;
    campaign.budgetCurrency = input.budgetCurrency;
    campaign.theme = input.theme ?? null;
    campaign.tags = input.tags ?? [];
    campaign.language = input.language ?? null;
    campaign.goal = input.goal ?? null;
    campaign.ctaUrl = input.ctaUrl ?? null;
    campaign.buttonText = input.buttonText ?? null;
    campaign.mediaUrl = input.mediaUrl ?? null;
    campaign.targetAudience = input.targetAudience ?? null;

    return {
      ...campaign,
      tags: [...campaign.tags],
    };
  }

  public async updateStatus(
    id: string,
    status: CampaignStatus,
  ): Promise<Campaign | null> {
    const campaign = this.campaigns.get(id);

    if (campaign === undefined) return null;

    campaign.status = status;

    return { ...campaign };
  }
}
