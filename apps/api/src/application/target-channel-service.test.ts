import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealRepository,
} from "@repo/db";
import type { Campaign, Channel } from "@repo/types";
import { TargetChannelService } from "./target-channel-service.js";
import type { ChannelParserService, ParsedChannelResult } from "./channel-parser-service.js";

// ── Fake ChannelParserService ────────────────────────────────────────────────

class FakeChannelParserService {
  public shouldThrow = false;

  public async parse(_reference: string): Promise<ParsedChannelResult> {
    if (this.shouldThrow) {
      throw new Error("MTProto resolution failed");
    }

    return {
      channel: {
        id: "channel-1",
        username: "@testchannel",
        title: "Test Channel",
        description: "A test channel. Ads: @admin",
      },
      parsed: {
        description: "A test channel. Ads: @admin",
        usernames: ["@admin"],
        links: [],
        adsContact: true,
      },
      contacts: [
        {
          type: "username",
          value: "@admin",
          source: "extracted_username",
          isAdsContact: true,
        },
      ],
      selectedContact: "@admin",
    };
  }
}

// ── Fixture factories ─────────────────────────────────────────────────────────

const createTestCampaign = async (
  repo: InMemoryCampaignRepository,
  status: Campaign["status"] = "draft",
): Promise<Campaign> => {
  const campaign = await repo.create({
    userId: "user-1",
    text: "Test campaign",
    budgetAmount: "10",
    budgetCurrency: "TON",
    goal: "TRAFFIC",
    language: "RU",
  });

  if (status !== "draft") {
    await repo.updateStatus(campaign.id, status);
    campaign.status = status;
  }

  return campaign;
};

const setup = () => {
  const campaignRepo = new InMemoryCampaignRepository();
  const channelRepo = new InMemoryChannelRepository();
  const dealRepo = new InMemoryDealRepository();
  const parser = new FakeChannelParserService();
  const service = new TargetChannelService(
    campaignRepo,
    channelRepo,
    dealRepo,
    parser as unknown as ChannelParserService,
  );

  return { campaignRepo, channelRepo, dealRepo, parser, service };
};

// ── Happy path: creates deal on first submission ─────────────────────────────

test("submit creates deal on first submission", async () => {
  const { campaignRepo, service } = setup();
  const campaign = await createTestCampaign(campaignRepo);

  const result = await service.submit(campaign.id, "@testchannel");

  assert.equal(result.success, true);
  assert.ok(result.result);
  assert.equal(result.result.deal.campaignId, campaign.id);
  assert.equal(result.result.deal.status, "negotiating");

  const updated = await campaignRepo.findById(campaign.id);
  assert.equal(updated?.status, "channel_resolved");
});

// ── Idempotent: returns existing deal on duplicate ───────────────────────────

test("submit returns existing deal on duplicate submission", async () => {
  const { campaignRepo, service } = setup();
  const campaign = await createTestCampaign(campaignRepo);

  const first = await service.submit(campaign.id, "@testchannel");
  assert.equal(first.success, true);

  // Reset campaign to draft for second submission
  await campaignRepo.updateStatus(campaign.id, "draft");

  const second = await service.submit(campaign.id, "@testchannel");
  assert.equal(second.success, true);
  assert.equal(second.result?.deal.id, first.result?.deal.id);
});

// ── Campaign not found ───────────────────────────────────────────────────────

test("submit returns 404 for non-existent campaign", async () => {
  const { service } = setup();

  const result = await service.submit("non-existent", "@testchannel");

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 404);
  assert.equal(result.message, "Campaign not found");
});

// ── Wrong campaign status ────────────────────────────────────────────────────

test("submit rejects campaign in active status", async () => {
  const { campaignRepo, service } = setup();
  const campaign = await createTestCampaign(campaignRepo);

  // Walk to active: draft -> channel_pending -> channel_resolved -> active
  await campaignRepo.updateStatus(campaign.id, "channel_pending");
  await campaignRepo.updateStatus(campaign.id, "channel_resolved");
  await campaignRepo.updateStatus(campaign.id, "active");

  const result = await service.submit(campaign.id, "@testchannel");

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 400);
  assert.equal(
    result.message,
    "Campaign must be in draft or channel_pending status",
  );
});

test("submit rejects campaign in done status", async () => {
  const { campaignRepo, service } = setup();
  const campaign = await createTestCampaign(campaignRepo);

  await campaignRepo.updateStatus(campaign.id, "channel_pending");
  await campaignRepo.updateStatus(campaign.id, "channel_resolved");
  await campaignRepo.updateStatus(campaign.id, "active");
  await campaignRepo.updateStatus(campaign.id, "done");

  const result = await service.submit(campaign.id, "@testchannel");

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 400);
});

// ── Retry from channel_pending ───────────────────────────────────────────────

test("submit succeeds from channel_pending status (retry)", async () => {
  const { campaignRepo, service } = setup();
  const campaign = await createTestCampaign(campaignRepo, "channel_pending");

  const result = await service.submit(campaign.id, "@testchannel");

  assert.equal(result.success, true);

  const updated = await campaignRepo.findById(campaign.id);
  assert.equal(updated?.status, "channel_resolved");
});

// ── MTProto failure leaves channel_pending ───────────────────────────────────

test("submit leaves campaign in channel_pending when parser throws", async () => {
  const { campaignRepo, parser, service } = setup();
  const campaign = await createTestCampaign(campaignRepo);
  parser.shouldThrow = true;

  await assert.rejects(
    () => service.submit(campaign.id, "@testchannel"),
    { message: "MTProto resolution failed" },
  );

  const updated = await campaignRepo.findById(campaign.id);
  assert.equal(updated?.status, "channel_pending");
});

// ── DealRepository.findByCampaignAndChannel ──────────────────────────────────

test("InMemoryDealRepository.findByCampaignAndChannel returns deal when exists", async () => {
  const repo = new InMemoryDealRepository();
  const deal = await repo.createDeal({
    campaignId: "c1",
    channelId: "ch1",
    price: 10,
    status: "negotiating",
  });

  const found = await repo.findByCampaignAndChannel("c1", "ch1");

  assert.notEqual(found, null);
  assert.equal(found?.id, deal.id);
});

test("InMemoryDealRepository.findByCampaignAndChannel returns null when no match", async () => {
  const repo = new InMemoryDealRepository();

  const found = await repo.findByCampaignAndChannel("c1", "ch1");

  assert.equal(found, null);
});
