import test from "node:test";
import assert from "node:assert/strict";
import { KeywordGenerationLlmService } from "./keyword-generation-llm-service.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeOkFetch = (keywords: string[]): typeof fetch =>
  (async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({ keywords }),
          },
        },
      ],
    }),
  })) as unknown as typeof fetch;

const makeErrorFetch = (status: number, message: string): typeof fetch =>
  (async () => ({
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  })) as unknown as typeof fetch;

const makeRawContentFetch = (content: string): typeof fetch =>
  (async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  })) as unknown as typeof fetch;

const makeTimeoutFetch = (): typeof fetch =>
  ((_url: unknown, opts: { signal?: AbortSignal }) =>
    new Promise<never>((_resolve, reject) => {
      if (opts.signal) {
        opts.signal.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted.", "AbortError")),
        );
      }
    })) as unknown as typeof fetch;

const service = new KeywordGenerationLlmService("test-api-key", "gpt-4o-mini");

// ── Tests ─────────────────────────────────────────────────────────────────────

test("generates keywords from description", async () => {
  const expected = ["crypto", "blockchain", "TON", "DeFi"];
  globalThis.fetch = makeOkFetch(expected);

  const result = await service.generateKeywords(
    "A crypto news channel covering TON blockchain and DeFi",
  );

  assert.deepEqual(result, expected);
});

test("handles short description", async () => {
  const expected = ["ads", "telegram"];
  globalThis.fetch = makeOkFetch(expected);

  const result = await service.generateKeywords("Buy ads");

  assert.deepEqual(result, expected);
});

test("returns fallback on OpenAI error", async () => {
  globalThis.fetch = makeErrorFetch(500, "Internal server error");

  const description = "crypto blockchain telegram advertising";
  const result = await service.generateKeywords(description);

  // Fallback splits by whitespace and keeps words >= 3 chars, sliced to 5
  const expectedFallback = description
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 5);
  assert.deepEqual(result, expectedFallback);
});

test("returns fallback on timeout (AbortError)", async () => {
  globalThis.fetch = makeTimeoutFetch();

  const description = "crypto blockchain telegram";
  const result = await service.generateKeywords(description);

  const expectedFallback = description
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 5);
  assert.deepEqual(result, expectedFallback);
});

test("returns fallback on malformed JSON from LLM", async () => {
  globalThis.fetch = makeRawContentFetch("not valid json {{{{");

  const description = "crypto blockchain telegram";
  const result = await service.generateKeywords(description);

  const expectedFallback = description
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 5);
  assert.deepEqual(result, expectedFallback);
});

test("respects max 5 keywords by slicing", async () => {
  const sevenKeywords = [
    "crypto",
    "blockchain",
    "TON",
    "DeFi",
    "NFT",
    "Web3",
    "trading",
  ];
  globalThis.fetch = makeOkFetch(sevenKeywords);

  const result = await service.generateKeywords("Crypto trading platform");

  assert.equal(result.length, 5);
  assert.deepEqual(result, sevenKeywords.slice(0, 5));
});

test("filters keywords shorter than 2 characters", async () => {
  const mixedKeywords = ["a", "crypto", "x", "blockchain", "AI"];
  globalThis.fetch = makeOkFetch(mixedKeywords);

  const result = await service.generateKeywords("Crypto and AI news");

  // "a" and "x" are < 2 chars, filtered out. "AI" is 2 chars, kept.
  assert.ok(!result.includes("a"), "single-char 'a' should be filtered");
  assert.ok(!result.includes("x"), "single-char 'x' should be filtered");
  assert.ok(result.includes("crypto"));
  assert.ok(result.includes("blockchain"));
  assert.ok(result.includes("AI"));
});

test("returns fallback when LLM returns empty keywords array", async () => {
  globalThis.fetch = makeOkFetch([]);

  const description = "crypto blockchain telegram";
  const result = await service.generateKeywords(description);

  const expectedFallback = description
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 5);
  assert.deepEqual(result, expectedFallback);
});

test("returns fallback when response has no choices", async () => {
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => ({ choices: [] }),
  })) as unknown as typeof fetch;

  const description = "crypto blockchain telegram";
  const result = await service.generateKeywords(description);

  const expectedFallback = description
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 5);
  assert.deepEqual(result, expectedFallback);
});

test("deduplicates keywords", async () => {
  const duplicated = ["crypto", "blockchain", "crypto", "blockchain", "TON"];
  globalThis.fetch = makeOkFetch(duplicated);

  const result = await service.generateKeywords("Crypto blockchain news");

  assert.deepEqual(result, ["crypto", "blockchain", "TON"]);
});

test("passes language instruction when language is provided", async () => {
  let capturedBody = "";
  globalThis.fetch = (async (_url: unknown, opts: { body?: string }) => {
    capturedBody = opts.body ?? "";
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ keywords: ["crypto", "news"] }),
            },
          },
        ],
      }),
    };
  }) as unknown as typeof fetch;

  await service.generateKeywords("Crypto news channel", "RU");

  const parsedBody = JSON.parse(capturedBody) as {
    messages: Array<{ role: string; content: string }>;
  };
  const systemMessage = parsedBody.messages.find((m) => m.role === "system");
  assert.ok(systemMessage, "system message should exist");
  assert.ok(
    systemMessage.content.includes("RU"),
    "system message should mention the language",
  );
});

test("returns fallback when keywords field is not an array", async () => {
  globalThis.fetch = makeRawContentFetch(
    JSON.stringify({ keywords: "not-an-array" }),
  );

  const description = "crypto blockchain telegram";
  const result = await service.generateKeywords(description);

  const expectedFallback = description
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .slice(0, 5);
  assert.deepEqual(result, expectedFallback);
});
