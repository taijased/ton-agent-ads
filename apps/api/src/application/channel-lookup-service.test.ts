import test from "node:test";
import assert from "node:assert/strict";
import type { ResolveChannelByUsernameResult } from "@repo/types";
import {
  ChannelLookupService,
  normalizeTelegramUsername,
  type ChannelLookupClient,
} from "./channel-lookup-service.js";

const createLookupClient = (
  result: ResolveChannelByUsernameResult | null,
  calls: string[],
): ChannelLookupClient => ({
  async resolveChannelByUsername(username: string) {
    calls.push(username);
    return result;
  },
});

test("normalizeTelegramUsername strips leading @ and whitespace", () => {
  assert.equal(normalizeTelegramUsername("  @durov  "), "durov");
});

test("resolveByUsername validates public Telegram usernames", async () => {
  const calls: string[] = [];
  const service = new ChannelLookupService(createLookupClient(null, calls));

  await assert.rejects(
    () => service.resolveByUsername("@bad"),
    /public Telegram handle/,
  );
  assert.deepEqual(calls, []);
});

test("resolveByUsername normalizes username before client lookup", async () => {
  const calls: string[] = [];
  const expected: ResolveChannelByUsernameResult = {
    id: "42",
    title: "Durov",
    username: "@durov",
    description: "Telegram updates",
    avatarUrl: null,
    subscriberCount: 1000000,
  };
  const service = new ChannelLookupService(createLookupClient(expected, calls));

  const result = await service.resolveByUsername("  @durov  ");

  assert.deepEqual(calls, ["durov"]);
  assert.deepEqual(result, expected);
});

test("resolveByUsername returns null when lookup client misses", async () => {
  const calls: string[] = [];
  const service = new ChannelLookupService(createLookupClient(null, calls));

  const result = await service.resolveByUsername("@telegram");

  assert.equal(result, null);
  assert.deepEqual(calls, ["telegram"]);
});
