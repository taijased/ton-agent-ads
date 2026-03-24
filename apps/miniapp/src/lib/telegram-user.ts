export interface TelegramMiniAppUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

interface TelegramWebAppWindow extends Window {
  Telegram?: {
    WebApp?: {
      initDataUnsafe?: {
        user?: TelegramMiniAppUser;
      };
    };
  };
}

export const getTelegramMiniAppUser = (): TelegramMiniAppUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const telegramWindow = window as TelegramWebAppWindow;
  return telegramWindow.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
};
