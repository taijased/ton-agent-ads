import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { ProfileSummary } from "@repo/types";
import {
  issueSessionToken,
  verifySessionToken,
  validateTelegramInitData,
  TelegramAuthError,
  buildProfileFromTelegramInitData,
} from "./telegram-auth.js";

// ── Fixture factories ────────────────────────────────────────────────────────

const TEST_BOT_TOKEN = "123456:ABC-DEF-test-bot-token";

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
  userOverrides?: Record<string, unknown>;
}): string => {
  const authDate = options?.authDateOverride ?? Math.floor(Date.now() / 1000);
  const user = {
    id: 12345678,
    first_name: "Test",
    last_name: "User",
    username: "testuser",
    language_code: "en",
    ...options?.userOverrides,
  };

  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("user", JSON.stringify(user));

  // Build data-check-string (sorted keys excluding hash, joined by newline)
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

// ── Environment setup ────────────────────────────────────────────────────────

let originalBotToken: string | undefined;

beforeEach(() => {
  originalBotToken = process.env.TEST_BOT_TOKEN;
  process.env.TEST_BOT_TOKEN = TEST_BOT_TOKEN;
});

afterEach(() => {
  if (originalBotToken === undefined) {
    delete process.env.TEST_BOT_TOKEN;
  } else {
    process.env.TEST_BOT_TOKEN = originalBotToken;
  }
});

// ── issueSessionToken / verifySessionToken ───────────────────────────────────

describe("issueSessionToken", () => {
  test("returns a string with exactly one dot separator", () => {
    const profile = makeProfile();
    const token = issueSessionToken(profile);

    assert.equal(typeof token, "string");
    const parts = token.split(".");
    assert.equal(parts.length, 2, "Token must have exactly one dot separator");
    assert.ok(parts[0]!.length > 0, "Payload part must not be empty");
    assert.ok(parts[1]!.length > 0, "Signature part must not be empty");
  });

  test("produces different tokens for different profiles", () => {
    const tokenA = issueSessionToken(makeProfile({ telegramId: "111" }));
    const tokenB = issueSessionToken(makeProfile({ telegramId: "222" }));
    assert.notEqual(tokenA, tokenB);
  });
});

describe("verifySessionToken", () => {
  test("round-trips: issue then verify returns same profile", () => {
    const profile = makeProfile();
    const token = issueSessionToken(profile);
    const recovered = verifySessionToken(token);

    assert.deepStrictEqual(recovered, profile);
  });

  test("rejects tampered payload", () => {
    const token = issueSessionToken(makeProfile());
    const [payload, signature] = token.split(".");

    // Tamper payload by flipping a character
    const tamperedPayload =
      payload!.charAt(0) === "a"
        ? "b" + payload!.slice(1)
        : "a" + payload!.slice(1);

    assert.throws(
      () => verifySessionToken(`${tamperedPayload}.${signature}`),
      (error: unknown) => {
        assert.ok(error instanceof TelegramAuthError);
        return true;
      },
    );
  });

  test("rejects expired token", () => {
    // We cannot easily test expiry with the current API since issueSessionToken
    // uses Date.now() internally. Instead, craft a token with an expired exp.
    const expiredPayload = JSON.stringify({
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in the past
      profile: makeProfile(),
    });
    const encoded = Buffer.from(expiredPayload, "utf8").toString("base64url");
    const signature = crypto
      .createHmac("sha256", TEST_BOT_TOKEN)
      .update(encoded)
      .digest("base64url");

    assert.throws(
      () => verifySessionToken(`${encoded}.${signature}`),
      (error: unknown) => {
        assert.ok(error instanceof TelegramAuthError);
        assert.ok(error.message.includes("expired"));
        return true;
      },
    );
  });

  test("rejects malformed token with no dot", () => {
    assert.throws(
      () => verifySessionToken("nodothere"),
      (error: unknown) => {
        assert.ok(error instanceof TelegramAuthError);
        assert.ok(error.message.includes("malformed"));
        return true;
      },
    );
  });

  test("rejects empty string token", () => {
    assert.throws(
      () => verifySessionToken(""),
      (error: unknown) => {
        assert.ok(error instanceof TelegramAuthError);
        return true;
      },
    );
  });

  test("rejects token with empty payload part", () => {
    assert.throws(
      () => verifySessionToken(".somesignature"),
      (error: unknown) => {
        assert.ok(error instanceof TelegramAuthError);
        return true;
      },
    );
  });
});

// ── validateTelegramInitData ─────────────────────────────────────────────────

describe("validateTelegramInitData", () => {
  test("accepts valid HMAC-signed data", () => {
    const initData = buildSignedInitData();
    const result = validateTelegramInitData(initData);

    assert.equal(result.user.id, 12345678);
    assert.equal(result.user.first_name, "Test");
    assert.equal(result.user.last_name, "User");
    assert.equal(result.user.username, "testuser");
  });

  test("rejects expired data (auth_date older than 15 minutes)", () => {
    const fifteenMinutesAgo = Math.floor(Date.now() / 1000) - 16 * 60;
    const initData = buildSignedInitData({
      authDateOverride: fifteenMinutesAgo,
    });

    assert.throws(
      () => validateTelegramInitData(initData),
      (error: unknown) => {
        assert.ok(error instanceof TelegramAuthError);
        assert.ok(error.message.includes("expired"));
        return true;
      },
    );
  });

  test("rejects invalid HMAC (tampered initData)", () => {
    const initData = buildSignedInitData();
    // Tamper with the data by replacing the user
    const tampered = initData.replace("Test", "Tampered");

    assert.throws(
      () => validateTelegramInitData(tampered),
      (error: unknown) => {
        assert.ok(error instanceof TelegramAuthError);
        assert.ok(
          error.message.includes("signature") ||
            error.message.includes("validation"),
        );
        return true;
      },
    );
  });

  test("rejects initData missing hash parameter", () => {
    const params = new URLSearchParams();
    params.set("auth_date", String(Math.floor(Date.now() / 1000)));
    params.set("user", JSON.stringify({ id: 123, first_name: "Test" }));

    assert.throws(
      () => validateTelegramInitData(params.toString()),
      (error: unknown) => {
        assert.ok(error instanceof TelegramAuthError);
        return true;
      },
    );
  });

  test("rejects initData missing user parameter", () => {
    const params = new URLSearchParams();
    params.set("auth_date", String(Math.floor(Date.now() / 1000)));
    params.set("hash", "somehash");

    assert.throws(
      () => validateTelegramInitData(params.toString()),
      (error: unknown) => {
        assert.ok(error instanceof TelegramAuthError);
        return true;
      },
    );
  });

  test("rejects initData with future auth_date beyond TTL window", () => {
    // auth_date far in the future should fail because ageSeconds < 0
    const futureDate = Math.floor(Date.now() / 1000) + 3600;
    const initData = buildSignedInitData({ authDateOverride: futureDate });

    assert.throws(
      () => validateTelegramInitData(initData),
      (error: unknown) => {
        assert.ok(error instanceof TelegramAuthError);
        return true;
      },
    );
  });
});

// ── buildProfileFromTelegramInitData ─────────────────────────────────────────

describe("buildProfileFromTelegramInitData", () => {
  test("builds correct profile from valid initData", () => {
    const initData = buildSignedInitData();
    const parsed = validateTelegramInitData(initData);
    const profile = buildProfileFromTelegramInitData(parsed);

    assert.equal(profile.displayName, "Test User");
    assert.equal(profile.username, "@testuser");
    assert.equal(profile.telegramId, "12345678");
    assert.equal(profile.avatarUrl, null);
    assert.equal(profile.isTelegramVerified, true);
    assert.equal(profile.authMethod, "telegram_init_data");
  });

  test("uses first_name only when last_name is absent", () => {
    const initData = buildSignedInitData({
      userOverrides: { last_name: undefined },
    });
    const parsed = validateTelegramInitData(initData);
    const profile = buildProfileFromTelegramInitData(parsed);

    assert.equal(profile.displayName, "Test");
  });
});
