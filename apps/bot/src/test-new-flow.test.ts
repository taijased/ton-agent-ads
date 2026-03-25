import test, { describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TestPipelineSession } from "./test-pipeline-session.js";
import type { PipelineMessageResult } from "./test-pipeline-session.js";

/**
 * Tests the /test_new flow end-to-end through TestPipelineSession:
 *
 * 1. Choose channel @tontestyshmestyhackaton, describe "culinary blog"
 * 2. Budget "10 usdt" → convert to TON → approve conversion
 * 3. "Write manually" → "Test post"
 * 4. Campaign created → triggers real negotiation
 *
 * Note: convertToTon hits real CoinGecko API, so TON amounts are dynamic.
 * Tests assert the conversion flow structure, not exact amounts.
 */

describe("/test_new flow", () => {
  let pipeline: TestPipelineSession;
  const replies: string[] = [];

  beforeEach(() => {
    replies.length = 0;
    pipeline = new TestPipelineSession(
      "test-user-123",
      async (text: string) => {
        replies.push(text);
      },
      {
        fullPipeline: false,
        realNegotiation: true,
        creatorChatId: 12345,
        channelUsername: "tontestyshmestyhackaton",
      },
    );
  });

  test("step 1: description 'culinary blog' advances to budget step", async () => {
    assert.deepEqual(pipeline.phase, {
      kind: "campaign_creation",
      step: "description",
    });

    const result = await pipeline.handleMessage(
      "culinary blog for food lovers",
    );

    assert.equal(pipeline.phase.kind, "campaign_creation");
    assert.equal((pipeline.phase as { step: string }).step, "budget");
    assert.ok(result.reply?.includes("How much TON"));
    assert.equal(
      pipeline.campaignDraft.description,
      "culinary blog for food lovers",
    );
  });

  test("step 1: short description is rejected", async () => {
    const result = await pipeline.handleMessage("food");

    assert.equal(pipeline.phase.kind, "campaign_creation");
    assert.equal((pipeline.phase as { step: string }).step, "description");
    assert.ok(result.reply?.includes("more detailed description"));
  });

  test("step 2: budget '10 usdt' triggers conversion prompt", async () => {
    await pipeline.handleMessage("culinary blog for food lovers");

    const result = await pipeline.handleMessage("10 usdt");

    assert.equal(pipeline.phase.kind, "campaign_creation");
    assert.equal((pipeline.phase as { step: string }).step, "budget");
    // Should show conversion: 10 USD ≈ X TON
    assert.ok(
      result.reply?.includes("TON"),
      `Expected TON in reply: ${result.reply}`,
    );
    assert.ok(
      result.reply?.includes("USD"),
      `Expected USD in reply: ${result.reply}`,
    );
    assert.ok(
      result.reply?.includes("Use") ||
        result.reply?.includes("budget") ||
        result.reply?.includes("confirm"),
      `Expected confirmation prompt: ${result.reply}`,
    );
    assert.ok(
      pipeline.campaignDraft.pendingBudgetAmount !== undefined &&
        pipeline.campaignDraft.pendingBudgetAmount > 0,
      "Expected pending budget amount to be set",
    );
    assert.ok(
      result.keyboard !== undefined,
      "Expected inline keyboard with Approve/Decline buttons",
    );
  });

  test("step 2: approve conversion moves to post step", async () => {
    await pipeline.handleMessage("culinary blog for food lovers");
    await pipeline.handleMessage("10 usdt");

    const pendingAmount = pipeline.campaignDraft.pendingBudgetAmount;
    assert.ok(pendingAmount !== undefined && pendingAmount > 0);

    const result = await pipeline.handleMessage("yes");

    assert.equal(pipeline.phase.kind, "campaign_creation");
    assert.equal((pipeline.phase as { step: string }).step, "post");
    assert.ok(result.reply?.includes("How would you like to create"));
    assert.equal(pipeline.campaignDraft.budgetAmount, String(pendingAmount));
    assert.equal(pipeline.campaignDraft.pendingBudgetAmount, undefined);
    // Should have inline keyboard with Write manually / Generate with AI
    assert.ok(
      result.keyboard !== undefined,
      "Expected keyboard with post options",
    );
  });

  test("step 2: decline conversion asks for budget again", async () => {
    await pipeline.handleMessage("culinary blog for food lovers");
    await pipeline.handleMessage("10 usdt");

    const result = await pipeline.handleMessage("no");

    assert.equal(pipeline.phase.kind, "campaign_creation");
    assert.equal((pipeline.phase as { step: string }).step, "budget");
    assert.ok(result.reply?.includes("How much TON"));
    assert.equal(pipeline.campaignDraft.pendingBudgetAmount, undefined);
  });

  test("step 3: callback 'Write manually' asks for post text", async () => {
    await pipeline.handleMessage("culinary blog for food lovers");
    await pipeline.handleMessage("10 usdt");
    await pipeline.handleMessage("yes");

    // Simulate inline keyboard callback for "Write manually"
    const result = await pipeline.handleCallback("pipeline_post:write:dummy");

    assert.ok(result.reply?.includes("Send your advertising post text"));
  });

  test("step 3: sending post text completes campaign and triggers real negotiation", async () => {
    await pipeline.handleMessage("culinary blog for food lovers");
    await pipeline.handleMessage("10 usdt");
    const expectedBudget = String(pipeline.campaignDraft.pendingBudgetAmount);
    await pipeline.handleMessage("yes");

    // Simulate "Write manually" callback
    await pipeline.handleCallback("pipeline_post:write:dummy");

    // Send the actual post text
    const result = await pipeline.handleMessage("Test post");

    assert.equal(pipeline.phase.kind, "negotiating");
    assert.ok(
      result.reply?.includes("Campaign created"),
      `Expected campaign summary: ${result.reply}`,
    );
    assert.ok(
      result.reply?.includes("Test post"),
      `Expected post text in summary: ${result.reply}`,
    );
    assert.ok(
      result.reply?.includes(expectedBudget),
      `Expected budget ${expectedBudget} in summary: ${result.reply}`,
    );
    assert.ok(
      result.reply?.includes("Contacting channel admin"),
      `Expected negotiation trigger: ${result.reply}`,
    );
    assert.equal(result.triggerRealNegotiation, true);

    // Verify campaign draft
    assert.equal(pipeline.campaignDraft.postText, "Test post");
    assert.equal(pipeline.campaignDraft.budgetAmount, expectedBudget);
    assert.equal(
      pipeline.campaignDraft.description,
      "culinary blog for food lovers",
    );
  });

  test("step 3: short post text is rejected", async () => {
    await pipeline.handleMessage("culinary blog for food lovers");
    await pipeline.handleMessage("10 usdt");
    await pipeline.handleMessage("yes");
    await pipeline.handleCallback("pipeline_post:write:dummy");

    const result = await pipeline.handleMessage("Hi");

    assert.equal(pipeline.phase.kind, "campaign_creation");
    assert.ok(result.reply?.includes("too short"));
  });

  test("full happy path: description → budget → approve → write manually → post text", async () => {
    // Step 1: Description
    const r1 = await pipeline.handleMessage("culinary blog for food lovers");
    assert.ok(r1.reply?.includes("How much TON"));

    // Step 2: Budget in USDT
    const r2 = await pipeline.handleMessage("10 usdt");
    assert.ok(r2.reply?.includes("TON"));
    assert.ok(r2.reply?.includes("USD"));
    const convertedAmount = pipeline.campaignDraft.pendingBudgetAmount;
    assert.ok(convertedAmount !== undefined && convertedAmount > 0);

    // Step 2b: Approve conversion via inline button callback
    const r3 = await pipeline.handleCallback("budget_convert:approve:dummy");
    assert.ok(r3.reply?.includes("How would you like to create"));
    assert.ok(r3.keyboard !== undefined);

    // Step 3: Write manually callback
    const r4 = await pipeline.handleCallback("pipeline_post:write:dummy");
    assert.ok(r4.reply?.includes("Send your advertising post text"));

    // Step 3b: Send post text
    const r5 = await pipeline.handleMessage("Test post");
    assert.equal(pipeline.phase.kind, "negotiating");
    assert.equal(r5.triggerRealNegotiation, true);
    assert.ok(r5.reply?.includes("Campaign created"));
    assert.ok(r5.reply?.includes("culinary blog for food lovers"));
    assert.ok(r5.reply?.includes(`${convertedAmount} TON`));
    assert.ok(r5.reply?.includes("Test post"));
  });

  test("budget in pure TON skips conversion", async () => {
    await pipeline.handleMessage("culinary blog for food lovers");

    const result = await pipeline.handleMessage("10 ton");

    assert.equal(pipeline.phase.kind, "campaign_creation");
    assert.equal((pipeline.phase as { step: string }).step, "post");
    assert.equal(pipeline.campaignDraft.budgetAmount, "10");
    assert.ok(result.reply?.includes("How would you like to create"));
  });

  test("budget as bare number asks for confirmation", async () => {
    await pipeline.handleMessage("culinary blog for food lovers");

    const result = await pipeline.handleMessage("10");

    assert.equal(pipeline.phase.kind, "campaign_creation");
    assert.equal((pipeline.phase as { step: string }).step, "budget");
    assert.ok(result.reply?.includes("your budget in TON"));
    assert.equal(pipeline.campaignDraft.pendingBudgetAmount, 10);
  });

  test("isRealNegotiation flag is set correctly", () => {
    assert.equal(pipeline.isRealNegotiation, true);
    assert.equal(pipeline.isFullPipeline, false);
  });

  test("step 2: callback budget_convert:approve advances to post step", async () => {
    await pipeline.handleMessage("culinary blog for food lovers");
    await pipeline.handleMessage("10 usdt");

    const pendingAmount = pipeline.campaignDraft.pendingBudgetAmount;
    assert.ok(
      pendingAmount !== undefined && pendingAmount > 0,
      "Expected pending budget amount before approval",
    );

    const result = await pipeline.handleCallback(
      "budget_convert:approve:dummy",
    );

    assert.equal(pipeline.phase.kind, "campaign_creation");
    assert.equal((pipeline.phase as { step: string }).step, "post");
    assert.ok(
      result.reply?.includes("How would you like to create"),
      `Expected post step prompt: ${result.reply}`,
    );
    assert.equal(pipeline.campaignDraft.budgetAmount, String(pendingAmount));
    assert.equal(pipeline.campaignDraft.pendingBudgetAmount, undefined);
    assert.ok(
      result.keyboard !== undefined,
      "Expected keyboard with Write manually / Generate options",
    );
  });

  test("step 2: callback budget_convert:decline re-asks budget", async () => {
    await pipeline.handleMessage("culinary blog for food lovers");
    await pipeline.handleMessage("10 usdt");

    const result = await pipeline.handleCallback(
      "budget_convert:decline:dummy",
    );

    assert.equal(pipeline.phase.kind, "campaign_creation");
    assert.equal((pipeline.phase as { step: string }).step, "budget");
    assert.ok(
      result.reply?.includes("How much TON"),
      `Expected budget re-ask: ${result.reply}`,
    );
    assert.equal(pipeline.campaignDraft.pendingBudgetAmount, undefined);
  });

  test("full happy path with button callbacks instead of text yes/no", async () => {
    // Step 1: Description
    const r1 = await pipeline.handleMessage("culinary blog for food lovers");
    assert.ok(r1.reply?.includes("How much TON"));

    // Step 2: Budget in USDT
    const r2 = await pipeline.handleMessage("10 usdt");
    assert.ok(r2.reply?.includes("TON"));
    assert.ok(r2.reply?.includes("USD"));
    assert.ok(
      r2.keyboard !== undefined,
      "Expected inline keyboard after USDT conversion",
    );
    const convertedAmount = pipeline.campaignDraft.pendingBudgetAmount;
    assert.ok(convertedAmount !== undefined && convertedAmount > 0);

    // Step 2b: Approve conversion via inline button callback
    const r3 = await pipeline.handleCallback("budget_convert:approve:dummy");
    assert.ok(r3.reply?.includes("How would you like to create"));
    assert.ok(r3.keyboard !== undefined, "Expected keyboard with post options");
    assert.equal(pipeline.campaignDraft.budgetAmount, String(convertedAmount));
    assert.equal(pipeline.campaignDraft.pendingBudgetAmount, undefined);

    // Step 3: Write manually callback
    const r4 = await pipeline.handleCallback("pipeline_post:write:dummy");
    assert.ok(r4.reply?.includes("Send your advertising post text"));

    // Step 3b: Send post text
    const r5 = await pipeline.handleMessage("Test post");
    assert.equal(pipeline.phase.kind, "negotiating");
    assert.equal(r5.triggerRealNegotiation, true);
    assert.ok(r5.reply?.includes("Campaign created"));
    assert.ok(r5.reply?.includes("culinary blog for food lovers"));
    assert.ok(r5.reply?.includes("Test post"));
  });
});
