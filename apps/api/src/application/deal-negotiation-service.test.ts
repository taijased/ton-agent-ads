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

test("DealNegotiationService continues negotiation when price fits but main terms are missing", async () => {
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
      extracted: { offeredPriceTon: 5 },
      summary: "Admin offered 5 TON",
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
    text: "i agree my price 5 ton per post",
  });
  const pendingApproval =
    await dealApprovalRequestRepository.getPendingByDealId(deal.id);
  const updatedDeal = await dealRepository.getDealById(deal.id);

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.equal(telegramAdminClient.sent.length, 1);
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /формат|when|когда/i);
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
    /следующий шаг|price|формат/i,
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
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /цену за 1 пост/i);
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
    summary: "test",
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  const msg = buildApprovalConfirmationMessage(request, "EN");
  assert.match(msg, /We confirm/i);
  assert.match(msg, /TON/);
});

test("buildMissingTermsReply returns English format question (EN)", () => {
  const reply = buildMissingTermsReply(["format"], false, "EN");
  assert.match(reply, /format/i);
});

test("buildMissingTermsReply returns English date question (EN)", () => {
  const reply = buildMissingTermsReply(["date"], false, "EN");
  assert.match(reply, /publish/i);
});
