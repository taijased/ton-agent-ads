import type { FastifyRequest } from "fastify";
import type { ProfileSummary } from "@repo/types";

const readHeader = (request: FastifyRequest, name: string): string | null => {
  const value = request.headers[name];

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const normalizeUsername = (value: string | null): string => {
  if (value === null) {
    return "";
  }

  return value.startsWith("@") ? value : `@${value}`;
};

const getDisplayName = (
  firstName: string | null,
  lastName: string | null,
  username: string,
): string => {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName.length > 0) {
    return fullName;
  }

  if (username.length > 0) {
    return username.replace(/^@/, "");
  }

  return "Mini App User";
};

export const getRequestProfile = (request: FastifyRequest): ProfileSummary => {
  const suppliedUserId = readHeader(request, "x-miniapp-user-id");
  const username = normalizeUsername(readHeader(request, "x-miniapp-username"));
  const firstName = readHeader(request, "x-miniapp-first-name");
  const lastName = readHeader(request, "x-miniapp-last-name");
  const avatarUrl = readHeader(request, "x-miniapp-photo-url");

  return {
    displayName: getDisplayName(firstName, lastName, username),
    username,
    telegramId: suppliedUserId ?? "miniapp-local-user",
    avatarUrl,
    isTelegramVerified: suppliedUserId !== null,
  };
};
