export interface TelegramMiniAppUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

export interface TelegramWebApp {
  expand?: () => void;
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramMiniAppUser;
  };
  ready?: () => void;
}

export interface TelegramWebAppWindow extends Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}

const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const telegramWindow = window as TelegramWebAppWindow;
  return telegramWindow.Telegram?.WebApp ?? null;
};

const getTelegramLaunchInitData = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const searchParams = new URLSearchParams(window.location.search);
  const rawHash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(rawHash);
  const nestedHashQueryIndex = rawHash.indexOf("?");
  const nestedHashParams =
    nestedHashQueryIndex >= 0
      ? new URLSearchParams(rawHash.slice(nestedHashQueryIndex + 1))
      : null;

  const candidates = [
    searchParams.get("tgWebAppData"),
    hashParams.get("tgWebAppData"),
    nestedHashParams?.get("tgWebAppData") ?? null,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return "";
};

export const getTelegramInitData = (): string => {
  const runtimeInitData = getTelegramWebApp()?.initData?.trim();

  if (runtimeInitData && runtimeInitData.length > 0) {
    return runtimeInitData;
  }

  return getTelegramLaunchInitData();
};

export const isTelegramWebAppAvailable = (): boolean => {
  return getTelegramWebApp() !== null || getTelegramLaunchInitData().length > 0;
};

export const initializeTelegramWebApp = (): void => {
  const telegramWebApp = getTelegramWebApp();
  telegramWebApp?.ready?.();
  telegramWebApp?.expand?.();
};

export const getTelegramMiniAppUser = (): TelegramMiniAppUser | null => {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
};
