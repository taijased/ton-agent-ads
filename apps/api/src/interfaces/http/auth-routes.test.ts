import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import type { ProfileSummary } from "@repo/types";
import { addApiSchemas } from "./schemas.js";
import { registerAuthRoutes } from "./auth-routes.js";
import { registerProfileRoutes } from "./profile-routes.js";
import {
  readBearerToken,
  verifySessionToken,
  issueSessionToken,
  TelegramAuthError,
} from "./telegram-auth.js";

// ── Constants ────────────────────────────────────────────────────────────────

const TEST_BOT_TOKEN = "123456:ABC-DEF-test-bot-token";

// ── Fixture factories ────────────────────────────────────────────────────────

const makeProfile = (overrides?: Partial<ProfileSummary>): ProfileSummary => ({
  displayName: "Test User",
  username: "@testuser",
  telegramId: "12345678",
  avatarUrl: null,
  isTelegramVerified: true,
  authMethod: "telegram_init_data",
  ...overrides,
});

/**
 * Builds a valid Telegram initData string signed with the test bot token.
 */
const buildSignedInitData = (options?: {
  authDateOverride?: number;
}): string => {
  const authDate = options?.authDateOverride ?? Math.floor(Date.now() / 1000);
  const user = {
    id: 12345678,
    first_name: "Test",
    last_name: "User",
    username: "testuser",
    language_code: "en",
  };

  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("user", JSON.stringify(user));

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(TEST_BOT_TOKEN)
    .digest();
  const hash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  params.set("hash", hash);
  return params.toString();
};

// ── Test app factory ─────────────────────────────────────────────────────────

/**
 * Creates a minimal Fastify app with only auth routes, profile routes,
 * CORS hooks, and the auth preHandler — no DB or Telegram clients needed.
 */
const createTestApp = (): FastifyInstance => {
  const app = Fastify({ logger: false });

  addApiSchemas(app);

  // Replicate the CORS hook from app.ts
  const isAllowedCorsOrigin = (
    origin: string | undefined,
  ): origin is string => {
    if (typeof origin !== "string") {
      return false;
    }

    return (
      origin === "https://ton-agent-ads-miniapp.vercel.app" ||
      /^https:\/\/[\w-]+\.telegram\.org$/.test(origin) ||
      /^http:\/\/localhost:\d+$/i.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/i.test(origin)
    );
  };

  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;

    if (isAllowedCorsOrigin(origin)) {
      reply.header("access-control-allow-origin", origin);
      reply.header("vary", "Origin");
      reply.header(
        "access-control-allow-headers",
        "authorization, content-type",
      );
      reply.header(
        "access-control-allow-methods",
        "GET, POST, PATCH, DELETE, OPTIONS",
      );
    }

    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  // Replicate the auth preHandler from app.ts
  app.addHook("preHandler", async (request, reply) => {
    const path = request.url.split("?")[0];

    if (
      path === "/auth/telegram" ||
      path === "/auth/dev" ||
      path === "/health" ||
      path!.startsWith("/documentation")
    ) {
      return;
    }

    try {
      const token = readBearerToken(request);

      if (token === null) {
        throw new TelegramAuthError("Authentication is required.");
      }

      request.authProfile = verifySessionToken(token);
    } catch (error: unknown) {
      if (error instanceof TelegramAuthError) {
        return reply.code(401).send({ message: error.message });
      }

      throw error;
    }
  });

  // Also register a simple /health route for CORS tests
  app.get("/health", async () => ({ status: "ok" }));

  registerAuthRoutes(app);
  registerProfileRoutes(app);

  return app;
};

// ── Environment setup ────────────────────────────────────────────────────────

let app: FastifyInstance;
let originalBotToken: string | undefined;
let originalDevAuthBypass: string | undefined;

beforeEach(async () => {
  originalBotToken = process.env.TEST_BOT_TOKEN;
  originalDevAuthBypass = process.env.DEV_AUTH_BYPASS_ENABLED;
  process.env.TEST_BOT_TOKEN = TEST_BOT_TOKEN;
  delete process.env.DEV_AUTH_BYPASS_ENABLED;

  app = createTestApp();
  await app.ready();
});

afterEach(async () => {
  await app.close();

  if (originalBotToken === undefined) {
    delete process.env.TEST_BOT_TOKEN;
  } else {
    process.env.TEST_BOT_TOKEN = originalBotToken;
  }

  if (originalDevAuthBypass === undefined) {
    delete process.env.DEV_AUTH_BYPASS_ENABLED;
  } else {
    process.env.DEV_AUTH_BYPASS_ENABLED = originalDevAuthBypass;
  }
});

