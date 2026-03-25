import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryConversationMessageRepository,
  InMemoryConversationThreadRepository,
  InMemoryDealExternalThreadRepository,
  InMemoryDealMessageRepository,
  InMemoryDealRepository,
} from "@repo/db";
import { CampaignNegotiationService } from "./campaign-negotiation-service.js";
import type { AdminOutreachTransport } from "./admin-outreach-transport.js";
import { ConversationThreadService } from "./conversation-thread-service.js";

class FakeOutreachTransport implements AdminOutreachTransport {
  public readonly sent: Array<{ adminHandle: string; text: string }> = [];

  public constructor(
    private readonly shouldFailFor: Set<string> = new Set<string>(),
  ) {}

  public async sendIntroMessage(input: {
    adminHandle: string;
    text: string;
    threadId: string;
  }): Promise<{ telegramMessageId: string; telegramChatId: string }> {
    if (this.shouldFailFor.has(input.adminHandle)) {
      throw new Error(`Failed to reach ${input.adminHandle}`);
    }

    this.sent.push({
      adminHandle: input.adminHandle,
      text: input.text,
    });

    return {
      telegramMessageId: `msg-${input.threadId}`,
      telegramChatId: `chat-${input.adminHandle.replace(/^@/, "")}`,
    };
  }
}

const createReadyChannel = async (
  channelRepository: InMemoryChannelRepository,
  input: {
    id: string;
    username: string;
    title: string;
    adminHandles: string[];
  },
) => {
  await channelRepository.saveParsedChannel({
    id: input.id,
    username: input.username,
    title: input.title,
    description: "Ads via contacts",
    category: "telegram",
    price: 12,
    avgViews: 1200,
    contacts: [],
  });

  const channel = await channelRepository.saveAdminParsingResult({
    channelId: input.id,
    adminParseStatus: "admins_found",
    readinessStatus: "ready",
    adminCount: input.adminHandles.length,
    lastParsedAt: new Date().toISOString(),
    adminContacts: input.adminHandles.map((telegramHandle) => ({
      telegramHandle,
      telegramUserId: null,
      source: "channel_description" as const,
      confidenceScore: 0.92,
      status: "found" as const,
    })),
  });

  assert.notEqual(channel, undefined);

  return channel!;
};

test("CampaignNegotiationService creates one thread per ready admin contact and queues intro outreach", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const conversationThreadRepository =
    new InMemoryConversationThreadRepository();
  const conversationMessageRepository =
    new InMemoryConversationMessageRepository();

  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Need TON placement",
    budgetAmount: "20",
    budgetCurrency: "TON",
  });
  const channel = await createReadyChannel(channelRepository, {
    id: "channel-ready",
    username: "@ready_channel",
    title: "Ready Channel",
    adminHandles: ["@salesdesk", "@adops"],
  });

  await dealRepository.createDeal({
    campaignId: campaign.id,
    channelId: channel.id,
    price: 20,
    status: "negotiating",
  });

  const transport = new FakeOutreachTransport();
  const service = new CampaignNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealExternalThreadRepository,
    conversationThreadRepository,
    conversationMessageRepository,
    transport,
  );

  const result = await service.startCampaignNegotiation(campaign.id);
  const threads = await conversationThreadRepository.getByCampaignId(
    campaign.id,
  );

  assert.equal(result.success, true);
  assert.equal(result.result?.readyChannelCount, 1);
  assert.equal(result.result?.createdThreadCount, 2);
  assert.equal(result.result?.existingThreadCount, 0);
  assert.equal(result.result?.failedThreadCount, 0);
  assert.equal(threads.length, 2);
  assert.deepEqual(
    threads.map((thread) => thread.status),
    ["awaiting_reply", "awaiting_reply"],
  );
  assert.equal(transport.sent.length, 2);

  for (const thread of threads) {
    const messages = await conversationMessageRepository.listByThreadId(
      thread.id,
    );
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.messageType, "intro");
    assert.equal(messages[0]?.direction, "outbound");
    assert.ok(messages[0]?.telegramMessageId?.startsWith("msg-"));
    assert.equal(thread.lastDirection, "outbound");
    assert.equal(thread.outreachAttemptCount, 1);
  }

  const updatedCampaign = await campaignRepository.findById(campaign.id);
  assert.equal(updatedCampaign?.negotiationStatus, "active");
  assert.notEqual(updatedCampaign?.negotiationStartedAt, null);
});

