import { getTelegramMiniAppUser } from "./telegram-user";

const parseErrorMessage = async (response: Response): Promise<string> => {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
    error?: string;
    reason?: string;
  } | null;

  return (
    body?.message ??
    body?.reason ??
    body?.error ??
    `API request failed with status ${response.status}`
  );
};

const buildHeaders = (headers?: HeadersInit): Headers => {
  const requestHeaders = new Headers(headers);
  const user = getTelegramMiniAppUser();

  if (user !== null) {
    requestHeaders.set("x-miniapp-user-id", String(user.id));

    if (typeof user.username === "string" && user.username.trim().length > 0) {
      requestHeaders.set("x-miniapp-username", user.username.trim());
    }

    if (
      typeof user.first_name === "string" &&
      user.first_name.trim().length > 0
    ) {
      requestHeaders.set("x-miniapp-first-name", user.first_name.trim());
    }

    if (
      typeof user.last_name === "string" &&
      user.last_name.trim().length > 0
    ) {
      requestHeaders.set("x-miniapp-last-name", user.last_name.trim());
    }

    if (
      typeof user.photo_url === "string" &&
      user.photo_url.trim().length > 0
    ) {
      requestHeaders.set("x-miniapp-photo-url", user.photo_url.trim());
    }
  }

  return requestHeaders;
};

export const apiRequest = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: buildHeaders(init?.headers),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
};
