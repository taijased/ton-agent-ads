import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryDealRepository,
  InMemoryCampaignRepository,
  InMemoryChannelRepository,
  InMemoryDealMessageRepository,
  InMemoryDealExternalThreadRepository,
} from "@repo/db";
import type { Deal, DealPaymentResponse } from "@repo/types";
import { DealService } from "./deal-service.js";

// ── Stubs ────────────────────────────────────────────────────────────────────

const stubTelegramClient = {
  sendAdminMessage: async () => ({ messageId: null }),
};

const stubNotificationService = {
  notifyOutreachStarted: async () => {},
  notifyNegotiationUpdate: async () => {},
  notifyDealStatusChanged: async () => {},
};

// ── Factory ──────────────────────────────────────────────────────────────────

function createTestContext() {
  const dealRepo = new InMemoryDealRepository();
  const service = new DealService(
    dealRepo,
    new InMemoryCampaignRepository(),
    new InMemoryChannelRepository(),
    new InMemoryDealMessageRepository(),
    new InMemoryDealExternalThreadRepository(),
    stubTelegramClient as any,
    stubNotificationService as any,
  );
  return { dealRepo, service };
}

async function seedDeal(
  dealRepo: InMemoryDealRepository,
  statusOverride?: string,
): Promise<Deal> {
  const deal = await dealRepo.createDeal({
    campaignId: "campaign-001",
    channelId: "channel-001",
    price: 5,
    status: (statusOverride ?? "terms_agreed") as any,
  });
  return deal;
}

// ── T1-T3: Repository  paymentBoc field ──────────────────────────────────────

test("T1: InMemoryDealRepository.createDeal initializes paymentBoc as null", async () => {
  const { dealRepo } = createTestContext();
  const deal = await dealRepo.createDeal({
    campaignId: "campaign-001",
    channelId: "channel-001",
    price: 10,
  });
  assert.equal(deal.paymentBoc, null);
});

test("T2: InMemoryDealRepository.updateDealStatus persists paymentBoc", async () => {
  const { dealRepo } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  await dealRepo.updateDealStatus(deal.id, {
    status: "payment_pending",
    paymentBoc: "test-boc-value",
  });

  const updated = await dealRepo.getDealById(deal.id);
  assert.equal(updated?.paymentBoc, "test-boc-value");
});

test("T3: InMemoryDealRepository.updateDealStatus without paymentBoc leaves it unchanged", async () => {
  const { dealRepo } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  // First set paymentBoc
  await dealRepo.updateDealStatus(deal.id, {
    status: "payment_pending",
    paymentBoc: "original-boc",
  });

  // Now update status without paymentBoc
  await dealRepo.updateDealStatus(deal.id, {
    status: "paid",
  });

  const updated = await dealRepo.getDealById(deal.id);
  assert.equal(updated?.paymentBoc, "original-boc");
});

// ── T4-T6: DealService.payDeal  happy path ──────────────────────────────────

test("T4: payDeal transitions deal from terms_agreed to payment_pending", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  const result: DealPaymentResponse = await service.payDeal(
    deal.id,
    "boc-data",
  );

  assert.equal(result.status, "payment_pending");
});

test("T5: payDeal stores paymentBoc on deal", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  await service.payDeal(deal.id, "boc-data");

  const updated = await dealRepo.getDealById(deal.id);
  assert.equal(updated?.paymentBoc, "boc-data");
});

test("T6: payDeal returns DealPaymentResponse with correct shape", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  const result: DealPaymentResponse = await service.payDeal(deal.id, "boc-123");

  assert.equal(result.id, deal.id);
  assert.equal(result.status, "payment_pending");
  assert.equal(result.paymentBoc, "boc-123");
  assert.equal(result.paidAt, null);
});

// ── T7: payDeal 404 for non-existent deal ────────────────────────────────────

test("T7: payDeal throws 404 for non-existent deal", async () => {
  const { service } = createTestContext();

  try {
    await service.payDeal("nonexistent-id", "boc");
    assert.fail("Expected payDeal to throw");
  } catch (error: unknown) {
    const err = error as { statusCode: number; message: string };
    assert.equal(err.statusCode, 404);
    assert.ok(err.message.includes("Deal not found"));
  }
});

// ── T8-T12: payDeal 400 for wrong statuses ───────────────────────────────────

const invalidPayStatuses = [
  { status: "negotiating", label: "T8" },
  { status: "pending", label: "T9" },
  { status: "payment_pending", label: "T10" },
  { status: "paid", label: "T11" },
  { status: "completed", label: "T12" },
] as const;

for (const { status, label } of invalidPayStatuses) {
  test(`${label}: payDeal throws 400 for deal in ${status} status`, async () => {
    const { dealRepo, service } = createTestContext();
    const deal = await seedDeal(dealRepo, status);

    try {
      await service.payDeal(deal.id, "boc-data");
      assert.fail("Expected payDeal to throw");
    } catch (error: unknown) {
      const err = error as { statusCode: number; message: string };
      assert.equal(err.statusCode, 400);
      assert.ok(err.message.includes(status));
    }
  });
}

// ── T13-T14: payDeal 400 for empty/whitespace boc ───────────────────────────

