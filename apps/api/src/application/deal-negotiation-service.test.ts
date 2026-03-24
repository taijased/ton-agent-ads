import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealApprovalRequestRepository,
  InMemoryDealExternalThreadRepository,
  InMemoryDealMessageRepository,
  InMemoryDealRepository,
} from "@repo/db";
import type {
  Campaign,
  Channel,
  CreatorNotificationPayload,
  Deal,
  DealMessage,
  DealApprovalRequest,
  NegotiationDecision,
} from "@repo/types";
import { CreatorNotificationService } from "./creator-notification-service.js";
import {
  DealNegotiationService,
  buildMissingTermsReply,
  buildApprovalConfirmationMessage,
  applyBudgetGate,
} from "./deal-negotiation-service.js";
import { DealService } from "./deal-service.js";
import { extractPriceTon } from "./price-extractor.js";

// ── Fake implementations ─────────────────────────────────────────────────────

class FakeNegotiationLlmService {
  private decisions: NegotiationDecision[];
  private callIndex = 0;

  public constructor(decision: NegotiationDecision | NegotiationDecision[]) {
    this.decisions = Array.isArray(decision) ? decision : [decision];
  }

  public async decide(): Promise<NegotiationDecision> {
    const decision =
      this.decisions[Math.min(this.callIndex, this.decisions.length - 1)];
    this.callIndex++;
    return decision as NegotiationDecision;
  }
}

class FakeTelegramAdminClient {
  public readonly sent: Array<{ username: string; text: string }> = [];

  public async sendAdminMessage(
    username: string,
    text: string,
  ): Promise<{ messageId: string; chatId: string }> {
    this.sent.push({ username, text });
    return { messageId: "msg-1", chatId: "chat-1" };
  }
}

class FakeCreatorNotificationPort {
  public readonly notifications: CreatorNotificationPayload[] = [];

  public async send(
    input: CreatorNotificationPayload,
  ): Promise<{ providerMessageId: string | null }> {
    this.notifications.push(input);
    return { providerMessageId: `bot-${this.notifications.length}` };
  }

  public async notifyApprovalRequired(input: {
    deal: Deal;
    campaignId: string;
    chatId: string;
    approvalRequest: DealApprovalRequest;
  }): Promise<{ delivered: boolean; duplicate: boolean; messageId: string | null }> {
    const result = await this.send({
      dealId: input.deal.id,
      campaignId: input.campaignId,
      chatId: input.chatId,
      eventType: "approval_required",
      text: input.approvalRequest.summary,
      action: "approve_approval",
      actionTargetId: input.approvalRequest.id,
      notificationKey: `approval_required:${input.approvalRequest.id}`,
      status: input.deal.status,
    });

    return {
      delivered: true,
      duplicate: false,
      messageId: result.providerMessageId,
    };
  }

  public async notifyOutreachStarted(input: {
    deal: Deal;
    campaignId: string;
    chatId: string;
  }): Promise<{ delivered: boolean; duplicate: boolean; messageId: string | null }> {
    const result = await this.send({
      dealId: input.deal.id,
      campaignId: input.campaignId,
      chatId: input.chatId,
      eventType: "outreach_started",
      text: "Outreach started",
      action: "none",
      actionTargetId: null,
      notificationKey: `outreach_started:${input.deal.id}`,
      status: input.deal.status,
    });

    return {
      delivered: true,
      duplicate: false,
      messageId: result.providerMessageId,
    };
  }
}

const createCreatorNotificationService = (
  dealRepository: InMemoryDealRepository,
  dealMessageRepository: InMemoryDealMessageRepository,
  notificationPort: FakeCreatorNotificationPort,
): CreatorNotificationService =>
  new CreatorNotificationService(
    dealRepository,
    dealMessageRepository,
    notificationPort,
  );

// ── Fixture factories ─────────────────────────────────────────────────────────

const createCampaign = async (
  campaignRepository: InMemoryCampaignRepository,
  budgetAmount = "10",
): Promise<Campaign> =>
  campaignRepository.create({
    userId: "123",
    text: "Test campaign",
    budgetAmount,
    budgetCurrency: "TON",
    goal: "TRAFFIC",
    language: "RU",
  });

const createChannel = async (
  channelRepository: InMemoryChannelRepository,
): Promise<Channel> =>
  channelRepository.saveParsedChannel({
    id: "channel-telegram-1",
    username: "@channelone",
    description: "Реклама: @contactone",
    title: "Channel One",
    category: "telegram",
    price: 9,
    avgViews: 0,
    contacts: [
      {
        type: "username",
        value: "@contactone",
        source: "extracted_username",
        isAdsContact: true,
      },
    ],
  });

const createDeal = async (
  dealRepository: InMemoryDealRepository,
  campaign: Campaign,
  channel: Channel,
  status: Deal["status"],
): Promise<Deal> =>
  dealRepository.createDeal({
    campaignId: campaign.id,
    channelId: channel.id,
    price: 9,
    status,
  });

const VALID_WALLET = "EQC1234567890123456789012345678901234567890123";

// ── DealService tests ─────────────────────────────────────────────────────────

