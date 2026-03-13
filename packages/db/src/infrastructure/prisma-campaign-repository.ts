import type { Campaign, CreateCampaignInput } from "@repo/types";
import type { CampaignRepository } from "../domain/campaign-repository.js";
import { prisma } from "./prisma-client.js";

const toCampaign = (campaign: {
  id: string;
  userId: string;
  text: string;
  budget: number;
  spent: number;
  status: string;
  createdAt: Date;
}): Campaign => ({
  id: campaign.id,
  userId: campaign.userId,
  text: campaign.text,
  budget: campaign.budget,
  spent: campaign.spent,
  status: campaign.status as Campaign["status"],
  createdAt: campaign.createdAt.toISOString()
});

export class PrismaCampaignRepository implements CampaignRepository {
  public async list(): Promise<Campaign[]> {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "asc" }
    });

    return campaigns.map(toCampaign);
  }

  public async findById(id: string): Promise<Campaign | null> {
    const campaign = await prisma.campaign.findUnique({
      where: { id }
    });

    return campaign === null ? null : toCampaign(campaign);
  }

  public async create(input: CreateCampaignInput): Promise<Campaign> {
    const campaign = await prisma.campaign.create({
      data: {
        userId: input.userId,
        text: input.text,
        budget: input.budget,
        spent: 0,
        status: "draft"
      }
    });

    return toCampaign(campaign);
  }
}
