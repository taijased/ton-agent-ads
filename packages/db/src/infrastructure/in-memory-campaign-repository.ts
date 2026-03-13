import { randomUUID } from "node:crypto";
import type { Campaign, CreateCampaignInput } from "@repo/types";
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
      budget: input.budget,
      spent: 0,
      status: "active",
      createdAt: new Date().toISOString()
    };

    this.campaigns.set(campaign.id, campaign);

    return { ...campaign };
  }
}
