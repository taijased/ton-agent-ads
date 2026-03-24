import type {
  CampaignRepository,
  ChannelRepository,
  ConversationMessageRepository,
  ConversationThreadRepository,
  DealRepository,
} from "@repo/db";
import type {
  AdminContact,
  CampaignNegotiationStartResult,
  Channel,
  ConversationThread,
} from "@repo/types";
import { buildNegotiationIntroMessage } from "./outreach-message-builder.js";
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
    private readonly conversationThreadRepository: ConversationThreadRepository,
    private readonly conversationMessageRepository: ConversationMessageRepository,
    private readonly adminOutreachTransport: AdminOutreachTransport,
  ) {}

  public async startCampaignNegotiation(
    campaignId: string,
  ): Promise<CampaignNegotiationActionResult> {
    const campaign = await this.campaignRepository.findById(campaignId);

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
          status: "message_queued",
          startedAt,
          outreachAttemptCount: 1,
        });
        createdThreadCount += 1;

        await this.sendIntroMessage(
          thread,
          campaignId,
          channel,
          adminContact,
          campaign.language,
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
    campaignId: string,
    channel: Channel,
    adminContact: AdminContact,
    campaignLanguage: "RU" | "EN" | "OTHER" | null,
  ): Promise<void> {
    const introText = buildNegotiationIntroMessage(campaignLanguage);
    const introMessage = await this.conversationMessageRepository.create({
      threadId: thread.id,
      direction: "outbound",
      messageType: "intro",
      text: introText,
      telegramMessageId: null,
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
        campaignId,
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
