import type { CreateDealInput, Deal, UpdateDealStatusInput } from "@repo/types";
import type { DealRepository } from "../domain/deal-repository.js";
import { prisma } from "./prisma-client.js";

const toDeal = (deal: {
  id: string;
  campaignId: string;
  channelId: string;
  price: number;
  status: string;
  adminContactedAt: Date | null;
  termsAgreedAt: Date | null;
  paidAt: Date | null;
  proofText: string | null;
  proofUrl: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
}): Deal => ({
  id: deal.id,
  campaignId: deal.campaignId,
  channelId: deal.channelId,
  price: deal.price,
  status: deal.status as Deal["status"],
  adminContactedAt: deal.adminContactedAt?.toISOString() ?? null,
  termsAgreedAt: deal.termsAgreedAt?.toISOString() ?? null,
  paidAt: deal.paidAt?.toISOString() ?? null,
  proofText: deal.proofText,
  proofUrl: deal.proofUrl,
  completedAt: deal.completedAt?.toISOString() ?? null,
  failedAt: deal.failedAt?.toISOString() ?? null,
  createdAt: deal.createdAt.toISOString()
});

export class PrismaDealRepository implements DealRepository {
  public async getDeals(): Promise<Deal[]> {
    const deals = await prisma.deal.findMany({
      orderBy: { createdAt: "asc" }
    });

    return deals.map(toDeal);
  }

  public async getDealById(id: string): Promise<Deal | undefined> {
    const deal = await prisma.deal.findUnique({
      where: { id }
    });

    return deal === null ? undefined : toDeal(deal);
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

  public async updateDealStatus(id: string, input: UpdateDealStatusInput): Promise<Deal | undefined> {
    const existingDeal = await prisma.deal.findUnique({
      where: { id }
    });

    if (existingDeal === null) {
      return undefined;
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        status: input.status,
        adminContactedAt:
          input.status === "admin_contacted" ? new Date() : existingDeal.adminContactedAt,
        termsAgreedAt:
          input.status === "terms_agreed" ? new Date() : existingDeal.termsAgreedAt,
        paidAt: input.status === "paid" ? new Date() : existingDeal.paidAt,
        proofText: input.proofText ?? existingDeal.proofText,
        proofUrl: input.proofUrl ?? existingDeal.proofUrl,
        completedAt:
          input.status === "completed" ? new Date() : existingDeal.completedAt,
        failedAt: input.status === "failed" ? new Date() : existingDeal.failedAt
      }
    });

    return toDeal(deal);
  }
}