// ── CORS tests ───────────────────────────────────────────────────────────────

describe("CORS — isAllowedCorsOrigin via Fastify inject", () => {
  test("allows http://localhost:5173", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "http://localhost:5173" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      response.headers["access-control-allow-origin"],
      "http://localhost:5173",
    );
  });

  test("allows http://127.0.0.1:3000", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "http://127.0.0.1:3000" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      response.headers["access-control-allow-origin"],
      "http://127.0.0.1:3000",
    );
  });

  test("allows https://ton-agent-ads-miniapp.vercel.app", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        origin: "https://ton-agent-ads-miniapp.vercel.app",
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      response.headers["access-control-allow-origin"],
      "https://ton-agent-ads-miniapp.vercel.app",
    );
  });

  test("allows https://web.telegram.org", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "https://web.telegram.org" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      response.headers["access-control-allow-origin"],
      "https://web.telegram.org",
    );
  });

  test("allows https://k.telegram.org", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "https://k.telegram.org" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      response.headers["access-control-allow-origin"],
      "https://k.telegram.org",
    );
  });

  test("allows https://t.telegram.org", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "https://t.telegram.org" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(
      response.headers["access-control-allow-origin"],
      "https://t.telegram.org",
    );
  });

  test("rejects https://evil.com — no CORS header set", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "https://evil.com" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], undefined);
  });

  test("rejects https://evil.telegram.org.attacker.com — regex anchored", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: {
        origin: "https://evil.telegram.org.attacker.com",
      },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], undefined);
  });

  test("rejects http://telegram.org — http not https, no subdomain", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "http://telegram.org" },
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], undefined);
  });

  test("rejects undefined origin — no CORS header set", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
    });

    assert.equal(response.statusCode, 204);
    assert.equal(response.headers["access-control-allow-origin"], undefined);
  });

  test("sets correct CORS headers on allowed origin", async () => {
    const response = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "http://localhost:3000" },
    });

    assert.equal(
      response.headers["access-control-allow-methods"],
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
    assert.equal(
      response.headers["access-control-allow-headers"],
      "authorization, content-type",
    );
    assert.equal(response.headers["vary"], "Origin");
  });
});

// ── Auth routes: POST /auth/dev ──────────────────────────────────────────────

describe("POST /auth/dev", () => {
  test("returns 200 with token when DEV_AUTH_BYPASS_ENABLED=true", async () => {
    process.env.DEV_AUTH_BYPASS_ENABLED = "true";

    const response = await app.inject({
      method: "POST",
      url: "/auth/dev",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { token: string };
    assert.equal(typeof body.token, "string");
    assert.ok(body.token.length > 0);
    // Token must contain a dot (payload.signature format)
    assert.ok(body.token.includes("."));
  });

  test("returns 403 when DEV_AUTH_BYPASS_ENABLED is not set", async () => {
    delete process.env.DEV_AUTH_BYPASS_ENABLED;

    const response = await app.inject({
      method: "POST",
      url: "/auth/dev",
    });

    assert.equal(response.statusCode, 403);
    const body = response.json() as { message: string };
    assert.equal(typeof body.message, "string");
    assert.ok(body.message.includes("disabled"));
  });

  test("returns 403 when DEV_AUTH_BYPASS_ENABLED=false", async () => {
    process.env.DEV_AUTH_BYPASS_ENABLED = "false";

    const response = await app.inject({
      method: "POST",
      url: "/auth/dev",
    });

    assert.equal(response.statusCode, 403);
  });
});

// ── Auth routes: POST /auth/telegram ─────────────────────────────────────────

describe("POST /auth/telegram", () => {
  test("returns 400 when body is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/telegram",
      headers: { "content-type": "application/json" },
      payload: {},
    });

    // Fastify schema validation or our validator should catch this
    const statusCode = response.statusCode;
    assert.ok(statusCode === 400, `Expected 400 but got ${statusCode}`);
  });

  test("returns 400 when initData is empty string", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/telegram",
      headers: { "content-type": "application/json" },
      payload: { initData: "" },
    });

    assert.equal(response.statusCode, 400);
  });

  test("returns 400 when initData is not a string", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/telegram",
      headers: { "content-type": "application/json" },
      payload: { initData: 12345 },
    });

    assert.equal(response.statusCode, 400);
  });

  test("returns 200 with token when initData is valid and properly signed", async () => {
    const initData = buildSignedInitData();

    const response = await app.inject({
      method: "POST",
      url: "/auth/telegram",
      headers: { "content-type": "application/json" },
      payload: { initData },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { token: string };
    assert.equal(typeof body.token, "string");
    assert.ok(body.token.includes("."));
  });

  test("returns 401 when initData has invalid HMAC signature", async () => {
    // Build initData with a wrong hash
    const params = new URLSearchParams();
    params.set("auth_date", String(Math.floor(Date.now() / 1000)));
    params.set("user", JSON.stringify({ id: 123, first_name: "Test" }));
    params.set(
      "hash",
      "0000000000000000000000000000000000000000000000000000000000000000",
    );

    const response = await app.inject({
      method: "POST",
      url: "/auth/telegram",
      headers: { "content-type": "application/json" },
      payload: { initData: params.toString() },
    });

    assert.equal(response.statusCode, 401);
  });

  test("returns 401 when initData is expired", async () => {
    const oldAuthDate = Math.floor(Date.now() / 1000) - 16 * 60;
    const initData = buildSignedInitData({ authDateOverride: oldAuthDate });

    const response = await app.inject({
      method: "POST",
      url: "/auth/telegram",
      headers: { "content-type": "application/json" },
      payload: { initData },
    });

    assert.equal(response.statusCode, 401);
  });
});

