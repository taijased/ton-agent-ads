import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealRepository,
} from "@repo/db";
import { ChannelAdminService } from "./channel-admin-service.js";
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
  public shouldThrow = false;
  public description = "Ads: @sales";
  public contacts: ParsedChannelResult["contacts"] = [
    {
      type: "username",
      value: "@sales",
      source: "extracted_username",
      isAdsContact: true,
    },
  ];

  public async parse(reference: string): Promise<ParsedChannelResult> {
    if (this.shouldThrow) {
      throw new Error("Parser failed");
    }

    return {
      channel: {
        id: "channel-bootstrap",
        username: reference,
        title: "Bootstrap Channel",
        description: this.description,
      },
      parsed: {
        description: this.description,
        usernames: this.contacts
          .filter((contact) => contact.type === "username")
          .map((contact) => contact.value),
        links: [],
        adsContact: this.contacts.some((contact) => contact.isAdsContact),
      },
      contacts: this.contacts,
      selectedContact:
        this.contacts.find((contact) => contact.type === "username")?.value ??
        null,
    };
  }
}

class FakeAdminContactSelectionService {
  public constructor(private readonly selectedContact: string | null) {}

  public async selectAdminContact(): Promise<{
    selectedContact: string | null;
    reason: string;
  }> {
    return {
      selectedContact: this.selectedContact,
      reason:
        this.selectedContact === null
          ? "no confident contact"
          : "selected by test double",
    };
  }
}

test("CampaignWorkspaceBootstrapService creates persisted deal-backed rows", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const parser = new FakeChannelParserService();
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
    parser as unknown as ChannelParserService,
    new ChannelAdminService(
      channelRepository,
      parser as unknown as ChannelParserService,
    ),
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
  const channel = await channelRepository.getChannelById("channel-bootstrap");
  assert.equal(channel?.adminParseStatus, "admins_found");
  assert.equal(channel?.readinessStatus, "ready");
  assert.equal(channel?.adminCount, 1);
  assert.equal(channel?.adminContacts[0]?.telegramHandle, "@sales");

  const updatedCampaign = await campaignRepository.findById(campaign.id);
  assert.equal(updatedCampaign?.status, "channel_resolved");
});

test("CampaignWorkspaceBootstrapService is idempotent for duplicate channels", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const parser = new FakeChannelParserService();
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
    parser as unknown as ChannelParserService,
    new ChannelAdminService(
      channelRepository,
      parser as unknown as ChannelParserService,
    ),
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
    new ChannelAdminService(
      new InMemoryChannelRepository(),
      new FakeChannelParserService() as unknown as ChannelParserService,
    ),
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

test("CampaignWorkspaceBootstrapService stores not-ready metadata when admins are not found", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const parser = new FakeChannelParserService();
  parser.contacts = [];
  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "No admins",
    budgetAmount: "20",
    budgetCurrency: "TON",
  });

  const service = new CampaignWorkspaceBootstrapService(
    campaignRepository,
    channelRepository,
    dealRepository,
    new FakeChannelLookupService({
      no_admins_channel: {
        id: "channel-no-admins",
        title: "No Admins Channel",
        username: "@no_admins_channel",
        description: "Welcome to the channel",
        subscriberCount: 1200,
      },
    }) as unknown as ChannelLookupService,
    parser as unknown as ChannelParserService,
    new ChannelAdminService(
      channelRepository,
      parser as unknown as ChannelParserService,
    ),
  );

  const result = await service.bootstrap(campaign.id, [
    {
      username: "@no_admins_channel",
      source: "wizard_shortlist",
    },
  ]);

  assert.equal(result.success, true);
  const channel = await channelRepository.getChannelById("channel-no-admins");
  assert.equal(channel?.adminParseStatus, "admins_not_found");
  assert.equal(channel?.readinessStatus, "not_ready");
  assert.equal(channel?.adminCount, 0);
});

test("CampaignWorkspaceBootstrapService stores failed metadata when admin parsing fails", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const parser = new FakeChannelParserService();
  parser.shouldThrow = true;
  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Failed parse",
    budgetAmount: "20",
    budgetCurrency: "TON",
  });

  const service = new CampaignWorkspaceBootstrapService(
    campaignRepository,
    channelRepository,
    dealRepository,
    new FakeChannelLookupService({
      failed_parse_channel: {
        id: "channel-failed-parse",
        title: "Failed Parse Channel",
        username: "@failed_parse_channel",
        description: "Ads info unavailable",
        subscriberCount: 3200,
      },
    }) as unknown as ChannelLookupService,
    parser as unknown as ChannelParserService,
    new ChannelAdminService(
      channelRepository,
      parser as unknown as ChannelParserService,
    ),
  );

  const result = await service.bootstrap(campaign.id, [
    {
      username: "@failed_parse_channel",
      source: "wizard_shortlist",
    },
  ]);

  assert.equal(result.success, true);
  assert.equal(
    (await dealRepository.getDealsByCampaignId(campaign.id)).length,
    1,
  );

  const channel = await channelRepository.getChannelById(
    "channel-failed-parse",
  );
  assert.equal(channel?.adminParseStatus, "failed");
  assert.equal(channel?.readinessStatus, "not_ready");
});

test("CampaignWorkspaceBootstrapService persists the LLM-selected admin contact from description", async () => {
  const campaignRepository = new InMemoryCampaignRepository();
  const channelRepository = new InMemoryChannelRepository();
  const dealRepository = new InMemoryDealRepository();
  const parser = new FakeChannelParserService();
  parser.contacts = [
    {
      type: "username",
      value: "@ta_test_agent",
      source: "extracted_username",
      isAdsContact: false,
    },
    {
      type: "username",
      value: "@udmurt_vorgoron",
      source: "extracted_username",
      isAdsContact: true,
    },
  ];
  parser.description = "please write for ads @udmurt_vorgoron";
  const campaign = await campaignRepository.create({
    userId: "user-1",
    text: "Prefer selected admin",
    budgetAmount: "20",
    budgetCurrency: "TON",
  });

  const service = new CampaignWorkspaceBootstrapService(
    campaignRepository,
    channelRepository,
    dealRepository,
    new FakeChannelLookupService({
      ta_test_agent: {
        id: "channel-selected-admin",
        title: "TA",
        username: "@ta_test_agent",
        description: "please write for ads @udmurt_vorgoron",
        subscriberCount: 15000,
      },
    }) as unknown as ChannelLookupService,
    parser as unknown as ChannelParserService,
    new ChannelAdminService(
      channelRepository,
      parser as unknown as ChannelParserService,
      new FakeAdminContactSelectionService("@udmurt_vorgoron"),
    ),
  );

  const result = await service.bootstrap(campaign.id, [
    {
      username: "@ta_test_agent",
      title: "TA",
      source: "wizard_shortlist",
    },
  ]);

  assert.equal(result.success, true);

  const channel = await channelRepository.getChannelById(
    "channel-selected-admin",
  );

  assert.deepEqual(
    channel?.adminContacts.map((contact) => contact.telegramHandle),
    ["@udmurt_vorgoron"],
  );
  assert.equal(channel?.adminCount, 1);
  assert.equal(channel?.readinessStatus, "ready");
});
