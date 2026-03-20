import type {
  CreateDealMessageInput,
  DealMessage,
  DealMessageSenderType,
  UpdateDealMessageDeliveryInput,
} from "@repo/types";

export interface DealMessageRepository {
  create(input: CreateDealMessageInput): Promise<DealMessage>;
  listByDealId(dealId: string): Promise<DealMessage[]>;
  listRecentByDealId(dealId: string, limit: number): Promise<DealMessage[]>;
  getByDealIdAndNotificationKey(
    dealId: string,
    notificationKey: string,
  ): Promise<DealMessage | undefined>;
  getByDealIdAndExternalMessageId(
    dealId: string,
    senderType: DealMessageSenderType,
    externalMessageId: string,
  ): Promise<DealMessage | undefined>;
  updateDelivery(
    id: string,
    input: UpdateDealMessageDeliveryInput,
  ): Promise<DealMessage | undefined>;
}
