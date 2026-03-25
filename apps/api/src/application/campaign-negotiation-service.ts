import type {
  CampaignRepository,
  ChannelRepository,
  ConversationMessageRepository,
  ConversationThreadRepository,
  DealExternalThreadRepository,
  DealMessageRepository,
  DealRepository,
} from "@repo/db";
import type {
  AdminContact,
  Campaign,
  CampaignNegotiationStartResult,
  Channel,
  ConversationThread,
  Deal,
} from "@repo/types";
import { buildOutreachMessage } from "./outreach-message-builder.js";
import type { AdminOutreachTransport } from "./admin-outreach-transport.js";

export interface CampaignNegotiationActionResult {
  success: boolean;
  result?: CampaignNegotiationStartResult;
  message?: string;
  statusCode?: number;
}

const validAdminContactStatuses = new Set<AdminContact["status"]>([
  "found",
  "verified",
]);

const nextStartedAt = (
  existingStartedAt: string | null,
  fallback: string,
): string => existingStartedAt ?? fallback;

export class CampaignNegotiationService {
  public constructor(
    private readonly campaignRepository: CampaignRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly dealRepository: DealRepository,
    private readonly dealMessageRepository: DealMessageRepository,
    private readonly dealExternalThreadRepository: DealExternalThreadRepository,
    private readonly conversationThreadRepository: ConversationThreadRepository,
    private readonly conversationMessageRepository: ConversationMessageRepository,
    private readonly adminOutreachTransport: AdminOutreachTransport,
  ) {}

  public async startCampaignNegotiation(
    campaignId: string,
    userId?: string,
  ): Promise<CampaignNegotiationActionResult> {
    const campaign =
      userId === undefined
        ? await this.campaignRepository.findById(campaignId)
        : await this.campaignRepository.findByIdForUser(campaignId, userId);

    if (campaign === null) {
      return {
        success: false,
        message: "Campaign not found",
        statusCode: 404,
      };
    }

    const now = new Date().toISOString();
    const startedAt = nextStartedAt(campaign.negotiationStartedAt, now);
    const deals = await this.dealRepository.getDealsByCampaignId(campaignId);
    const channels = await Promise.all(
      Array.from(new Set(deals.map((deal) => deal.channelId))).map(
        async (channelId) => this.channelRepository.getChannelById(channelId),
      ),
    );
    const readyChannels = channels.filter(
      (channel): channel is Channel =>
        channel !== undefined && channel.readinessStatus === "ready",
    );

    let createdThreadCount = 0;
    let existingThreadCount = 0;
    let failedThreadCount = 0;

    for (const channel of readyChannels) {
      let deal = await this.dealRepository.findByCampaignAndChannel(
        campaignId,
        channel.id,
      );
      if (deal === null) {
        deal = await this.dealRepository.createDeal({
          campaignId,
          channelId: channel.id,
          price: 0,
          status: "admin_contacted",
        });
      }

      const adminContacts = channel.adminContacts.filter((contact) =>
        validAdminContactStatuses.has(contact.status),
      );

      for (const adminContact of adminContacts) {
        const existingThread =
          await this.conversationThreadRepository.findByCampaignChannelAdmin(
            campaignId,
            channel.id,
            adminContact.id,
          );

        if (existingThread !== null) {
          existingThreadCount += 1;
          continue;
        }

        const thread = await this.conversationThreadRepository.create({
          campaignId,
          channelId: channel.id,
          adminContactId: adminContact.id,
          dealId: deal.id,
          status: "message_queued",
          startedAt,
          outreachAttemptCount: 1,
        });
        createdThreadCount += 1;

        await this.sendIntroMessage(
          thread,
          campaign,
          channel,
          adminContact,
          deal,
        );

        const finalThread = await this.conversationThreadRepository.getById(
          thread.id,
        );

        if (finalThread?.status === "failed") {
          failedThreadCount += 1;
        }
      }
    }

    await this.campaignRepository.updateNegotiationState(campaignId, {
      negotiationStatus: "active",
      negotiationStartedAt: startedAt,
    });

    return {
      success: true,
      result: {
        campaignId,
        negotiationStatus: "active",
        negotiationStartedAt: startedAt,
        readyChannelCount: readyChannels.length,
        createdThreadCount,
        existingThreadCount,
        failedThreadCount,
      },
    };
  }

  private async sendIntroMessage(
    thread: ConversationThread,
    campaign: Campaign,
    channel: Channel,
    adminContact: AdminContact,
    deal: Deal,
  ): Promise<void> {
    const introText = buildOutreachMessage({
      channelTitle: channel.title,
      channelUsername: channel.username ?? "",
      language: campaign.language,
      postText: campaign.text ?? undefined,
    });
    const introMessage = await this.conversationMessageRepository.create({
      threadId: thread.id,
      direction: "outbound",
      messageType: "intro",
      text: introText,
      telegramMessageId: null,
    });

    await this.dealMessageRepository.create({
      dealId: deal.id,
      direction: "outbound",
      senderType: "agent",
      text: introText,
    });

    await this.conversationThreadRepository.update(thread.id, {
      status: "message_queued",
      startedAt: thread.startedAt,
      lastMessagePreview: introMessage.text,
      lastMessageAt: introMessage.createdAt,
      lastDirection: "outbound",
      outreachAttemptCount: thread.outreachAttemptCount,
    });

    try {
      const result = await this.adminOutreachTransport.sendIntroMessage({
        campaignId: campaign.id,
        threadId: thread.id,
        adminHandle: adminContact.telegramHandle,
        text: introText,
      });

      await this.conversationMessageRepository.update(introMessage.id, {
        telegramMessageId: result.telegramMessageId,
      });
      await this.conversationThreadRepository.update(thread.id, {
        status: "message_sent",
        telegramChatId: result.telegramChatId,
        startedAt: thread.startedAt,
        lastMessagePreview: introMessage.text,
        lastMessageAt: introMessage.createdAt,
        lastDirection: "outbound",
        outreachAttemptCount: thread.outreachAttemptCount,
      });

      if (result.telegramChatId !== null) {
        await this.dealExternalThreadRepository.create({
          dealId: deal.id,
          platform: "telegram",
          chatId: result.telegramChatId,
          contactValue: adminContact.telegramHandle,
        });
      }

      await this.conversationThreadRepository.update(thread.id, {
        status: "awaiting_reply",
        telegramChatId: result.telegramChatId,
        startedAt: thread.startedAt,
        lastMessagePreview: introMessage.text,
        lastMessageAt: introMessage.createdAt,
        lastDirection: "outbound",
        outreachAttemptCount: thread.outreachAttemptCount,
      });
    } catch (error: unknown) {
      const failureText =
        error instanceof Error
          ? error.message
          : `Failed to send intro message to ${adminContact.telegramHandle} for ${channel.title}.`;
      const errorMessage = await this.conversationMessageRepository.create({
        threadId: thread.id,
        direction: "system",
        messageType: "error",
        text: failureText,
      });

      await this.conversationThreadRepository.update(thread.id, {
        status: "failed",
        startedAt: thread.startedAt,
        lastMessagePreview: errorMessage.text,
        lastMessageAt: errorMessage.createdAt,
        lastDirection: "system",
        outreachAttemptCount: thread.outreachAttemptCount,
      });
    }
  }
}
