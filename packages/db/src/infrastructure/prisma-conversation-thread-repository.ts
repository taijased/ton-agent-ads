import type {
  ConversationDirection,
  ConversationThread,
  CreateConversationThreadInput,
  UpdateConversationThreadInput,
} from "@repo/types";
import type { ConversationThreadRepository } from "../domain/conversation-thread-repository.js";
import { prisma } from "./prisma-client.js";

const toIso = (value: Date | null): string | null =>
  value?.toISOString() ?? null;

const toConversationThread = (thread: {
  id: string;
  campaignId: string;
  channelId: string;
  adminContactId: string;
  status: string;
  startedAt: Date | null;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  lastDirection: string | null;
  outreachAttemptCount: number;
  telegramChatId: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ConversationThread => ({
  id: thread.id,
  campaignId: thread.campaignId,
  channelId: thread.channelId,
  adminContactId: thread.adminContactId,
  status: thread.status as ConversationThread["status"],
  startedAt: toIso(thread.startedAt),
  lastMessageAt: toIso(thread.lastMessageAt),
  lastMessagePreview: thread.lastMessagePreview,
  lastDirection: thread.lastDirection as ConversationDirection | null,
  outreachAttemptCount: thread.outreachAttemptCount,
  telegramChatId: thread.telegramChatId,
  closedAt: toIso(thread.closedAt),
  createdAt: thread.createdAt.toISOString(),
  updatedAt: thread.updatedAt.toISOString(),
});

const toNullableDate = (value: string | null | undefined): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return new Date(value);
};

export class PrismaConversationThreadRepository
  implements ConversationThreadRepository
{
  public async create(
    input: CreateConversationThreadInput,
  ): Promise<ConversationThread> {
    const thread = await prisma.conversationThread.create({
      data: {
        campaignId: input.campaignId,
        channelId: input.channelId,
        adminContactId: input.adminContactId,
        status: input.status ?? "not_started",
        startedAt: toNullableDate(input.startedAt),
        lastMessageAt: toNullableDate(input.lastMessageAt),
        lastMessagePreview: input.lastMessagePreview ?? null,
        lastDirection: input.lastDirection ?? null,
        outreachAttemptCount: input.outreachAttemptCount ?? 0,
        telegramChatId: input.telegramChatId ?? null,
        closedAt: toNullableDate(input.closedAt),
      },
    });

    return toConversationThread(thread);
  }

  public async getById(id: string): Promise<ConversationThread | undefined> {
    const thread = await prisma.conversationThread.findUnique({
      where: { id },
    });

    return thread === null ? undefined : toConversationThread(thread);
  }

  public async getByCampaignId(
    campaignId: string,
  ): Promise<ConversationThread[]> {
    const threads = await prisma.conversationThread.findMany({
      where: { campaignId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return threads.map(toConversationThread);
  }

  public async findByCampaignChannelAdmin(
    campaignId: string,
    channelId: string,
    adminContactId: string,
  ): Promise<ConversationThread | null> {
    const thread = await prisma.conversationThread.findUnique({
      where: {
        campaignId_channelId_adminContactId: {
          campaignId,
          channelId,
          adminContactId,
        },
      },
    });

    return thread === null ? null : toConversationThread(thread);
  }

  public async getByTelegramChatId(
    chatId: string,
  ): Promise<ConversationThread | undefined> {
    const thread = await prisma.conversationThread.findUnique({
      where: { telegramChatId: chatId },
    });

    return thread === null ? undefined : toConversationThread(thread);
  }

  public async update(
    id: string,
    input: UpdateConversationThreadInput,
  ): Promise<ConversationThread | undefined> {
    const existing = await prisma.conversationThread.findUnique({
      where: { id },
    });

    if (existing === null) {
      return undefined;
    }

    const thread = await prisma.conversationThread.update({
      where: { id },
      data: {
        status: input.status ?? existing.status,
        startedAt:
          input.startedAt !== undefined
            ? toNullableDate(input.startedAt)
            : existing.startedAt,
        lastMessageAt:
          input.lastMessageAt !== undefined
            ? toNullableDate(input.lastMessageAt)
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
          input.closedAt !== undefined
            ? toNullableDate(input.closedAt)
            : existing.closedAt,
      },
    });

    return toConversationThread(thread);
  }
}
