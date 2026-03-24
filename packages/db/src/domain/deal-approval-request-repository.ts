import type {
  CreateDealApprovalRequestInput,
  DealApprovalRequest,
} from "@repo/types";

export interface DealApprovalRequestRepository {
  create(input: CreateDealApprovalRequestInput): Promise<DealApprovalRequest>;
  getById(id: string): Promise<DealApprovalRequest | undefined>;
  getPendingByDealId(dealId: string): Promise<DealApprovalRequest | undefined>;
  getApprovedByDealId(dealId: string): Promise<DealApprovalRequest | undefined>;
  markApproved(id: string): Promise<DealApprovalRequest | undefined>;
  markRejected(id: string): Promise<DealApprovalRequest | undefined>;
}
