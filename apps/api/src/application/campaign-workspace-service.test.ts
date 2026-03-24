import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealApprovalRequestRepository,
  InMemoryDealMessageRepository,
  InMemoryDealRepository,
} from "@repo/db";
import { ChannelAdminService } from "./channel-admin-service.js";
import { CampaignWorkspaceService } from "./campaign-workspace-service.js";
import type {
  ChannelParserService,
  ParsedChannelResult,
} from "./channel-parser-service.js";

class FakeChannelParserService {
  public async parse(reference: string): Promise<ParsedChannelResult> {
    return {
      channel: {
        id: "channel-workspace",
        username: reference,
        title: "Workspace Channel",
        description: "Ads via @sales",
      },
      parsed: {
        description: "Ads via @sales",
        usernames: ["@sales"],
        links: [],
        adsContact: true,
      },
      contacts: [
        {
          type: "username",
          value: "@sales",
          source: "extracted_username",
          isAdsContact: true,
        },
      ],
      selectedContact: "@sales",
    };
  }
}

test("CampaignWorkspaceService aggregates latest message and pending approval", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const parser = new FakeChannelParserService();

  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Workspace test",
    budgetAmount: "25",
    budgetCurrency: "TON",
  });

  await channelRepository.saveParsedChannel({
    id: "channel-workspace",
    username: "@workspace_channel",
    title: "Workspace Channel",
    description: "Ads via @sales",
    category: "telegram",
    price: 18,
    avgViews: 12000,
    contacts: [],
  });
  await channelRepository.saveAdminParsingResult({
    channelId: "channel-workspace",
    adminParseStatus: "admins_found",
    readinessStatus: "ready",
    adminCount: 1,
    lastParsedAt: new Date().toISOString(),
    adminContacts: [
      {
        telegramHandle: "@sales",
        telegramUserId: null,
        source: "channel_description",
        confidenceScore: 0.92,
        status: "found",
      },
    ],
  });

  const deal = await dealRepository.createDeal({
    campaignId: campaign.id,
    channelId: "channel-workspace",
    price: 18,
    status: "awaiting_user_approval",
  });

  await dealMessageRepository.create({
    dealId: deal.id,
    direction: "inbound",
    senderType: "admin",
    audience: "admin",
    transport: "telegram_mtproto",
    text: "We can publish tomorrow for 18 TON.",
    contactValue: "@sales",
  });

  const approvalRequest = await dealApprovalRequestRepository.create({
    dealId: deal.id,
    proposedPriceTon: 18,
    proposedDateText: "tomorrow",
    summary: "Admin proposed 18 TON for tomorrow.",
    status: "pending",
  });

  const service = new CampaignWorkspaceService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    new ChannelAdminService(
      channelRepository,
      parser as unknown as ChannelParserService,
    ),
  );

  const result = await service.getByCampaignId(campaign.id);

  assert.notEqual(result, null);
  assert.equal(result?.campaignId, campaign.id);
  assert.equal(result?.counts.total, 1);
  assert.equal(result?.counts.negotiations, 1);
  assert.equal(result?.chatCards[0]?.channel.title, "Workspace Channel");
  assert.equal(
    result?.chatCards[0]?.latestMessage?.text,
    "We can publish tomorrow for 18 TON.",
  );
  assert.equal(result?.chatCards[0]?.pendingApproval?.id, approvalRequest.id);
  assert.equal(result?.chatCards[0]?.priceTon, 18);
  assert.equal(result?.chatCards[0]?.adminParseStatus, "admins_found");
  assert.equal(result?.chatCards[0]?.readinessStatus, "ready");
  assert.equal(
    result?.chatCards[0]?.adminContacts[0]?.telegramHandle,
    "@sales",
  );
});

test("CampaignWorkspaceService returns an empty workspace for campaigns without deals", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const service = new CampaignWorkspaceService(
    campaignRepository,
    new InMemoryChannelRepository(),
    new InMemoryDealRepository(),
    new InMemoryDealMessageRepository(),
    new InMemoryDealApprovalRequestRepository(),
    new ChannelAdminService(
      new InMemoryChannelRepository(),
      new FakeChannelParserService() as unknown as ChannelParserService,
    ),
  );

  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "No deals yet",
    budgetAmount: "10",
    budgetCurrency: "TON",
  });

  const result = await service.getByCampaignId(campaign.id);

  assert.notEqual(result, null);
  assert.equal(result?.chatCards.length, 0);
  assert.equal(result?.counts.total, 0);
  assert.equal(result?.analyticsState, "soon");
});

test("CampaignWorkspaceService retries admin parsing for an existing campaign channel", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();
  const parser = new FakeChannelParserService();
  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Retry workspace",
    budgetAmount: "25",
    budgetCurrency: "TON",
  });

  await channelRepository.saveParsedChannel({
    id: "channel-workspace",
    username: "@workspace_channel",
    title: "Workspace Channel",
    description: "Ads via @sales",
    category: "telegram",
    price: 18,
    avgViews: 12000,
    contacts: [],
  });
  await dealRepository.createDeal({
    campaignId: campaign.id,
    channelId: "channel-workspace",
    price: 18,
    status: "negotiating",
  });

  const service = new CampaignWorkspaceService(
    campaignRepository,
    channelRepository,
    dealRepository,
    dealMessageRepository,
    dealApprovalRequestRepository,
    new ChannelAdminService(
      channelRepository,
      parser as unknown as ChannelParserService,
    ),
  );

  const card = await service.retryAdminParse(campaign.id, "channel-workspace");

  assert.notEqual(card, null);
  assert.equal(card?.adminParseStatus, "admins_found");
  assert.equal(card?.readinessStatus, "ready");
  assert.equal(card?.adminContacts[0]?.telegramHandle, "@sales");
});
