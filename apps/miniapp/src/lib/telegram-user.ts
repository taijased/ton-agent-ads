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
      expand?: () => void;
      initData?: string;
      initDataUnsafe?: {
        user?: TelegramMiniAppUser;
      };
      ready?: () => void;
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

export const isTelegramWebAppAvailable = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const telegramWindow = window as TelegramWebAppWindow;
  return telegramWindow.Telegram?.WebApp !== undefined;
};

export const initializeTelegramWebApp = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  const telegramWindow = window as TelegramWebAppWindow;
  telegramWindow.Telegram?.WebApp?.ready?.();
  telegramWindow.Telegram?.WebApp?.expand?.();
};

export const getTelegramMiniAppUser = (): TelegramMiniAppUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const telegramWindow = window as TelegramWebAppWindow;
  return telegramWindow.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
};
