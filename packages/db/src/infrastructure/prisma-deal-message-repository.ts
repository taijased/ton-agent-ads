import type { CreateDealMessageInput, DealMessage } from "@repo/types";
import type { DealMessageRepository } from "../domain/deal-message-repository.js";
import { prisma } from "./prisma-client.js";

const toDealMessage = (message: {
  id: string;
  dealId: string;
  direction: string;
  senderType: string;
  contactValue: string | null;
  text: string;
  externalMessageId: string | null;
  createdAt: Date;
}): DealMessage => ({
  id: message.id,
  dealId: message.dealId,
  direction: message.direction as DealMessage["direction"],
  senderType: message.senderType as DealMessage["senderType"],
  contactValue: message.contactValue,
  text: message.text,
  externalMessageId: message.externalMessageId,
  createdAt: message.createdAt.toISOString(),
});

export class PrismaDealMessageRepository implements DealMessageRepository {
  public async create(input: CreateDealMessageInput): Promise<DealMessage> {
    const message = await prisma.dealMessage.create({
      data: {
        dealId: input.dealId,
        direction: input.direction,
        senderType: input.senderType,
        contactValue: input.contactValue ?? null,
        text: input.text,
        externalMessageId: input.externalMessageId ?? null,
      },
    });

    return toDealMessage(message);
  }

  public async listByDealId(dealId: string): Promise<DealMessage[]> {
    const messages = await prisma.dealMessage.findMany({
      where: { dealId },
      orderBy: { createdAt: "asc" },
    });

    return messages.map(toDealMessage);
  }

  public async listRecentByDealId(
    dealId: string,
    limit: number,
  ): Promise<DealMessage[]> {
    const messages = await prisma.dealMessage.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return messages.reverse().map(toDealMessage);
  }
}
