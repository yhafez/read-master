/**
 * Tests for CDN Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCDNUrl,
  getCDNUrlWithSize,
  getCDNUrlWithTransform,
  addCacheBuster,
  generateContentHash,
  generateSrcSet,
  generateSizesAttribute,
  getCacheControlHeader,
  isCDNEnabled,
  getConfig,
  preloadImages,
  preconnectToCDN,
  IMAGE_SIZES,
  BOOK_COVER_SIZES,
  AVATAR_SIZES,
  CACHE_DURATIONS,
} from "./cdn";

describe("CDN Utilities", () => {
  beforeEach(() => {
    // Reset env before each test
    vi.stubEnv("VITE_CDN_URL", "");
    vi.stubEnv("VITE_R2_PUBLIC_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getCDNUrl", () => {
    it("should return original path when CDN is disabled", () => {
      const path = "images/photo.jpg";
      expect(getCDNUrl(path)).toBe(path);
    });

    it("should return full CDN URL when CDN is enabled", () => {
      vi.stubEnv("VITE_CDN_URL", "https://cdn.example.com");

      const path = "images/photo.jpg";
      expect(getCDNUrl(path)).toBe("https://cdn.example.com/images/photo.jpg");
    });

    it("should handle paths with leading slash", () => {
      vi.stubEnv("VITE_CDN_URL", "https://cdn.example.com");

      expect(getCDNUrl("/images/photo.jpg")).toBe(
        "https://cdn.example.com/images/photo.jpg"
      );
    });

    it("should handle CDN URL with trailing slash", () => {
      vi.stubEnv("VITE_CDN_URL", "https://cdn.example.com/");

      expect(getCDNUrl("images/photo.jpg")).toBe(
        "https://cdn.example.com/images/photo.jpg"
      );
    });

    it("should return empty string for empty path", () => {
      expect(getCDNUrl("")).toBe("");
    });

    it("should fall back to R2 public URL if CDN URL is not set", () => {
      vi.stubEnv("VITE_R2_PUBLIC_URL", "https://r2.example.com");

      expect(getCDNUrl("images/photo.jpg")).toBe(
        "https://r2.example.com/images/photo.jpg"
      );
    });
  });

  describe("getCDNUrlWithSize", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_CDN_URL", "https://cdn.example.com");
    });

    it("should add size suffix to image URL", () => {
      expect(getCDNUrlWithSize("images/photo.jpg", "thumb")).toBe(
        "https://cdn.example.com/images/photo-thumb.jpg"
      );
    });

    it("should handle medium size", () => {
      expect(getCDNUrlWithSize("images/photo.png", "medium")).toBe(
        "https://cdn.example.com/images/photo-medium.png"
      );
    });

    it("should handle large size", () => {
      expect(getCDNUrlWithSize("images/photo.webp", "large")).toBe(
        "https://cdn.example.com/images/photo-large.webp"
      );
    });

    it("should return original URL for original size", () => {
      expect(getCDNUrlWithSize("images/photo.jpg", "original")).toBe(
        "https://cdn.example.com/images/photo.jpg"
      );
    });

    it("should handle paths without extension", () => {
      expect(getCDNUrlWithSize("images/photo", "thumb")).toBe(
        "https://cdn.example.com/images/photo-thumb"
      );
    });

    it("should handle paths with multiple dots", () => {
      expect(getCDNUrlWithSize("images/my.photo.final.jpg", "medium")).toBe(
        "https://cdn.example.com/images/my.photo.final-medium.jpg"
      );
    });
  });

  describe("getCDNUrlWithTransform", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_CDN_URL", "https://cdn.example.com");
    });

    it("should return original path when CDN is disabled", () => {
      vi.stubEnv("VITE_CDN_URL", "");
      expect(getCDNUrlWithTransform("images/photo.jpg", { width: 300 })).toBe(
        "images/photo.jpg"
      );
    });

    it("should add width parameter", () => {
      expect(getCDNUrlWithTransform("images/photo.jpg", { width: 300 })).toBe(
        "https://cdn.example.com/cdn-cgi/image/width=300/images/photo.jpg"
      );
    });

    it("should add height parameter", () => {
      expect(getCDNUrlWithTransform("images/photo.jpg", { height: 200 })).toBe(
        "https://cdn.example.com/cdn-cgi/image/height=200/images/photo.jpg"
      );
    });

    it("should add quality parameter", () => {
      expect(getCDNUrlWithTransform("images/photo.jpg", { quality: 80 })).toBe(
        "https://cdn.example.com/cdn-cgi/image/quality=80/images/photo.jpg"
      );
    });

    it("should add format parameter", () => {
      expect(
        getCDNUrlWithTransform("images/photo.jpg", { format: "webp" })
      ).toBe(
        "https://cdn.example.com/cdn-cgi/image/format=webp/images/photo.jpg"
      );
    });

    it("should add fit parameter", () => {
      expect(getCDNUrlWithTransform("images/photo.jpg", { fit: "cover" })).toBe(
        "https://cdn.example.com/cdn-cgi/image/fit=cover/images/photo.jpg"
      );
    });

    it("should combine multiple parameters", () => {
      const result = getCDNUrlWithTransform("images/photo.jpg", {
        width: 300,
        height: 200,
        quality: 80,
        format: "webp",
        fit: "cover",
      });
      expect(result).toBe(
        "https://cdn.example.com/cdn-cgi/image/width=300,height=200,quality=80,format=webp,fit=cover/images/photo.jpg"
      );
    });

    it("should return regular CDN URL when no options provided", () => {
      expect(getCDNUrlWithTransform("images/photo.jpg", {})).toBe(
        "https://cdn.example.com/images/photo.jpg"
      );
    });
  });

  describe("addCacheBuster", () => {
    it("should add version parameter to URL without query string", () => {
      const result = addCacheBuster("https://example.com/image.jpg", "1.0.0");
      expect(result).toBe("https://example.com/image.jpg?v=1.0.0");
    });

    it("should add version parameter to URL with existing query string", () => {
      const result = addCacheBuster(
        "https://example.com/image.jpg?size=large",
        "1.0.0"
      );
      expect(result).toBe("https://example.com/image.jpg?size=large&v=1.0.0");
    });

    it("should use timestamp when no version provided and no env version", () => {
      vi.stubEnv("VITE_APP_VERSION", "");
      const result = addCacheBuster("https://example.com/image.jpg");
      // Should contain a numeric timestamp
      expect(result).toMatch(/\?v=\d+$/);
    });
  });

  describe("generateContentHash", () => {
    it("should generate consistent hash for same content", () => {
      const content = "Hello, World!";
      const hash1 = generateContentHash(content);
      const hash2 = generateContentHash(content);
      expect(hash1).toBe(hash2);
    });

    it("should generate different hash for different content", () => {
      const hash1 = generateContentHash("Hello");
      const hash2 = generateContentHash("World");
      expect(hash1).not.toBe(hash2);
    });

    it("should handle ArrayBuffer content", () => {
      const buffer = new ArrayBuffer(8);
      const view = new Uint8Array(buffer);
      view[0] = 72; // 'H'
      view[7] = 33; // '!'

      const hash = generateContentHash(buffer);
      expect(hash).toBeTruthy();
      expect(hash.length).toBeLessThanOrEqual(8);
    });

    it("should return alphanumeric hash", () => {
      const hash = generateContentHash("test content");
      expect(hash).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe("generateSrcSet", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_CDN_URL", "https://cdn.example.com");
    });

    it("should generate srcSet string from sizes", () => {
      const result = generateSrcSet("images/photo.jpg", [
        { width: 150, suffix: "thumb" },
        { width: 400, suffix: "medium" },
      ]);

      expect(result).toBe(
        "https://cdn.example.com/images/photo-thumb.jpg 150w, " +
          "https://cdn.example.com/images/photo-medium.jpg 400w"
      );
    });

    it("should handle single size", () => {
      const result = generateSrcSet("images/photo.jpg", [
        { width: 300, suffix: "sm" },
      ]);
      expect(result).toBe("https://cdn.example.com/images/photo-sm.jpg 300w");
    });

    it("should handle empty sizes array", () => {
      const result = generateSrcSet("images/photo.jpg", []);
      expect(result).toBe("");
    });
  });

  describe("generateSizesAttribute", () => {
    it("should generate sizes with breakpoints", () => {
      const result = generateSizesAttribute([
        { maxWidth: 600, size: "100vw" },
        { maxWidth: 1200, size: "50vw" },
        { size: "400px" },
      ]);

      expect(result).toBe(
        "(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 400px"
      );
    });

    it("should handle single size without breakpoint", () => {
      const result = generateSizesAttribute([{ size: "100vw" }]);
      expect(result).toBe("100vw");
    });

    it("should handle multiple breakpoints", () => {
      const result = generateSizesAttribute([
        { maxWidth: 480, size: "100vw" },
        { maxWidth: 768, size: "75vw" },
        { maxWidth: 1024, size: "50vw" },
        { size: "400px" },
      ]);

      expect(result).toBe(
        "(max-width: 480px) 100vw, (max-width: 768px) 75vw, (max-width: 1024px) 50vw, 400px"
      );
    });
  });

  describe("getCacheControlHeader", () => {
    it("should return immutable cache header", () => {
      const result = getCacheControlHeader("immutable");
      expect(result).toBe("public, max-age=31536000, immutable");
    });

    it("should return images cache header", () => {
      const result = getCacheControlHeader("images");
      expect(result).toBe("public, max-age=2592000");
    });

    it("should return dynamic cache header", () => {
      const result = getCacheControlHeader("dynamic");
      expect(result).toBe("public, max-age=3600, must-revalidate");
    });

    it("should return no-cache header", () => {
      const result = getCacheControlHeader("none");
      expect(result).toBe("no-cache, no-store, must-revalidate");
    });

    it("should allow custom max-age", () => {
      const result = getCacheControlHeader("images", 86400);
      expect(result).toBe("public, max-age=86400");
    });
  });

  describe("isCDNEnabled", () => {
    it("should return false when CDN is not configured", () => {
      expect(isCDNEnabled()).toBe(false);
    });

    it("should return true when CDN URL is set", () => {
      vi.stubEnv("VITE_CDN_URL", "https://cdn.example.com");
      expect(isCDNEnabled()).toBe(true);
    });

    it("should return true when R2 public URL is set", () => {
      vi.stubEnv("VITE_R2_PUBLIC_URL", "https://r2.example.com");
      expect(isCDNEnabled()).toBe(true);
    });
  });

  describe("getConfig", () => {
    it("should return config object", () => {
      vi.stubEnv("VITE_CDN_URL", "https://cdn.example.com");

      const config = getConfig();
      expect(config).toHaveProperty("baseUrl", "https://cdn.example.com");
      expect(config).toHaveProperty("enabled", true);
      expect(config).toHaveProperty("defaultCacheDuration");
    });

    it("should return disabled config when not configured", () => {
      const config = getConfig();
      expect(config.enabled).toBe(false);
      expect(config.baseUrl).toBe("");
    });
  });

  describe("preloadImages", () => {
    let appendChildSpy: ReturnType<typeof vi.fn>;
    let querySelectorSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      appendChildSpy = vi.fn();
      querySelectorSpy = vi.fn().mockReturnValue(null);

      vi.stubGlobal("document", {
        createElement: vi.fn().mockReturnValue({
          rel: "",
          as: "",
          href: "",
          fetchPriority: "",
          crossOrigin: "",
        }),
        head: {
          appendChild: appendChildSpy,
        },
        querySelector: querySelectorSpy,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should create preload links for images", () => {
      preloadImages([
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ]);
      expect(appendChildSpy).toHaveBeenCalledTimes(2);
    });

    it("should not create duplicate preload links", () => {
      querySelectorSpy.mockReturnValue(document.createElement("link"));
      preloadImages(["https://example.com/image.jpg"]);
      expect(appendChildSpy).not.toHaveBeenCalled();
    });

    it("should handle empty array", () => {
      preloadImages([]);
      expect(appendChildSpy).not.toHaveBeenCalled();
    });
  });

  describe("preconnectToCDN", () => {
    let appendChildSpy: ReturnType<typeof vi.fn>;
    let querySelectorSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      appendChildSpy = vi.fn();
      querySelectorSpy = vi.fn().mockReturnValue(null);

      vi.stubGlobal("document", {
        createElement: vi.fn().mockReturnValue({
          rel: "",
          href: "",
          crossOrigin: "",
        }),
        head: {
          appendChild: appendChildSpy,
        },
        querySelector: querySelectorSpy,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should create preconnect links when CDN is enabled", () => {
      vi.stubEnv("VITE_CDN_URL", "https://cdn.example.com");
      preconnectToCDN();
      // Should add both preconnect and dns-prefetch
      expect(appendChildSpy).toHaveBeenCalledTimes(2);
    });

    it("should not create links when CDN is disabled", () => {
      preconnectToCDN();
      expect(appendChildSpy).not.toHaveBeenCalled();
    });
  });

  describe("Size Constants", () => {
    it("should have correct IMAGE_SIZES", () => {
      expect(IMAGE_SIZES.thumb).toEqual({
        width: 150,
        height: 150,
        suffix: "thumb",
      });
      expect(IMAGE_SIZES.medium).toEqual({
        width: 400,
        height: 400,
        suffix: "medium",
      });
      expect(IMAGE_SIZES.large).toEqual({
        width: 800,
        height: 800,
        suffix: "large",
      });
      expect(IMAGE_SIZES.original).toEqual({ suffix: "original" });
    });

    it("should have correct BOOK_COVER_SIZES", () => {
      expect(BOOK_COVER_SIZES.thumb).toEqual({
        width: 80,
        height: 120,
        suffix: "thumb",
      });
      expect(BOOK_COVER_SIZES.medium).toEqual({
        width: 200,
        height: 300,
        suffix: "medium",
      });
      expect(BOOK_COVER_SIZES.large).toEqual({
        width: 400,
        height: 600,
        suffix: "large",
      });
    });

    it("should have correct AVATAR_SIZES", () => {
      expect(AVATAR_SIZES.thumb).toEqual({
        width: 40,
        height: 40,
        suffix: "thumb",
      });
      expect(AVATAR_SIZES.medium).toEqual({
        width: 96,
        height: 96,
        suffix: "medium",
      });
      expect(AVATAR_SIZES.large).toEqual({
        width: 200,
        height: 200,
        suffix: "large",
      });
    });

    it("should have correct CACHE_DURATIONS", () => {
      expect(CACHE_DURATIONS.immutable).toBe(31536000); // 1 year
      expect(CACHE_DURATIONS.images).toBe(2592000); // 30 days
      expect(CACHE_DURATIONS.dynamic).toBe(3600); // 1 hour
      expect(CACHE_DURATIONS.none).toBe(0);
    });
  });
});