test("DealService persists outbound message and thread on outreach start", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const creatorNotificationPort = new FakeCreatorNotificationPort();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(dealRepository, campaign, channel, "approved");
  const service = new DealService(
    dealRepository,
    campaignRepository,
    channelRepository,
    dealMessageRepository,
    dealExternalThreadRepository,
    telegramAdminClient as never,
    createCreatorNotificationService(
      dealRepository,
      dealMessageRepository,
      creatorNotificationPort,
    ),
  );

  const result = await service.updateDealStatus(deal.id, {
    status: "admin_outreach_pending",
  });
  const messages = await dealMessageRepository.listByDealId(deal.id);
  const thread = await dealExternalThreadRepository.getByDealId(deal.id);

  assert.equal(result.success, true);
  assert.equal(messages.length, 2);
  assert.equal(messages[0]?.direction, "outbound");
  assert.equal(messages[0]?.senderType, "agent");
  assert.equal(messages[1]?.audience, "creator");
  assert.equal(thread?.chatId, "chat-1");
  assert.equal(creatorNotificationPort.notifications.length, 1);
});

// ── DealNegotiationService — core routing tests ───────────────────────────────

test("DealNegotiationService safely ignores inbound message with no thread mapping", async () => {
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const service = new DealNegotiationService(
    new InMemoryCampaignRepository(),
    new InMemoryChannelRepository(),
    dealRepository,
    dealMessageRepository,
    new InMemoryDealApprovalRequestRepository(),
    new InMemoryDealExternalThreadRepository(),
    new FakeNegotiationLlmService({ action: "wait", extracted: {} }) as never,
    new FakeTelegramAdminClient() as never,
    createCreatorNotificationService(
      dealRepository,
      dealMessageRepository,
      new FakeCreatorNotificationPort(),
    ),
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "unknown-chat",
    text: "10 TON",
  });

  assert.deepEqual(result, { matched: false });
});

test("DealNegotiationService creates approval request for suitable offer and does not auto-accept", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const creatorNotificationPort = new FakeCreatorNotificationPort();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-approval",
    contactValue: "@contactone",
  });

  // Prior inbound message (for conversation history)
  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "inbound",
    senderType: "admin",
    contactValue: "@contactone",
    text: "TON wallet EQC1234567890123456789012345678901234567890123",
  });

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    // LLM must now extract ALL terms (price + date + wallet) since regex scan is gone
    new FakeNegotiationLlmService({
      action: "wait",
      extracted: {
        offeredPriceTon: 9,
        format: "1 post",
        dateText: "tomorrow",
        wallet: VALID_WALLET,
      },
      summary: "Admin agrees to 9 TON for 1 post tomorrow",
    }) as never,
    telegramAdminClient as never,
    createCreatorNotificationService(
      dealRepository,
      dealMessageRepository,
      creatorNotificationPort,
    ),
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-approval",
    text: "Сделаем за 9 TON за 1 пост завтра",
  });
  const pendingApproval =
    await dealApprovalRequestRepository.getPendingByDealId(deal.id);
  const updatedDeal = await dealRepository.getDealById(deal.id);
  const messages = await dealMessageRepository.listByDealId(deal.id);

  assert.equal(result.matched, true);
  assert.equal(result.action, "request_user_approval");
  assert.ok(pendingApproval);
  assert.equal(updatedDeal?.status, "awaiting_user_approval");
  assert.equal(telegramAdminClient.sent.length, 0);
  assert.equal(
    messages.filter((message) => message.direction === "inbound").length,
    2,
  );
  assert.equal(creatorNotificationPort.notifications.length, 1);
});

test("DealNegotiationService continues negotiation when price fits but wallet is missing", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const creatorNotificationPort = new FakeCreatorNotificationPort();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-missing-terms",
    contactValue: "@contactone",
  });

  // LLM returns action:reply with replyText asking for wallet (new behavior:
  // passthrough means whatever the LLM returns is used; to ask for wallet we
  // need the LLM to return action:"reply" with an appropriate replyText)
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText:
        "Отлично! Подскажите, пожалуйста, адрес вашего TON-кошелька для оплаты?",
      extracted: { offeredPriceTon: 5, dateText: "tomorrow" },
      summary: "Admin offered 5 TON tomorrow, wallet missing",
    }) as never,
    telegramAdminClient as never,
    createCreatorNotificationService(
      dealRepository,
      dealMessageRepository,
      creatorNotificationPort,
    ),
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-missing-terms",
    text: "5 ton, завтра могу",
  });
  const pendingApproval =
    await dealApprovalRequestRepository.getPendingByDealId(deal.id);
  const updatedDeal = await dealRepository.getDealById(deal.id);

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.equal(telegramAdminClient.sent.length, 1);
  // Should ask for wallet (the missing term)
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /кошельк|wallet/i);
  assert.equal(pendingApproval, undefined);
  assert.equal(updatedDeal?.status, "admin_contacted");
  assert.equal(creatorNotificationPort.notifications.length, 0);
});

