import type {
  Campaign,
  CampaignStatus,
  CreateCampaignInput,
  UpdateCampaignNegotiationStateInput,
  UpdateCampaignInput,
} from "@repo/types";
import type { CampaignRepository } from "../domain/campaign-repository.js";
import { prisma } from "./prisma-client.js";

const toCampaign = (campaign: {
  id: string;
  userId: string;
  text: string;
  budgetAmount: string;
  budgetCurrency: string;
  theme: string | null;
  tags: string[];
  language: string | null;
  goal: string | null;
  ctaUrl: string | null;
  buttonText: string | null;
  mediaUrl: string | null;
  targetAudience: string | null;
  spent: number;
  status: string;
  negotiationStartedAt: Date | null;
  negotiationStatus: string;
  createdAt: Date;
}): Campaign => ({
  id: campaign.id,
  userId: campaign.userId,
  text: campaign.text,
  budgetAmount: campaign.budgetAmount,
  budgetCurrency: campaign.budgetCurrency as Campaign["budgetCurrency"],
  theme: campaign.theme,
  tags: campaign.tags,
  language: campaign.language as Campaign["language"],
  goal: campaign.goal as Campaign["goal"],
  ctaUrl: campaign.ctaUrl,
  buttonText: campaign.buttonText,
  mediaUrl: campaign.mediaUrl,
  targetAudience: campaign.targetAudience,
  spent: campaign.spent,
  status: campaign.status as Campaign["status"],
  negotiationStartedAt: campaign.negotiationStartedAt?.toISOString() ?? null,
  negotiationStatus:
    campaign.negotiationStatus as Campaign["negotiationStatus"],
  createdAt: campaign.createdAt.toISOString(),
});

export class PrismaCampaignRepository implements CampaignRepository {
  public async list(): Promise<Campaign[]> {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "asc" },
    });

    return campaigns.map(toCampaign);
  }

  public async listByUserId(userId: string): Promise<Campaign[]> {
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return campaigns.map(toCampaign);
  }

  public async findById(id: string): Promise<Campaign | null> {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    return campaign === null ? null : toCampaign(campaign);
  }

  public async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<Campaign | null> {
    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
    });

    return campaign === null ? null : toCampaign(campaign);
  }

  public async create(input: CreateCampaignInput): Promise<Campaign> {
    const campaign = await prisma.campaign.create({
      data: {
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
        negotiationStartedAt: null,
        negotiationStatus: "idle",
      },
    });

    return toCampaign(campaign);
  }

  public async update(
    id: string,
    input: UpdateCampaignInput,
  ): Promise<Campaign | null> {
    const existing = await prisma.campaign.findUnique({ where: { id } });

    if (existing === null) {
      return null;
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
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
      },
    });

    return toCampaign(updated);
  }

  public async updateStatus(
    id: string,
    status: CampaignStatus,
  ): Promise<Campaign | null> {
    const existing = await prisma.campaign.findUnique({ where: { id } });

    if (existing === null) return null;

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status },
    });

    return toCampaign(updated);
  }

  public async updateNegotiationState(
    id: string,
    input: UpdateCampaignNegotiationStateInput,
  ): Promise<Campaign | null> {
    const existing = await prisma.campaign.findUnique({ where: { id } });

    if (existing === null) return null;

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        negotiationStatus: input.negotiationStatus,
        negotiationStartedAt:
          input.negotiationStartedAt !== undefined
            ? input.negotiationStartedAt === null
              ? null
              : new Date(input.negotiationStartedAt)
            : existing.negotiationStartedAt,
      },
    });

    return toCampaign(updated);
  }
}
