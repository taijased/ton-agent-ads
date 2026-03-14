import type { CreateDealExternalThreadInput, DealExternalThread } from "@repo/types";

export interface DealExternalThreadRepository {
  create(input: CreateDealExternalThreadInput): Promise<DealExternalThread>;
  getByDealId(dealId: string): Promise<DealExternalThread | undefined>;
  getByPlatformChatId(platform: string, chatId: string): Promise<DealExternalThread | undefined>;
}
