import type { CreateDealMessageInput, DealMessage } from "@repo/types";

export interface DealMessageRepository {
  create(input: CreateDealMessageInput): Promise<DealMessage>;
  listByDealId(dealId: string): Promise<DealMessage[]>;
  listRecentByDealId(dealId: string, limit: number): Promise<DealMessage[]>;
}
