import { Api } from "telegram";
import { TelegramClient } from "telegram";
import {
  NewMessage,
  type NewMessageEvent,
} from "telegram/events/NewMessage.js";
import type { FastifyBaseLogger } from "fastify";
import type { DealNegotiationService } from "../application/deal-negotiation-service.js";
import { TelegramUserClient } from "./telegram-user-client.js";

const extractPeerChatId = (peerId: Api.TypePeer | undefined): string | null => {
  if (peerId === undefined) {
    return null;
  }

  if (peerId instanceof Api.PeerUser) {
    return String(peerId.userId);
  }

  if (peerId instanceof Api.PeerChat) {
    return String(peerId.chatId);
  }

  if (peerId instanceof Api.PeerChannel) {
    return String(peerId.channelId);
  }

  return null;
};

const extractSenderUsername = (
  entities: Map<number, unknown> | undefined,
  fromId: Api.TypePeer | undefined,
): string | undefined => {
  if (!(fromId instanceof Api.PeerUser) || entities === undefined) {
    return undefined;
  }

  const entity = entities.get(Number(fromId.userId));

  if (
    entity instanceof Api.User &&
    typeof entity.username === "string" &&
    entity.username.trim().length > 0
  ) {
    return `@${entity.username}`;
  }

  return undefined;
};

export class TelegramNegotiationListener {
  private started = false;
  private client: TelegramClient | null = null;
  private readonly eventBuilder = new NewMessage({ incoming: true });
  private selfUserId: string | null = null;
  private readonly handler = async (event: NewMessageEvent): Promise<void> => {
    const message = event.message;
    const text = message.message?.trim();

    this.logger.info(
      {
        messageId: String(message.id),
        out: message.out === true,
        fromId:
          message.fromId instanceof Api.PeerUser
            ? String(message.fromId.userId)
            : message.fromId instanceof Api.PeerChat
              ? String(message.fromId.chatId)
              : message.fromId instanceof Api.PeerChannel
                ? String(message.fromId.channelId)
                : null,
        peerId:
          message.peerId instanceof Api.PeerUser
            ? String(message.peerId.userId)
            : message.peerId instanceof Api.PeerChat
              ? String(message.peerId.chatId)
              : message.peerId instanceof Api.PeerChannel
                ? String(message.peerId.channelId)
                : null,
        text,
      },
      "Observed Telegram message event",
    );

    if (message.out === true) {
      this.logger.info(
        { messageId: String(message.id) },
        "Ignored outbound/self Telegram message event",
      );
      return;
    }

    if (message.fromId instanceof Api.PeerUser && this.selfUserId !== null) {
      const fromUserId = String(message.fromId.userId);

      if (fromUserId === this.selfUserId) {
        this.logger.info(
          { messageId: String(message.id), fromUserId },
          "Ignored Telegram event from current authenticated user",
        );
        return;
      }
    }

    if (typeof text !== "string" || text.length === 0) {
      return;
    }

    const chatId = extractPeerChatId(message.peerId);

    if (chatId === null) {
      this.logger.warn("Skipped inbound Telegram message without chatId");
      return;
    }

    this.logger.info(
      {
        chatId,
        messageId: String(message.id),
        text,
      },
      "Received inbound Telegram message",
    );

    try {
      const result =
        await this.dealNegotiationService.handleIncomingAdminMessage({
          platform: "telegram",
          chatId,
          externalMessageId: String(message.id),
          text,
          contactValue: extractSenderUsername(
            event.originalUpdate._entities,
            message.fromId,
          ),
        });

      if (result.matched) {
        await message.markAsRead();
        this.logger.info(
          {
            dealId: result.dealId,
            action: result.action,
            approvalRequestId: result.approvalRequestId,
            chatId,
          },
          "Processed inbound Telegram negotiation message",
        );
      } else {
        this.logger.info(
          {
            chatId,
            messageId: String(message.id),
          },
          "Ignored inbound Telegram message because no deal thread matched this chatId",
        );
      }
    } catch (error: unknown) {
      this.logger.error(
        {
          chatId,
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to process inbound Telegram negotiation message",
      );
    }
  };

  public constructor(
    private readonly dealNegotiationService: DealNegotiationService,
    private readonly logger: FastifyBaseLogger,
    private readonly telegramUserClient: TelegramUserClient,
  ) {}

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }

    const client = await this.telegramUserClient.getClient();
    const me = await client.getMe();
    this.selfUserId = String(me.id);
    console.info(
      JSON.stringify({
        level: 30,
        source: "telegram-negotiation-listener",
        msg: "Telegram listener authenticated",
        authUserId: this.selfUserId,
        authUsername: me.username ? `@${me.username}` : null,
      }),
    );

    const dialogs = await client.getDialogs({ limit: 5 });
    console.info(
      JSON.stringify({
        level: 30,
        source: "telegram-negotiation-listener",
        msg: "Telegram listener warm dialog sample",
        dialogs: dialogs.map((dialog) => ({
          id: String(dialog.id),
          title: dialog.title,
          isUser: dialog.isUser,
          isChannel: dialog.isChannel,
        })),
      }),
    );

    client.addEventHandler(this.handler, this.eventBuilder);
    this.client = client;
    this.started = true;
    this.logger.info("Telegram negotiation listener started");
  }

  public async stop(): Promise<void> {
    if (!this.started || this.client === null) {
      return;
    }

    this.client.removeEventHandler(this.handler, this.eventBuilder);
    await this.client.disconnect();
    this.client = null;
    this.selfUserId = null;
    this.started = false;
    this.logger.info("Telegram negotiation listener stopped");
  }
}