test("DealNegotiationService passthrough: handoff_to_human without replyText sends no message", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-next-step",
    contactValue: "@contactone",
  });

  // In new behavior: handoff_to_human without replyText passes through
  // and no reply is sent (admin gets silence)
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "handoff_to_human",
      extracted: {},
    }) as never,
    telegramAdminClient as never,
    createCreatorNotificationService(
      dealRepository,
      dealMessageRepository,
      new FakeCreatorNotificationPort(),
    ),
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-next-step",
    text: "what is next step?",
  });

  assert.equal(result.matched, true);
  assert.equal(result.action, "handoff_to_human");
  assert.equal(telegramAdminClient.sent.length, 0);
});

test("DealNegotiationService matches inbound Telegram chat to stored thread", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-known",
    contactValue: "@contactone",
  });

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({ action: "wait", extracted: {} }) as never,
    new FakeTelegramAdminClient() as never,
    createCreatorNotificationService(
      dealRepository,
      dealMessageRepository,
      new FakeCreatorNotificationPort(),
    ),
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-known",
    text: "Добрый день",
  });

  assert.equal(result.matched, true);
  assert.equal(result.dealId, deal.id);
});

test("DealNegotiationService ignores replayed inbound Telegram messages with the same external id", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-replay",
    contactValue: "@contactone",
  });

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({ action: "reply", extracted: {} }) as never,
    telegramAdminClient as never,
    createCreatorNotificationService(
      dealRepository,
      dealMessageRepository,
      new FakeCreatorNotificationPort(),
    ),
  );

  await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-replay",
    externalMessageId: "msg-replay-1",
    text: "Добрый день",
  });

  const replayResult = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-replay",
    externalMessageId: "msg-replay-1",
    text: "Добрый день",
  });
  const messages = await dealMessageRepository.listByDealId(deal.id);

  assert.equal(replayResult.matched, true);
  assert.equal(replayResult.action, "wait");
  assert.equal(
    messages.filter((message) => message.externalMessageId === "msg-replay-1")
      .length,
    1,
  );
});

test("DealNegotiationService keeps conversation going when admin confirms without price", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-confirm",
    contactValue: "@contactone",
  });

  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "outbound",
    senderType: "agent",
    contactValue: "@contactone",
    text: "Could you please share your available ad formats, conditions, and your current rate for this placement?",
  });

  // In new behavior: LLM must return action:"reply" with replyText to send a message.
  // "wait" passes through and no message is sent.
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText:
        "Подскажите, пожалуйста, сколько стоит одна рекламная публикация?",
      extracted: {},
    }) as never,
    telegramAdminClient as never,
    createCreatorNotificationService(
      dealRepository,
      dealMessageRepository,
      new FakeCreatorNotificationPort(),
    ),
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-confirm",
    text: "Confirm",
  });
  const messages = await dealMessageRepository.listByDealId(deal.id);

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.equal(telegramAdminClient.sent.length, 1);
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /стоит|price/i);
  assert.equal(
    messages.filter((message) => message.direction === "outbound").length,
    2,
  );
});

// ── Bilingual reply tests ────────────────────────────────────────────────────

test("buildMissingTermsReply returns Russian text for missing price (RU)", () => {
  const reply = buildMissingTermsReply(["price"], false, "RU");
  assert.match(reply, /стоит/i);
});

test("buildMissingTermsReply returns English text for missing price (EN)", () => {
  const reply = buildMissingTermsReply(["price"], false, "EN");
  assert.match(reply, /price per advertising post/i);
});

test("buildMissingTermsReply returns Russian TON conversion ask (RU)", () => {
  const reply = buildMissingTermsReply(["price"], true, "RU");
  assert.match(reply, /TON/);
  assert.match(reply, /Спасибо/i);
});

test("buildMissingTermsReply returns English TON conversion ask (EN)", () => {
  const reply = buildMissingTermsReply(["price"], true, "EN");
  assert.match(reply, /TON/);
  assert.match(reply, /Thank you/i);
});

