import type { ProfileSummary } from "@repo/types";
import { apiRequest } from "../../../lib/api";

export const getEmptyProfileSummary = (): ProfileSummary => ({
  displayName: "Mini App User",
  username: "",
  telegramId: "miniapp-local-user",
  avatarUrl: null,
  isTelegramVerified: false,
});

export const loadProfile = async (): Promise<ProfileSummary> =>
  apiRequest<ProfileSummary>("/api/profile");
