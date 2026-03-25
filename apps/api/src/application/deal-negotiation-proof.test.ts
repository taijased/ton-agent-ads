import test, { beforeEach, describe } from "node:test";
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
  DealApprovalRequest,
  DealStatus,
  NegotiationDecision,
} from "@repo/types";
import { CreatorNotificationService } from "./creator-notification-service.js";
import { DealNegotiationService } from "./deal-negotiation-service.js";
import type { NegotiationLlmInput } from "./negotiation-llm-service.js";
import type { ConversationLogEntry } from "./conversation-logger.js";

// ── Fake implementations ─────────────────────────────────────────────────────

class FakeNegotiationLlmService {
  public lastInput?: NegotiationLlmInput;

  public async decide(
    input: NegotiationLlmInput,
  ): Promise<NegotiationDecision> {
    this.lastInput = input;
    return { action: "wait", extracted: {} };
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
  }): Promise<{
    delivered: boolean;
    duplicate: boolean;
    messageId: string | null;
  }> {
    return { delivered: true, duplicate: false, messageId: null };
  }

  public async notifyOutreachStarted(input: {
    deal: Deal;
    campaignId: string;
    chatId: string;
  }): Promise<{
    delivered: boolean;
    duplicate: boolean;
    messageId: string | null;
  }> {
    return { delivered: true, duplicate: false, messageId: null };
  }
}

class FakeConversationLogger {
  public readonly logs: ConversationLogEntry[] = [];

  public log(entry: ConversationLogEntry): void {
    this.logs.push(entry);
  }
}

// ── Fixture factories ─────────────────────────────────────────────────────────

const CAMPAIGN_TEXT = "Sexy shmeksy";
const CHANNEL_ID = "channel-telegram-proof";

const createCampaign = async (
  campaignRepository: InMemoryCampaignRepository,
  text: string = CAMPAIGN_TEXT,
): Promise<Campaign> =>
  campaignRepository.create({
    userId: "user-proof-test",
    text,
    budgetAmount: "10",
    budgetCurrency: "TON",
    goal: "TRAFFIC",
    language: "EN",
  });

const createChannel = async (
  channelRepository: InMemoryChannelRepository,
  channelId: string = CHANNEL_ID,
): Promise<Channel> =>
  channelRepository.saveParsedChannel({
    id: channelId,
    username: "@proofchannel",
    description: "Test channel",
    title: "Proof Channel",
    category: "telegram",
    price: 5,
    avgViews: 100,
    contacts: [
      {
        type: "username",
        value: "@proofattempt",
        source: "extracted_username",
        isAdsContact: true,
      },
    ],
  });

const createDeal = async (
  dealRepository: InMemoryDealRepository,
  campaign: Campaign,
  channel: Channel,
  status: DealStatus,
): Promise<Deal> =>
  dealRepository.createDeal({
    campaignId: campaign.id,
    channelId: channel.id,
    price: 5,
    status,
  });

// ── Test context ──────────────────────────────────────────────────────────────

interface TestContext {
  campaignRepository: InMemoryCampaignRepository;
  channelRepository: InMemoryChannelRepository;
  dealRepository: InMemoryDealRepository;
  dealMessageRepository: InMemoryDealMessageRepository;
  dealApprovalRequestRepository: InMemoryDealApprovalRequestRepository;
  dealExternalThreadRepository: InMemoryDealExternalThreadRepository;
  telegramAdminClient: FakeTelegramAdminClient;
  creatorNotificationPort: FakeCreatorNotificationPort;
  logger: FakeConversationLogger;
  service: DealNegotiationService;
  campaign: Campaign;
  channel: Channel;
}

