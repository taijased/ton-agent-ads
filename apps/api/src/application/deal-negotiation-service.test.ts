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
  NegotiationDecision,
} from "@repo/types";
import { CreatorNotificationService } from "./creator-notification-service.js";
import {
  DealNegotiationService,
  buildMissingTermsReply,
  buildApprovalConfirmationMessage,
} from "./deal-negotiation-service.js";
import { DealService } from "./deal-service.js";

class FakeNegotiationLlmService {
  public constructor(private readonly decision: NegotiationDecision) {}

  public async decide(): Promise<NegotiationDecision> {
    return this.decision;
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

const createCampaign = async (
  campaignRepository: InMemoryCampaignRepository,
): Promise<Campaign> =>
  campaignRepository.create({
    userId: "123",
    text: "Test campaign",
    budgetAmount: "10",
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
    new FakeNegotiationLlmService({
      action: "wait",
      extracted: { format: "1 post", dateText: "tomorrow" },
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

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "handoff_to_human",
      extracted: { offeredPriceTon: 5, dateText: "tomorrow" },
      summary: "Admin offered 5 TON tomorrow",
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

test("DealNegotiationService converts generic handoff into reply while negotiation is still incomplete", async () => {
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
  assert.equal(result.action, "reply");
  assert.equal(telegramAdminClient.sent.length, 1);
  assert.match(
    telegramAdminClient.sent[0]?.text ?? "",
    /стоит|price|формат/i,
  );
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

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({ action: "wait", extracted: {} }) as never,
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
    proposedWallet: "EQC1234567890123456789012345678901234567890123",
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

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "wait",
      extracted: {},
    }) as never,
    telegramAdminClient as never,
    new FakeTelegramBotNotifier() as never,
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
  assert.match(sentText, /price|Could|tell/i, `Expected English reply but got: ${sentText}`);
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

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({
      action: "wait",
      extracted: {},
    }) as never,
    telegramAdminClient as never,
    new FakeTelegramBotNotifier() as never,
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
  assert.match(sentText, /price|Could|tell/i, `Expected English reply (from override) but got: ${sentText}`);
});

// ── Bug fix tests ────────────────────────────────────────────────────────────

test("BUG: LLM replies 'I'll confirm internally' but date/wallet not extracted → should ask for missing terms instead", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const telegramBotNotifier = new FakeTelegramBotNotifier();
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
        "Спасибо, основные условия выглядят понятными. Я передам их на внутреннее подтверждение и вернусь с финальным ответом.",
      extracted: { offeredPriceTon: 9 },
      summary: "Admin offered 9 TON",
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
  assert.ok(
    telegramAdminClient.sent.length > 0,
    "Should send a reply asking for remaining terms",
  );
  const sentText = telegramAdminClient.sent[0]?.text ?? "";
  assert.ok(
    !sentText.includes("подтверждение") && !sentText.includes("confirm"),
    `Should NOT send dead-end "I'll confirm" text, but sent: ${sentText}`,
  );
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
  const telegramBotNotifier = new FakeTelegramBotNotifier();
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

  // Seed prior conversation with all terms discussed (including wallet)
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
    new FakeNegotiationLlmService({
      action: "wait",
      replyText: undefined,
      extracted: { offeredPriceTon: 9, format: "1 post", dateText: "tomorrow" },
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
  assert.ok(result.approvalRequestId, "Should have created an approval request");
  assert.equal(telegramAdminClient.sent.length, 0);
});

test("BUG: LLM returns 'wait' with missing terms → correctly converts to reply asking for terms", async () => {
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
    new FakeNegotiationLlmService({
      action: "wait",
      extracted: {},
      summary: "Admin is thinking",
    }) as never,
    telegramAdminClient as never,
    new FakeTelegramBotNotifier() as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-wait-missing",
    text: "Дайте подумать",
  });

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.ok(telegramAdminClient.sent.length > 0, "Should ask for missing terms");
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /стоит|price/i);
});

test("BUG: LLM returns 'wait' with price known but date/wallet missing → converts to reply for remaining terms", async () => {
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
    new FakeNegotiationLlmService({
      action: "wait",
      extracted: { offeredPriceTon: 9 },
      summary: "Partial terms",
    }) as never,
    telegramAdminClient as never,
    new FakeTelegramBotNotifier() as never,
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-wait-partial",
    text: "9 TON, нужно обсудить",
  });

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.ok(telegramAdminClient.sent.length > 0, "Should ask for remaining terms");
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
  const telegramBotNotifier = new FakeTelegramBotNotifier();
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

  // Seed prior messages with all terms mentioned (including wallet)
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
    new FakeNegotiationLlmService({
      action: "handoff_to_human",
      extracted: { offeredPriceTon: 1, format: "any format", dateText: "any time" },
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
  assert.ok(result.approvalRequestId, "Should have created an approval request");
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
  const telegramBotNotifier = new FakeTelegramBotNotifier();
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
    new FakeNegotiationLlmService({
      action: "handoff_to_human",
      replyText: "Нужна помощь человека для финализации сделки",
      extracted: { offeredPriceTon: 9, format: "1 post", dateText: "tomorrow" },
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
