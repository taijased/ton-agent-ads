import { randomUUID } from "node:crypto";
import type {
  ConversationThread,
  CreateConversationThreadInput,
  UpdateConversationThreadInput,
} from "@repo/types";
import type { ConversationThreadRepository } from "../domain/conversation-thread-repository.js";

export class InMemoryConversationThreadRepository implements ConversationThreadRepository {
  private readonly threads: ConversationThread[] = [];

  public async create(
    input: CreateConversationThreadInput,
  ): Promise<ConversationThread> {
    const now = new Date().toISOString();
    const thread: ConversationThread = {
      id: randomUUID(),
      campaignId: input.campaignId,
      channelId: input.channelId,
      adminContactId: input.adminContactId,
      dealId: input.dealId ?? null,
      status: input.status ?? "not_started",
      startedAt: input.startedAt ?? null,
      lastMessageAt: input.lastMessageAt ?? null,
      lastMessagePreview: input.lastMessagePreview ?? null,
      lastDirection: input.lastDirection ?? null,
      outreachAttemptCount: input.outreachAttemptCount ?? 0,
      telegramChatId: input.telegramChatId ?? null,
      closedAt: input.closedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.threads.push(thread);

    return { ...thread };
  }

  public async getById(id: string): Promise<ConversationThread | undefined> {
    const thread = this.threads.find((entry) => entry.id === id);

    return thread === undefined ? undefined : { ...thread };
  }

  public async getByCampaignId(
    campaignId: string,
  ): Promise<ConversationThread[]> {
    return this.threads
      .filter((thread) => thread.campaignId === campaignId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((thread) => ({ ...thread }));
  }

  public async findByCampaignChannelAdmin(
    campaignId: string,
    channelId: string,
    adminContactId: string,
  ): Promise<ConversationThread | null> {
    const thread = this.threads.find(
      (entry) =>
        entry.campaignId === campaignId &&
        entry.channelId === channelId &&
        entry.adminContactId === adminContactId,
    );

    return thread === undefined ? null : { ...thread };
  }

  public async getByTelegramChatId(
    chatId: string,
  ): Promise<ConversationThread | undefined> {
    const thread = this.threads.find(
      (entry) => entry.telegramChatId === chatId,
    );

    return thread === undefined ? undefined : { ...thread };
  }

  public async update(
    id: string,
    input: UpdateConversationThreadInput,
  ): Promise<ConversationThread | undefined> {
    const index = this.threads.findIndex((thread) => thread.id === id);

    if (index === -1) {
      return undefined;
    }

    const existing = this.threads[index];
    const updated: ConversationThread = {
      ...existing,
      dealId: input.dealId !== undefined ? input.dealId : existing.dealId,
      status: input.status ?? existing.status,
      startedAt:
        input.startedAt !== undefined ? input.startedAt : existing.startedAt,
      lastMessageAt:
        input.lastMessageAt !== undefined
          ? input.lastMessageAt
          : existing.lastMessageAt,
      lastMessagePreview:
        input.lastMessagePreview !== undefined
          ? input.lastMessagePreview
          : existing.lastMessagePreview,
      lastDirection:
        input.lastDirection !== undefined
          ? input.lastDirection
          : existing.lastDirection,
      outreachAttemptCount:
        input.outreachAttemptCount ?? existing.outreachAttemptCount,
      telegramChatId:
        input.telegramChatId !== undefined
          ? input.telegramChatId
          : existing.telegramChatId,
      closedAt:
        input.closedAt !== undefined ? input.closedAt : existing.closedAt,
      updatedAt: new Date().toISOString(),
    };

    this.threads[index] = updated;

    return { ...updated };
  }
}
