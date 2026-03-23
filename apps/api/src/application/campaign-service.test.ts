import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryCampaignRepository } from "@repo/db";
import type { Campaign, CampaignStatus } from "@repo/types";
import { allowedCampaignTransitions } from "@repo/types";
import { CampaignService } from "./campaign-service.js";

// ── Fixture factories ─────────────────────────────────────────────────────────

const createTestCampaign = async (
  campaignRepository: InMemoryCampaignRepository,
): Promise<Campaign> =>
  campaignRepository.create({
    userId: "user-1",
    text: "Test campaign",
    budgetAmount: "10",
    budgetCurrency: "TON",
    goal: "TRAFFIC",
    language: "RU",
  });

// ── CampaignService.createCampaign ───────────────────────────────────────────

test("createCampaign returns campaign with draft status", async () => {
  const repo = new InMemoryCampaignRepository();
  const service = new CampaignService(repo);

  const campaign = await service.createCampaign({
    userId: "user-1",
    text: "Test",
    budgetAmount: "5",
    budgetCurrency: "TON",
  });

  assert.equal(campaign.status, "draft");
});

// ── CampaignService.updateStatus — valid transitions ─────────────────────────

const validTransitions: Array<[CampaignStatus, CampaignStatus]> = [
  ["draft", "channel_pending"],
  ["channel_pending", "channel_resolved"],
  ["channel_resolved", "active"],
  ["active", "done"],
  ["active", "cancelled"],
  ["active", "failed"],
];

for (const [from, to] of validTransitions) {
  test(`valid transition: ${from} -> ${to}`, async () => {
    const repo = new InMemoryCampaignRepository();
    const service = new CampaignService(repo);
    const campaign = await createTestCampaign(repo);

    // Walk the campaign to the "from" state
    const path = findPath("draft", from);

    for (const status of path) {
      await repo.updateStatus(campaign.id, status);
    }

    const result = await service.updateStatus(campaign.id, to);

    assert.equal(result.success, true);
    assert.equal(result.campaign?.status, to);
  });
}

// ── CampaignService.updateStatus — invalid transitions ───────────────────────

const invalidTransitions: Array<[CampaignStatus, CampaignStatus]> = [
  ["draft", "active"],
  ["done", "draft"],
  ["cancelled", "active"],
  ["failed", "draft"],
];

for (const [from, to] of invalidTransitions) {
  test(`invalid transition: ${from} -> ${to}`, async () => {
    const repo = new InMemoryCampaignRepository();
    const service = new CampaignService(repo);
    const campaign = await createTestCampaign(repo);

    const path = findPath("draft", from);

    for (const status of path) {
      await repo.updateStatus(campaign.id, status);
    }

    const result = await service.updateStatus(campaign.id, to);

    assert.equal(result.success, false);
    assert.equal(result.statusCode, 400);
    assert.ok(result.message?.includes("Cannot transition"));
  });
}

// ── CampaignService.updateStatus — campaign not found ────────────────────────

test("updateStatus returns 404 for non-existent campaign", async () => {
  const repo = new InMemoryCampaignRepository();
  const service = new CampaignService(repo);

  const result = await service.updateStatus("non-existent-id", "active");

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 404);
  assert.equal(result.message, "Campaign not found");
});

// ── CampaignRepository.updateStatus ──────────────────────────────────────────

test("InMemoryCampaignRepository.updateStatus changes status", async () => {
  const repo = new InMemoryCampaignRepository();
  const campaign = await createTestCampaign(repo);

  const updated = await repo.updateStatus(campaign.id, "channel_pending");

  assert.notEqual(updated, null);
  assert.equal(updated?.status, "channel_pending");
});

test("InMemoryCampaignRepository.updateStatus returns null for missing campaign", async () => {
  const repo = new InMemoryCampaignRepository();

  const result = await repo.updateStatus("bad-id", "active");

  assert.equal(result, null);
});

// ── Helper: find a path through the FSM ──────────────────────────────────────

function findPath(from: CampaignStatus, to: CampaignStatus): CampaignStatus[] {
  if (from === to) return [];

  const queue: Array<{ status: CampaignStatus; path: CampaignStatus[] }> = [
    { status: from, path: [] },
  ];
  const visited = new Set<CampaignStatus>([from]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const transitions = allowedCampaignTransitions[current.status];

    for (const next of transitions) {
      if (next === to) return [...current.path, next];

      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ status: next, path: [...current.path, next] });
      }
    }
  }

  return [to];
}
