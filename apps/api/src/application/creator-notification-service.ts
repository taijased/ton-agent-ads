import type { DealMessageRepository, DealRepository } from "@repo/db";
import type {
  CreatorNotificationPayload,
  Deal,
  DealApprovalRequest,
} from "@repo/types";

export interface CreatorNotificationPort {
  send(
    payload: CreatorNotificationPayload,
  ): Promise<{ providerMessageId: string | null }>;
}

export interface CreatorNotificationResult {
  delivered: boolean;
  duplicate: boolean;
  messageId?: string | null;
  error?: string;
}

export class CreatorNotificationService {
  public constructor(
    private readonly dealRepository: DealRepository,
    private readonly dealMessageRepository: DealMessageRepository,
    private readonly notificationPort: CreatorNotificationPort,
  ) {}

  public async notifyApprovalRequired(input: {
    deal: Deal;
    campaignId: string;
    chatId: string;
    channelTitle: string;
    channelUsername: string;
    contactValue: string | null;
    approvalRequest: DealApprovalRequest;
    subscriberCount?: number | null;
    conversationSummary?: string[];
    conversionNote?: string | null;
  }): Promise<CreatorNotificationResult> {
    const text = [
      "Approval required",
      "",
      `Channel: ${input.channelTitle} (${input.channelUsername})`,
      input.subscriberCount != null && input.subscriberCount > 0
        ? `Subscribers: ${input.subscriberCount.toLocaleString()}`
        : null,
      input.contactValue ? `Contact: ${input.contactValue}` : null,
      input.approvalRequest.proposedPriceTon !== null
        ? `Proposed price: ${input.approvalRequest.proposedPriceTon} TON`
        : null,
      input.conversionNote ? `(${input.conversionNote})` : null,
      input.approvalRequest.proposedDateText
        ? `Timing: ${input.approvalRequest.proposedDateText}`
        : null,
      ...(input.conversationSummary && input.conversationSummary.length > 0
        ? [
            "",
            "Conversation:",
            ...input.conversationSummary.map((line) => `  ${line}`),
          ]
        : []),
      "",
      `Summary: ${input.approvalRequest.summary}`,
    ]
      .filter((value): value is string => value !== null)
      .join("\n");

    return this.send({
      dealId: input.deal.id,
      campaignId: input.campaignId,
      chatId: input.chatId,
      eventType: "approval_required",
      text,
      action: "approve_approval",
      actionTargetId: input.approvalRequest.id,
      notificationKey: `approval_required:${input.approvalRequest.id}`,
      status: input.deal.status,
    });
  }

  public async notifyOutreachStarted(input: {
    deal: Deal;
    campaignId: string;
    chatId: string;
    channelTitle: string;
    channelUsername: string;
    contactValue: string | null;
  }): Promise<CreatorNotificationResult> {
    const text = [
      "Outreach started",
      "",
      `Channel: ${input.channelTitle} (${input.channelUsername})`,
      input.contactValue ? `Contact: ${input.contactValue}` : null,
      "We have started contacting the channel admin and will keep you updated.",
    ]
      .filter((value): value is string => value !== null)
      .join("\n");

    return this.send({
      dealId: input.deal.id,
      campaignId: input.campaignId,
      chatId: input.chatId,
      eventType: "outreach_started",
      text,
      action: "none",
      actionTargetId: null,
      notificationKey: `outreach_started:${input.deal.id}`,
      status: input.deal.status,
    });
  }

  private async send(
    payload: CreatorNotificationPayload,
  ): Promise<CreatorNotificationResult> {
    const existingMessage =
      await this.dealMessageRepository.getByDealIdAndNotificationKey(
        payload.dealId,
        payload.notificationKey,
      );

    if (existingMessage?.deliveryStatus === "sent") {
      return {
        delivered: true,
        duplicate: true,
        messageId: existingMessage.externalMessageId,
      };
    }

    const message =
      existingMessage ??
      (await this.dealMessageRepository.create({
        dealId: payload.dealId,
        direction: "outbound",
        senderType: "system",
        audience: "creator",
        transport: "telegram_bot",
        contactValue: payload.chatId,
        text: payload.text,
        externalMessageId: null,
        deliveryStatus: "pending",
        notificationKey: payload.notificationKey,
        failureReason: null,
      }));

    try {
      const result = await this.notificationPort.send(payload);

      await this.dealMessageRepository.updateDelivery(message.id, {
        deliveryStatus: "sent",
        externalMessageId: result.providerMessageId,
        failureReason: null,
      });
      await this.dealRepository.updateCreatorNotificationState(payload.dealId, {
        lastCreatorNotificationAt: new Date().toISOString(),
        lastCreatorNotificationKey: payload.notificationKey,
        lastCreatorNotificationError: null,
      });

      return {
        delivered: true,
        duplicate: existingMessage !== undefined,
        messageId: result.providerMessageId,
      };
    } catch (error: unknown) {
      const messageText =
        error instanceof Error
          ? error.message
          : "Failed to deliver creator notification";

      await this.dealMessageRepository.updateDelivery(message.id, {
        deliveryStatus: "failed",
        failureReason: messageText,
      });
      await this.dealRepository.updateCreatorNotificationState(payload.dealId, {
        lastCreatorNotificationKey: payload.notificationKey,
        lastCreatorNotificationError: messageText,
      });

      return {
        delivered: false,
        duplicate: existingMessage !== undefined,
        error: messageText,
      };
    }
  }
}
