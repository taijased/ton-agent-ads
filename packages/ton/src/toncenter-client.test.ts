import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { resolveTransactionHash } from "./toncenter-client.js";

describe("resolveTransactionHash", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockFetch(
    impl: (url: string | URL | Request) => Promise<Response>,
  ): void {
    globalThis.fetch = impl as typeof globalThis.fetch;
  }

  it("returns tx hash when toncenter responds with a transaction", async () => {
    const expectedHash = "abc123txhash";

    mockFetch(
      async () =>
        new Response(
          JSON.stringify({ transactions: [{ hash: expectedHash }] }),
          { status: 200 },
        ),
    );

    const result = await resolveTransactionHash("base64MsgHash==", {
      maxRetries: 0,
      retryDelayMs: 10,
    });

    assert.equal(result, expectedHash);
  });

  it("returns null when toncenter returns empty transactions", async () => {
    mockFetch(
      async () =>
        new Response(JSON.stringify({ transactions: [] }), { status: 200 }),
    );

    const result = await resolveTransactionHash("base64MsgHash==", {
      maxRetries: 0,
      retryDelayMs: 10,
    });

    assert.equal(result, null);
  });

  it("retries on failure and succeeds on subsequent attempt", async () => {
    let callCount = 0;
    const expectedHash = "retried-hash-xyz";

    mockFetch(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({ transactions: [] }), {
          status: 200,
        });
      }
      return new Response(
        JSON.stringify({ transactions: [{ hash: expectedHash }] }),
        { status: 200 },
      );
    });

    const result = await resolveTransactionHash("base64MsgHash==", {
      maxRetries: 1,
      retryDelayMs: 10,
    });

    assert.equal(result, expectedHash);
    assert.equal(callCount, 2);
  });

  it("returns null after all retries exhausted", async () => {
    let callCount = 0;

    mockFetch(async () => {
      callCount++;
      return new Response(JSON.stringify({ transactions: [] }), {
        status: 200,
      });
    });

    const result = await resolveTransactionHash("base64MsgHash==", {
      maxRetries: 2,
      retryDelayMs: 10,
    });

    assert.equal(result, null);
    assert.equal(callCount, 3); // initial + 2 retries
  });

  it("retries on network error and succeeds", async () => {
    let callCount = 0;
    const expectedHash = "recovered-hash";

    mockFetch(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Network error");
      }
      return new Response(
        JSON.stringify({ transactions: [{ hash: expectedHash }] }),
        { status: 200 },
      );
    });

    const result = await resolveTransactionHash("base64MsgHash==", {
      maxRetries: 1,
      retryDelayMs: 10,
    });

    assert.equal(result, expectedHash);
    assert.equal(callCount, 2);
  });

  it("retries on non-ok HTTP response", async () => {
    let callCount = 0;
    const expectedHash = "after-500-hash";

    mockFetch(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response("Internal Server Error", { status: 500 });
      }
      return new Response(
        JSON.stringify({ transactions: [{ hash: expectedHash }] }),
        { status: 200 },
      );
    });

    const result = await resolveTransactionHash("base64MsgHash==", {
      maxRetries: 1,
      retryDelayMs: 10,
    });

    assert.equal(result, expectedHash);
    assert.equal(callCount, 2);
  });

  it("uses testnet URL when testnet=true", async () => {
    let capturedUrl = "";

    mockFetch(async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({ transactions: [{ hash: "hash" }] }),
        { status: 200 },
      );
    });

    await resolveTransactionHash("base64MsgHash==", {
      testnet: true,
      maxRetries: 0,
      retryDelayMs: 10,
    });

    assert.ok(
      capturedUrl.includes("testnet.toncenter.com"),
      `Expected URL to contain testnet.toncenter.com, got: ${capturedUrl}`,
    );
  });

  it("uses mainnet URL when testnet=false", async () => {
    let capturedUrl = "";

    mockFetch(async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({ transactions: [{ hash: "hash" }] }),
        { status: 200 },
      );
    });

    await resolveTransactionHash("base64MsgHash==", {
      testnet: false,
      maxRetries: 0,
      retryDelayMs: 10,
    });

    assert.ok(
      capturedUrl.includes("toncenter.com"),
      `Expected URL to contain toncenter.com, got: ${capturedUrl}`,
    );
    assert.ok(
      !capturedUrl.includes("testnet.toncenter.com"),
      `Expected URL NOT to contain testnet.toncenter.com, got: ${capturedUrl}`,
    );
  });

  it("defaults to testnet when testnet option is not provided", async () => {
    let capturedUrl = "";

    mockFetch(async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({ transactions: [{ hash: "hash" }] }),
        { status: 200 },
      );
    });

    await resolveTransactionHash("base64MsgHash==", {
      maxRetries: 0,
      retryDelayMs: 10,
    });

    assert.ok(
      capturedUrl.includes("testnet.toncenter.com"),
      `Expected default URL to use testnet, got: ${capturedUrl}`,
    );
  });

  it("encodes the message hash in the URL", async () => {
    let capturedUrl = "";
    const msgHash = "abc+/=special";

    mockFetch(async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({ transactions: [{ hash: "hash" }] }),
        { status: 200 },
      );
    });

    await resolveTransactionHash(msgHash, {
      maxRetries: 0,
      retryDelayMs: 10,
    });

    assert.ok(
      capturedUrl.includes(encodeURIComponent(msgHash)),
      `Expected URL to contain encoded msg hash, got: ${capturedUrl}`,
    );
  });
});
