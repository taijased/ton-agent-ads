export interface TelegramMiniAppUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

export interface TelegramWebAppWindow extends Window {
  Telegram?: {
    WebApp?: {
      initData?: string;
      initDataUnsafe?: {
        user?: TelegramMiniAppUser;
      };
    };
  };
}

export const getTelegramInitData = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const telegramWindow = window as TelegramWebAppWindow;
  return telegramWindow.Telegram?.WebApp?.initData?.trim() ?? "";
};

export const getTelegramMiniAppUser = (): TelegramMiniAppUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const telegramWindow = window as TelegramWebAppWindow;
  return telegramWindow.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
};