test("T13: payDeal throws 400 for empty boc string", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  try {
    await service.payDeal(deal.id, "");
    assert.fail("Expected payDeal to throw");
  } catch (error: unknown) {
    const err = error as { statusCode: number; message: string };
    assert.equal(err.statusCode, 400);
  }
});

test("T14: payDeal throws 400 for whitespace-only boc", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  try {
    await service.payDeal(deal.id, "   ");
    assert.fail("Expected payDeal to throw");
  } catch (error: unknown) {
    const err = error as { statusCode: number; message: string };
    assert.equal(err.statusCode, 400);
  }
});

// ── T15-T16: Status transition validity ──────────────────────────────────────

test("T15: terms_agreed to payment_pending is valid transition", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  const result = await service.updateDealStatus(deal.id, {
    status: "payment_pending",
  });

  assert.equal(result.success, true);
  assert.equal(result.deal?.status, "payment_pending");
});

test("T16: payment_pending to paid is valid transition", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "payment_pending");

  const result = await service.updateDealStatus(deal.id, {
    status: "paid",
  });

  assert.equal(result.success, true);
  assert.equal(result.deal?.status, "paid");
});

// ── T31-T38: DealService.confirmPayment ─────────────────────────────────────

test("T31: confirmPayment transitions payment_pending deal to paid", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  // First move to payment_pending with a BOC
  await dealRepo.updateDealStatus(deal.id, {
    status: "payment_pending",
    paymentBoc: "some-invalid-boc",
  });

  const result: DealPaymentResponse = await service.confirmPayment(deal.id);

  assert.equal(result.status, "paid");
  assert.equal(result.id, deal.id);
});

test("T32: confirmPayment with invalid BOC returns txHash as null (graceful fallback)", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  await dealRepo.updateDealStatus(deal.id, {
    status: "payment_pending",
    paymentBoc: "not-a-valid-base64-boc",
  });

  const result: DealPaymentResponse = await service.confirmPayment(deal.id);

  assert.equal(result.status, "paid");
  assert.equal(result.txHash, null);
});

test("T33: confirmPayment with null paymentBoc returns txHash as null", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  // Move to payment_pending without setting paymentBoc
  await dealRepo.updateDealStatus(deal.id, {
    status: "payment_pending",
  });

  const result: DealPaymentResponse = await service.confirmPayment(deal.id);

  assert.equal(result.status, "paid");
  assert.equal(result.txHash, null);
  assert.equal(result.paymentBoc, null);
});

test("T34: confirmPayment throws 404 for non-existent deal", async () => {
  const { service } = createTestContext();

  try {
    await service.confirmPayment("nonexistent-id");
    assert.fail("Expected confirmPayment to throw");
  } catch (error: unknown) {
    const err = error as { statusCode: number; message: string };
    assert.equal(err.statusCode, 404);
    assert.ok(err.message.includes("Deal not found"));
  }
});

test("T35: confirmPayment throws 400 for deal in negotiating status", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "negotiating");

  try {
    await service.confirmPayment(deal.id);
    assert.fail("Expected confirmPayment to throw");
  } catch (error: unknown) {
    const err = error as { statusCode: number; message: string };
    assert.equal(err.statusCode, 400);
    assert.ok(err.message.includes("payment_pending"));
  }
});

test("T36: confirmPayment is idempotent for already paid deal", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  await dealRepo.updateDealStatus(deal.id, {
    status: "payment_pending",
    paymentBoc: "test-boc",
  });

  // Confirm payment once
  await service.confirmPayment(deal.id);

  // Confirm payment again — should not throw
  const result: DealPaymentResponse = await service.confirmPayment(deal.id);

  assert.equal(result.status, "paid");
  assert.equal(result.id, deal.id);
});

test("T37: confirmPayment is idempotent for deal in proof_pending status", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  // Transition through: payment_pending -> paid -> proof_pending
  await dealRepo.updateDealStatus(deal.id, {
    status: "payment_pending",
    paymentBoc: "test-boc",
  });
  await dealRepo.updateDealStatus(deal.id, { status: "paid" });
  await dealRepo.updateDealStatus(deal.id, { status: "proof_pending" });

  const result: DealPaymentResponse = await service.confirmPayment(deal.id);

  assert.equal(result.status, "proof_pending");
  assert.equal(result.id, deal.id);
});

test("T38: confirmPayment is idempotent for deal in completed status", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  // Transition through: payment_pending -> paid -> completed
  await dealRepo.updateDealStatus(deal.id, {
    status: "payment_pending",
    paymentBoc: "test-boc",
  });
  await dealRepo.updateDealStatus(deal.id, { status: "paid" });
  await dealRepo.updateDealStatus(deal.id, { status: "completed" });

  const result: DealPaymentResponse = await service.confirmPayment(deal.id);

  assert.equal(result.status, "completed");
  assert.equal(result.id, deal.id);
});

test("T39: confirmPayment sets paidAt timestamp on the deal", async () => {
  const { dealRepo, service } = createTestContext();
  const deal = await seedDeal(dealRepo, "terms_agreed");

  await dealRepo.updateDealStatus(deal.id, {
    status: "payment_pending",
    paymentBoc: "test-boc",
  });

  const result: DealPaymentResponse = await service.confirmPayment(deal.id);

  assert.equal(result.status, "paid");
  assert.notEqual(result.paidAt, null);
});
