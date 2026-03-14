import type {
  CreateDealApprovalRequestInput,
  DealApprovalRequest
} from "@repo/types";
import type { DealApprovalRequestRepository } from "../domain/deal-approval-request-repository.js";
import { prisma } from "./prisma-client.js";

const toDealApprovalRequest = (request: {
  id: string;
  dealId: string;
  proposedPriceTon: number | null;
  proposedFormat: string | null;
  proposedDateText: string | null;
  summary: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
}): DealApprovalRequest => ({
  id: request.id,
  dealId: request.dealId,
  proposedPriceTon: request.proposedPriceTon,
  proposedFormat: request.proposedFormat,
  proposedDateText: request.proposedDateText,
  summary: request.summary,
  status: request.status as DealApprovalRequest["status"],
  createdAt: request.createdAt.toISOString(),
  resolvedAt: request.resolvedAt?.toISOString() ?? null
});

export class PrismaDealApprovalRequestRepository implements DealApprovalRequestRepository {
  public async create(input: CreateDealApprovalRequestInput): Promise<DealApprovalRequest> {
    const request = await prisma.dealApprovalRequest.create({
      data: {
        dealId: input.dealId,
        proposedPriceTon: input.proposedPriceTon ?? null,
        proposedFormat: input.proposedFormat ?? null,
        proposedDateText: input.proposedDateText ?? null,
        summary: input.summary,
        status: input.status ?? "pending"
      }
    });

    return toDealApprovalRequest(request);
  }

  public async getById(id: string): Promise<DealApprovalRequest | undefined> {
    const request = await prisma.dealApprovalRequest.findUnique({ where: { id } });
    return request === null ? undefined : toDealApprovalRequest(request);
  }

  public async getPendingByDealId(dealId: string): Promise<DealApprovalRequest | undefined> {
    const request = await prisma.dealApprovalRequest.findFirst({
      where: { dealId, status: "pending" },
      orderBy: { createdAt: "desc" }
    });

    return request === null ? undefined : toDealApprovalRequest(request);
  }

  public async markApproved(id: string): Promise<DealApprovalRequest | undefined> {
    return this.updateStatus(id, "approved");
  }

  public async markRejected(id: string): Promise<DealApprovalRequest | undefined> {
    return this.updateStatus(id, "rejected");
  }

  private async updateStatus(
    id: string,
    status: DealApprovalRequest["status"]
  ): Promise<DealApprovalRequest | undefined> {
    const existing = await prisma.dealApprovalRequest.findUnique({ where: { id } });

    if (existing === null) {
      return undefined;
    }

    const request = await prisma.dealApprovalRequest.update({
      where: { id },
      data: {
        status,
        resolvedAt: new Date()
      }
    });

    return toDealApprovalRequest(request);
  }
}
