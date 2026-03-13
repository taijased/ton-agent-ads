import { randomUUID } from "node:crypto";
import type { CreateDealInput, Deal } from "@repo/types";
import type { DealRepository } from "./deal-repository.js";

export class InMemoryDealRepository implements DealRepository {
  private readonly deals: Deal[] = [];

  public getDeals(): Deal[] {
    return this.deals.map((deal) => ({ ...deal }));
  }

  public getDealsByCampaignId(campaignId: string): Deal[] {
    return this.deals
      .filter((deal) => deal.campaignId === campaignId)
      .map((deal) => ({ ...deal }));
  }

  public createDeal(input: CreateDealInput): Deal {
    if (input.campaignId.trim().length === 0) {
      throw new Error("campaignId is required");
    }

    if (input.channelId.trim().length === 0) {
      throw new Error("channelId is required");
    }

    if (!Number.isFinite(input.price)) {
      throw new Error("price is required");
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
