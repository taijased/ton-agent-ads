import { randomUUID } from "node:crypto";
import type { CreateDealInput, Deal } from "@repo/types";
import type { DealRepository } from "../domain/deal-repository.js";

export class InMemoryDealRepository implements DealRepository {
  private readonly deals: Deal[] = [];

  public async getDeals(): Promise<Deal[]> {
    return this.deals.map((deal) => ({ ...deal }));
  }

  public async getDealsByCampaignId(campaignId: string): Promise<Deal[]> {
    return this.deals
      .filter((deal) => deal.campaignId === campaignId)
      .map((deal) => ({ ...deal }));
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

    const deal: Deal = {
      id: randomUUID(),
      campaignId: input.campaignId,
      channelId: input.channelId,
      price: input.price,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    this.deals.push(deal);

    return { ...deal };
  }
}
