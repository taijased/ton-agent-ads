import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealApprovalRequestRepository,
  InMemoryDealExternalThreadRepository,
  InMemoryDealMessageRepository,
  InMemoryDealRepository
} from "@repo/db";
import type {
  Campaign,
  Channel,
  Deal,
  DealApprovalRequest,
  DealMessage,
  NegotiationDecision
} from "@repo/types";
import { DealNegotiationService } from "./deal-negotiation-service.js";
import { DealService } from "./deal-service.js";

class FakeNegotiationLlmService {
  public constructor(private readonly decision: NegotiationDecision) {}

  public async decide(): Promise<NegotiationDecision> {
    return this.decision;
  }
}

class FakeTelegramAdminClient {
  public readonly sent: Array<{ username: string; text: string }> = [];

  public async sendAdminMessage(username: string, text: string): Promise<{ messageId: string; chatId: string }> {
    this.sent.push({ username, text });
    return { messageId: "msg-1", chatId: "chat-1" };
  }
}

class FakeTelegramBotNotifier {
  public readonly notifications: Array<{
    chatId: string;
    channelTitle: string;
    channelUsername: string;
    contactValue: string | null;
    approvalRequest: DealApprovalRequest;
  }> = [];

  public async sendApprovalRequestNotification(input: {
    chatId: string;
    channelTitle: string;
    channelUsername: string;
    contactValue: string | null;
    approvalRequest: DealApprovalRequest;
  }): Promise<void> {
    this.notifications.push(input);
  }
}

const createCampaign = async (campaignRepository: InMemoryCampaignRepository): Promise<Campaign> =>
  campaignRepository.create({
    userId: "123",
    text: "Test campaign",
    budgetAmount: "10",
    budgetCurrency: "TON",
    goal: "TRAFFIC",
    language: "RU"
  });

const createChannel = async (channelRepository: InMemoryChannelRepository): Promise<Channel> =>
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
        isAdsContact: true
      }
    ]
  });

const createDeal = async (
  dealRepository: InMemoryDealRepository,
  campaign: Campaign,
  channel: Channel,
  status: Deal["status"]
): Promise<Deal> =>
  dealRepository.createDeal({
    campaignId: campaign.id,
    channelId: channel.id,
    price: 9,
    status
  });

test("DealService persists outbound message and thread on outreach start", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealExternalThreadRepository = new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(dealRepository, campaign, channel, "approved");
  const service = new DealService(
    dealRepository,
    campaignRepository,
    channelRepository,
    dealMessageRepository,
    dealExternalThreadRepository,
    telegramAdminClient as never
  );

  const result = await service.updateDealStatus(deal.id, { status: "admin_outreach_pending" });
  const messages = await dealMessageRepository.listByDealId(deal.id);
  const thread = await dealExternalThreadRepository.getByDealId(deal.id);

  assert.equal(result.success, true);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.direction, "outbound");
  assert.equal(messages[0]?.senderType, "agent");
  assert.equal(thread?.chatId, "chat-1");
});

test("DealNegotiationService safely ignores inbound message with no thread mapping", async () => {
  const service = new DealNegotiationService(
    new InMemoryCampaignRepository(),
    new InMemoryChannelRepository(),
    new InMemoryDealRepository(),
    new InMemoryDealMessageRepository(),
    new InMemoryDealApprovalRequestRepository(),
    new InMemoryDealExternalThreadRepository(),
    new FakeNegotiationLlmService({ action: "wait", extracted: {} }) as never,
    new FakeTelegramAdminClient() as never,
    new FakeTelegramBotNotifier() as never
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "unknown-chat",
    text: "10 TON"
  });

  assert.deepEqual(result, { matched: false });
});

