import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { apiRequest } from "./api.js";

// Store original fetch so we can restore it after each test
const originalFetch = globalThis.fetch;

/**
 * Helper: create a mock Response object that mimics the Fetch API Response.
 */
const makeMockResponse = (options: {
  status: number;
  ok: boolean;
  body: unknown;
  jsonThrows?: boolean;
}): Response => {
  const { status, ok, body, jsonThrows } = options;
  return {
    status,
    ok,
    json: jsonThrows
      ? () => Promise.reject(new SyntaxError("Unexpected token"))
      : () => Promise.resolve(body),
    headers: new Headers(),
    redirected: false,
    statusText: "",
    type: "basic" as ResponseType,
    url: "",
    clone: () => makeMockResponse(options),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(JSON.stringify(body)),
    bytes: () => Promise.resolve(new Uint8Array()),
  } satisfies Response;
};

describe("apiRequest — Error Classification (Phase 1)", () => {
  afterEach(() => {
    // Restore original fetch after every test to prevent cross-contamination
    globalThis.fetch = originalFetch;
  });

  // ── Test 1: Network error detection ──────────────────────────────────
  it("throws with API unreachable message when fetch() throws TypeError", async () => {
    globalThis.fetch = () => Promise.reject(new TypeError("Failed to fetch"));

    await assert.rejects(
      () => apiRequest<unknown>("/api/campaigns"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "Could not connect to the API server. Make sure it is running: pnpm --filter @repo/api start",
        );
        return true;
      },
    );
  });

  // ── Test 2: HTTP 500 with JSON body ──────────────────────────────────
  it("throws with body message when fetch() returns HTTP 500 with JSON", async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        makeMockResponse({
          status: 500,
          ok: false,
          body: { message: "Internal Server Error: something broke" },
        }),
      );

    await assert.rejects(
      () => apiRequest<unknown>("/api/campaigns"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "Internal Server Error: something broke");
        return true;
      },
    );
  });

  // ── Test 3: HTTP 500 with non-JSON (HTML) body ───────────────────────
  it("throws fallback message when fetch() returns HTTP 500 with non-JSON body", async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        makeMockResponse({
          status: 500,
          ok: false,
          body: null,
          jsonThrows: true,
        }),
      );

    await assert.rejects(
      () => apiRequest<unknown>("/api/campaigns"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "API request failed with status 500");
        return true;
      },
    );
  });

  // ── Test 4: HTTP 503 DB unavailable ──────────────────────────────────
  it("throws with DB unavailable message when fetch() returns HTTP 503", async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        makeMockResponse({
          status: 503,
          ok: false,
          body: { message: "Database is unavailable" },
        }),
      );

    await assert.rejects(
      () => apiRequest<unknown>("/api/campaigns"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "Database is unavailable");
        return true;
      },
    );
  });

  // ── Test 5: HTTP 400 validation error ────────────────────────────────
  it("throws with validation message when fetch() returns HTTP 400", async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        makeMockResponse({
          status: 400,
          ok: false,
          body: { message: "Budget must be a positive number" },
        }),
      );

    await assert.rejects(
      () => apiRequest<unknown>("/api/campaigns"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "Budget must be a positive number");
        return true;
      },
    );
  });

  // ── Test 6: Successful request ───────────────────────────────────────
  it("returns parsed JSON when fetch() returns HTTP 200", async () => {
    const expectedData = {
      id: "campaign-001",
      title: "Test Campaign",
      budget: 10,
    };

    globalThis.fetch = () =>
      Promise.resolve(
        makeMockResponse({
          status: 200,
          ok: true,
          body: expectedData,
        }),
      );

    const result = await apiRequest<{
      id: string;
      title: string;
      budget: number;
    }>("/api/campaigns");

    assert.deepStrictEqual(result, expectedData);
  });

  // ── Edge: Non-TypeError network errors also produce API unreachable ──
  it("throws API unreachable message for any fetch() throw, not just TypeError", async () => {
    globalThis.fetch = () =>
      Promise.reject(
        new DOMException("The operation was aborted", "AbortError"),
      );

    await assert.rejects(
      () => apiRequest<unknown>("/api/campaigns"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "Could not connect to the API server. Make sure it is running: pnpm --filter @repo/api start",
        );
        return true;
      },
    );
  });

  // ── Edge: Response with `reason` field instead of `message` ──────────
  it("falls back to reason field when message is absent in error body", async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        makeMockResponse({
          status: 422,
          ok: false,
          body: { reason: "Unprocessable entity: missing required field" },
        }),
      );

    await assert.rejects(
      () => apiRequest<unknown>("/api/campaigns"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(
          error.message,
          "Unprocessable entity: missing required field",
        );
        return true;
      },
    );
  });

  // ── Edge: Response with `error` field instead of `message` ───────────
  it("falls back to error field when message and reason are absent", async () => {
    globalThis.fetch = () =>
      Promise.resolve(
        makeMockResponse({
          status: 403,
          ok: false,
          body: { error: "Forbidden: insufficient permissions" },
        }),
      );

    await assert.rejects(
      () => apiRequest<unknown>("/api/campaigns"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "Forbidden: insufficient permissions");
        return true;
      },
    );
  });
});
