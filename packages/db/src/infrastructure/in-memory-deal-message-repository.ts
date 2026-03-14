import { randomUUID } from "node:crypto";
import type { CreateDealMessageInput, DealMessage } from "@repo/types";
import type { DealMessageRepository } from "../domain/deal-message-repository.js";

export class InMemoryDealMessageRepository implements DealMessageRepository {
  private readonly messages: DealMessage[] = [];

  public async create(input: CreateDealMessageInput): Promise<DealMessage> {
    const message: DealMessage = {
      id: randomUUID(),
      dealId: input.dealId,
      direction: input.direction,
      senderType: input.senderType,
      contactValue: input.contactValue ?? null,
      text: input.text,
      externalMessageId: input.externalMessageId ?? null,
      createdAt: new Date().toISOString()
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

  public async listRecentByDealId(dealId: string, limit: number): Promise<DealMessage[]> {
    return (await this.listByDealId(dealId)).slice(-limit);
  }
}
