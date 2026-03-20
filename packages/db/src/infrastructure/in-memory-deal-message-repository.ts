import { randomUUID } from "node:crypto";
import type {
  CreateDealMessageInput,
  DealMessage,
  DealMessageAudience,
  DealMessageSenderType,
  DealMessageTransport,
  UpdateDealMessageDeliveryInput,
} from "@repo/types";
import type { DealMessageRepository } from "../domain/deal-message-repository.js";

const inferAudience = (input: CreateDealMessageInput): DealMessageAudience => {
  if (input.audience !== undefined) {
    return input.audience;
  }

  if (input.direction === "internal") {
    return "internal";
  }

  return input.senderType === "user" || input.senderType === "system"
    ? "creator"
    : "admin";
};

const inferTransport = (
  input: CreateDealMessageInput,
): DealMessageTransport => {
  if (input.transport !== undefined) {
    return input.transport;
  }

  if (input.direction === "internal") {
    return "internal";
  }

  return inferAudience(input) === "creator"
    ? "telegram_bot"
    : "telegram_mtproto";
};

export class InMemoryDealMessageRepository implements DealMessageRepository {
  private readonly messages: DealMessage[] = [];

  public async create(input: CreateDealMessageInput): Promise<DealMessage> {
    const message: DealMessage = {
      id: randomUUID(),
      dealId: input.dealId,
      direction: input.direction,
      senderType: input.senderType,
      audience: inferAudience(input),
      transport: inferTransport(input),
      contactValue: input.contactValue ?? null,
      text: input.text,
      externalMessageId: input.externalMessageId ?? null,
      deliveryStatus: input.deliveryStatus ?? null,
      notificationKey: input.notificationKey ?? null,
      failureReason: input.failureReason ?? null,
      createdAt: new Date().toISOString(),
    };

    this.messages.push(message);
    return { ...message };
  }

  public async listByDealId(dealId: string): Promise<DealMessage[]> {
    return this.messages
      .filter((message) => message.dealId === dealId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((message) => ({ ...message }));
  }

  public async listRecentByDealId(
    dealId: string,
    limit: number,
  ): Promise<DealMessage[]> {
    return (await this.listByDealId(dealId)).slice(-limit);
  }

  public async getByDealIdAndNotificationKey(
    dealId: string,
    notificationKey: string,
  ): Promise<DealMessage | undefined> {
    const message = this.messages.find(
      (entry) =>
        entry.dealId === dealId && entry.notificationKey === notificationKey,
    );

    return message === undefined ? undefined : { ...message };
  }

  public async getByDealIdAndExternalMessageId(
    dealId: string,
    senderType: DealMessageSenderType,
    externalMessageId: string,
  ): Promise<DealMessage | undefined> {
    const message = this.messages.find(
      (entry) =>
        entry.dealId === dealId &&
        entry.senderType === senderType &&
        entry.externalMessageId === externalMessageId,
    );

    return message === undefined ? undefined : { ...message };
  }

  public async updateDelivery(
    id: string,
    input: UpdateDealMessageDeliveryInput,
  ): Promise<DealMessage | undefined> {
    const index = this.messages.findIndex((message) => message.id === id);

    if (index === -1) {
      return undefined;
    }

    const updatedMessage: DealMessage = {
      ...this.messages[index],
      deliveryStatus: input.deliveryStatus,
      externalMessageId:
        input.externalMessageId !== undefined
          ? input.externalMessageId
          : this.messages[index].externalMessageId,
      failureReason:
        input.failureReason !== undefined
          ? input.failureReason
          : this.messages[index].failureReason,
    };

    this.messages[index] = updatedMessage;

    return { ...updatedMessage };
  }
}
