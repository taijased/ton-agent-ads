import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { PublicationScheduler } from "./publication-scheduler.js";

// ── PS1-PS5: PublicationScheduler ───────────────────────────────────────────

let scheduler: PublicationScheduler;

afterEach(() => {
  scheduler?.destroy();
});

test("PS1: schedule fires callback after the scheduled time", async () => {
  scheduler = new PublicationScheduler();
  let callbackCalled = false;

  const targetDate = new Date(Date.now() + 20); // 20ms from now
  scheduler.schedule("deal-001", targetDate, async () => {
    callbackCalled = true;
  });

  // Wait enough time for the timer to fire
  await new Promise<void>((resolve) => setTimeout(resolve, 80));

  assert.equal(callbackCalled, true);
});

test("PS2: schedule with past date fires callback immediately", async () => {
  scheduler = new PublicationScheduler();
  let callbackCalled = false;

  const pastDate = new Date(Date.now() - 1000); // 1 second in the past
  scheduler.schedule("deal-002", pastDate, async () => {
    callbackCalled = true;
  });

  // delay=0 fires on next tick
  await new Promise<void>((resolve) => setTimeout(resolve, 50));

  assert.equal(callbackCalled, true);
});

test("PS3: cancel prevents callback from firing", async () => {
  scheduler = new PublicationScheduler();
  let callbackCalled = false;

  const targetDate = new Date(Date.now() + 100);
  scheduler.schedule("deal-003", targetDate, async () => {
    callbackCalled = true;
  });

  scheduler.cancel("deal-003");

  await new Promise<void>((resolve) => setTimeout(resolve, 200));

  assert.equal(callbackCalled, false);
});

test("PS4: cancel is safe for non-existent dealId", () => {
  scheduler = new PublicationScheduler();
  // Should not throw
  scheduler.cancel("nonexistent-deal");
});

test("PS5: destroy cancels all pending timers", async () => {
  scheduler = new PublicationScheduler();
  let callCount = 0;

  const futureDate = new Date(Date.now() + 100);
  scheduler.schedule("deal-a", futureDate, async () => {
    callCount += 1;
  });
  scheduler.schedule("deal-b", futureDate, async () => {
    callCount += 1;
  });

  scheduler.destroy();

  await new Promise<void>((resolve) => setTimeout(resolve, 200));

  assert.equal(callCount, 0);
});

test("PS6: scheduling same dealId replaces previous timer", async () => {
  scheduler = new PublicationScheduler();
  let firstCalled = false;
  let secondCalled = false;

  const futureDate = new Date(Date.now() + 200);
  scheduler.schedule("deal-replace", futureDate, async () => {
    firstCalled = true;
  });

  // Replace with a sooner timer
  const soonerDate = new Date(Date.now() + 20);
  scheduler.schedule("deal-replace", soonerDate, async () => {
    secondCalled = true;
  });

  await new Promise<void>((resolve) => setTimeout(resolve, 100));

  assert.equal(firstCalled, false);
  assert.equal(secondCalled, true);
});