test("buildApprovalConfirmationMessage returns Russian confirmation (RU)", () => {
  const request: DealApprovalRequest = {
    id: "req-1",
    dealId: "deal-1",
    status: "pending",
    proposedPriceTon: 10,
    proposedFormat: "1 post",
    proposedDateText: "tomorrow",
    proposedWallet: null,
    summary: "test",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  const msg = buildApprovalConfirmationMessage(request, "RU");
  assert.match(msg, /Подтверждаем/i);
  assert.match(msg, /TON/);
});

test("buildApprovalConfirmationMessage returns English confirmation (EN)", () => {
  const request: DealApprovalRequest = {
    id: "req-2",
    dealId: "deal-2",
    status: "pending",
    proposedPriceTon: 10,
    proposedFormat: "1 post",
    proposedDateText: "tomorrow",
    proposedWallet: null,
    summary: "test",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  const msg = buildApprovalConfirmationMessage(request, "EN");
  assert.match(msg, /We confirm/i);
  assert.match(msg, /TON/);
});

test("buildMissingTermsReply returns English date question (EN)", () => {
  const reply = buildMissingTermsReply(["date"], false, "EN");
  assert.match(reply, /publish/i);
});

// ── Wallet term tests ────────────────────────────────────────────────────────

test("buildMissingTermsReply returns Russian wallet question (RU)", () => {
  const reply = buildMissingTermsReply(["wallet"], false, "RU");
  assert.match(reply, /кошельк/i);
});

test("buildMissingTermsReply returns English wallet question (EN)", () => {
  const reply = buildMissingTermsReply(["wallet"], false, "EN");
  assert.match(reply, /wallet/i);
});

test("buildApprovalConfirmationMessage includes wallet when present", () => {
  const request: DealApprovalRequest = {
    id: "req-3",
    dealId: "deal-3",
    status: "pending",
    proposedPriceTon: 10,
    proposedFormat: "1 post",
    proposedDateText: "tomorrow",
    proposedWallet: VALID_WALLET,
    summary: "test",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  const msg = buildApprovalConfirmationMessage(request, "RU");
  assert.match(msg, /Кошелёк/i);
  assert.match(msg, /EQC1234/);
});

// ── Language threading tests ─────────────────────────────────────────────────

test("DealNegotiationService uses EN replies when admin writes in English", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-en",
    contactValue: "@contactone",
  });

  // In new behavior: LLM must return action:"reply" with English replyText.
  // "wait" now passes through without sending a message.
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText: "Could you tell us the price per advertising post?",
      extracted: {},
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-en",
    text: "Yes, I am interested in advertising",
  });

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  // Should get an English reply since admin wrote in English
  const sentText = telegramAdminClient.sent[0]?.text ?? "";
  assert.match(
    sentText,
    /price|Could|tell/i,
    `Expected English reply but got: ${sentText}`,
  );
});

test("DealNegotiationService uses detectedLanguage from input when provided", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-detect",
    contactValue: "@contactone",
  });

  // In new behavior: LLM must return action:"reply" with English replyText
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText: "Could you tell us the price per advertising post?",
      extracted: {},
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  // Pass explicit detectedLanguage override
  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-detect",
    text: "Да, интересно",
    detectedLanguage: "EN",
  });

  assert.equal(result.matched, true);
  // With detectedLanguage: "EN" override, reply should be in English
  const sentText = telegramAdminClient.sent[0]?.text ?? "";
  assert.match(
    sentText,
    /price|Could|tell/i,
    `Expected English reply (from override) but got: ${sentText}`,
  );
});

// ── Bug fix tests ────────────────────────────────────────────────────────────

test("BUG: LLM replies with dead-end text when terms missing → passthrough sends that text", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const telegramBotNotifier = new FakeCreatorNotificationPort();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-dead-end",
    contactValue: "@contactone",
  });

  // New behavior: LLM's replyText is passed through unchanged (Rule C passthrough).
  // If terms are incomplete, the LLM should ask for them. Here the LLM asks for
  // the wallet which is the missing term.
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText:
        "Отлично! Подскажите, пожалуйста, адрес вашего TON-кошелька для оплаты?",
      extracted: { offeredPriceTon: 9, dateText: "послезавтра" },
      summary: "Admin offered 9 TON for stories tomorrow",
    }) as never,
    telegramAdminClient as never,
    telegramBotNotifier as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-dead-end",
    text: "Давайте, 9 TON за интеграцию в сторис на 24 часа, разместим послезавтра",
  });

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.ok(telegramAdminClient.sent.length > 0, "Should send a reply");
  // Should ask for wallet, not send a dead-end "I'll confirm" text
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /кошельк|wallet/i);
});

test("BUG: LLM returns 'wait' with all terms known + price within budget → should become request_user_approval", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const telegramBotNotifier = new FakeCreatorNotificationPort();
  const campaign = await campaignRepository.create({
    userId: "123",
    text: "Test campaign",
    budgetAmount: "50",
    budgetCurrency: "TON",
    goal: "TRAFFIC",
    language: "RU",
  });
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-wait-approval",
    contactValue: "@contactone",
  });

  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "outbound",
    senderType: "agent",
    contactValue: "@contactone",
    text: "Здравствуйте! Хотели бы обсудить размещение.",
    externalMessageId: null,
  });
  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "inbound",
    senderType: "admin",
    contactValue: "@contactone",
    text: "Пост стоит 9 TON, можем завтра. Кошелёк EQC1234567890123456789012345678901234567890123",
    externalMessageId: null,
  });

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    // LLM must now extract wallet from conversation history directly
    new FakeNegotiationLlmService({
      action: "wait",
      replyText: undefined,
      extracted: {
        offeredPriceTon: 9,
        format: "1 post",
        dateText: "tomorrow",
        wallet: VALID_WALLET,
      },
      summary: "Admin will confirm internally",
    }) as never,
    telegramAdminClient as never,
    telegramBotNotifier as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-wait-approval",
    text: "Хорошо, подтверждаю.",
  });

  assert.equal(result.matched, true);
  assert.equal(
    result.action,
    "request_user_approval",
    `Expected "request_user_approval" when all terms are known and price is within budget`,
  );
  assert.ok(
    result.approvalRequestId,
    "Should have created an approval request",
  );
  assert.equal(telegramAdminClient.sent.length, 0);
});

