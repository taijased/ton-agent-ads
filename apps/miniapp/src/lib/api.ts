import { clearAuthToken, getAuthToken } from "./auth-storage";

export const AUTH_EXPIRED_EVENT = "miniapp-auth-expired";

export class ApiError extends Error {
  public readonly status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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

const buildHeaders = (headers?: HeadersInit, includeAuth = true): Headers => {
  const requestHeaders = new Headers(headers);

  if (includeAuth) {
    const token = getAuthToken();

    if (token !== null) {
      requestHeaders.set("authorization", `Bearer ${token}`);
    }
  }

  return requestHeaders;
};

export const apiRequest = async <T>(
  path: string,
  init?: RequestInit,
  options?: { auth?: boolean },
): Promise<T> => {
  const includeAuth = options?.auth !== false;
  const response = await fetch(path, {
    ...init,
    headers: buildHeaders(init?.headers, includeAuth),
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);

    if (includeAuth && response.status === 401) {
      clearAuthToken();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      }
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
};

export const isApiErrorStatus = (
  error: unknown,
  status: number,
): error is ApiError => error instanceof ApiError && error.status === status;
