import type { ProfileSummary } from "@repo/types";
import { apiRequest } from "../../../lib/api";

export const getEmptyProfileSummary = (): ProfileSummary => ({
  displayName: "Mini App User",
  username: "Test User",
  telegramId: "miniapp-local-user",
  avatarUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGCpcS07MvEGYFPZINYLTps_SH9QB69rjkzLmezGGPpyl2ENWs8yv-IZTOgcMj4TdAibjjUVwRkv3lTQo51i9Q-R9o09030UBZmSNJQUk&s=10",
  isTelegramVerified: false,
});

export const loadProfile = async (): Promise<ProfileSummary> =>
  apiRequest<ProfileSummary>("/api/profile");
