import type { CreateDealInput, Deal } from "@repo/types";
import type { DealRepository } from "../domain/deal-repository.js";
import { prisma } from "./prisma-client.js";

const toDeal = (deal: {
  id: string;
  campaignId: string;
  channelId: string;
  price: number;
  status: string;
  createdAt: Date;
}): Deal => ({
  id: deal.id,
  campaignId: deal.campaignId,
  channelId: deal.channelId,
  price: deal.price,
  status: deal.status as Deal["status"],
  createdAt: deal.createdAt.toISOString()
});

export class PrismaDealRepository implements DealRepository {
  public async getDeals(): Promise<Deal[]> {
    const deals = await prisma.deal.findMany({
      orderBy: { createdAt: "asc" }
    });

    return deals.map(toDeal);
  }

  public async getDealsByCampaignId(campaignId: string): Promise<Deal[]> {
    const deals = await prisma.deal.findMany({
      where: { campaignId },
      orderBy: { createdAt: "asc" }
    });

    return deals.map(toDeal);
  }

  public async createDeal(input: CreateDealInput): Promise<Deal> {
    if (input.campaignId.trim().length === 0) {
      throw new Error("campaignId is required");
    }

    if (input.channelId.trim().length === 0) {
      throw new Error("channelId is required");
    }

    if (!Number.isFinite(input.price) || input.price <= 0) {
      throw new Error("price must be a positive number");
    }

    const deal = await prisma.deal.create({
      data: {
        campaignId: input.campaignId,
        channelId: input.channelId,
        price: input.price,
        status: input.status ?? "pending"
      }
    });

    return toDeal(deal);
  }
}
