/**
 * Tests for OptimizedImage component utilities
 */

import { describe, it, expect } from "vitest";
import {
  getImageUrlWithSize,
  generateSrcSet,
  DEFAULT_IMAGE_SIZES,
} from "./OptimizedImage";

describe("OptimizedImage utilities", () => {
  describe("getImageUrlWithSize", () => {
    it("should add size suffix before extension", () => {
      const url = "https://cdn.example.com/images/photo.jpg";
      const result = getImageUrlWithSize(url, "thumb");
      expect(result).toBe("https://cdn.example.com/images/photo-thumb.jpg");
    });

    it("should handle different extensions", () => {
      expect(getImageUrlWithSize("image.png", "medium")).toBe(
        "image-medium.png"
      );
      expect(getImageUrlWithSize("image.webp", "large")).toBe(
        "image-large.webp"
      );
      expect(getImageUrlWithSize("image.avif", "thumb")).toBe(
        "image-thumb.avif"
      );
    });

    it("should return original URL if no extension found", () => {
      // When no dot in URL, returns original unchanged
      const path = "images/photo";
      const result = getImageUrlWithSize(path, "thumb");
      expect(result).toBe("images/photo");
    });

    it("should handle URLs with multiple dots", () => {
      const url = "https://cdn.example.com/images/user.photo.final.jpg";
      const result = getImageUrlWithSize(url, "medium");
      expect(result).toBe(
        "https://cdn.example.com/images/user.photo.final-medium.jpg"
      );
    });

    it("should handle URLs with query parameters", () => {
      // Note: This function doesn't handle query params, so they become part of the extension
      const url = "image.jpg?v=123";
      const result = getImageUrlWithSize(url, "thumb");
      expect(result).toBe("image-thumb.jpg?v=123");
    });
  });

  describe("generateSrcSet", () => {
    it("should generate srcset string from sizes array", () => {
      const url = "https://cdn.example.com/images/photo.jpg";
      const sizes = [
        { width: 150, suffix: "thumb" },
        { width: 400, suffix: "medium" },
        { width: 800, suffix: "large" },
      ];

      const result = generateSrcSet(url, sizes);

      expect(result).toBe(
        "https://cdn.example.com/images/photo-thumb.jpg 150w, " +
          "https://cdn.example.com/images/photo-medium.jpg 400w, " +
          "https://cdn.example.com/images/photo-large.jpg 800w"
      );
    });

    it("should handle single size", () => {
      const result = generateSrcSet("image.jpg", [
        { width: 300, suffix: "sm" },
      ]);
      expect(result).toBe("image-sm.jpg 300w");
    });

    it("should handle empty sizes array", () => {
      const result = generateSrcSet("image.jpg", []);
      expect(result).toBe("");
    });

    it("should handle URLs without extension", () => {
      const result = generateSrcSet("image", [{ width: 100, suffix: "thumb" }]);
      expect(result).toBe("image 100w");
    });
  });

  describe("DEFAULT_IMAGE_SIZES", () => {
    it("should have required properties", () => {
      expect(DEFAULT_IMAGE_SIZES).toBeDefined();
      expect(DEFAULT_IMAGE_SIZES.thumbnail).toBeDefined();
      expect(DEFAULT_IMAGE_SIZES.medium).toBeDefined();
      expect(DEFAULT_IMAGE_SIZES.large).toBeDefined();
    });

    it("should have correct widths", () => {
      expect(DEFAULT_IMAGE_SIZES.thumbnail.width).toBe(150);
      expect(DEFAULT_IMAGE_SIZES.medium.width).toBe(400);
      expect(DEFAULT_IMAGE_SIZES.large.width).toBe(800);
    });

    it("should have suffixes", () => {
      expect(DEFAULT_IMAGE_SIZES.thumbnail.suffix).toBe("thumb");
      expect(DEFAULT_IMAGE_SIZES.medium.suffix).toBe("medium");
      expect(DEFAULT_IMAGE_SIZES.large.suffix).toBe("large");
    });
  });
});
