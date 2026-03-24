import test from "node:test";
import assert from "node:assert/strict";
import { buildConversationSummary } from "./conversation-summary-builder.js";
import type { DealMessage } from "@repo/types";

const makeMessage = (
  overrides: Partial<DealMessage> & { direction: DealMessage["direction"]; text: string },
): DealMessage => ({
  id: `msg-${Date.now()}-${Math.random()}`,
  dealId: "deal-1",
  direction: overrides.direction,
  senderType: overrides.senderType ?? (overrides.direction === "inbound" ? "admin" : "agent"),
  audience: overrides.audience ?? "admin",
  transport: "telegram_mtproto",
  contactValue: null,
  text: overrides.text,
  externalMessageId: null,
  deliveryStatus: null,
  notificationKey: null,
  failureReason: null,
  createdAt: new Date().toISOString(),
});

test("buildConversationSummary returns '(no conversation yet)' for empty messages", () => {
  const result = buildConversationSummary([]);
  assert.deepStrictEqual(result, ["(no conversation yet)"]);
});

test("buildConversationSummary formats inbound as Admin and outbound as Lumi", () => {
  const messages = [
    makeMessage({ direction: "inbound", text: "yes" }),
    makeMessage({ direction: "outbound", text: "How much does one ad post cost?" }),
  ];

  const result = buildConversationSummary(messages);
  assert.equal(result.length, 2);
  assert.equal(result[0], "Admin: yes");
  assert.equal(result[1], "Lumi: How much does one ad post cost?");
});

test("buildConversationSummary truncates long messages", () => {
  const longText = "A".repeat(150);
  const messages = [makeMessage({ direction: "inbound", text: longText })];

  const result = buildConversationSummary(messages, 4, 100);
  assert.equal(result.length, 1);
  assert.ok(result[0].length <= 110); // "Admin: " + 100 chars + "..."
  assert.ok(result[0].endsWith("..."));
});

test("buildConversationSummary limits to maxExchanges * 2 messages", () => {
  const messages = Array.from({ length: 12 }, (_, i) =>
    makeMessage({
      direction: i % 2 === 0 ? "inbound" : "outbound",
      text: `Message ${i + 1}`,
    }),
  );

  const result = buildConversationSummary(messages, 2);
  assert.equal(result.length, 4); // 2 exchanges = 4 messages
  assert.ok(result[0].includes("Message 9"));
  assert.ok(result[3].includes("Message 12"));
});

test("buildConversationSummary filters out system messages", () => {
  const messages = [
    makeMessage({ direction: "inbound", text: "yes" }),
    makeMessage({ direction: "outbound", text: "system log", senderType: "system", audience: "creator" as DealMessage["audience"] }),
    makeMessage({ direction: "outbound", text: "How much?" }),
  ];

  const result = buildConversationSummary(messages);
  // system message with audience "creator" is filtered out since audience !== "admin"
  assert.equal(result.length, 2);
  assert.equal(result[0], "Admin: yes");
  assert.equal(result[1], "Lumi: How much?");
});

test("buildConversationSummary defaults to 4 exchanges (8 messages)", () => {
  const messages = Array.from({ length: 20 }, (_, i) =>
    makeMessage({
      direction: i % 2 === 0 ? "inbound" : "outbound",
      text: `M${i + 1}`,
    }),
  );

  const result = buildConversationSummary(messages);
  assert.equal(result.length, 8);
});