const setupContext = async (
  dealStatus: DealStatus,
  campaignText: string = CAMPAIGN_TEXT,
): Promise<TestContext & { deal: Deal }> => {
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
  const logger = new FakeConversationLogger();

  const campaign = await createCampaign(campaignRepository, campaignText);
  const channel = await createChannel(channelRepository);
  const deal = await createDeal(dealRepository, campaign, channel, dealStatus);

  await dealExternalThreadRepository.create({
    dealId: deal.id,
    platform: "telegram",
    chatId: "chat-proof",
    contactValue: "@proofattempt",
  });

  const creatorNotificationService = new CreatorNotificationService(
    dealRepository,
    dealMessageRepository,
    creatorNotificationPort,
  );

  const service = new DealNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    new FakeNegotiationLlmService() as never,
    telegramAdminClient as never,
    creatorNotificationService,
    logger as never,
  );

  return {
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    dealExternalThreadRepository,
    telegramAdminClient,
    creatorNotificationPort,
    logger,
    service,
    campaign,
    channel,
    deal,
  };
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DealNegotiationService — proof handling", () => {
  // #13: Happy path — valid proof on paid deal
  test("accepts forwarded proof with matching content on paid deal and marks it completed", async () => {
    const ctx = await setupContext("paid");

    const result = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: CAMPAIGN_TEXT,
      isForwarded: true,
      forwardedFromChannelId: CHANNEL_ID,
    });

    assert.equal(result.matched, true);
    assert.equal(result.dealId, ctx.deal.id);

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "completed");

    // Ack reply sent
    assert.equal(ctx.telegramAdminClient.sent.length, 1);
    assert.match(
      ctx.telegramAdminClient.sent[0]?.text ?? "",
      /confirmed|thank/i,
    );
  });

  // #14: Valid proof on proof_pending deal
  test("accepts forwarded proof with matching content on proof_pending deal", async () => {
    const ctx = await setupContext("proof_pending");

    const result = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: CAMPAIGN_TEXT,
      isForwarded: true,
      forwardedFromChannelId: CHANNEL_ID,
    });

    assert.equal(result.matched, true);

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "completed");
  });

  // #15: Content mismatch — rejection (THE BUG REPORT SCENARIO)
  test("rejects forwarded proof when content does not match campaign text", async () => {
    const ctx = await setupContext("paid");

    const result = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: "new offer lol",
      isForwarded: true,
      forwardedFromChannelId: CHANNEL_ID,
    });

    assert.equal(result.matched, true);
    assert.equal(result.dealId, ctx.deal.id);

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "paid");

    // Rejection reply sent
    assert.equal(ctx.telegramAdminClient.sent.length, 1);
    assert.match(
      ctx.telegramAdminClient.sent[0]?.text ?? "",
      /doesn't seem to match/,
    );
  });

  // #16: Non-forwarded message on paid deal
  test("asks for forwarded post when non-forwarded message received on paid deal", async () => {
    const ctx = await setupContext("paid");

    const result = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: "I published it",
      isForwarded: false,
    });

    assert.equal(result.matched, true);

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "paid");

    assert.equal(ctx.telegramAdminClient.sent.length, 1);
    assert.match(
      ctx.telegramAdminClient.sent[0]?.text ?? "",
      /forward.*published|forwarded message/i,
    );
  });

  // #17: Empty text forward
  test("rejects forwarded proof with empty text and asks for text-containing post", async () => {
    const ctx = await setupContext("paid");

    const result = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: "",
      isForwarded: true,
      forwardedFromChannelId: CHANNEL_ID,
    });

    assert.equal(result.matched, true);

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "paid");

    assert.equal(ctx.telegramAdminClient.sent.length, 1);
    assert.match(
      ctx.telegramAdminClient.sent[0]?.text ?? "",
      /doesn't contain text|text/i,
    );
  });

  // #18: Wrong channel, correct content
  test("accepts proof from wrong channel when content matches", async () => {
    const ctx = await setupContext("paid");

    const result = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: CAMPAIGN_TEXT,
      isForwarded: true,
      forwardedFromChannelId: "999999",
    });

    assert.equal(result.matched, true);

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "completed");

    // Logger should have a warning about channel mismatch
    const channelMismatchLog = ctx.logger.logs.find((log) =>
      log.text.includes("forwarded from channel"),
    );
    assert.ok(channelMismatchLog, "Expected a channel mismatch warning log");
  });

  // #19: Wrong channel, wrong content
  test("rejects proof from wrong channel with non-matching content", async () => {
    const ctx = await setupContext("paid");

    const result = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: "unrelated post",
      isForwarded: true,
      forwardedFromChannelId: "999999",
    });

    assert.equal(result.matched, true);

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "paid");

    assert.equal(ctx.telegramAdminClient.sent.length, 1);
    assert.match(
      ctx.telegramAdminClient.sent[0]?.text ?? "",
      /doesn't seem to match/,
    );
  });

  // #20: Privacy fallback (no channel ID)
  test("accepts proof without channel ID when content matches (privacy fallback)", async () => {
    const ctx = await setupContext("paid");

    const result = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: CAMPAIGN_TEXT,
      isForwarded: true,
      forwardedFromChannelId: undefined,
    });

    assert.equal(result.matched, true);

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "completed");
  });

  // #22: proofReceivedAt auto-set
  test("sets proofReceivedAt on successful proof verification", async () => {
    const ctx = await setupContext("paid");

    await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: CAMPAIGN_TEXT,
      isForwarded: true,
      forwardedFromChannelId: CHANNEL_ID,
    });

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.ok(
      updatedDeal?.proofReceivedAt !== null,
      "proofReceivedAt should be set",
    );
  });

  // #23: completedAt auto-set
  test("sets completedAt on successful proof verification", async () => {
    const ctx = await setupContext("paid");

    await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: CAMPAIGN_TEXT,
      isForwarded: true,
      forwardedFromChannelId: CHANNEL_ID,
    });

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.ok(updatedDeal?.completedAt !== null, "completedAt should be set");
  });

  // #24: Creator notified on success
  test("notifies creator when proof is accepted", async () => {
    const ctx = await setupContext("paid");

    await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: CAMPAIGN_TEXT,
      isForwarded: true,
      forwardedFromChannelId: CHANNEL_ID,
    });

    assert.equal(ctx.creatorNotificationPort.notifications.length, 1);
    assert.equal(
      ctx.creatorNotificationPort.notifications[0]?.eventType,
      "publication_confirmed",
    );
  });

  // #25: No notification on rejection
  test("does not notify creator when proof is rejected for content mismatch", async () => {
    const ctx = await setupContext("paid");

    await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: "new offer lol",
      isForwarded: true,
      forwardedFromChannelId: CHANNEL_ID,
    });

    assert.equal(ctx.creatorNotificationPort.notifications.length, 0);
  });

  // #27: Retry after rejection
  test("allows retry after initial content mismatch rejection", async () => {
    const ctx = await setupContext("paid");

    // First attempt: wrong text -> rejected
    const firstResult = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: "wrong text entirely",
      isForwarded: true,
      forwardedFromChannelId: CHANNEL_ID,
    });

    assert.equal(firstResult.matched, true);
    let updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "paid");

    // Second attempt: correct text -> completed
    const secondResult = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: CAMPAIGN_TEXT,
      isForwarded: true,
      forwardedFromChannelId: CHANNEL_ID,
    });

    assert.equal(secondResult.matched, true);
    updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "completed");
  });

  // #29: Campaign not found
  test("accepts proof permissively when campaign is not found", async () => {
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
    const logger = new FakeConversationLogger();

    // Create campaign, channel, deal — then remove campaign from repo
    const campaign = await createCampaign(campaignRepository);
    const channel = await createChannel(channelRepository);
    const deal = await createDeal(dealRepository, campaign, channel, "paid");

    await dealExternalThreadRepository.create({
      dealId: deal.id,
      platform: "telegram",
      chatId: "chat-campaign-missing",
      contactValue: "@proofattempt",
    });

    // Delete the campaign so findById returns null
    // InMemoryCampaignRepository does not have a delete method,
    // so we create a fresh repo without the campaign but keep the deal referencing it
    const emptyCampaignRepository = new InMemoryCampaignRepository();

    const creatorNotificationService = new CreatorNotificationService(
      dealRepository,
      dealMessageRepository,
      creatorNotificationPort,
    );

    const service = new DealNegotiationService(
      emptyCampaignRepository,
      channelRepository,
      dealRepository,
      dealMessageRepository,
      dealApprovalRequestRepository,
      dealExternalThreadRepository,
      new FakeNegotiationLlmService() as never,
      telegramAdminClient as never,
      creatorNotificationService,
      logger as never,
    );

    const result = await service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-campaign-missing",
      text: "anything here",
      isForwarded: true,
    });

    assert.equal(result.matched, true);

    const updatedDeal = await dealRepository.getDealById(deal.id);
    assert.equal(updatedDeal?.status, "completed");

    // Warning logged about missing campaign
    const warningLog = logger.logs.find((log) =>
      log.text.includes("not found"),
    );
    assert.ok(warningLog, "Expected a warning log about missing campaign");
  });

  // Additional: non-forwarded message on proof_pending deal also asks for forward
  test("asks for forwarded post when non-forwarded message received on proof_pending deal", async () => {
    const ctx = await setupContext("proof_pending");

    const result = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: "Done, check it out",
      isForwarded: false,
    });

    assert.equal(result.matched, true);

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "proof_pending");

    assert.equal(ctx.telegramAdminClient.sent.length, 1);
    assert.match(
      ctx.telegramAdminClient.sent[0]?.text ?? "",
      /forward|forwarded/i,
    );
  });

  // Additional: isForwarded undefined treated as non-forwarded
  test("treats undefined isForwarded as non-forwarded on paid deal", async () => {
    const ctx = await setupContext("paid");

    const result = await ctx.service.handleIncomingAdminMessage({
      platform: "telegram",
      chatId: "chat-proof",
      text: "I posted it",
    });

    assert.equal(result.matched, true);

    const updatedDeal = await ctx.dealRepository.getDealById(ctx.deal.id);
    assert.equal(updatedDeal?.status, "paid");

    assert.equal(ctx.telegramAdminClient.sent.length, 1);
    assert.match(ctx.telegramAdminClient.sent[0]?.text ?? "", /forward/i);
  });
});
