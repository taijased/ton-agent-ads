import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealApprovalRequestRepository,
  InMemoryDealExternalThreadRepository,
  InMemoryDealMessageRepository,
  InMemoryDealRepository,
} from "@repo/db";
import {
  DealNegotiationService,
  NegotiationLlmService,
  TelegramBotNotifier,
  buildOutreachMessage,
} from "@repo/api";
import type { SendAdminMessageResult } from "@repo/api";
import type { CampaignGoal, CampaignLanguage, DealApprovalRequest } from "@repo/types";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram";

export interface RealNegotiationConfig {
  userId: string;
  creatorChatId: number;
  channelUsername: string;
  campaign: {
    text: string;
    budgetAmount: string;
    theme: string | null;
    language: CampaignLanguage;
    goal: CampaignGoal;
  };
}

export interface RealNegotiationStartResult {
  outreachMessage: string;
  adminContact: string;
  channelTitle: string;
}

export function extractAdminFromTitle(title: string): string | null {
  const match = title.match(/@(\w{3,})/);
  return match ? match[1] : null;
}

class RealAdminClient {
  private client: TelegramClient | null = null;

  public async sendAdminMessage(
    username: string,
    text: string,
  ): Promise<SendAdminMessageResult> {
    const client = await this.getClient();
    const inputEntity = await client.getInputEntity(username);
    const message = await client.sendMessage(username, { message: text });
    const resolvedChatId = await client.getPeerId(inputEntity, false);

    return {
      messageId: "id" in message ? String(message.id) : undefined,
      chatId: resolvedChatId,
    };
  }

  public async resolveChannel(username: string): Promise<{
    title: string;
    participantsCount: number;
  }> {
    const client = await this.getClient();
    const entity = await client.getEntity(username);

    if (!(entity instanceof Api.Channel)) {
      throw new Error(`@${username} is not a channel`);
    }

    const fullChannel = await client.invoke(
      new Api.channels.GetFullChannel({ channel: entity }),
    );

    const chat = fullChannel.chats[0];
    const title = "title" in chat ? (chat.title as string) : username;
    const participantsCount =
      "participantsCount" in fullChannel.fullChat
        ? (fullChannel.fullChat.participantsCount as number) ?? 0
        : 0;

    return { title, participantsCount };
  }

  public async getChannelCreatorUsername(username: string): Promise<string | null> {
    const client = await this.getClient();
    const entity = await client.getEntity(username);

    if (!(entity instanceof Api.Channel)) {
      return null;
    }

    try {
      const participants = await client.invoke(
        new Api.channels.GetParticipants({
          channel: entity,
          filter: new Api.ChannelParticipantsAdmins(),
          offset: 0,
          limit: 10,
          hash: BigInt(0) as never,
        }),
      );

      if (participants instanceof Api.channels.ChannelParticipants) {
        for (const user of participants.users) {
          if (user instanceof Api.User && user.username) {
            return user.username;
          }
        }
      }
    } catch {
      // Participants not accessible
    }

    return null;
  }

  private async getClient(): Promise<TelegramClient> {
    if (this.client !== null) {
      return this.client;
    }

    const apiId = Number(process.env.TG_API_ID);
    const apiHash = process.env.TG_API_HASH;
    const sessionString = process.env.TG_SESSION_STRING;

    if (!Number.isInteger(apiId) || apiId <= 0) {
      throw new Error("TG_API_ID is required for real negotiation");
    }

    if (!apiHash?.trim()) {
      throw new Error("TG_API_HASH is required for real negotiation");
    }

    if (!sessionString?.trim()) {
      throw new Error("TG_SESSION_STRING is required for real negotiation");
    }

    const client = new TelegramClient(
      new StringSession(sessionString),
      apiId,
      apiHash,
      { connectionRetries: 3 },
    );

    await client.connect();
    await client.getMe();
    this.client = client;

    return client;
  }
}

export class RealNegotiationSession {
  private negotiationService: DealNegotiationService | undefined;
  private currentDealId: string | undefined;
  private adminClient: RealAdminClient;
  private channelTitle = "";
  private channelUsername = "";
  private adminContact = "";
  private readonly config: RealNegotiationConfig;

  public constructor(config: RealNegotiationConfig) {
    this.config = config;
    this.adminClient = new RealAdminClient();
  }

