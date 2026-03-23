import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealRepository,
} from "@repo/db";
import { CampaignWorkspaceBootstrapService } from "./campaign-workspace-bootstrap-service.js";
import type { ChannelLookupService } from "./channel-lookup-service.js";
import type {
  ChannelParserService,
  ParsedChannelResult,
} from "./channel-parser-service.js";

class FakeChannelLookupService {
  public constructor(
    private readonly channels: Record<
      string,
      {
        id: string;
        title: string;
        username: string;
        description: string | null;
        subscriberCount: number | null;
      }
    >,
  ) {}

  public async resolveByUsername(username: string) {
    return this.channels[username.replace(/^@/, "")] ?? null;
  }
}

class FakeChannelParserService {
  public async parse(reference: string): Promise<ParsedChannelResult> {
    return {
      channel: {
        id: "channel-bootstrap",
        username: reference,
        title: "Bootstrap Channel",
        description: "Ads: @sales",
      },
      parsed: {
        description: "Ads: @sales",
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

test("CampaignWorkspaceBootstrapService creates persisted deal-backed rows", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Bootstrap me",
    budgetAmount: "20",
    budgetCurrency: "TON",
  });

  const service = new CampaignWorkspaceBootstrapService(
    campaignRepository,
    channelRepository,
    dealRepository,
    new FakeChannelLookupService({
      bootstrap_channel: {
        id: "channel-bootstrap",
        title: "Bootstrap Channel",
        username: "@bootstrap_channel",
        description: "Ads: @sales",
        subscriberCount: 15000,
      },
    }) as unknown as ChannelLookupService,
    new FakeChannelParserService() as unknown as ChannelParserService,
  );

  const result = await service.bootstrap(campaign.id, [
    {
      username: "@bootstrap_channel",
      title: "Bootstrap Channel",
      source: "wizard_shortlist",
    },
  ]);

  assert.equal(result.success, true);
  assert.equal(result.result?.items[0]?.outcome, "created");
  assert.equal(
    (await dealRepository.getDealsByCampaignId(campaign.id)).length,
    1,
  );

  const updatedCampaign = await campaignRepository.findById(campaign.id);
  assert.equal(updatedCampaign?.status, "channel_resolved");
});

test("CampaignWorkspaceBootstrapService is idempotent for duplicate channels", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Duplicate bootstrap",
    budgetAmount: "20",
    budgetCurrency: "TON",
  });

  const service = new CampaignWorkspaceBootstrapService(
    campaignRepository,
    channelRepository,
    dealRepository,
    new FakeChannelLookupService({
      repeat_channel: {
        id: "channel-repeat",
        title: "Repeat Channel",
        username: "@repeat_channel",
        description: null,
        subscriberCount: null,
      },
    }) as unknown as ChannelLookupService,
    new FakeChannelParserService() as unknown as ChannelParserService,
  );

  await service.bootstrap(campaign.id, [
    {
      username: "@repeat_channel",
      source: "wizard_shortlist",
    },
  ]);

  const second = await service.bootstrap(campaign.id, [
    {
      username: "@repeat_channel",
      source: "wizard_shortlist",
    },
  ]);

  assert.equal(second.success, true);
  assert.equal(second.result?.items[0]?.outcome, "already_exists");
  assert.equal(
    (await dealRepository.getDealsByCampaignId(campaign.id)).length,
    1,
  );
});

test("CampaignWorkspaceBootstrapService reports unresolved usernames", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const service = new CampaignWorkspaceBootstrapService(
    campaignRepository,
    new InMemoryChannelRepository(),
    new InMemoryDealRepository(),
    new FakeChannelLookupService({}) as unknown as ChannelLookupService,
    new FakeChannelParserService() as unknown as ChannelParserService,
  );

  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Unknown channel",
    budgetAmount: "20",
    budgetCurrency: "TON",
  });

  const result = await service.bootstrap(campaign.id, [
    {
      username: "@missing_channel",
      source: "wizard_shortlist",
    },
  ]);

  assert.equal(result.success, true);
  assert.equal(result.result?.items[0]?.outcome, "unresolved");
});
