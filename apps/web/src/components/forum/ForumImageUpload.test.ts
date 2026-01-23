/**
 * Tests for ForumImageUpload Component
 *
 * Tests the helper functions and validation logic for forum image uploads.
 */

import { describe, it, expect } from "vitest";
import {
  validateImageFile,
  formatFileSize,
  generateImageId,
  MAX_IMAGE_SIZE,
  MAX_IMAGES_PER_POST,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_EXTENSIONS,
  type UploadedImage,
  type ImageUploadState,
} from "./ForumImageUpload";

// ============================================================================
// validateImageFile Tests
// ============================================================================

describe("validateImageFile", () => {
  // Helper to create a mock File
  const createMockFile = (name: string, type: string, size: number): File => {
    const blob = new Blob(["x".repeat(size)], { type });
    return new File([blob], name, { type });
  };

  describe("valid files", () => {
    it("should accept JPEG files", () => {
      const file = createMockFile("test.jpg", "image/jpeg", 1024);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });

    it("should accept PNG files", () => {
      const file = createMockFile("test.png", "image/png", 1024);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });

    it("should accept WebP files", () => {
      const file = createMockFile("test.webp", "image/webp", 1024);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });

    it("should accept GIF files", () => {
      const file = createMockFile("test.gif", "image/gif", 1024);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });

    it("should accept files up to max size", () => {
      const file = createMockFile("test.jpg", "image/jpeg", MAX_IMAGE_SIZE);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });
  });

  describe("invalid file types", () => {
    it("should reject PDF files", () => {
      const file = createMockFile("test.pdf", "application/pdf", 1024);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("should reject SVG files", () => {
      const file = createMockFile("test.svg", "image/svg+xml", 1024);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("should reject BMP files", () => {
      const file = createMockFile("test.bmp", "image/bmp", 1024);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });

    it("should reject text files", () => {
      const file = createMockFile("test.txt", "text/plain", 1024);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid file type");
    });
  });

  describe("file size validation", () => {
    it("should reject files larger than max size", () => {
      const file = createMockFile(
        "large.jpg",
        "image/jpeg",
        MAX_IMAGE_SIZE + 1
      );
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("should reject empty files", () => {
      const file = createMockFile("empty.jpg", "image/jpeg", 0);
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("should accept small files", () => {
      const file = createMockFile("small.jpg", "image/jpeg", 100);
      expect(validateImageFile(file)).toEqual({ valid: true });
    });
  });
});

// ============================================================================
// formatFileSize Tests
// ============================================================================

describe("formatFileSize", () => {
  describe("bytes", () => {
    it("should format 0 bytes", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("should format small byte values", () => {
      expect(formatFileSize(512)).toBe("512 B");
    });

    it("should format up to 1023 bytes", () => {
      expect(formatFileSize(1023)).toBe("1023 B");
    });
  });

  describe("kilobytes", () => {
    it("should format exactly 1 KB", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
    });

    it("should format kilobyte values", () => {
      expect(formatFileSize(2560)).toBe("2.5 KB");
    });

    it("should format up to 1023 KB", () => {
      expect(formatFileSize(1024 * 1023)).toBe("1023.0 KB");
    });
  });

  describe("megabytes", () => {
    it("should format exactly 1 MB", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    });

    it("should format megabyte values", () => {
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
    });

    it("should format large megabyte values", () => {
      expect(formatFileSize(10 * 1024 * 1024)).toBe("10.0 MB");
    });
  });
});

// ============================================================================
// generateImageId Tests
// ============================================================================

describe("generateImageId", () => {
  it("should generate string IDs", () => {
    const id = generateImageId();
    expect(typeof id).toBe("string");
  });

  it("should generate IDs with img_ prefix", () => {
    const id = generateImageId();
    expect(id.startsWith("img_")).toBe(true);
  });

  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateImageId());
    }
    expect(ids.size).toBe(100);
  });

  it("should generate IDs with reasonable length", () => {
    const id = generateImageId();
    expect(id.length).toBeGreaterThan(10);
    expect(id.length).toBeLessThan(50);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("constants", () => {
  describe("MAX_IMAGE_SIZE", () => {
    it("should be 5MB", () => {
      expect(MAX_IMAGE_SIZE).toBe(5 * 1024 * 1024);
    });
  });

  describe("MAX_IMAGES_PER_POST", () => {
    it("should be 5", () => {
      expect(MAX_IMAGES_PER_POST).toBe(5);
    });
  });

  describe("ALLOWED_IMAGE_TYPES", () => {
    it("should include common image types", () => {
      expect(ALLOWED_IMAGE_TYPES).toContain("image/jpeg");
      expect(ALLOWED_IMAGE_TYPES).toContain("image/png");
      expect(ALLOWED_IMAGE_TYPES).toContain("image/webp");
      expect(ALLOWED_IMAGE_TYPES).toContain("image/gif");
    });

    it("should have 4 allowed types", () => {
      expect(ALLOWED_IMAGE_TYPES.length).toBe(4);
    });
  });

  describe("ALLOWED_EXTENSIONS", () => {
    it("should include common extensions", () => {
      expect(ALLOWED_EXTENSIONS).toContain("JPG");
      expect(ALLOWED_EXTENSIONS).toContain("PNG");
      expect(ALLOWED_EXTENSIONS).toContain("WebP");
      expect(ALLOWED_EXTENSIONS).toContain("GIF");
    });
  });
});

// ============================================================================
// Type Tests
// ============================================================================

describe("type definitions", () => {
  it("should have correct UploadedImage structure", () => {
    const image: UploadedImage = {
      id: "img_123",
      url: "https://example.com/image.png",
      key: "forum/user123/img456/image.png",
      filename: "image.png",
      contentType: "image/png",
      size: 12345,
    };

    expect(image.id).toBe("img_123");
    expect(image.url).toBe("https://example.com/image.png");
    expect(image.key).toBe("forum/user123/img456/image.png");
    expect(image.filename).toBe("image.png");
    expect(image.contentType).toBe("image/png");
    expect(image.size).toBe(12345);
  });

  it("should have correct ImageUploadState structure", () => {
    const uploadingState: ImageUploadState = {
      isUploading: true,
      error: null,
      progress: 50,
    };

    expect(uploadingState.isUploading).toBe(true);
    expect(uploadingState.error).toBeNull();
    expect(uploadingState.progress).toBe(50);

    const errorState: ImageUploadState = {
      isUploading: false,
      error: "Upload failed",
      progress: 0,
    };

    expect(errorState.isUploading).toBe(false);
    expect(errorState.error).toBe("Upload failed");
    expect(errorState.progress).toBe(0);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("edge cases", () => {
  describe("validateImageFile", () => {
    it("should handle files at exactly the size limit", () => {
      const blob = new Blob(["x".repeat(MAX_IMAGE_SIZE)], {
        type: "image/jpeg",
      });
      const file = new File([blob], "exact-limit.jpg", { type: "image/jpeg" });
      expect(validateImageFile(file)).toEqual({ valid: true });
    });

    it("should handle files one byte over the limit", () => {
      const blob = new Blob(["x".repeat(MAX_IMAGE_SIZE + 1)], {
        type: "image/jpeg",
      });
      const file = new File([blob], "over-limit.jpg", { type: "image/jpeg" });
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
    });
  });

  describe("formatFileSize", () => {
    it("should handle boundary between KB and MB", () => {
      expect(formatFileSize(1024 * 1024 - 1)).toBe("1024.0 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    });
  });
});
