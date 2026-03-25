import { clearAuthToken, getAuthToken } from "./auth-storage";

export const AUTH_EXPIRED_EVENT = "miniapp-auth-expired";
declare const __API_BASE_URL__: string;

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

const getApiUrl = (path: string): string => {
  const configuredBaseUrl =
    typeof __API_BASE_URL__ === "string" ? __API_BASE_URL__.trim() : "";

  // On localhost: always return path as-is (Vite proxy handles /api → API server)
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";

    if (isLocal) {
      return path;
    }
  }

  // Production: strip /api prefix (Fastify routes don't have it) and prepend base URL
  if (configuredBaseUrl.length === 0) {
    throw new Error("API_BASE_URL is not configured for this miniapp build.");
  }

  const resolvedPath = path.replace(/^\/api(?=\/)/, "");
  const normalizedBaseUrl = configuredBaseUrl.replace(/\/$/, "");
  return `${normalizedBaseUrl}${resolvedPath}`;
};

export const apiRequest = async <T>(
  path: string,
  init?: RequestInit,
  options?: { auth?: boolean },
): Promise<T> => {
  const includeAuth = options?.auth !== false;
  const response = await fetch(getApiUrl(path), {
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
