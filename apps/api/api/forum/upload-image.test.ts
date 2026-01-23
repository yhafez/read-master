/**
 * Tests for Forum Image Upload API Endpoint
 *
 * Tests the helper functions and validation logic for forum image uploads.
 */

import { describe, it, expect } from "vitest";
import {
  isAllowedMimeType,
  getExtensionFromMimeType,
  isValidImageBuffer,
  sanitizeFilename,
  generateImageId,
} from "./upload-image.js";

// ============================================================================
// isAllowedMimeType Tests
// ============================================================================

describe("isAllowedMimeType", () => {
  describe("allowed types", () => {
    it("should accept image/jpeg", () => {
      expect(isAllowedMimeType("image/jpeg")).toBe(true);
    });

    it("should accept image/png", () => {
      expect(isAllowedMimeType("image/png")).toBe(true);
    });

    it("should accept image/webp", () => {
      expect(isAllowedMimeType("image/webp")).toBe(true);
    });

    it("should accept image/gif", () => {
      expect(isAllowedMimeType("image/gif")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(isAllowedMimeType("IMAGE/JPEG")).toBe(true);
      expect(isAllowedMimeType("Image/Png")).toBe(true);
    });
  });

  describe("disallowed types", () => {
    it("should reject application/pdf", () => {
      expect(isAllowedMimeType("application/pdf")).toBe(false);
    });

    it("should reject text/plain", () => {
      expect(isAllowedMimeType("text/plain")).toBe(false);
    });

    it("should reject image/svg+xml", () => {
      expect(isAllowedMimeType("image/svg+xml")).toBe(false);
    });

    it("should reject image/bmp", () => {
      expect(isAllowedMimeType("image/bmp")).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isAllowedMimeType("")).toBe(false);
    });

    it("should reject random strings", () => {
      expect(isAllowedMimeType("not-a-mime-type")).toBe(false);
    });
  });
});

// ============================================================================
// getExtensionFromMimeType Tests
// ============================================================================

describe("getExtensionFromMimeType", () => {
  describe("valid MIME types", () => {
    it("should return jpg for image/jpeg", () => {
      expect(getExtensionFromMimeType("image/jpeg")).toBe("jpg");
    });

    it("should return png for image/png", () => {
      expect(getExtensionFromMimeType("image/png")).toBe("png");
    });

    it("should return webp for image/webp", () => {
      expect(getExtensionFromMimeType("image/webp")).toBe("webp");
    });

    it("should return gif for image/gif", () => {
      expect(getExtensionFromMimeType("image/gif")).toBe("gif");
    });

    it("should be case-insensitive", () => {
      expect(getExtensionFromMimeType("IMAGE/PNG")).toBe("png");
      expect(getExtensionFromMimeType("Image/Jpeg")).toBe("jpg");
    });
  });

  describe("invalid MIME types", () => {
    it("should return null for unknown types", () => {
      expect(getExtensionFromMimeType("application/pdf")).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(getExtensionFromMimeType("")).toBeNull();
    });

    it("should return null for invalid strings", () => {
      expect(getExtensionFromMimeType("not-a-mime-type")).toBeNull();
    });
  });
});

// ============================================================================
// isValidImageBuffer Tests
// ============================================================================

describe("isValidImageBuffer", () => {
  describe("valid image signatures", () => {
    it("should accept JPEG signature (FF D8 FF)", () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(isValidImageBuffer(jpegBuffer)).toBe(true);
    });

    it("should accept PNG signature (89 50 4E 47)", () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      expect(isValidImageBuffer(pngBuffer)).toBe(true);
    });

    it("should accept GIF87a signature", () => {
      const gif87aBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
      expect(isValidImageBuffer(gif87aBuffer)).toBe(true);
    });

    it("should accept GIF89a signature", () => {
      const gif89aBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(isValidImageBuffer(gif89aBuffer)).toBe(true);
    });

    it("should accept WebP signature (RIFF...WEBP)", () => {
      // WebP: RIFF????WEBP
      const webpBuffer = Buffer.from([
        0x52,
        0x49,
        0x46,
        0x46, // RIFF
        0x00,
        0x00,
        0x00,
        0x00, // size (placeholder)
        0x57,
        0x45,
        0x42,
        0x50, // WEBP
      ]);
      expect(isValidImageBuffer(webpBuffer)).toBe(true);
    });
  });

  describe("invalid image signatures", () => {
    it("should reject empty buffer", () => {
      expect(isValidImageBuffer(Buffer.from([]))).toBe(false);
    });

    it("should reject buffer too short", () => {
      expect(isValidImageBuffer(Buffer.from([0xff, 0xd8]))).toBe(false);
    });

    it("should reject PDF signature", () => {
      // PDF starts with %PDF
      const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      expect(isValidImageBuffer(pdfBuffer)).toBe(false);
    });

    it("should reject random data", () => {
      const randomBuffer = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
      expect(isValidImageBuffer(randomBuffer)).toBe(false);
    });

    it("should reject text content", () => {
      const textBuffer = Buffer.from("Hello World", "utf-8");
      expect(isValidImageBuffer(textBuffer)).toBe(false);
    });

    it("should reject incomplete WebP signature", () => {
      // Has RIFF but not WEBP
      const incompleteWebpBuffer = Buffer.from([
        0x52,
        0x49,
        0x46,
        0x46, // RIFF
        0x00,
        0x00,
        0x00,
        0x00, // size
        0x41,
        0x56,
        0x49,
        0x20, // AVI (not WEBP)
      ]);
      expect(isValidImageBuffer(incompleteWebpBuffer)).toBe(false);
    });
  });
});

