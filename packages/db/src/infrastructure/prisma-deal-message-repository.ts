import type {
  CreateDealMessageInput,
  DealMessage,
  DealMessageAudience,
  DealMessageSenderType,
  DealMessageTransport,
  MessageDeliveryStatus,
  UpdateDealMessageDeliveryInput,
} from "@repo/types";
import type { DealMessageRepository } from "../domain/deal-message-repository.js";
import { prisma } from "./prisma-client.js";

const toDealMessage = (message: {
  id: string;
  dealId: string;
  direction: string;
  senderType: string;
  audience: string;
  transport: string;
  contactValue: string | null;
  text: string;
  externalMessageId: string | null;
  deliveryStatus: string | null;
  notificationKey: string | null;
  failureReason: string | null;
  createdAt: Date;
}): DealMessage => ({
  id: message.id,
  dealId: message.dealId,
  direction: message.direction as DealMessage["direction"],
  senderType: message.senderType as DealMessage["senderType"],
  audience: message.audience as DealMessageAudience,
  transport: message.transport as DealMessageTransport,
  contactValue: message.contactValue,
  text: message.text,
  externalMessageId: message.externalMessageId,
  deliveryStatus: message.deliveryStatus as MessageDeliveryStatus | null,
  notificationKey: message.notificationKey,
  failureReason: message.failureReason,
  createdAt: message.createdAt.toISOString(),
});

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

export class PrismaDealMessageRepository implements DealMessageRepository {
  public async create(input: CreateDealMessageInput): Promise<DealMessage> {
    const message = await prisma.dealMessage.create({
      data: {
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

  public async getByDealIdAndNotificationKey(
    dealId: string,
    notificationKey: string,
  ): Promise<DealMessage | undefined> {
    const message = await prisma.dealMessage.findUnique({
      where: {
        dealId_notificationKey: {
          dealId,
          notificationKey,
        },
      },
    });

    return message === null ? undefined : toDealMessage(message);
  }

  public async getByDealIdAndExternalMessageId(
    dealId: string,
    senderType: DealMessageSenderType,
    externalMessageId: string,
  ): Promise<DealMessage | undefined> {
    const message = await prisma.dealMessage.findUnique({
      where: {
        dealId_senderType_externalMessageId: {
          dealId,
          senderType,
          externalMessageId,
        },
      },
    });

    return message === null ? undefined : toDealMessage(message);
  }

  public async updateDelivery(
    id: string,
    input: UpdateDealMessageDeliveryInput,
  ): Promise<DealMessage | undefined> {
    const existing = await prisma.dealMessage.findUnique({
      where: { id },
    });

    if (existing === null) {
      return undefined;
    }

    const message = await prisma.dealMessage.update({
      where: { id },
      data: {
        deliveryStatus: input.deliveryStatus,
        externalMessageId:
          input.externalMessageId !== undefined
            ? input.externalMessageId
            : existing.externalMessageId,
        failureReason:
          input.failureReason !== undefined
            ? input.failureReason
            : existing.failureReason,
      },
    });

    return toDealMessage(message);
  }
}
