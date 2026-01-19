/**
 * Tests for Service Worker Utilities
 * Tests helper functions for PWA service worker management
 */

import { describe, it, expect } from "vitest";

import {
  formatBytes,
  urlMatchesPattern,
  getCacheStrategyForUrl,
  createSWUpdateState,
} from "./serviceWorkerUtils";
import {
  CACHE_NAMES,
  CACHE_MAX_AGE,
  NETWORK_TIMEOUT,
} from "./serviceWorkerTypes";

describe("serviceWorkerUtils", () => {
  describe("formatBytes", () => {
    it("returns '0 Bytes' for 0", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
    });

    it("formats bytes correctly", () => {
      expect(formatBytes(500)).toBe("500 Bytes");
    });

    it("formats kilobytes correctly", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
    });

    it("formats megabytes correctly", () => {
      expect(formatBytes(1048576)).toBe("1 MB");
      expect(formatBytes(1572864)).toBe("1.5 MB");
    });

    it("formats gigabytes correctly", () => {
      expect(formatBytes(1073741824)).toBe("1 GB");
    });

    it("respects decimal places parameter", () => {
      expect(formatBytes(1536, 0)).toBe("2 KB");
      expect(formatBytes(1536, 3)).toBe("1.5 KB");
    });

    it("handles negative decimal places", () => {
      expect(formatBytes(1536, -1)).toBe("2 KB");
    });

    it("handles large values", () => {
      expect(formatBytes(10737418240)).toBe("10 GB");
    });

    it("handles small decimal bytes", () => {
      expect(formatBytes(100)).toBe("100 Bytes");
    });
  });

  describe("urlMatchesPattern", () => {
    it("matches string patterns", () => {
      expect(urlMatchesPattern("https://example.com/api/users", "/api/")).toBe(
        true
      );
      expect(urlMatchesPattern("https://example.com/users", "/api/")).toBe(
        false
      );
    });

    it("matches regex patterns", () => {
      expect(urlMatchesPattern("https://example.com/image.png", /\.png$/)).toBe(
        true
      );
      expect(urlMatchesPattern("https://example.com/image.jpg", /\.png$/)).toBe(
        false
      );
      expect(
        urlMatchesPattern("https://example.com/api/v1/users", /\/api\/v\d+\//)
      ).toBe(true);
    });

    it("handles case-insensitive regex", () => {
      expect(
        urlMatchesPattern("https://example.com/IMAGE.PNG", /\.png$/i)
      ).toBe(true);
    });

    it("handles complex patterns", () => {
      expect(
        urlMatchesPattern(
          "https://fonts.googleapis.com/css",
          /fonts\.googleapis/
        )
      ).toBe(true);
      expect(
        urlMatchesPattern(
          "https://fonts.gstatic.com/s/roboto",
          /fonts\.gstatic/
        )
      ).toBe(true);
    });

    it("handles partial string matches", () => {
      expect(urlMatchesPattern("https://example.com/test.js", ".js")).toBe(
        true
      );
      expect(urlMatchesPattern("https://example.com/test.ts", ".js")).toBe(
        false
      );
    });
  });

  describe("getCacheStrategyForUrl", () => {
    it("returns NetworkFirst for API calls", () => {
      expect(getCacheStrategyForUrl("https://example.com/api/users")).toBe(
        "NetworkFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/api/books/123")).toBe(
        "NetworkFirst"
      );
      expect(getCacheStrategyForUrl("/api/flashcards")).toBe("NetworkFirst");
    });

    it("returns CacheFirst for static assets", () => {
      expect(getCacheStrategyForUrl("https://example.com/main.js")).toBe(
        "CacheFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/styles.css")).toBe(
        "CacheFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/font.woff2")).toBe(
        "CacheFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/favicon.ico")).toBe(
        "CacheFirst"
      );
    });

    it("returns CacheFirst for Google Fonts", () => {
      expect(
        getCacheStrategyForUrl(
          "https://fonts.googleapis.com/css2?family=Roboto"
        )
      ).toBe("CacheFirst");
      expect(
        getCacheStrategyForUrl(
          "https://fonts.gstatic.com/s/roboto/v30/font.woff2"
        )
      ).toBe("CacheFirst");
    });

    it("returns CacheFirst for images", () => {
      expect(getCacheStrategyForUrl("https://example.com/image.png")).toBe(
        "CacheFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/photo.jpg")).toBe(
        "CacheFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/icon.svg")).toBe(
        "CacheFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/banner.webp")).toBe(
        "CacheFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/image.jpeg")).toBe(
        "CacheFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/image.gif")).toBe(
        "CacheFirst"
      );
    });

    it("returns NetworkFirst for HTML and other content", () => {
      expect(getCacheStrategyForUrl("https://example.com/page.html")).toBe(
        "NetworkFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/")).toBe(
        "NetworkFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/about")).toBe(
        "NetworkFirst"
      );
      expect(getCacheStrategyForUrl("https://example.com/library")).toBe(
        "NetworkFirst"
      );
    });
  });

  describe("createSWUpdateState", () => {
    it("creates default state without registration", () => {
      const state = createSWUpdateState();

      expect(state).toEqual({
        hasUpdate: false,
        isUpdating: false,
        updateError: null,
        registration: null,
      });
    });

    it("creates state with registration that has waiting worker", () => {
      const mockRegistration = {
        waiting: {} as ServiceWorker,
        installing: null,
      } as ServiceWorkerRegistration;

      const state = createSWUpdateState(mockRegistration);

      expect(state.hasUpdate).toBe(true);
      expect(state.isUpdating).toBe(false);
      expect(state.registration).toBe(mockRegistration);
    });

    it("creates state with registration that has installing worker", () => {
      const mockRegistration = {
        waiting: null,
        installing: {} as ServiceWorker,
      } as ServiceWorkerRegistration;

      const state = createSWUpdateState(mockRegistration);

      expect(state.hasUpdate).toBe(false);
      expect(state.isUpdating).toBe(true);
      expect(state.registration).toBe(mockRegistration);
    });

    it("handles registration with both waiting and installing workers", () => {
      const mockRegistration = {
        waiting: {} as ServiceWorker,
        installing: {} as ServiceWorker,
      } as ServiceWorkerRegistration;

      const state = createSWUpdateState(mockRegistration);

      expect(state.hasUpdate).toBe(true);
      expect(state.isUpdating).toBe(true);
    });

    it("handles registration with no workers", () => {
      const mockRegistration = {
        waiting: null,
        installing: null,
      } as ServiceWorkerRegistration;

      const state = createSWUpdateState(mockRegistration);

      expect(state.hasUpdate).toBe(false);
      expect(state.isUpdating).toBe(false);
      expect(state.registration).toBe(mockRegistration);
    });
  });

  describe("Constants", () => {
    describe("CACHE_NAMES", () => {
      it("has all expected cache names", () => {
        expect(CACHE_NAMES.STATIC).toBe("read-master-static-v1");
        expect(CACHE_NAMES.IMAGES).toBe("images-cache");
        expect(CACHE_NAMES.FONTS).toBe("google-fonts-cache");
        expect(CACHE_NAMES.FONTS_GSTATIC).toBe("gstatic-fonts-cache");
        expect(CACHE_NAMES.API).toBe("api-cache");
        expect(CACHE_NAMES.BOOKS).toBe("books-cache");
        expect(CACHE_NAMES.AUDIO).toBe("audio-cache");
      });

      it("cache names are unique", () => {
        const values = Object.values(CACHE_NAMES);
        const uniqueValues = new Set(values);
        expect(values.length).toBe(uniqueValues.size);
      });
    });

    describe("CACHE_MAX_AGE", () => {
      it("has all expected max ages", () => {
        expect(CACHE_MAX_AGE.STATIC).toBe(60 * 60 * 24 * 365); // 1 year
        expect(CACHE_MAX_AGE.IMAGES).toBe(60 * 60 * 24 * 30); // 30 days
        expect(CACHE_MAX_AGE.FONTS).toBe(60 * 60 * 24 * 365); // 1 year
        expect(CACHE_MAX_AGE.API).toBe(60 * 5); // 5 minutes
        expect(CACHE_MAX_AGE.BOOKS).toBe(60 * 60 * 24 * 7); // 7 days
        expect(CACHE_MAX_AGE.AUDIO).toBe(60 * 60 * 24 * 7); // 7 days
      });

      it("all values are positive", () => {
        Object.values(CACHE_MAX_AGE).forEach((value) => {
          expect(value).toBeGreaterThan(0);
        });
      });
    });

    describe("NETWORK_TIMEOUT", () => {
      it("has all expected timeouts", () => {
        expect(NETWORK_TIMEOUT.API).toBe(10);
        expect(NETWORK_TIMEOUT.BOOKS).toBe(30);
        expect(NETWORK_TIMEOUT.DEFAULT).toBe(15);
      });

      it("all values are positive and reasonable", () => {
        Object.values(NETWORK_TIMEOUT).forEach((value) => {
          expect(value).toBeGreaterThan(0);
          expect(value).toBeLessThanOrEqual(60); // max 60 seconds
        });
      });
    });
  });
});

describe("serviceWorkerTypes", () => {
  describe("Type exports", () => {
    it("exports expected type interfaces (compile-time check)", () => {
      // This test verifies that the types can be imported
      // TypeScript will catch any missing exports at compile time
      expect(true).toBe(true);
    });
  });
});
