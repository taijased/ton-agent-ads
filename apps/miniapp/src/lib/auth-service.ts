import type { TelegramAuthResponse } from "@repo/types";
import { apiRequest } from "./api";
import { clearAuthToken, setAuthToken } from "./auth-storage";
import {
  getTelegramInitData,
  getTelegramMiniAppUser,
  initializeTelegramWebApp,
} from "./telegram-user";

declare const __DEV_AUTH_BYPASS_ENABLED__: string;

export const hasTelegramInitData = (): boolean =>
  getTelegramInitData().trim().length > 0;

const isDevAuthBypassEnabled = (): boolean =>
  __DEV_AUTH_BYPASS_ENABLED__.trim().toLowerCase() === "true";

export const canUseDevAuthBypass = (): boolean => {
  if (!isDevAuthBypassEnabled() || typeof window === "undefined") {
    return false;
  }

  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
};

export const authenticateWithTelegram = async (): Promise<string> => {
  initializeTelegramWebApp();
  const initData = getTelegramInitData().trim();

  if (initData.length === 0) {
    const missingSessionMessage =
      getTelegramMiniAppUser() !== null
        ? "Open the mini app from the Telegram bot button to refresh the auth session and try again."
        : "Telegram session data is unavailable. Reopen the mini app from Telegram and try again.";

    throw new Error(missingSessionMessage);
  }

  try {
    const response = await apiRequest<TelegramAuthResponse>(
      "/api/auth/telegram",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ initData }),
      },
      { auth: false },
    );

    setAuthToken(response.token);
    return response.token;
  } catch (error) {
    clearAuthToken();
    throw error;
  }
};

export const authenticateWithDevBypass = async (): Promise<string> => {
  try {
    const response = await apiRequest<TelegramAuthResponse>(
      "/api/auth/dev",
      {
        method: "POST",
      },
      { auth: false },
    );

    setAuthToken(response.token);
    return response.token;
  } catch (error) {
    clearAuthToken();
    throw error;
  }
};
