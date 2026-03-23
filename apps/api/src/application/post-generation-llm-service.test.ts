import test from "node:test";
import assert from "node:assert/strict";
import type { GeneratePostInput } from "@repo/types";
import { PostGenerationLlmService } from "./post-generation-llm-service.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeOkFetch = (postText: string, hashtags: string[]): typeof fetch =>
  (async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({ postText, hashtags }),
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

const service = new PostGenerationLlmService("test-api-key", "gpt-4o-mini");

const baseInput: GeneratePostInput = {
  description: "A crypto news channel covering TON blockchain",
  language: "EN",
  goal: "AWARENESS",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

test("generates post for AWARENESS goal in EN", async () => {
  globalThis.fetch = makeOkFetch("Stay ahead of TON blockchain news!", [
    "#TON",
    "#crypto",
    "#blockchain",
  ]);

  const result = await service.generate({
    ...baseInput,
    goal: "AWARENESS",
    language: "EN",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.postText, "Stay ahead of TON blockchain news!");
    assert.deepEqual(result.data.hashtags, ["#TON", "#crypto", "#blockchain"]);
  }
});

test("generates post for SUBSCRIBERS goal in RU", async () => {
  globalThis.fetch = makeOkFetch("Подпишись и будь в курсе новостей TON!", [
    "#TON",
    "#крипта",
  ]);

  const result = await service.generate({
    description: "Крипто-канал про TON блокчейн",
    language: "RU",
    goal: "SUBSCRIBERS",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.data.postText,
      "Подпишись и будь в курсе новостей TON!",
    );
    assert.deepEqual(result.data.hashtags, ["#TON", "#крипта"]);
  }
});

test("generates post for TRAFFIC goal", async () => {
  globalThis.fetch = makeOkFetch("Click the link to learn more about TON!", [
    "#TON",
    "#blockchain",
  ]);

  const result = await service.generate({
    ...baseInput,
    goal: "TRAFFIC",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.data.postText,
      "Click the link to learn more about TON!",
    );
  }
});

test("generates post for SALES goal", async () => {
  globalThis.fetch = makeOkFetch("Limited offer! Buy TON tools now!", [
    "#TON",
    "#sale",
    "#crypto",
  ]);

  const result = await service.generate({
    ...baseInput,
    goal: "SALES",
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.postText, "Limited offer! Buy TON tools now!");
    assert.equal(result.data.hashtags.length, 3);
  }
});

test("includes channel context when provided", async () => {
  let capturedBody = "";
  globalThis.fetch = (async (_url: unknown, opts: { body?: string }) => {
    capturedBody = opts.body ?? "";
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                postText: "Join the best crypto channel!",
                hashtags: ["#crypto"],
              }),
            },
          },
        ],
      }),
    };
  }) as unknown as typeof fetch;

  await service.generate({
    ...baseInput,
    channelDescription: "Top crypto news in Telegram",
    targetAudience: "crypto enthusiasts",
  });

  const parsedBody = JSON.parse(capturedBody) as {
    messages: Array<{ role: string; content: string }>;
  };
  const userMessage = parsedBody.messages.find((m) => m.role === "user");
  assert.ok(userMessage, "user message should exist");
  const userContent = JSON.parse(userMessage.content) as Record<string, string>;
  assert.equal(userContent.channelDescription, "Top crypto news in Telegram");
  assert.equal(userContent.targetAudience, "crypto enthusiasts");
});

test("handles OpenAI timeout", async () => {
  globalThis.fetch = makeTimeoutFetch();

  const result = await service.generate(baseInput);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(
      result.error.toLowerCase().includes("abort") ||
        result.error.toLowerCase().includes("aborted"),
      `Expected abort error, got: ${result.error}`,
    );
  }
});

test("handles OpenAI error response", async () => {
  globalThis.fetch = makeErrorFetch(500, "Internal server error");

  const result = await service.generate(baseInput);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "Internal server error");
  }
});

test("handles malformed JSON from LLM", async () => {
  globalThis.fetch = makeRawContentFetch("not valid json {{{{");

  const result = await service.generate(baseInput);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.error.length > 0);
  }
});

test("handles empty postText in response", async () => {
  globalThis.fetch = makeRawContentFetch(
    JSON.stringify({ postText: "", hashtags: ["#tag"] }),
  );

  const result = await service.generate(baseInput);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.error.includes("postText"));
  }
});

test("truncates long description", async () => {
  let capturedBody = "";
  globalThis.fetch = (async (_url: unknown, opts: { body?: string }) => {
    capturedBody = opts.body ?? "";
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                postText: "Generated post!",
                hashtags: ["#tag"],
              }),
            },
          },
        ],
      }),
    };
  }) as unknown as typeof fetch;

  const longDescription = "a".repeat(5000);
  await service.generate({ ...baseInput, description: longDescription });

  const parsedBody = JSON.parse(capturedBody) as {
    messages: Array<{ role: string; content: string }>;
  };
  const userMessage = parsedBody.messages.find((m) => m.role === "user");
  assert.ok(userMessage);
  const userContent = JSON.parse(userMessage.content) as Record<string, string>;
  assert.equal(
    userContent.description.length,
    2000,
    "description should be truncated to 2000 chars",
  );
});

test("handles missing API key (401 response)", async () => {
  globalThis.fetch = makeErrorFetch(401, "Incorrect API key provided");

  const result = await service.generate(baseInput);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, "Incorrect API key provided");
  }
});
