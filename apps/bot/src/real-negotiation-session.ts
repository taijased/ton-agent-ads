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
  CreatorNotificationService,
  ConversationLogger,
  buildOutreachMessage,
} from "@repo/api";
import type { SendAdminMessageResult } from "@repo/api";
import type { CampaignGoal, CampaignLanguage, DealApprovalRequest } from "@repo/types";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram";
import {
  NewMessage,
  type NewMessageEvent,
} from "telegram/events/NewMessage.js";
import { detectLanguageFromTitle } from "./language-detector.js";

export interface ConversionApprovalInfo {
  text: string;
  approveCallbackData: string;
  declineCallbackData: string;
}

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
  onStatusUpdate?: (text: string) => Promise<void>;
  onConversionApproval?: (info: ConversionApprovalInfo) => Promise<void>;
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

const descriptionAdsKeywords = [
  "ads",
  "advert",
  "adv",
  "contact",
  "promo",
  "реклама",
  "сотрудничество",
];

export function extractContactFromDescription(
  description: string,
): string | null {
  if (!description.trim()) return null;

  const lines = description
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const usernamePattern = /@([A-Za-z0-9_]{3,})/g;

  let adsContact: string | null = null;
  let anyContact: string | null = null;

  for (const line of lines) {
    const hasAdsKeyword = descriptionAdsKeywords.some((kw) =>
      line.toLowerCase().includes(kw),
    );
    const matches = [...line.matchAll(usernamePattern)];

    for (const match of matches) {
      if (anyContact === null) anyContact = match[1];
      if (hasAdsKeyword && adsContact === null) adsContact = match[1];
    }
  }

  return adsContact ?? anyContact;
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
      chatId: String(resolvedChatId),
    };
  }

  public async resolveChannel(username: string): Promise<{
    title: string;
    participantsCount: number;
    description: string;
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
    const description =
      "about" in fullChannel.fullChat
        ? (fullChannel.fullChat.about as string) ?? ""
        : "";

    return { title, participantsCount, description };
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

  public async getClient(): Promise<TelegramClient> {
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
  private detectedLanguage: "RU" | "EN" = "RU";
  private readonly config: RealNegotiationConfig;
  private adminChatId: string | undefined;
  private selfUserId: string | null = null;
  private readonly eventBuilder = new NewMessage({ incoming: true });
  private listenerHandler: ((event: NewMessageEvent) => Promise<void>) | null = null;
  private readonly onStatusUpdate: ((text: string) => Promise<void>) | null;

  public constructor(config: RealNegotiationConfig) {
    this.config = config;
    this.adminClient = new RealAdminClient();
    this.onStatusUpdate = config.onStatusUpdate ?? null;
  }

  public async start(): Promise<RealNegotiationStartResult> {
    const { channelUsername, campaign, userId, creatorChatId } = this.config;

    // 1. Resolve channel via MTProto
    const channelInfo = await this.adminClient.resolveChannel(channelUsername);
    this.channelTitle = channelInfo.title;
    this.channelUsername = `@${channelUsername}`;

    // 2. Extract admin contact: title → description → MTProto admin list
    let admin = extractAdminFromTitle(channelInfo.title);
    if (!admin) {
      admin = extractContactFromDescription(channelInfo.description);
    }
    if (!admin) {
      admin = await this.adminClient.getChannelCreatorUsername(channelUsername);
    }
    if (!admin) {
      throw new Error(
        `Could not determine admin contact for @${channelUsername}. ` +
        `Channel title: "${channelInfo.title}". ` +
        `No @username found in title or description, and could not resolve channel creator.`,
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
      description: channelInfo.description,
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
      price: Number(campaign.budgetAmount) || 1,
      status: "admin_contacted",
    });

    this.currentDealId = deal.id;

    // 5. Send outreach via MTProto — detect channel language from description/title
    const channelLanguage = detectLanguageFromTitle(
      channelInfo.description || channelInfo.title,
    );
    this.detectedLanguage = channelLanguage;
    const outreachMessage = buildOutreachMessage({
      channelTitle: this.channelTitle,
      channelUsername: this.channelUsername,
      language: campaign.language,
      detectedLanguage: channelLanguage,
      postText: campaign.text,
    });

    const sendResult = await this.adminClient.sendAdminMessage(admin, outreachMessage);

    // 6. Create external thread mapping
    const chatId = sendResult.chatId !== undefined ? String(sendResult.chatId) : `real-chat-${admin}`;
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
    const creatorNotificationService = new CreatorNotificationService(
      dealRepo,
      dealMessageRepo,
      botNotifier,
    );
    const logger = new ConversationLogger();

    this.negotiationService = new DealNegotiationService(
      campaignRepo,
      channelRepo,
      dealRepo,
      dealMessageRepo,
      dealApprovalRepo,
      dealExternalThreadRepo,
      negotiationLlmService,
      this.adminClient as never,
      creatorNotificationService,
      logger,
    );

    // Store chatId for listener filtering
    this.adminChatId = chatId;

    // Start listening for incoming admin replies
    await this.startListening();

    return {
      outreachMessage,
      adminContact: this.adminContact,
      channelTitle: this.channelTitle,
    };
  }

  private async startListening(): Promise<void> {
    const client = await this.adminClient.getClient();
    const me = await client.getMe();
    this.selfUserId = String(me.id);

    this.listenerHandler = async (event: NewMessageEvent): Promise<void> => {
      const message = event.message;

      console.info(
        JSON.stringify({
          source: "real-negotiation-listener",
          msg: "Raw incoming event",
          out: message.out,
          text: message.message?.slice(0, 80),
          peerId: message.peerId?.className,
          peerIdValue: message.peerId instanceof Api.PeerUser
            ? String(message.peerId.userId)
            : message.peerId instanceof Api.PeerChat
              ? String(message.peerId.chatId)
              : message.peerId instanceof Api.PeerChannel
                ? String(message.peerId.channelId)
                : "unknown",
          fromId: message.fromId?.className,
          expectedChatId: this.adminChatId,
          selfUserId: this.selfUserId,
        }),
      );

      // Skip outbound / self messages
      if (message.out === true) return;
      if (
        message.fromId instanceof Api.PeerUser &&
        this.selfUserId !== null &&
        String(message.fromId.userId) === this.selfUserId
      ) {
        return;
      }

      const text = message.message?.trim();
      if (typeof text !== "string" || text.length === 0) return;

      // Extract chatId from peerId
      let messageChatId: string | null = null;
      if (message.peerId instanceof Api.PeerUser) {
        messageChatId = String(message.peerId.userId);
      } else if (message.peerId instanceof Api.PeerChat) {
        messageChatId = String(message.peerId.chatId);
      } else if (message.peerId instanceof Api.PeerChannel) {
        messageChatId = String(message.peerId.channelId);
      }

      if (messageChatId === null) return;

      // Only process messages from the admin chat we're tracking
      if (this.adminChatId !== undefined && messageChatId !== this.adminChatId) {
        console.info(
          JSON.stringify({
            source: "real-negotiation-listener",
            msg: "ChatId mismatch — skipping",
            messageChatId,
            expectedChatId: this.adminChatId,
          }),
        );
        return;
      }

      if (!this.negotiationService) return;

      try {
        console.info(
          JSON.stringify({
            source: "real-negotiation-listener",
            msg: "Calling handleIncomingAdminMessage",
            chatId: messageChatId,
            text: text.slice(0, 80),
          }),
        );

        const result =
          await this.negotiationService.handleIncomingAdminMessage({
            platform: "telegram",
            chatId: messageChatId,
            externalMessageId: String(message.id),
            text,
          });

        console.info(
          JSON.stringify({
            source: "real-negotiation-listener",
            msg: "handleIncomingAdminMessage result",
            matched: result.matched,
            dealId: result.dealId,
            action: result.action,
          }),
        );

        if (result.matched) {
          try {
            await message.markAsRead();
          } catch {
            // Ignore read receipt errors
          }

          // Notify buyer about price conversion if one occurred
          if (result.conversionNote !== undefined && this.config.onConversionApproval) {
            try {
              await this.config.onConversionApproval({
                text: `Admin quoted ${result.conversionNote}. Accept this conversion?`,
                approveCallbackData: `price_convert:accept:${this.currentDealId}`,
                declineCallbackData: `price_convert:decline:${this.currentDealId}`,
              });
            } catch {
              // Don't break the listener if conversion notification fails
            }
          }

          // Notify the user about the negotiation progress
          if (this.onStatusUpdate) {
            try {
              if (result.action === "reply") {
                await this.onStatusUpdate(
                  `[Negotiation] Admin said: "${text.slice(0, 100)}"\nLumi replied automatically.`,
                );
              } else if (result.action === "wait") {
                await this.onStatusUpdate(
                  `[Negotiation] Admin said: "${text.slice(0, 100)}"\nLumi is waiting (no reply sent). This may indicate an LLM issue — check logs.`,
                );
              } else if (result.action === "decline") {
                await this.onStatusUpdate(
                  `[Negotiation] Admin said: "${text.slice(0, 100)}"\nLumi declined the deal.`,
                );
              } else if (result.action === "request_user_approval") {
                // Approval card will be sent via notifyCampaignCreator
                await this.onStatusUpdate(
                  `[Negotiation] Admin said: "${text.slice(0, 100)}"\nTerms collected! Check the approval card above.`,
                );
              }
            } catch {
              // Don't break the listener if status update fails
            }
          }
        } else {
          console.warn(
            JSON.stringify({
              source: "real-negotiation-listener",
              msg: "Message did not match any deal thread",
              chatId: messageChatId,
            }),
          );
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(
          JSON.stringify({
            source: "real-negotiation-listener",
            msg: "Failed to process admin reply",
            chatId: messageChatId,
            error: errorMsg,
            stack: error instanceof Error ? error.stack : undefined,
          }),
        );

        // Notify user about the error
        if (this.onStatusUpdate) {
          try {
            await this.onStatusUpdate(
              `[Negotiation Error] Failed to process admin reply: ${errorMsg}`,
            );
          } catch {
            // Don't break the listener
          }
        }
      }
    };

    client.addEventHandler(this.listenerHandler, this.eventBuilder);
    console.info(
      JSON.stringify({
        source: "real-negotiation-session",
        msg: "Started listening for admin replies",
        adminChatId: this.adminChatId,
        selfUserId: this.selfUserId,
      }),
    );
  }

  public async stopListening(): Promise<void> {
    if (this.listenerHandler === null) return;

    try {
      const client = await this.adminClient.getClient();
      client.removeEventHandler(this.listenerHandler, this.eventBuilder);
    } catch {
      // Client may already be disconnected
    }
    this.listenerHandler = null;
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

  public getDetectedLanguage(): "RU" | "EN" {
    return this.detectedLanguage;
  }

  public async sendAdminNotification(text: string): Promise<void> {
    try {
      await this.adminClient.sendAdminMessage(this.adminContact, text);
    } catch (error) {
      console.error(
        JSON.stringify({
          source: "real-negotiation-session",
          msg: "Failed to send admin notification",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
}
