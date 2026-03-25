import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import type {
  ProfileSummary,
  TelegramInitData,
  TelegramInitDataUser,
} from "@repo/types";

const INIT_DATA_TTL_SECONDS = 15 * 60;
const SESSION_TTL_SECONDS = 24 * 60 * 60;
const TELEGRAM_AUTH_METHOD: ProfileSummary["authMethod"] = "telegram_init_data";

declare module "fastify" {
  interface FastifyRequest {
    authProfile?: ProfileSummary;
  }
}

interface SessionPayload {
  exp: number;
  profile: ProfileSummary;
}

export class TelegramAuthError extends Error {
  public readonly statusCode: number;

  public constructor(message: string, statusCode = 401) {
    super(message);
    this.name = "TelegramAuthError";
    this.statusCode = statusCode;
  }
}

const getBotToken = (): string => {
  const token =
    process.env.TEST_BOT_TOKEN ||
    process.env.PROD_BOT_TOKEN ||
    process.env.BOT_TOKEN;

  if (typeof token !== "string" || token.trim().length === 0) {
    throw new TelegramAuthError(
      "Telegram bot token is not configured for auth validation.",
      500,
    );
  }

  return token.trim();
};

const base64UrlEncode = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const base64UrlDecode = (value: string): string =>
  Buffer.from(value, "base64url").toString("utf8");

const createSignature = (payload: string): string =>
  crypto
    .createHmac("sha256", getBotToken())
    .update(payload)
    .digest("base64url");

const parseTelegramInitDataUser = (value: string): TelegramInitDataUser => {
  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(value);
  } catch {
    throw new TelegramAuthError("Telegram user payload is malformed.", 400);
  }

  if (typeof parsedValue !== "object" || parsedValue === null) {
    throw new TelegramAuthError("Telegram user payload is malformed.", 400);
  }

  const candidate = parsedValue as Record<string, unknown>;

  if (
    typeof candidate.id !== "number" ||
    !Number.isFinite(candidate.id) ||
    typeof candidate.first_name !== "string" ||
    candidate.first_name.trim().length === 0
  ) {
    throw new TelegramAuthError("Telegram user payload is incomplete.", 400);
  }

  return {
    id: candidate.id,
    first_name: candidate.first_name.trim(),
    last_name:
      typeof candidate.last_name === "string" && candidate.last_name.trim()
        ? candidate.last_name.trim()
        : undefined,
    username:
      typeof candidate.username === "string" && candidate.username.trim()
        ? candidate.username.trim()
        : undefined,
    language_code:
      typeof candidate.language_code === "string" &&
      candidate.language_code.trim()
        ? candidate.language_code.trim()
        : undefined,
    is_premium:
      typeof candidate.is_premium === "boolean"
        ? candidate.is_premium
        : undefined,
    photo_url:
      typeof candidate.photo_url === "string" && candidate.photo_url.trim()
        ? candidate.photo_url.trim()
        : undefined,
  };
};

const parseTelegramInitData = (initData: string): TelegramInitData => {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash")?.trim();
  const authDate = Number(params.get("auth_date"));
  const rawUser = params.get("user");

  if (
    !hash ||
    !Number.isFinite(authDate) ||
    authDate <= 0 ||
    rawUser === null
  ) {
    throw new TelegramAuthError("Telegram init data is incomplete.", 400);
  }

  const user = parseTelegramInitDataUser(rawUser);

  return {
    user,
    auth_date: authDate,
    hash,
    query_id: params.get("query_id")?.trim() || undefined,
    chat_instance: params.get("chat_instance")?.trim() || undefined,
    chat_type: params.get("chat_type")?.trim() || undefined,
  };
};

const getDataCheckString = (initData: string): string => {
  const params = new URLSearchParams(initData);
  const pairs = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`);

  return pairs.join("\n");
};

const normalizeUsername = (value?: string): string =>
  value && value.length > 0
    ? value.startsWith("@")
      ? value
      : `@${value}`
    : "";

const getDisplayName = (user: TelegramInitDataUser): string => {
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName.length > 0) {
    return fullName;
  }

  const username = normalizeUsername(user.username);
  return username.length > 0 ? username.replace(/^@/, "") : "Mini App User";
};

export const buildProfileFromTelegramInitData = (
  data: TelegramInitData,
): ProfileSummary => ({
  displayName: getDisplayName(data.user),
  username: normalizeUsername(data.user.username),
  telegramId: String(data.user.id),
  avatarUrl: data.user.photo_url ?? null,
  isTelegramVerified: true,
  authMethod: TELEGRAM_AUTH_METHOD,
});

export const validateTelegramInitData = (
  initData: string,
  now = Date.now(),
): TelegramInitData => {
  const parsedData = parseTelegramInitData(initData);
  const dataCheckString = getDataCheckString(initData);
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(getBotToken())
    .digest();
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  const providedHashBuffer = Buffer.from(parsedData.hash, "hex");
  const expectedHashBuffer = Buffer.from(expectedHash, "hex");

  if (
    providedHashBuffer.length !== expectedHashBuffer.length ||
    !crypto.timingSafeEqual(providedHashBuffer, expectedHashBuffer)
  ) {
    throw new TelegramAuthError("Telegram signature validation failed.");
  }

  const ageSeconds = Math.floor(now / 1000) - parsedData.auth_date;

  if (ageSeconds < 0 || ageSeconds > INIT_DATA_TTL_SECONDS) {
    throw new TelegramAuthError("Telegram auth data has expired.");
  }

  return parsedData;
};

export const issueSessionToken = (profile: ProfileSummary): string => {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    profile,
  };
  const serializedPayload = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(serializedPayload);
  const signature = createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
};

export const verifySessionToken = (token: string): ProfileSummary => {
  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new TelegramAuthError("Session token is malformed.");
  }

  const expectedSignature = createSignature(encodedPayload);
  const providedSignatureBuffer = Buffer.from(providedSignature, "utf8");
  const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    providedSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
  ) {
    throw new TelegramAuthError("Session token is invalid.");
  }

  let payload: unknown;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new TelegramAuthError("Session token payload is malformed.");
  }

  if (typeof payload !== "object" || payload === null) {
    throw new TelegramAuthError("Session token payload is malformed.");
  }

  const candidate = payload as {
    exp?: unknown;
    profile?: ProfileSummary;
  };

  if (
    typeof candidate.exp !== "number" ||
    !Number.isFinite(candidate.exp) ||
    typeof candidate.profile !== "object" ||
    candidate.profile === null
  ) {
    throw new TelegramAuthError("Session token payload is malformed.");
  }

  if (candidate.exp <= Math.floor(Date.now() / 1000)) {
    throw new TelegramAuthError("Session token has expired.");
  }

  return candidate.profile;
};

export const authenticateTelegramInitData = (
  initData: string,
): { profile: ProfileSummary; token: string } => {
  const telegramInitData = validateTelegramInitData(initData);
  const profile = buildProfileFromTelegramInitData(telegramInitData);

  return {
    profile,
    token: issueSessionToken(profile),
  };
};

export const readBearerToken = (request: FastifyRequest): string | null => {
  const authorizationHeader = request.headers.authorization;

  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const requireRequestAuthProfile = (
  request: FastifyRequest,
): ProfileSummary => {
  if (request.authProfile) {
    return request.authProfile;
  }

  const token = readBearerToken(request);

  if (token === null) {
    throw new TelegramAuthError("Authentication is required.");
  }

  const profile = verifySessionToken(token);
  request.authProfile = profile;
  return profile;
};
