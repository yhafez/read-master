/**
 * Tests for Image Optimization Service utilities
 */

import { describe, it, expect } from "vitest";
import {
  getImageKeyWithSize,
  getImageVariantKeys,
  getCacheControlHeader,
  DEFAULT_IMAGE_SIZES,
  IMAGE_SIZE_PRESETS,
} from "./imageOptimization.js";

describe("Image Optimization utilities", () => {
  describe("getImageKeyWithSize", () => {
    it("should add size suffix before extension", () => {
      const key = "users/123/forum/abc/image.jpg";
      const result = getImageKeyWithSize(key, "thumb");
      expect(result).toBe("users/123/forum/abc/image-thumb.jpg");
    });

    it("should handle different extensions", () => {
      expect(getImageKeyWithSize("image.png", "medium")).toBe(
        "image-medium.png"
      );
      expect(getImageKeyWithSize("image.webp", "large")).toBe(
        "image-large.webp"
      );
      expect(getImageKeyWithSize("photo.avif", "thumb")).toBe(
        "photo-thumb.avif"
      );
    });

    it("should handle keys without extension", () => {
      const key = "users/123/images/photo";
      const result = getImageKeyWithSize(key, "thumb");
      expect(result).toBe("users/123/images/photo-thumb");
    });

    it("should handle keys with multiple dots", () => {
      const key = "users/123/images/photo.final.jpg";
      const result = getImageKeyWithSize(key, "medium");
      expect(result).toBe("users/123/images/photo.final-medium.jpg");
    });
  });

  describe("getImageVariantKeys", () => {
    it("should generate variant keys for all default sizes", () => {
      const baseKey = "users/123/forum/abc/image.jpg";
      const result = getImageVariantKeys(baseKey);

      expect(result.size).toBe(3);
      expect(result.get("thumb")).toBe("users/123/forum/abc/image-thumb.jpg");
      expect(result.get("medium")).toBe("users/123/forum/abc/image-medium.jpg");
      expect(result.get("large")).toBe("users/123/forum/abc/image-large.jpg");
    });

    it("should use custom sizes when provided", () => {
      const baseKey = "image.png";
      const customSizes = [
        { name: "sm", width: 100 },
        { name: "lg", width: 500 },
      ];
      const result = getImageVariantKeys(baseKey, customSizes);

      expect(result.size).toBe(2);
      expect(result.get("sm")).toBe("image-sm.png");
      expect(result.get("lg")).toBe("image-lg.png");
    });
  });

  describe("getCacheControlHeader", () => {
    it("should return long cache for images", () => {
      expect(getCacheControlHeader("image/jpeg")).toBe(
        "public, max-age=31536000, immutable"
      );
      expect(getCacheControlHeader("image/png")).toBe(
        "public, max-age=31536000, immutable"
      );
      expect(getCacheControlHeader("image/webp")).toBe(
        "public, max-age=31536000, immutable"
      );
    });

    it("should return default cache for non-images", () => {
      expect(getCacheControlHeader("application/json")).toBe(
        "public, max-age=86400"
      );
      expect(getCacheControlHeader("text/html")).toBe("public, max-age=86400");
    });
  });

  describe("DEFAULT_IMAGE_SIZES", () => {
    it("should have thumb, medium, and large sizes", () => {
      expect(DEFAULT_IMAGE_SIZES).toHaveLength(3);

      const names = DEFAULT_IMAGE_SIZES.map((s) => s.name);
      expect(names).toContain("thumb");
      expect(names).toContain("medium");
      expect(names).toContain("large");
    });

    it("should have correct dimensions", () => {
      const thumb = DEFAULT_IMAGE_SIZES.find((s) => s.name === "thumb");
      const medium = DEFAULT_IMAGE_SIZES.find((s) => s.name === "medium");
      const large = DEFAULT_IMAGE_SIZES.find((s) => s.name === "large");

      expect(thumb?.width).toBe(150);
      expect(medium?.width).toBe(400);
      expect(large?.width).toBe(800);
    });
  });

  describe("IMAGE_SIZE_PRESETS", () => {
    it("should have bookCover preset", () => {
      expect(IMAGE_SIZE_PRESETS.bookCover).toBeDefined();
      expect(IMAGE_SIZE_PRESETS.bookCover).toHaveLength(3);
    });

    it("should have avatar preset with square dimensions", () => {
      expect(IMAGE_SIZE_PRESETS.avatar).toBeDefined();

      for (const size of IMAGE_SIZE_PRESETS.avatar) {
        expect(size.width).toBe(size.height);
        expect(size.fit).toBe("cover");
      }
    });

    it("should have forum preset for content images", () => {
      expect(IMAGE_SIZE_PRESETS.forum).toBeDefined();
      expect(IMAGE_SIZE_PRESETS.forum).toHaveLength(3);

      // Forum images should scale inside container
      for (const size of IMAGE_SIZE_PRESETS.forum) {
        expect(size.fit).toBe("inside");
      }
    });
  });
});
