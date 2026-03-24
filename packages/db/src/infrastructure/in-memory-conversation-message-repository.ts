import { randomUUID } from "node:crypto";
import type {
  ConversationMessage,
  CreateConversationMessageInput,
  UpdateConversationMessageInput,
} from "@repo/types";
import type { ConversationMessageRepository } from "../domain/conversation-message-repository.js";

export class InMemoryConversationMessageRepository
  implements ConversationMessageRepository
{
  private readonly messages: ConversationMessage[] = [];

  public async create(
    input: CreateConversationMessageInput,
  ): Promise<ConversationMessage> {
    const now = new Date().toISOString();
    const message: ConversationMessage = {
      id: randomUUID(),
      threadId: input.threadId,
      direction: input.direction,
      messageType: input.messageType,
      text: input.text,
      telegramMessageId: input.telegramMessageId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.messages.push(message);

    return { ...message };
  }

  public async listByThreadId(threadId: string): Promise<ConversationMessage[]> {
    return this.messages
      .filter((message) => message.threadId === threadId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map((message) => ({ ...message }));
  }

  public async getByThreadIdAndTelegramMessageId(
    threadId: string,
    telegramMessageId: string,
  ): Promise<ConversationMessage | undefined> {
    const message = this.messages.find(
      (entry) =>
        entry.threadId === threadId &&
        entry.telegramMessageId === telegramMessageId,
    );

    return message === undefined ? undefined : { ...message };
  }

  public async update(
    id: string,
    input: UpdateConversationMessageInput,
  ): Promise<ConversationMessage | undefined> {
    const index = this.messages.findIndex((message) => message.id === id);

    if (index === -1) {
      return undefined;
    }

    const existing = this.messages[index];
    const updated: ConversationMessage = {
      ...existing,
      text: input.text ?? existing.text,
      telegramMessageId:
        input.telegramMessageId !== undefined
          ? input.telegramMessageId
          : existing.telegramMessageId,
      updatedAt: new Date().toISOString(),
    };

    this.messages[index] = updated;

    return { ...updated };
  }
}
