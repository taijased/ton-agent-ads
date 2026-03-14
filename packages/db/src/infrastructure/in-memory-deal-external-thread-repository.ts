import { randomUUID } from "node:crypto";
import type { CreateDealExternalThreadInput, DealExternalThread } from "@repo/types";
import type { DealExternalThreadRepository } from "../domain/deal-external-thread-repository.js";

export class InMemoryDealExternalThreadRepository implements DealExternalThreadRepository {
  private readonly threads: DealExternalThread[] = [];

  public async create(input: CreateDealExternalThreadInput): Promise<DealExternalThread> {
    const existing = this.threads.find(
      (entry) => entry.platform === input.platform && entry.chatId === input.chatId
    );

    if (existing !== undefined) {
      return { ...existing };
    }

    const thread: DealExternalThread = {
      id: randomUUID(),
      dealId: input.dealId,
      platform: input.platform,
      chatId: input.chatId,
      contactValue: input.contactValue ?? null,
      createdAt: new Date().toISOString()
    };

    this.threads.push(thread);
    return { ...thread };
  }

  public async getByDealId(dealId: string): Promise<DealExternalThread | undefined> {
    const thread = this.threads.find((entry) => entry.dealId === dealId);
    return thread === undefined ? undefined : { ...thread };
  }

  public async getByPlatformChatId(platform: string, chatId: string): Promise<DealExternalThread | undefined> {
    const thread = this.threads.find(
      (entry) => entry.platform === platform && entry.chatId === chatId
    );
    return thread === undefined ? undefined : { ...thread };
  }
}