  public async start(): Promise<RealNegotiationStartResult> {
    const { channelUsername, campaign, userId, creatorChatId } = this.config;

    // 1. Resolve channel via MTProto
    const channelInfo = await this.adminClient.resolveChannel(channelUsername);
    this.channelTitle = channelInfo.title;
    this.channelUsername = `@${channelUsername}`;

    // 2. Extract admin contact from channel title, fallback to creator
    let admin = extractAdminFromTitle(channelInfo.title);
    if (!admin) {
      admin = await this.adminClient.getChannelCreatorUsername(channelUsername);
    }
    if (!admin) {
      throw new Error(
        `Could not determine admin contact for @${channelUsername}. ` +
        `Channel title: "${channelInfo.title}". No @username found in title and could not resolve channel creator.`,
      );
    }
    this.adminContact = `@${admin}`;

    // 3. Create in-memory repositories
    const campaignRepo = new InMemoryCampaignRepository();
    const channelRepo = new InMemoryChannelRepository();
    const dealRepo = new InMemoryDealRepository();
    const dealMessageRepo = new InMemoryDealMessageRepository();
    const dealApprovalRepo = new InMemoryDealApprovalRequestRepository();
    const dealExternalThreadRepo = new InMemoryDealExternalThreadRepository();

    // 4. Create entities
    const campaignEntity = await campaignRepo.create({
      userId,
      text: campaign.text,
      budgetAmount: campaign.budgetAmount,
      budgetCurrency: "TON",
      theme: campaign.theme,
      language: campaign.language,
      goal: campaign.goal,
    });

    const channelEntity = await channelRepo.saveParsedChannel({
      id: `ch-${channelUsername}`,
      username: this.channelUsername,
      title: this.channelTitle,
      description: "",
      category: "telegram",
      price: 0,
      avgViews: 0,
      contacts: [
        {
          type: "username" as const,
          value: this.adminContact,
          source: "extracted_username" as const,
          isAdsContact: true,
        },
      ],
    });

    const deal = await dealRepo.createDeal({
      campaignId: campaignEntity.id,
      channelId: channelEntity.id,
      price: 0,
      status: "admin_contacted",
    });

    this.currentDealId = deal.id;

    // 5. Send outreach via MTProto
    const outreachMessage = buildOutreachMessage({
      channelTitle: this.channelTitle,
      channelUsername: this.channelUsername,
      language: campaign.language,
    });

    const sendResult = await this.adminClient.sendAdminMessage(admin, outreachMessage);

    // 6. Create external thread mapping
    const chatId = sendResult.chatId ?? `real-chat-${admin}`;
    await dealExternalThreadRepo.create({
      dealId: deal.id,
      platform: "telegram",
      chatId,
      contactValue: this.adminContact,
    });

    // 7. Store outreach message
    await dealMessageRepo.create({
      dealId: deal.id,
      direction: "outbound",
      senderType: "agent",
      contactValue: this.adminContact,
      text: outreachMessage,
      externalMessageId: sendResult.messageId ?? null,
    });

    // 8. Wire negotiation service with real admin client + real bot notifier
    const negotiationLlmService = new NegotiationLlmService();
    const botNotifier = new TelegramBotNotifier();

    this.negotiationService = new DealNegotiationService(
      campaignRepo,
      channelRepo,
      dealRepo,
      dealMessageRepo,
      dealApprovalRepo,
      dealExternalThreadRepo,
      negotiationLlmService,
      this.adminClient as never,
      botNotifier,
    );

    return {
      outreachMessage,
      adminContact: this.adminContact,
      channelTitle: this.channelTitle,
    };
  }

  public async handleAdminReply(
    chatId: string,
    text: string,
  ): Promise<{
    action: string;
    approvalRequestId?: string;
    summary?: string;
  }> {
    if (!this.negotiationService) {
      throw new Error("Real negotiation session not started");
    }

    const result = await this.negotiationService.handleIncomingAdminMessage({
      platform: "telegram",
      chatId,
      text,
    });

    if (!result.matched) {
      throw new Error("Message did not match any deal thread");
    }

    return {
      action: result.action ?? "unknown",
      approvalRequestId: result.approvalRequestId,
    };
  }

  public async approveApproval(
    approvalRequestId: string,
  ): Promise<{
    dealStatus: string;
    approvalRequest: DealApprovalRequest;
    channelTitle: string;
    channelUsername: string;
  }> {
    if (!this.negotiationService) {
      throw new Error("Real negotiation session not started");
    }

    const result = await this.negotiationService.approveApprovalRequest(approvalRequestId);

    return {
      dealStatus: result.deal.status,
      approvalRequest: result.approvalRequest,
      channelTitle: this.channelTitle,
      channelUsername: this.channelUsername,
    };
  }

  public async rejectApproval(
    approvalRequestId: string,
  ): Promise<{ dealStatus: string }> {
    if (!this.negotiationService) {
      throw new Error("Real negotiation session not started");
    }

    const result = await this.negotiationService.rejectApprovalRequest(approvalRequestId);
    return { dealStatus: result.deal.status };
  }

  public async counterApproval(
    approvalRequestId: string,
    text: string,
  ): Promise<{ dealStatus: string }> {
    if (!this.negotiationService) {
      throw new Error("Real negotiation session not started");
    }

    const result = await this.negotiationService.counterApprovalRequest(
      approvalRequestId,
      text,
    );
    return { dealStatus: result.deal.status };
  }

  public get dealId(): string {
    if (!this.currentDealId) {
      throw new Error("Real negotiation session not started");
    }
    return this.currentDealId;
  }

  public getChannelTitle(): string {
    return this.channelTitle;
  }

  public getChannelUsername(): string {
    return this.channelUsername;
  }

  public getAdminContact(): string {
    return this.adminContact;
  }
}
