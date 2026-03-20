import { randomUUID } from "node:crypto";
import type {
  CreateDealApprovalRequestInput,
  DealApprovalRequest,
} from "@repo/types";
import type { DealApprovalRequestRepository } from "../domain/deal-approval-request-repository.js";

export class InMemoryDealApprovalRequestRepository implements DealApprovalRequestRepository {
  private readonly requests: DealApprovalRequest[] = [];

  public async create(
    input: CreateDealApprovalRequestInput,
  ): Promise<DealApprovalRequest> {
    const request: DealApprovalRequest = {
      id: randomUUID(),
      dealId: input.dealId,
      proposedPriceTon: input.proposedPriceTon ?? null,
      proposedFormat: input.proposedFormat ?? null,
      proposedDateText: input.proposedDateText ?? null,
      proposedWallet: input.proposedWallet ?? null,
      summary: input.summary,
      status: input.status ?? "pending",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    this.requests.push(request);
    return { ...request };
  }

  public async getById(id: string): Promise<DealApprovalRequest | undefined> {
    const request = this.requests.find((entry) => entry.id === id);
    return request === undefined ? undefined : { ...request };
  }

  public async getPendingByDealId(
    dealId: string,
  ): Promise<DealApprovalRequest | undefined> {
    const request = this.requests.find(
      (entry) => entry.dealId === dealId && entry.status === "pending",
    );
    return request === undefined ? undefined : { ...request };
  }

  public async markApproved(
    id: string,
  ): Promise<DealApprovalRequest | undefined> {
    return this.updateStatus(id, "approved");
  }

  public async markRejected(
    id: string,
  ): Promise<DealApprovalRequest | undefined> {
    return this.updateStatus(id, "rejected");
  }

  private async updateStatus(
    id: string,
    status: DealApprovalRequest["status"],
  ): Promise<DealApprovalRequest | undefined> {
    const index = this.requests.findIndex((entry) => entry.id === id);

    if (index === -1) {
      return undefined;
    }

    this.requests[index] = {
      ...this.requests[index],
      status,
      resolvedAt: new Date().toISOString(),
    };

    return { ...this.requests[index] };
  }
}