test("DealNegotiationService creates approval request for suitable offer and does not auto-accept", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository = new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository = new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const telegramBotNotifier = new FakeTelegramBotNotifier();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(dealRepository, campaign, channel, "admin_contacted");

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-approval",
    contactValue: "@contactone"
  });

  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "inbound",
    senderType: "admin",
    contactValue: "@contactone",
    text: "TON wallet EQC1234567890123456789012345678901234567890123"
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
      summary: "Admin agrees to 9 TON for 1 post tomorrow"
    }) as never,
    telegramAdminClient as never,
    telegramBotNotifier as never
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-approval",
    text: "Сделаем за 9 TON за 1 пост завтра"
  });
  const pendingApproval = await dealApprovalRequestRepository.getPendingByDealId(deal.id);
  const updatedDeal = await dealRepository.getDealById(deal.id);
  const messages = await dealMessageRepository.listByDealId(deal.id);

  assert.equal(result.matched, true);
  assert.equal(result.action, "request_user_approval");
  assert.ok(pendingApproval);
  assert.equal(updatedDeal?.status, "awaiting_user_approval");
  assert.equal(telegramAdminClient.sent.length, 0);
  assert.equal(messages.filter((message) => message.direction === "inbound").length, 2);
  assert.equal(telegramBotNotifier.notifications.length, 1);
});

test("DealNegotiationService continues negotiation when price fits but main terms are missing", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository = new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository = new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const telegramBotNotifier = new FakeTelegramBotNotifier();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(dealRepository, campaign, channel, "admin_contacted");

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-missing-terms",
    contactValue: "@contactone"
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
      summary: "Admin offered 5 TON"
    }) as never,
    telegramAdminClient as never,
    telegramBotNotifier as never
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-missing-terms",
    text: "i agree my price 5 ton per post"
  });
  const pendingApproval = await dealApprovalRequestRepository.getPendingByDealId(deal.id);
  const updatedDeal = await dealRepository.getDealById(deal.id);

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.equal(telegramAdminClient.sent.length, 1);
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /формат|when|когда/i);
  assert.equal(pendingApproval, undefined);
  assert.equal(updatedDeal?.status, "admin_contacted");
  assert.equal(telegramBotNotifier.notifications.length, 0);
});

test("DealNegotiationService converts generic handoff into reply while negotiation is still incomplete", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository = new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository = new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(dealRepository, campaign, channel, "admin_contacted");

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-next-step",
    contactValue: "@contactone"
  });

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService({ action: "handoff_to_human", extracted: {} }) as never,
    telegramAdminClient as never,
    new FakeTelegramBotNotifier() as never
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-next-step",
    text: "what is next step?"
  });

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.equal(telegramAdminClient.sent.length, 1);
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /следующий шаг|price|формат/i);
});

test("DealNegotiationService matches inbound Telegram chat to stored thread", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository = new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository = new InMemoryDealExternalThreadRepository();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(dealRepository, campaign, channel, "admin_contacted");

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-known",
    contactValue: "@contactone"
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
    new FakeTelegramBotNotifier() as never
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-known",
    text: "Добрый день"
  });

  assert.equal(result.matched, true);
  assert.equal(result.dealId, deal.id);
});

test("DealNegotiationService keeps conversation going when admin confirms without price", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository = new InMemoryDealApprovalRequestRepository();
  const dealExternalThreadRepository = new InMemoryDealExternalThreadRepository();
  const telegramAdminClient = new FakeTelegramAdminClient();
  const campaign = await createCampaign(campaignRepository);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(dealRepository, campaign, channel, "admin_contacted");

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-confirm",
    contactValue: "@contactone"
  });

  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "outbound",
    senderType: "agent",
    contactValue: "@contactone",
    text: "Could you please share your available ad formats, conditions, and your current rate for this placement?"
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
    new FakeTelegramBotNotifier() as never
  );

  const result = await service.handleIncomingAdminMessage({
    platform: "telegram",
    chatId: "chat-confirm",
    text: "Confirm"
  });
  const messages = await dealMessageRepository.listByDealId(deal.id);

  assert.equal(result.matched, true);
  assert.equal(result.action, "reply");
  assert.equal(telegramAdminClient.sent.length, 1);
  assert.match(telegramAdminClient.sent[0]?.text ?? "", /цену за 1 пост/i);
  assert.equal(messages.filter((message) => message.direction === "outbound").length, 2);
});