test("CampaignNegotiationService is idempotent for duplicate starts", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const conversationThreadRepository =
    new InMemoryConversationThreadRepository();
  const conversationMessageRepository =
    new InMemoryConversationMessageRepository();

  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Duplicate launch",
    budgetAmount: "20",
    budgetCurrency: "TON",
  });
  const channel = await createReadyChannel(channelRepository, {
    id: "channel-repeat",
    username: "@repeat_channel",
    title: "Repeat Channel",
    adminHandles: ["@salesdesk"],
  });

  await dealRepository.createDeal({
    campaignId: campaign.id,
    channelId: channel.id,
    price: 20,
    status: "negotiating",
  });

  const service = new CampaignNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealExternalThreadRepository,
    conversationThreadRepository,
    conversationMessageRepository,
    new FakeOutreachTransport(),
  );

  await service.startCampaignNegotiation(campaign.id);
  const second = await service.startCampaignNegotiation(campaign.id);

  assert.equal(second.success, true);
  assert.equal(second.result?.createdThreadCount, 0);
  assert.equal(second.result?.existingThreadCount, 1);
  assert.equal(
    (await conversationThreadRepository.getByCampaignId(campaign.id)).length,
    1,
  );
});

test("CampaignNegotiationService records failed sends without blocking thread creation", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealExternalThreadRepository =
    new InMemoryDealExternalThreadRepository();
  const conversationThreadRepository =
    new InMemoryConversationThreadRepository();
  const conversationMessageRepository =
    new InMemoryConversationMessageRepository();

  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Failure path",
    budgetAmount: "20",
    budgetCurrency: "TON",
  });
  const channel = await createReadyChannel(channelRepository, {
    id: "channel-failure",
    username: "@failure_channel",
    title: "Failure Channel",
    adminHandles: ["@broken_handle"],
  });

  await dealRepository.createDeal({
    campaignId: campaign.id,
    channelId: channel.id,
    price: 20,
    status: "negotiating",
  });

  const service = new CampaignNegotiationService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealExternalThreadRepository,
    conversationThreadRepository,
    conversationMessageRepository,
    new FakeOutreachTransport(new Set(["@broken_handle"])),
  );

  const result = await service.startCampaignNegotiation(campaign.id);
  const [thread] = await conversationThreadRepository.getByCampaignId(
    campaign.id,
  );
  const messages = await conversationMessageRepository.listByThreadId(
    thread!.id,
  );

  assert.equal(result.success, true);
  assert.equal(result.result?.createdThreadCount, 1);
  assert.equal(result.result?.failedThreadCount, 1);
  assert.equal(thread?.status, "failed");
  assert.equal(messages.length, 2);
  assert.equal(messages[0]?.messageType, "intro");
  assert.equal(messages[1]?.messageType, "error");
  assert.match(messages[1]?.text ?? "", /Failed to reach @broken_handle/);
});

test("ConversationThreadService lists threads and records inbound replies", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const conversationThreadRepository =
    new InMemoryConversationThreadRepository();
  const conversationMessageRepository =
    new InMemoryConversationMessageRepository();

  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Reply flow",
    budgetAmount: "20",
    budgetCurrency: "TON",
  });
  const channel = await createReadyChannel(channelRepository, {
    id: "channel-reply",
    username: "@reply_channel",
    title: "Reply Channel",
    adminHandles: ["@reply_admin"],
  });
  const adminContact = channel.adminContacts[0];

  assert.ok(adminContact);

  const thread = await conversationThreadRepository.create({
    campaignId: campaign.id,
    channelId: channel.id,
    adminContactId: adminContact!.id,
    status: "awaiting_reply",
    startedAt: new Date().toISOString(),
    lastMessagePreview: "Intro sent",
    lastMessageAt: new Date().toISOString(),
    lastDirection: "outbound",
    outreachAttemptCount: 1,
    telegramChatId: "chat-reply-admin",
  });

  await conversationMessageRepository.create({
    threadId: thread.id,
    direction: "outbound",
    messageType: "intro",
    text: "Intro sent",
    telegramMessageId: "msg-intro",
  });

  const service = new ConversationThreadService(
    campaignRepository,
    channelRepository,
    conversationThreadRepository,
    conversationMessageRepository,
  );

  const list = await service.listByCampaignId(campaign.id);

  assert.notEqual(list, null);
  assert.equal(list?.threads.length, 1);
  assert.equal(list?.threads[0]?.admin.telegramHandle, "@reply_admin");
  assert.equal(list?.threads[0]?.channel.title, "Reply Channel");

  const incoming = await service.handleIncomingTelegramMessage({
    chatId: "chat-reply-admin",
    telegramMessageId: "msg-reply-1",
    text: "We can offer next week for 18 TON.",
  });

  assert.equal(incoming.matched, true);
  assert.equal(incoming.status, "replied");

  const detail = await service.getThreadById(thread.id);

  assert.notEqual(detail, null);
  assert.equal(detail?.messages.length, 2);
  assert.equal(detail?.messages[1]?.direction, "inbound");
  assert.equal(detail?.messages[1]?.messageType, "reply");

  const updatedThread = await conversationThreadRepository.getById(thread.id);

  assert.equal(updatedThread?.status, "replied");
  assert.equal(
    updatedThread?.lastMessagePreview,
    "We can offer next week for 18 TON.",
  );
});
