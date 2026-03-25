import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getTelegramInitData,
  initializeTelegramWebApp,
  isTelegramWebAppAvailable,
  type TelegramWebAppWindow,
} from "./telegram-user";

const setUrl = (url: string): void => {
  window.history.replaceState({}, "", url);
};

describe("telegram-user", () => {
  afterEach(() => {
    delete (window as TelegramWebAppWindow).Telegram;
    setUrl("/");
  });

  it("prefers runtime initData from Telegram.WebApp", () => {
    (window as TelegramWebAppWindow).Telegram = {
      WebApp: {
        initData: "query_id=runtime&hash=runtime-hash",
      },
    };
    setUrl("/?tgWebAppData=query_id%3Durl%26hash%3Durl-hash");

    expect(getTelegramInitData()).toBe("query_id=runtime&hash=runtime-hash");
  });

  it("falls back to tgWebAppData from the URL query string", () => {
    setUrl("/?tgWebAppData=query_id%3Dquery%26hash%3Dquery-hash");

    expect(getTelegramInitData()).toBe("query_id=query&hash=query-hash");
    expect(isTelegramWebAppAvailable()).toBe(true);
  });

  it("falls back to tgWebAppData nested inside the hash route", () => {
    setUrl("/#/login?tgWebAppData=query_id%3Dhash%26hash%3Dhash-value");

    expect(getTelegramInitData()).toBe("query_id=hash&hash=hash-value");
    expect(isTelegramWebAppAvailable()).toBe(true);
  });

  it("initializes Telegram WebApp runtime when available", () => {
    const ready = vi.fn();
    const expand = vi.fn();

    (window as TelegramWebAppWindow).Telegram = {
      WebApp: {
        ready,
        expand,
      },
    };

    initializeTelegramWebApp();

    expect(ready).toHaveBeenCalledTimes(1);
    expect(expand).toHaveBeenCalledTimes(1);
  });
});
