import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealApprovalRequestRepository,
  InMemoryDealMessageRepository,
  InMemoryDealRepository,
} from "@repo/db";
import { CampaignWorkspaceService } from "./campaign-workspace-service.js";

test("CampaignWorkspaceService aggregates latest message and pending approval", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const dealMessageRepository = new InMemoryDealMessageRepository();
  const dealApprovalRequestRepository =
    new InMemoryDealApprovalRequestRepository();

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
});

test("CampaignWorkspaceService returns an empty workspace for campaigns without deals", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const service = new CampaignWorkspaceService(
    campaignRepository,
    new InMemoryChannelRepository(),
    new InMemoryDealRepository(),
    new InMemoryDealMessageRepository(),
    new InMemoryDealApprovalRequestRepository(),
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