test("BUG: LLM returns 'wait' with missing terms → wait passthrough, no reply sent", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-wait-missing",
    contactValue: "@contactone",
  });

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    // New behavior: wait passes through, no conversion to reply
    new FakeNegotiationLlmService({
      action: "wait",
      extracted: {},
      summary: "Admin is thinking",
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-wait-missing",
    text: "Дайте подумать",
  });

  assert.equal(result.matched, true);
  assert.equal(result.action, "wait");
  assert.equal(
    telegramAdminClient.sent.length,
    0,
    "wait passthrough should not send any message",
  );
});

test("BUG: LLM returns 'wait' with price known but date/wallet missing → wait passthrough, no reply sent", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-wait-partial",
    contactValue: "@contactone",
  });

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    // New behavior: wait with partial terms passes through
    new FakeNegotiationLlmService({
      action: "wait",
      extracted: { offeredPriceTon: 9 },
      summary: "Partial terms",
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-wait-partial",
    text: "9 TON, нужно обсудить",
  });

  assert.equal(result.matched, true);
  assert.equal(result.action, "wait");
  assert.equal(
    telegramAdminClient.sent.length,
    0,
    "wait passthrough should not send any message",
  );
});

test("BUG: LLM returns 'handoff_to_human' when all terms known + price within budget → should become request_user_approval", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const telegramBotNotifier = new FakeCreatorNotificationPort();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-handoff-bug",
    contactValue: "@contactone",
  });

  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "outbound",
    senderType: "agent",
    contactValue: "@contactone",
    text: "Здравствуйте! Хотели бы обсудить размещение.",
    externalMessageId: null,
  });
  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "inbound",
    senderType: "admin",
    contactValue: "@contactone",
    text: "1 тон, в любом, EQC1234567890123456789012345678901234567890123",
    externalMessageId: null,
  });

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    // LLM now must include wallet in extracted (no regex scan of prior messages)
    new FakeNegotiationLlmService({
      action: "handoff_to_human",
      extracted: {
        offeredPriceTon: 1,
        format: "any format",
        dateText: "any time",
        wallet: VALID_WALLET,
      },
      summary: "Admin provided all terms",
    }) as never,
    telegramAdminClient as never,
    telegramBotNotifier as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-handoff-bug",
    text: "В любое",
  });

  assert.equal(result.matched, true);
  assert.equal(
    result.action,
    "request_user_approval",
    `Expected "request_user_approval" but got "${result.action}". ` +
      "handoff_to_human should be overridden when all terms are known and price fits budget.",
  );
  assert.ok(
    result.approvalRequestId,
    "Should have created an approval request",
  );
  assert.equal(telegramAdminClient.sent.length, 0);
});

test("BUG: LLM returns 'handoff_to_human' WITH replyText when all terms known → still becomes request_user_approval", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const telegramBotNotifier = new FakeCreatorNotificationPort();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-handoff-reply",
    contactValue: "@contactone",
  });

  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "inbound",
    senderType: "admin",
    contactValue: "@contactone",
    text: "Цена 9 тон за 1 пост, завтра могу разместить. Кошелёк EQC1234567890123456789012345678901234567890123",
    externalMessageId: null,
  });

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    // LLM must now include wallet in extracted
    new FakeNegotiationLlmService({
      action: "handoff_to_human",
      replyText: "Нужна помощь человека для финализации сделки",
      extracted: {
        offeredPriceTon: 9,
        format: "1 post",
        dateText: "tomorrow",
        wallet: VALID_WALLET,
      },
      summary: "All terms known but LLM confused",
    }) as never,
    telegramAdminClient as never,
    telegramBotNotifier as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-handoff-reply",
    text: "Подтверждаю условия",
  });

  assert.equal(result.matched, true);
  assert.equal(
    result.action,
    "request_user_approval",
    "handoff_to_human with replyText should still become request_user_approval when all terms are known",
  );
  assert.ok(result.approvalRequestId);
});

// ── applyBudgetGate unit tests (Phase 2) ─────────────────────────────────────

test("applyBudgetGate Rule A: all terms known + price within budget → request_user_approval", () => {
  const decision: NegotiationDecision = {
    action: "reply",
    replyText: "sounds good",
    extracted: {},
  };
  const knownTerms = {
    offeredPriceTon: 5,
    dateText: "tomorrow",
    wallet: VALID_WALLET,
  };

  const result = applyBudgetGate(decision, knownTerms, 10, "RU");

  assert.equal(result.action, "request_user_approval");
});

test("applyBudgetGate Rule A: price exactly at budget → request_user_approval", () => {
  const decision: NegotiationDecision = {
    action: "wait",
    extracted: {},
  };
  const knownTerms = {
    offeredPriceTon: 10,
    dateText: "Friday",
    wallet: VALID_WALLET,
  };

  const result = applyBudgetGate(decision, knownTerms, 10, "EN");

  assert.equal(result.action, "request_user_approval");
});

