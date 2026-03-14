import type { CreateDealExternalThreadInput, DealExternalThread } from "@repo/types";
import type { DealExternalThreadRepository } from "../domain/deal-external-thread-repository.js";
import { prisma } from "./prisma-client.js";

const toDealExternalThread = (thread: {
  id: string;
  dealId: string;
  platform: string;
  chatId: string;
  contactValue: string | null;
  createdAt: Date;
}): DealExternalThread => ({
  id: thread.id,
  dealId: thread.dealId,
  platform: thread.platform,
  chatId: thread.chatId,
  contactValue: thread.contactValue,
  createdAt: thread.createdAt.toISOString()
});

export class PrismaDealExternalThreadRepository implements DealExternalThreadRepository {
  public async create(input: CreateDealExternalThreadInput): Promise<DealExternalThread> {
    const thread = await prisma.dealExternalThread.upsert({
      where: {
        platform_chatId: {
          platform: input.platform,
          chatId: input.chatId
        }
      },
      update: {
        dealId: input.dealId,
        contactValue: input.contactValue ?? null
      },
      create: {
        dealId: input.dealId,
        platform: input.platform,
        chatId: input.chatId,
        contactValue: input.contactValue ?? null
      }
    });

    return toDealExternalThread(thread);
  }

  public async getByDealId(dealId: string): Promise<DealExternalThread | undefined> {
    const thread = await prisma.dealExternalThread.findFirst({ where: { dealId } });
    return thread === null ? undefined : toDealExternalThread(thread);
  }

  public async getByPlatformChatId(platform: string, chatId: string): Promise<DealExternalThread | undefined> {
    const thread = await prisma.dealExternalThread.findUnique({
      where: {
        platform_chatId: {
          platform,
          chatId
        }
      }
    });

    return thread === null ? undefined : toDealExternalThread(thread);
  }
}
