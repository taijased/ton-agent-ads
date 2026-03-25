const AUTH_TOKEN_STORAGE_KEY = "miniapp-auth-token";
const POST_LOGIN_HASH_STORAGE_KEY = "miniapp-post-login-hash";

const canUseStorage = (): boolean => typeof window !== "undefined";

export const getAuthToken = (): string | null => {
  if (!canUseStorage()) {
    return null;
  }

  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim();
  return token ? token : null;
};

export const setAuthToken = (token: string): void => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = (): void => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

export const rememberPostLoginHash = (hash: string): void => {
  if (!canUseStorage()) {
    return;
  }

  const trimmedHash = hash.trim();

  if (trimmedHash.length === 0 || trimmedHash === "#/login") {
    return;
  }

  window.sessionStorage.setItem(POST_LOGIN_HASH_STORAGE_KEY, trimmedHash);
};

export const consumePostLoginHash = (): string | null => {
  if (!canUseStorage()) {
    return null;
  }

  const value = window.sessionStorage.getItem(POST_LOGIN_HASH_STORAGE_KEY);
  window.sessionStorage.removeItem(POST_LOGIN_HASH_STORAGE_KEY);
  return value?.trim() ? value : null;
};
