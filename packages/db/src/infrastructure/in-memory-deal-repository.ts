import { randomUUID } from "node:crypto";
import type { CreateDealInput, Deal, UpdateDealStatusInput } from "@repo/types";
import type { DealRepository } from "../domain/deal-repository.js";

export class InMemoryDealRepository implements DealRepository {
  private readonly deals: Deal[] = [];

  public async getDeals(): Promise<Deal[]> {
    return this.deals.map((deal) => ({ ...deal }));
  }

  public async getDealById(id: string): Promise<Deal | undefined> {
    const deal = this.deals.find((entry) => entry.id === id);

    return deal === undefined ? undefined : { ...deal };
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
      status: input.status ?? "pending",
      adminContactedAt: null,
      termsAgreedAt: null,
      paidAt: null,
      proofText: null,
      proofUrl: null,
      completedAt: null,
      failedAt: null,
      createdAt: new Date().toISOString()
    };

    this.deals.push(deal);

    return { ...deal };
  }

  public async updateDealStatus(id: string, input: UpdateDealStatusInput): Promise<Deal | undefined> {
    const index = this.deals.findIndex((deal) => deal.id === id);

    if (index === -1) {
      return undefined;
    }

    const updatedDeal: Deal = {
      ...this.deals[index],
      status: input.status,
      adminContactedAt:
        input.status === "admin_contacted"
          ? new Date().toISOString()
          : this.deals[index].adminContactedAt,
      termsAgreedAt:
        input.status === "terms_agreed"
          ? new Date().toISOString()
          : this.deals[index].termsAgreedAt,
      paidAt:
        input.status === "paid" ? new Date().toISOString() : this.deals[index].paidAt,
      proofText: input.proofText ?? this.deals[index].proofText,
      proofUrl: input.proofUrl ?? this.deals[index].proofUrl,
      completedAt:
        input.status === "completed"
          ? new Date().toISOString()
          : this.deals[index].completedAt,
      failedAt:
        input.status === "failed"
          ? new Date().toISOString()
          : this.deals[index].failedAt
    };

    this.deals[index] = updatedDeal;

    return { ...updatedDeal };
  }
}
