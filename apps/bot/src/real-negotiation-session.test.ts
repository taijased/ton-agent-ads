import test from "node:test";
import assert from "node:assert/strict";
import { extractAdminFromTitle } from "./real-negotiation-session.js";
import { TestPipelineSession } from "./test-pipeline-session.js";

test("extractAdminFromTitle — extracts @username from title", () => {
  assert.equal(extractAdminFromTitle("Crypto Channel @cryptoadmin"), "cryptoadmin");
});

test("extractAdminFromTitle — extracts first @username when multiple", () => {
  assert.equal(
    extractAdminFromTitle("@first_admin and @second"),
    "first_admin",
  );
});

test("extractAdminFromTitle — returns null when no @username", () => {
  assert.equal(extractAdminFromTitle("Crypto Channel"), null);
});

test("extractAdminFromTitle — ignores short @mentions (< 3 chars)", () => {
  assert.equal(extractAdminFromTitle("Channel @ab"), null);
});

test("extractAdminFromTitle — handles @username at start of title", () => {
  assert.equal(extractAdminFromTitle("@myadmin Crypto"), "myadmin");
});

test("TestPipelineSession — real negotiation collects theme after post", async () => {
  const replies: string[] = [];
  const sendReply = async (text: string): Promise<void> => {
    replies.push(text);
  };

  const session = new TestPipelineSession("user-1", sendReply, {
    realNegotiation: true,
    creatorChatId: 12345,
  });

  // Step 1: description
  let result = await session.handleMessage("I want to advertise crypto trading course");
  assert.ok(result.reply?.includes("TON"));

  // Step 2: budget
  result = await session.handleMessage("15 TON");
  assert.ok(result.reply?.includes("post text"));

  // Step 3: post text
  result = await session.handleMessage("Buy our amazing crypto course now!");
  // Should ask for theme (real negotiation mode)
  assert.ok(result.reply?.includes("theme"));

  // Step 4: theme
  result = await session.handleMessage("crypto");
  assert.ok(result.reply?.includes("language"));

  // Verify draft
  assert.equal(session.campaignDraft.theme, "crypto");
});

test("TestPipelineSession — theme skip with dash", async () => {
  const session = new TestPipelineSession("user-1", async () => {}, {
    realNegotiation: true,
    creatorChatId: 12345,
  });

  await session.handleMessage("I want to advertise crypto course stuff");
  await session.handleMessage("15 TON");
  await session.handleMessage("Buy our amazing crypto course now!");

  const result = await session.handleMessage("-");
  assert.ok(result.reply?.includes("language"));
  assert.equal(session.campaignDraft.theme, null);
});

test("TestPipelineSession — language validation rejects invalid", async () => {
  const session = new TestPipelineSession("user-1", async () => {}, {
    realNegotiation: true,
    creatorChatId: 12345,
  });

  await session.handleMessage("I want to advertise crypto course stuff");
  await session.handleMessage("15 TON");
  await session.handleMessage("Buy our amazing crypto course now!");
  await session.handleMessage("crypto");

  // Invalid language
  const result = await session.handleMessage("FR");
  assert.ok(result.reply?.includes("Invalid language"));

  // Valid language
  const result2 = await session.handleMessage("EN");
  assert.ok(result2.reply?.includes("goal"));
  assert.equal(session.campaignDraft.language, "EN");
});

test("TestPipelineSession — goal validation rejects invalid", async () => {
  const session = new TestPipelineSession("user-1", async () => {}, {
    realNegotiation: true,
    creatorChatId: 12345,
  });

  await session.handleMessage("I want to advertise crypto course stuff");
  await session.handleMessage("15 TON");
  await session.handleMessage("Buy our amazing crypto course now!");
  await session.handleMessage("crypto");
  await session.handleMessage("EN");

  // Invalid goal
  const result = await session.handleMessage("CONVERT");
  assert.ok(result.reply?.includes("Invalid goal"));

  // Valid goal
  const result2 = await session.handleMessage("TRAFFIC");
  assert.equal(session.campaignDraft.goal, "TRAFFIC");
  // Should trigger real negotiation
  assert.ok(result2.triggerRealNegotiation);
});

test("TestPipelineSession — non-real-negotiation skips extra steps", async () => {
  const session = new TestPipelineSession("user-1", async () => {}, {
    fullPipeline: false,
    realNegotiation: false,
  });

  await session.handleMessage("I want to advertise crypto course stuff");
  await session.handleMessage("15 TON");

  // After post text, should complete (no theme/language/goal)
  const result = await session.handleMessage("Buy our amazing crypto course now!");
  assert.ok(result.done);
  assert.equal(session.phase.kind, "completed");
});

test("TestPipelineSession — campaign summary includes extra fields in real negotiation", async () => {
  const session = new TestPipelineSession("user-1", async () => {}, {
    realNegotiation: true,
    creatorChatId: 12345,
  });

  await session.handleMessage("I want to advertise crypto course stuff");
  await session.handleMessage("15 TON");
  await session.handleMessage("Buy our amazing crypto course now!");
  await session.handleMessage("crypto");
  await session.handleMessage("EN");

  const result = await session.handleMessage("TRAFFIC");
  assert.ok(result.reply?.includes("Theme: crypto"));
  assert.ok(result.reply?.includes("Language: EN"));
  assert.ok(result.reply?.includes("Goal: TRAFFIC"));
  assert.ok(result.reply?.includes("Contacting channel admin"));
});