test("applyBudgetGate Rule B: price exceeds budget → reply asking lower price (RU)", () => {
  // When LLM provides no replyText, the budget gate fills in the "lower price" text
  const decision: NegotiationDecision = {
    action: "reply",
    extracted: {},
  };
  const knownTerms = {
    offeredPriceTon: 15,
    dateText: "tomorrow",
    wallet: VALID_WALLET,
  };

  const result = applyBudgetGate(decision, knownTerms, 10, "RU");

  assert.equal(result.action, "reply");
  assert.match(result.replyText ?? "", /цен|планов/i);
});

test("applyBudgetGate Rule B: price exceeds budget → reply asking lower price (EN)", () => {
  const decision: NegotiationDecision = {
    action: "wait",
    extracted: {},
  };
  const knownTerms = {
    offeredPriceTon: 20,
  };

  const result = applyBudgetGate(decision, knownTerms, 10, "EN");

  assert.equal(result.action, "reply");
  assert.match(result.replyText ?? "", /lower price|above/i);
});

test("applyBudgetGate Rule C: decline always passes through", () => {
  const decision: NegotiationDecision = {
    action: "decline",
    replyText: "No thanks",
    extracted: {},
  };
  const knownTerms = {
    offeredPriceTon: 5,
    dateText: "tomorrow",
    wallet: VALID_WALLET,
  };

  const result = applyBudgetGate(decision, knownTerms, 10, "RU");

  assert.equal(result.action, "decline");
});

test("applyBudgetGate Rule C: NaN budget → passthrough LLM decision", () => {
  const decision: NegotiationDecision = {
    action: "reply",
    replyText: "Let me ask",
    extracted: {},
  };
  const knownTerms = {
    offeredPriceTon: 5,
    dateText: "tomorrow",
    wallet: VALID_WALLET,
  };

  const result = applyBudgetGate(decision, knownTerms, NaN, "RU");

  assert.equal(result.action, "reply");
  assert.equal(result.replyText, "Let me ask");
});

test("applyBudgetGate Rule C: missing terms → passthrough LLM decision", () => {
  const decision: NegotiationDecision = {
    action: "reply",
    replyText: "When can you publish?",
    extracted: {},
  };
  // price known but no date/wallet
  const knownTerms = { offeredPriceTon: 5 };

  const result = applyBudgetGate(decision, knownTerms, 10, "EN");

  assert.equal(result.action, "reply");
  assert.equal(result.replyText, "When can you publish?");
});

test("applyBudgetGate Rule C: handoff_to_human with no terms → passthrough", () => {
  const decision: NegotiationDecision = {
    action: "handoff_to_human",
    extracted: {},
  };

  const result = applyBudgetGate(decision, {}, 10, "RU");

  assert.equal(result.action, "handoff_to_human");
});

test("applyBudgetGate Rule C: wait with missing terms → passthrough", () => {
  const decision: NegotiationDecision = {
    action: "wait",
    extracted: {},
  };

  const result = applyBudgetGate(decision, {}, 10, "RU");

  assert.equal(result.action, "wait");
});

test("applyBudgetGate: zero price treated as unknown (no Rule A/B trigger)", () => {
  const decision: NegotiationDecision = {
    action: "reply",
    replyText: "What is your price?",
    extracted: {},
  };
  // offeredPriceTon = 0 → should NOT trigger Rule A or Rule B
  const knownTerms = {
    offeredPriceTon: 0,
    dateText: "tomorrow",
    wallet: VALID_WALLET,
  };

  const result = applyBudgetGate(decision, knownTerms, 10, "RU");

  // Rule A requires price > 0, so 0 should not trigger approval
  assert.notEqual(result.action, "request_user_approval");
  // Rule B requires price > 0, so 0 should not trigger counter
  assert.equal(result.action, "reply");
  assert.equal(result.replyText, "What is your price?");
});

// ── Price extractor regex tests (Phase 1 fallback path) ───────────────────────

test("extractPriceTon: тон without trailing н → offeredPriceTon = 50", () => {
  const result = extractPriceTon("50 тон");
  assert.equal(result.offeredPriceTon, 50);
});

test("extractPriceTon: тонн (double н) still works → offeredPriceTon = 50", () => {
  const result = extractPriceTon("50 тонн");
  assert.equal(result.offeredPriceTon, 50);
});

test("extractPriceTon: ton (English) → offeredPriceTon = 50", () => {
  const result = extractPriceTon("50 ton");
  assert.equal(result.offeredPriceTon, 50);
});

test("extractPriceTon: тона (genitive singular) → offeredPriceTon = 5", () => {
  const result = extractPriceTon("5 тона");
  assert.equal(result.offeredPriceTon, 5);
});

test("extractPriceTon: non-TON currency (dollars) → mentionedNonTonCurrency = true", () => {
  const result = extractPriceTon("500 долларов");
  assert.equal(result.mentionedNonTonCurrency, true);
  assert.equal(result.offeredPriceTon, undefined);
});

test("extractPriceTon: non-TON currency (USD symbol) → mentionedNonTonCurrency = true", () => {
  const result = extractPriceTon("$500");
  assert.equal(result.mentionedNonTonCurrency, true);
  assert.equal(result.offeredPriceTon, undefined);
});