// ── Profile route: GET /profile ──────────────────────────────────────────────

describe("GET /profile", () => {
  test("returns 401 without Authorization header", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profile",
    });

    assert.equal(response.statusCode, 401);
    const body = response.json() as { message: string };
    assert.equal(typeof body.message, "string");
  });

  test("returns 401 with malformed Authorization header (no Bearer)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profile",
      headers: { authorization: "Basic abc123" },
    });

    assert.equal(response.statusCode, 401);
  });

  test("returns 401 with invalid token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/profile",
      headers: { authorization: "Bearer invalid.token.here" },
    });

    assert.equal(response.statusCode, 401);
  });

  test("returns 200 with ProfileSummary when token is valid", async () => {
    const profile = makeProfile();
    const token = issueSessionToken(profile);

    const response = await app.inject({
      method: "GET",
      url: "/profile",
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as ProfileSummary;
    assert.equal(body.displayName, profile.displayName);
    assert.equal(body.username, profile.username);
    assert.equal(body.telegramId, profile.telegramId);
    assert.equal(body.avatarUrl, profile.avatarUrl);
    assert.equal(body.isTelegramVerified, profile.isTelegramVerified);
    assert.equal(body.authMethod, profile.authMethod);
  });

  test("returns 200 with dev profile when using dev auth token", async () => {
    process.env.DEV_AUTH_BYPASS_ENABLED = "true";

    // First get a dev token
    const devResponse = await app.inject({
      method: "POST",
      url: "/auth/dev",
    });
    const { token } = devResponse.json() as { token: string };

    // Then use it to access profile
    const profileResponse = await app.inject({
      method: "GET",
      url: "/profile",
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(profileResponse.statusCode, 200);
    const body = profileResponse.json() as ProfileSummary;
    assert.equal(body.displayName, "Local Dev User");
    assert.equal(body.authMethod, "none");
  });

  test("returns 200 via full auth flow: POST /auth/telegram then GET /profile", async () => {
    const initData = buildSignedInitData();

    const authResponse = await app.inject({
      method: "POST",
      url: "/auth/telegram",
      headers: { "content-type": "application/json" },
      payload: { initData },
    });

    assert.equal(authResponse.statusCode, 200);
    const { token } = authResponse.json() as { token: string };

    const profileResponse = await app.inject({
      method: "GET",
      url: "/profile",
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(profileResponse.statusCode, 200);
    const body = profileResponse.json() as ProfileSummary;
    assert.equal(body.displayName, "Test User");
    assert.equal(body.telegramId, "12345678");
    assert.equal(body.username, "@testuser");
    assert.equal(body.authMethod, "telegram_init_data");
  });
});

// ── Auth bypass on public endpoints ──────────────────────────────────────────

describe("Auth bypass on public endpoints", () => {
  test("/auth/telegram does not require Bearer token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/telegram",
      headers: { "content-type": "application/json" },
      payload: { initData: "test" },
    });

    // Should get 400 (bad initData), not 401 (no auth)
    assert.notEqual(response.statusCode, 401);
  });

  test("/auth/dev does not require Bearer token", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/dev",
    });

    // Should get 403 (disabled), not 401 (no auth)
    assert.equal(response.statusCode, 403);
  });

  test("/health does not require Bearer token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    assert.equal(response.statusCode, 200);
  });
});