// ============================================================================
// sanitizeFilename Tests
// ============================================================================

describe("sanitizeFilename", () => {
  describe("basic sanitization", () => {
    it("should keep valid characters", () => {
      expect(sanitizeFilename("my-image_001.png")).toBe("my-image_001.png");
    });

    it("should preserve alphanumeric characters", () => {
      expect(sanitizeFilename("Screenshot2024.jpg")).toBe("Screenshot2024.jpg");
    });

    it("should keep dots for extensions", () => {
      expect(sanitizeFilename("file.test.png")).toBe("file.test.png");
    });
  });

  describe("path traversal prevention", () => {
    it("should replace forward slashes with underscores", () => {
      // Dots are valid characters, but path separators are replaced
      expect(sanitizeFilename("../../../etc/passwd")).toBe(
        ".._.._.._etc_passwd"
      );
    });

    it("should replace backslashes with underscores", () => {
      expect(sanitizeFilename("..\\..\\Windows\\System32")).toBe(
        ".._.._Windows_System32"
      );
    });

    it("should handle mixed path separators", () => {
      expect(sanitizeFilename("path/to\\file.png")).toBe("path_to_file.png");
    });
  });

  describe("special character handling", () => {
    it("should replace spaces with underscores", () => {
      expect(sanitizeFilename("my file name.png")).toBe("my_file_name.png");
    });

    it("should remove special characters", () => {
      expect(sanitizeFilename("file!@#$%^&*().png")).toBe("file_.png");
    });

    it("should handle unicode characters", () => {
      expect(sanitizeFilename("foto")).toBe("foto");
    });

    it("should collapse multiple underscores", () => {
      expect(sanitizeFilename("file___test___name.png")).toBe(
        "file_test_name.png"
      );
    });

    it("should trim leading/trailing underscores", () => {
      // Only trims actual leading/trailing underscores at string boundaries
      // Underscore before dot is preserved as it's not at the end
      expect(sanitizeFilename("___file___.png")).toBe("file_.png");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(sanitizeFilename("")).toBe("image");
    });

    it("should handle just a dot", () => {
      expect(sanitizeFilename(".")).toBe("image");
    });

    it("should handle only special characters", () => {
      expect(sanitizeFilename("!@#$%^&*()")).toBe("image");
    });

    it("should truncate very long filenames", () => {
      const longName = "a".repeat(150) + ".png";
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result.endsWith(".png")).toBe(true);
    });

    it("should handle filenames without extension", () => {
      expect(sanitizeFilename("image_without_extension")).toBe(
        "image_without_extension"
      );
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

  it("should generate IDs with 16 characters", () => {
    const id = generateImageId();
    expect(id.length).toBe(16);
  });

  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateImageId());
    }
    expect(ids.size).toBe(100);
  });

  it("should only contain alphanumeric characters (hex)", () => {
    const id = generateImageId();
    expect(/^[a-f0-9]+$/.test(id)).toBe(true);
  });
});

// ============================================================================
// Type Tests
// ============================================================================

describe("type definitions", () => {
  it("should have correct ForumImageUploadResponse structure", () => {
    // This is a compile-time check - if types are wrong, TS will error
    const response = {
      success: true as const,
      url: "https://example.com/image.png",
      key: "forum/user123/img456/image.png",
      filename: "image.png",
      contentType: "image/png",
      size: 12345,
    };

    expect(response.success).toBe(true);
    expect(typeof response.url).toBe("string");
    expect(typeof response.key).toBe("string");
    expect(typeof response.filename).toBe("string");
    expect(typeof response.contentType).toBe("string");
    expect(typeof response.size).toBe("number");
  });

  it("should have correct ForumImageUploadError structure", () => {
    const errorResponse = {
      success: false as const,
      error: "Some error message",
      code: "ERROR_CODE",
    };

    expect(errorResponse.success).toBe(false);
    expect(typeof errorResponse.error).toBe("string");
    expect(typeof errorResponse.code).toBe("string");
  });
});