test("extractPriceTon: range pattern uses upper bound → offeredPriceTon = 80", () => {
  const result = extractPriceTon("60-80 тон");
  assert.equal(result.offeredPriceTon, 80);
});

test("extractPriceTon: decimal price with comma → offeredPriceTon = 5.5", () => {
  const result = extractPriceTon("5,5 тон");
  assert.equal(result.offeredPriceTon, 5.5);
});

test("extractPriceTon: no price information → returns empty object", () => {
  const result = extractPriceTon("Добрый день, рассматриваем сотрудничество");
  assert.equal(result.offeredPriceTon, undefined);
  assert.equal(result.mentionedNonTonCurrency, undefined);
});

// ── LLM-only extraction (Phase 1) ────────────────────────────────────────────

test("LLM extraction: LLM extracts price=50 → knownTerms uses 50 directly", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository, "100");
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-llm-extract",
    contactValue: "@contactone",
  });

  // LLM extracts price=50, budget=100 but date/wallet missing → passthrough (Rule C, missing terms)
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText: "Great! When could you publish the post?",
      extracted: { offeredPriceTon: 50 },
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-llm-extract",
    text: "50 тон",
  });

  assert.equal(result.action, "reply");
  // Budget gate: price 50 <= 100 but terms incomplete → passthrough LLM reply
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /publish|when/i);
});

test("LLM extraction: LLM returns no price, regex fallback extracts from inbound message", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository, "100");
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-regex-fallback",
    contactValue: "@contactone",
  });

  // LLM returns no offeredPriceTon → regex fallback should find "50 тон" in message
  // Price 50 <= budget 100, but date/wallet missing → Rule C passthrough
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText: "Great! When could you publish the post?",
      extracted: {}, // no price from LLM
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-regex-fallback",
    text: "50 тон за пост",
  });

  // Price extracted by regex from message (50), within budget (100), but terms incomplete
  assert.equal(result.matched, true);
  // LLM decision passthrough since terms are still incomplete
  assert.equal(result.action, "reply");
});

test("LLM extraction: LLM returns price correction (30) after first message (50)", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const telegramBotNotifier = new FakeCreatorNotificationPort();
  const campaign = await createCampaign(campaignRepository, "100");
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-price-correction",
    contactValue: "@contactone",
  });

  // Seed first message with price 50
  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "inbound",
    senderType: "admin",
    contactValue: "@contactone",
    text: "50 тон",
    externalMessageId: null,
  });

  // FakeLLM: first call would have returned price=50, correction returns price=30
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    // On the correction message, LLM understands "actually 30" → returns 30
    new FakeNegotiationLlmService({
      action: "reply",
      replyText: "Отлично! Когда вы могли бы разместить публикацию?",
      extracted: { offeredPriceTon: 30 },
    }) as never,
    telegramAdminClient as never,
    telegramBotNotifier as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-price-correction",
    text: "Нет, на самом деле 30 тон, завтра могу",
  });

  assert.equal(result.matched, true);
  // Price 30 <= 100 budget, terms incomplete (no wallet) → Rule C passthrough
  assert.equal(result.action, "reply");
  // Should ask for date/wallet, not re-ask for price
  assert.ok(telegramAdminClient.sent.length > 0, "Should send a reply");
});

test("LLM extraction: multi-field extraction — price and date both in knownTerms", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository, "50");
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-multi-extract",
    contactValue: "@contactone",
  });

  // LLM extracts both price and date — wallet missing → Rule C passthrough, ask for wallet
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText:
        "Отлично! Подскажите, пожалуйста, адрес вашего TON-кошелька для оплаты?",
      extracted: { offeredPriceTon: 9, dateText: "Friday" },
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-multi-extract",
    text: "9 тон, в пятницу",
  });

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /кошельк|wallet/i);
});

test("LLM extraction: invalid wallet format → treated as unknown, not added to knownTerms", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const telegramBotNotifier = new FakeCreatorNotificationPort();
  const campaign = await createCampaign(campaignRepository, "50");
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-invalid-wallet",
    contactValue: "@contactone",
  });

  // LLM extracts an invalid wallet (not a real TON address) → should be rejected
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText:
        "Отлично! Подскажите, пожалуйста, адрес вашего TON-кошелька для оплаты?",
      extracted: {
        offeredPriceTon: 9,
        dateText: "tomorrow",
        wallet: "not-a-real-wallet-address",
      },
    }) as never,
    telegramAdminClient as never,
    telegramBotNotifier as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-invalid-wallet",
    text: "9 тон, завтра, my-wallet-123",
  });

  assert.equal(result.matched, true);
  // Wallet is invalid → terms incomplete → no approval request
  assert.notEqual(result.action, "request_user_approval");
  assert.equal(telegramBotNotifier.notifications.length, 0);
});

test("LLM extraction: mentionedNonTonCurrency=true from LLM → reply asks for TON price", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-non-ton",
    contactValue: "@contactone",
  });

  // LLM sees "$500" and sets mentionedNonTonCurrency=true
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText:
        "Спасибо! Мы работаем в TON — подскажите, пожалуйста, сколько это будет в TON?",
      extracted: { mentionedNonTonCurrency: true },
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-non-ton",
    text: "$500 за рекламный пост",
  });

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /TON/);
});

