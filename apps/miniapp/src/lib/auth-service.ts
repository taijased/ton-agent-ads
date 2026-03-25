import type { TelegramAuthResponse } from "@repo/types";
import { apiRequest } from "./api";
import { clearAuthToken, setAuthToken } from "./auth-storage";
import {
  getTelegramInitData,
  isTelegramWebAppAvailable,
} from "./telegram-user";

export const TELEGRAM_BOT_URL = "https://t.me/agentads_bot";

export const hasTelegramInitData = (): boolean =>
  getTelegramInitData().trim().length > 0;

export const canOpenTelegramBot = (): boolean => !isTelegramWebAppAvailable();

export const authenticateWithTelegram = async (): Promise<string> => {
  const initData = getTelegramInitData().trim();

  if (initData.length === 0) {
    throw new Error(
      "Telegram session data is unavailable. Open this mini app from Telegram and try again.",
    );
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

export const openTelegramBot = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href = TELEGRAM_BOT_URL;
};
