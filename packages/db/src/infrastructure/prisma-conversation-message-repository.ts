import type {
  ConversationDirection,
  ConversationMessage,
  ConversationMessageType,
  CreateConversationMessageInput,
  UpdateConversationMessageInput,
} from "@repo/types";
import type { ConversationMessageRepository } from "../domain/conversation-message-repository.js";
import { prisma } from "./prisma-client.js";

const toConversationMessage = (message: {
  id: string;
  threadId: string;
  direction: string;
  messageType: string;
  text: string;
  telegramMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ConversationMessage => ({
  id: message.id,
  threadId: message.threadId,
  direction: message.direction as ConversationDirection,
  messageType: message.messageType as ConversationMessageType,
  text: message.text,
  telegramMessageId: message.telegramMessageId,
  createdAt: message.createdAt.toISOString(),
  updatedAt: message.updatedAt.toISOString(),
});

export class PrismaConversationMessageRepository implements ConversationMessageRepository {
  public async create(
    input: CreateConversationMessageInput,
  ): Promise<ConversationMessage> {
    const message = await prisma.conversationMessage.create({
      data: {
        threadId: input.threadId,
        direction: input.direction,
        messageType: input.messageType,
        text: input.text,
        telegramMessageId: input.telegramMessageId ?? null,
      },
    });

    return toConversationMessage(message);
  }

  public async listByThreadId(
    threadId: string,
  ): Promise<ConversationMessage[]> {
    const messages = await prisma.conversationMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });

    return messages.map(toConversationMessage);
  }

  public async getByThreadIdAndTelegramMessageId(
    threadId: string,
    telegramMessageId: string,
  ): Promise<ConversationMessage | undefined> {
    const message = await prisma.conversationMessage.findUnique({
      where: {
        threadId_telegramMessageId: {
          threadId,
          telegramMessageId,
        },
      },
    });

    return message === null ? undefined : toConversationMessage(message);
  }

  public async update(
    id: string,
    input: UpdateConversationMessageInput,
  ): Promise<ConversationMessage | undefined> {
    const existing = await prisma.conversationMessage.findUnique({
      where: { id },
    });

    if (existing === null) {
      return undefined;
    }

    const message = await prisma.conversationMessage.update({
      where: { id },
      data: {
        text: input.text ?? existing.text,
        telegramMessageId:
          input.telegramMessageId !== undefined
            ? input.telegramMessageId
            : existing.telegramMessageId,
      },
    });

    return toConversationMessage(message);
  }
}