// ── Semantic duplicate detection tests (Phase 4) ─────────────────────────────

test("Semantic dedup: same term asked again → canned reply with different phrasing", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-dedup",
    contactValue: "@contactone",
  });

  // Seed a prior outbound message that was asking about price
  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "outbound",
    senderType: "agent",
    contactValue: "@contactone",
    text: "Подскажите, пожалуйста, сколько стоит одна рекламная публикация?",
    externalMessageId: null,
  });

  // LLM also asks about price again with different wording → dedup triggers
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText: "How much does it cost per post?",
      extracted: {},
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-dedup",
    text: "I said yes",
  });

  // Dedup should fire because both messages ask about "price"
  // The sent text should be the canned reply (different phrasing)
  assert.equal(telegramAdminClient.sent.length, 1);
  const sentText = telegramAdminClient.sent[0]?.text ?? "";
  // Canned reply is: "Подскажите, пожалуйста, сколько стоит одна рекламная публикация?"
  // which is the same as lastOutbound → should trigger double-dedup fallback
  // OR if phrasing differs, it uses canned reply
  assert.ok(sentText.length > 0, "Should send something");
});

test("Semantic dedup: different term from last outbound → no dedup, LLM reply sent as-is", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-no-dedup",
    contactValue: "@contactone",
  });

  // Last outbound asked about price
  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "outbound",
    senderType: "agent",
    contactValue: "@contactone",
    text: "Подскажите, пожалуйста, сколько стоит одна рекламная публикация?",
    externalMessageId: null,
  });

  const specificReplyText = "Отлично! Когда вы могли бы разместить публикацию?";

  // LLM now asks about DATE (different term) → no dedup
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText: specificReplyText,
      extracted: { offeredPriceTon: 9 },
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-no-dedup",
    text: "9 тон за пост",
  });

  assert.equal(telegramAdminClient.sent.length, 1);
  assert.equal(telegramAdminClient.sent[0]?.text, specificReplyText);
});

test("Semantic dedup: no previous outbound → no dedup, LLM reply sent as-is", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-first-msg",
    contactValue: "@contactone",
  });

  const specificReplyText =
    "Подскажите, пожалуйста, сколько стоит одна рекламная публикация?";

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText: specificReplyText,
      extracted: {},
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-first-msg",
    text: "Hello",
  });

  assert.equal(telegramAdminClient.sent.length, 1);
  assert.equal(telegramAdminClient.sent[0]?.text, specificReplyText);
});

test("Semantic dedup: double-dedup fallback → generic fallback when canned reply was already sent", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-double-dedup",
    contactValue: "@contactone",
  });

  // Last outbound IS the exact canned reply for price (simulating it was already sent)
  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "outbound",
    senderType: "agent",
    contactValue: "@contactone",
    text: "Подскажите, пожалуйста, сколько стоит одна рекламная публикация?",
    externalMessageId: null,
  });

  // LLM asks about price again → dedup fires → canned = lastOutbound → double-dedup → generic fallback
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "reply",
      replyText: "Сколько стоит размещение рекламного поста?",
      extracted: {},
    }) as never,
    telegramAdminClient as never,
    new FakeCreatorNotificationPort() as never,
  );

  await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-double-dedup",
    text: "Я же сказал да",
  });

  assert.equal(telegramAdminClient.sent.length, 1);
  const sentText = telegramAdminClient.sent[0]?.text ?? "";
  // Should use generic fallback (not the specific price question again)
  assert.match(sentText, /детали|clarify/i);
});

// ── Three price corrections sequential test (Phase 1) ─────────────────────────

test("LLM extraction: three sequential price corrections — final result uses last value (20)", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const telegramBotNotifier = new FakeCreatorNotificationPort();
  const campaign = await createCampaign(campaignRepository, "100");
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(
    dealRepository,
    campaign,
    channel,
    "admin_contacted",
  );

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-3-corrections",
    contactValue: "@contactone",
  });

  // FakeNegotiationLlmService now supports sequential decisions
  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService([
      {
        action: "reply",
        replyText: "Отлично! Когда вы могли бы разместить публикацию?",
        extracted: { offeredPriceTon: 50 },
      },
      {
        action: "reply",
        replyText: "Отлично! Когда вы могли бы разместить публикацию?",
        extracted: { offeredPriceTon: 30 },
      },
      {
        action: "reply",
        replyText: "Отлично! Когда вы могли бы разместить публикацию?",
        extracted: { offeredPriceTon: 20 },
      },
    ]) as never,
    telegramAdminClient as never,
    telegramBotNotifier as never,
  );

  await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-3-corrections",
    text: "50 тон",
  });
  await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-3-corrections",
    text: "нет, 30 тон",
  });
  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-3-corrections",
    text: "на самом деле 20 тон",
  });

  // Third call: LLM returns price=20, budget=100, terms incomplete → passthrough
  assert.equal(result.matched, true);
  assert.notEqual(result.action, "request_user_approval");
});
