import type {
  CampaignRepository,
  ChannelRepository,
  ConversationMessageRepository,
  ConversationThreadRepository,
} from "@repo/db";
import type {
  CampaignThreadListResponse,
  ConversationDirection,
  ConversationMessage,
  ConversationThread,
  ConversationThreadDetailsResponse,
  ConversationThreadSummary,
} from "@repo/types";

export interface IncomingConversationMessageInput {
  chatId: string;
  telegramMessageId?: string;
  text: string;
  contactValue?: string;
}

export interface IncomingConversationMessageResult {
  matched: boolean;
  threadId?: string;
  status?: ConversationThread["status"];
  dealId?: string | null;
}

const buildNextInboundStatus = (
  currentStatus: ConversationThread["status"],
): ConversationThread["status"] => {
  switch (currentStatus) {
    case "replied":
    case "in_negotiation":
      return "in_negotiation";
    case "closed":
      return "closed";
    default:
      return "replied";
  }
};

export class ConversationThreadService {
  public constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly conversationThreadRepository: ConversationThreadRepository,
    private readonly conversationMessageRepository: ConversationMessageRepository,
  ) {}

  public async listByCampaignId(
    campaignId: string,
    userId?: string,
  ): Promise<CampaignThreadListResponse | null> {
    const campaign =
      userId === undefined
        ? await this.campaignRepository.findById(campaignId)
        : await this.campaignRepository.findByIdForUser(campaignId, userId);

    if (campaign === null) {
      return null;
    }

    const threads =
      await this.conversationThreadRepository.getByCampaignId(campaignId);

    return {
      campaignId,
      threads: await Promise.all(
        threads.map((thread) => this.toThreadSummary(thread)),
      ),
    };
  }

  public async getThreadById(
    threadId: string,
  ): Promise<ConversationThreadDetailsResponse | null> {
    const thread = await this.conversationThreadRepository.getById(threadId);

    if (thread === undefined) {
      return null;
    }

    const messages =
      await this.conversationMessageRepository.listByThreadId(threadId);

    return {
      thread: await this.toThreadSummary(thread),
      messages,
    };
  }

  public async handleIncomingTelegramMessage(
    input: IncomingConversationMessageInput,
  ): Promise<IncomingConversationMessageResult> {
    const thread = await this.conversationThreadRepository.getByTelegramChatId(
      input.chatId,
    );

    if (thread === undefined) {
      return { matched: false };
    }

    if (typeof input.telegramMessageId === "string") {
      const existing =
        await this.conversationMessageRepository.getByThreadIdAndTelegramMessageId(
          thread.id,
          input.telegramMessageId,
        );

      if (existing !== undefined) {
        return {
          matched: true,
          threadId: thread.id,
          status: thread.status,
          dealId: thread.dealId,
        };
      }
    }

    const message = await this.conversationMessageRepository.create({
      threadId: thread.id,
      direction: "inbound",
      messageType: "reply",
      text: input.text,
      telegramMessageId: input.telegramMessageId ?? null,
    });
    const nextStatus = buildNextInboundStatus(thread.status);

    await this.conversationThreadRepository.update(thread.id, {
      status: nextStatus,
      telegramChatId: input.chatId,
      lastMessagePreview: message.text,
      lastMessageAt: message.createdAt,
      lastDirection: "inbound",
    });

    return {
      matched: true,
      threadId: thread.id,
      status: nextStatus,
      dealId: thread.dealId,
    };
  }

  private async toThreadSummary(
    thread: ConversationThread,
  ): Promise<ConversationThreadSummary> {
    const channel = await this.channelRepository.getChannelById(
      thread.channelId,
    );
    const adminContact =
      channel?.adminContacts.find(
        (contact) => contact.id === thread.adminContactId,
      ) ?? null;

    return {
      id: thread.id,
      campaignId: thread.campaignId,
      channel: {
        id: thread.channelId,
        title: channel?.title ?? "Unknown channel",
        username: channel?.username ?? null,
      },
      admin: {
        id: thread.adminContactId,
        telegramHandle:
          adminContact?.telegramHandle ??
          (thread.telegramChatId
            ? `chat:${thread.telegramChatId}`
            : "@unknown"),
        status: adminContact?.status ?? "invalid",
      },
      status: thread.status,
      lastMessagePreview: thread.lastMessagePreview,
      lastDirection: thread.lastDirection,
      lastMessageAt: thread.lastMessageAt,
      updatedAt: thread.updatedAt,
      startedAt: thread.startedAt,
      outreachAttemptCount: thread.outreachAttemptCount,
      closedAt: thread.closedAt,
      dealId: thread.dealId,
    };
  }
}
