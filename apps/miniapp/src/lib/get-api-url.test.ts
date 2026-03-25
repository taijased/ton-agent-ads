/**
 * Tests for the getApiUrl() logic inside api.ts.
 *
 * Since getApiUrl is not exported, we test it indirectly through apiRequest
 * by inspecting the URL passed to fetch(). These tests run under vitest with
 * jsdom environment, which provides `window` and `window.location`.
 *
 * The compile-time `__API_BASE_URL__` define is declared globally for these tests.
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

// Declare the compile-time define so TypeScript does not complain
declare const __API_BASE_URL__: string;

// We need to control __API_BASE_URL__ at module level.
// vitest with jsdom gives us `window`. We'll use dynamic import + vi.stubGlobal.

describe("getApiUrl — URL routing (via apiRequest)", () => {
  let capturedUrl: string | URL | Request | undefined;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Mock localStorage for auth-storage (getAuthToken returns null)
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    // Capture the URL that fetch is called with
    capturedUrl = undefined;
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      capturedUrl = input;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  describe("on localhost (window.location.hostname = localhost)", () => {
    beforeEach(() => {
      // jsdom sets location to about:blank by default; override hostname
      Object.defineProperty(window, "location", {
        value: { hostname: "localhost" },
        writable: true,
        configurable: true,
      });
    });

    it("preserves /api/auth/dev path as-is", async () => {
      // Stub __API_BASE_URL__ (not needed on localhost, but must exist)
      vi.stubGlobal("__API_BASE_URL__", "");

      const { apiRequest } = await import("./api.js");
      await apiRequest("/api/auth/dev", undefined, { auth: false });

      expect(capturedUrl).toBe("/api/auth/dev");
    });

    it("preserves /api/profile path as-is", async () => {
      vi.stubGlobal("__API_BASE_URL__", "");

      const { apiRequest } = await import("./api.js");
      await apiRequest("/api/profile", undefined, { auth: false });

      expect(capturedUrl).toBe("/api/profile");
    });

    it("preserves /health path without /api prefix", async () => {
      vi.stubGlobal("__API_BASE_URL__", "");

      const { apiRequest } = await import("./api.js");
      await apiRequest("/health", undefined, { auth: false });

      expect(capturedUrl).toBe("/health");
    });
  });

  describe("on 127.0.0.1 (window.location.hostname = 127.0.0.1)", () => {
    beforeEach(() => {
      Object.defineProperty(window, "location", {
        value: { hostname: "127.0.0.1" },
        writable: true,
        configurable: true,
      });
    });

    it("preserves /api/auth/dev path as-is", async () => {
      vi.stubGlobal("__API_BASE_URL__", "");

      const { apiRequest } = await import("./api.js");
      await apiRequest("/api/auth/dev", undefined, { auth: false });

      expect(capturedUrl).toBe("/api/auth/dev");
    });
  });

  describe("in production (non-localhost hostname)", () => {
    beforeEach(() => {
      Object.defineProperty(window, "location", {
        value: { hostname: "ton-agent-ads-miniapp.vercel.app" },
        writable: true,
        configurable: true,
      });
    });

    it("strips /api prefix and prepends base URL for /api/auth/dev", async () => {
      vi.stubGlobal("__API_BASE_URL__", "https://my-api.example.com");

      const { apiRequest } = await import("./api.js");
      await apiRequest("/api/auth/dev", undefined, { auth: false });

      expect(capturedUrl).toBe("https://my-api.example.com/auth/dev");
    });

    it("strips /api prefix and prepends base URL for /api/profile", async () => {
      vi.stubGlobal("__API_BASE_URL__", "https://my-api.example.com");

      const { apiRequest } = await import("./api.js");
      await apiRequest("/api/profile", undefined, { auth: false });

      expect(capturedUrl).toBe("https://my-api.example.com/profile");
    });

    it("does not strip /health (no /api prefix)", async () => {
      vi.stubGlobal("__API_BASE_URL__", "https://my-api.example.com");

      const { apiRequest } = await import("./api.js");
      await apiRequest("/health", undefined, { auth: false });

      expect(capturedUrl).toBe("https://my-api.example.com/health");
    });

    it("handles trailing slash on API_BASE_URL", async () => {
      vi.stubGlobal("__API_BASE_URL__", "https://my-api.example.com/");

      const { apiRequest } = await import("./api.js");
      await apiRequest("/api/campaigns", undefined, { auth: false });

      expect(capturedUrl).toBe("https://my-api.example.com/campaigns");
    });

    it("throws when API_BASE_URL is empty in production", async () => {
      vi.stubGlobal("__API_BASE_URL__", "");

      const { apiRequest } = await import("./api.js");

      await expect(
        apiRequest("/api/profile", undefined, { auth: false }),
      ).rejects.toThrow("API_BASE_URL is not configured");
    });
  });
});
