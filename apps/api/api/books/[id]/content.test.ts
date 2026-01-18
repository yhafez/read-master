/**
 * Tests for GET /api/books/:id/content endpoint
 *
 * Tests cover:
 * - parseRangeHeader: Parse HTTP Range headers
 * - extractFilename: Extract filename from file path
 * - buildContentMetadata: Build content metadata
 * - formatContentRange: Format Content-Range header
 * - extractRangeFromBuffer: Extract byte ranges from buffer
 */

import { describe, it, expect } from "vitest";
import {
  parseRangeHeader,
  extractFilename,
  buildContentMetadata,
  formatContentRange,
  extractRangeFromBuffer,
  MAX_ID_LENGTH,
  MIN_ID_LENGTH,
  DEFAULT_CHUNK_SIZE,
  MAX_RANGE_SIZE,
  bookIdSchema,
  type ParsedRange,
  type ContentMetadata,
} from "./content.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  describe("MAX_ID_LENGTH", () => {
    it("should be 30", () => {
      expect(MAX_ID_LENGTH).toBe(30);
    });
  });

  describe("MIN_ID_LENGTH", () => {
    it("should be 1", () => {
      expect(MIN_ID_LENGTH).toBe(1);
    });
  });

  describe("DEFAULT_CHUNK_SIZE", () => {
    it("should be 1MB (1024 * 1024)", () => {
      expect(DEFAULT_CHUNK_SIZE).toBe(1024 * 1024);
    });
  });

  describe("MAX_RANGE_SIZE", () => {
    it("should be 10MB (10 * 1024 * 1024)", () => {
      expect(MAX_RANGE_SIZE).toBe(10 * 1024 * 1024);
    });
  });
});

// ============================================================================
// bookIdSchema Tests
// ============================================================================

describe("bookIdSchema", () => {
  describe("valid IDs", () => {
    it("should accept a valid CUID", () => {
      const result = bookIdSchema.safeParse("clxxxxxxxxxxxxxxxxxx123");
      expect(result.success).toBe(true);
    });

    it("should accept a short ID", () => {
      const result = bookIdSchema.safeParse("a");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("a");
      }
    });

    it("should accept a 30 character ID (max length)", () => {
      const id = "a".repeat(30);
      const result = bookIdSchema.safeParse(id);
      expect(result.success).toBe(true);
    });

    it("should trim whitespace from ID", () => {
      const result = bookIdSchema.safeParse("  book123  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("book123");
      }
    });

    it("should accept numeric-like strings", () => {
      const result = bookIdSchema.safeParse("12345");
      expect(result.success).toBe(true);
    });

    it("should accept alphanumeric with special characters", () => {
      const result = bookIdSchema.safeParse("book-123_abc");
      expect(result.success).toBe(true);
    });
  });

  describe("invalid IDs", () => {
    it("should reject empty string", () => {
      const result = bookIdSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only string", () => {
      const result = bookIdSchema.safeParse("   ");
      expect(result.success).toBe(false);
    });

    it("should reject ID exceeding max length", () => {
      const id = "a".repeat(31);
      const result = bookIdSchema.safeParse(id);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// parseRangeHeader Tests
// ============================================================================

describe("parseRangeHeader", () => {
  const totalSize = 10000;

  describe("valid range headers", () => {
    it("should parse bytes=0-499 correctly", () => {
      const result = parseRangeHeader("bytes=0-499", totalSize);
      expect(result).toEqual({ start: 0, end: 499 });
    });

    it("should parse bytes=500-999 correctly", () => {
      const result = parseRangeHeader("bytes=500-999", totalSize);
      expect(result).toEqual({ start: 500, end: 999 });
    });

    it("should handle bytes=0- (no end)", () => {
      const result = parseRangeHeader("bytes=0-", totalSize);
      expect(result).toEqual({ start: 0, end: totalSize - 1 });
    });

    it("should handle bytes=9000- (near end)", () => {
      const result = parseRangeHeader("bytes=9000-", totalSize);
      expect(result).toEqual({ start: 9000, end: totalSize - 1 });
    });

    it("should clamp end to file size if exceeds", () => {
      const result = parseRangeHeader("bytes=0-99999", totalSize);
      expect(result).toEqual({ start: 0, end: totalSize - 1 });
    });

    it("should handle single byte range", () => {
      const result = parseRangeHeader("bytes=100-100", totalSize);
      expect(result).toEqual({ start: 100, end: 100 });
    });

    it("should handle last byte of file", () => {
      const result = parseRangeHeader("bytes=9999-9999", totalSize);
      expect(result).toEqual({ start: 9999, end: 9999 });
    });
  });

  describe("range size limiting", () => {
    const largeFileSize = 100 * 1024 * 1024; // 100MB

    it("should limit range to MAX_RANGE_SIZE if too large", () => {
      const result = parseRangeHeader("bytes=0-99999999", largeFileSize);
      expect(result).not.toBeNull();
      if (result) {
        const rangeSize = result.end - result.start + 1;
        expect(rangeSize).toBe(MAX_RANGE_SIZE);
      }
    });

    it("should not modify range within MAX_RANGE_SIZE", () => {
      const result = parseRangeHeader("bytes=0-1000", largeFileSize);
      expect(result).toEqual({ start: 0, end: 1000 });
    });
  });

  describe("invalid range headers", () => {
    it("should return null for undefined header", () => {
      const result = parseRangeHeader(undefined, totalSize);
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = parseRangeHeader("", totalSize);
      expect(result).toBeNull();
    });

    it("should return null for header without bytes= prefix", () => {
      const result = parseRangeHeader("0-499", totalSize);
      expect(result).toBeNull();
    });

    it("should return null for invalid format (no dash)", () => {
      const result = parseRangeHeader("bytes=100", totalSize);
      expect(result).toBeNull();
    });

    it("should return null for invalid format (multiple dashes)", () => {
      const result = parseRangeHeader("bytes=0-100-200", totalSize);
      expect(result).toBeNull();
    });

    it("should return null for negative start", () => {
      const result = parseRangeHeader("bytes=-100-499", totalSize);
      expect(result).toBeNull();
    });

    it("should return null for start greater than end", () => {
      const result = parseRangeHeader("bytes=500-100", totalSize);
      expect(result).toBeNull();
    });

    it("should return null for non-numeric start", () => {
      const result = parseRangeHeader("bytes=abc-499", totalSize);
      expect(result).toBeNull();
    });

    it("should handle non-numeric end by using totalSize - 1", () => {
      const result = parseRangeHeader("bytes=0-abc", totalSize);
      // NaN end should result in end = totalSize - 1
      expect(result).toEqual({ start: 0, end: totalSize - 1 });
    });
  });

  describe("edge cases", () => {
    it("should handle zero total size", () => {
      const result = parseRangeHeader("bytes=0-0", 0);
      // With totalSize = 0, end is clamped to -1, which results in { start: 0, end: -1 }
      // This is an invalid range but the function returns it - caller should handle
      expect(result).toEqual({ start: 0, end: -1 });
    });

    it("should handle very large file sizes", () => {
      const hugeSize = 1024 * 1024 * 1024 * 10; // 10GB
      const result = parseRangeHeader("bytes=0-1023", hugeSize);
      expect(result).toEqual({ start: 0, end: 1023 });
    });

    it("should handle start at file boundary", () => {
      const result = parseRangeHeader("bytes=9999-", totalSize);
      expect(result).toEqual({ start: 9999, end: 9999 });
    });
  });
});

// ============================================================================
// extractFilename Tests
// ============================================================================

describe("extractFilename", () => {
  describe("standard file paths", () => {
    it("should extract filename from simple path", () => {
      expect(extractFilename("books/mybook.pdf")).toBe("mybook.pdf");
    });

    it("should extract filename from nested path", () => {
      expect(extractFilename("users/123/books/456/mybook.epub")).toBe(
        "mybook.epub"
      );
    });

    it("should extract filename from deeply nested path", () => {
      expect(extractFilename("a/b/c/d/e/file.txt")).toBe("file.txt");
    });

    it("should handle single filename (no path)", () => {
      expect(extractFilename("document.pdf")).toBe("document.pdf");
    });

    it("should handle path with trailing slash", () => {
      // Returns "content" default when last segment is empty
      expect(extractFilename("path/to/")).toBe("content");
    });
  });

  describe("special characters", () => {
    it("should handle filename with spaces", () => {
      expect(extractFilename("books/My Book Title.pdf")).toBe(
        "My Book Title.pdf"
      );
    });

    it("should handle filename with special characters", () => {
      expect(extractFilename("books/book_v2.0-final.pdf")).toBe(
        "book_v2.0-final.pdf"
      );
    });

    it("should handle filename with unicode characters", () => {
      expect(extractFilename("books/書籍.pdf")).toBe("書籍.pdf");
    });

    it("should handle filename with parentheses", () => {
      expect(extractFilename("books/book (copy).pdf")).toBe("book (copy).pdf");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      // Returns "content" default when input is empty
      expect(extractFilename("")).toBe("content");
    });

    it("should handle path with only slashes", () => {
      // Returns "content" default when all segments are empty
      expect(extractFilename("///")).toBe("content");
    });

    it("should handle filename with multiple dots", () => {
      expect(extractFilename("books/file.name.with.dots.pdf")).toBe(
        "file.name.with.dots.pdf"
      );
    });

    it("should handle hidden files (dot prefix)", () => {
      expect(extractFilename("books/.hidden")).toBe(".hidden");
    });

    it("should handle no extension", () => {
      expect(extractFilename("books/README")).toBe("README");
    });
  });
});

// ============================================================================
// buildContentMetadata Tests
// ============================================================================

describe("buildContentMetadata", () => {
  describe("standard file types", () => {
    it("should build metadata for PDF file", () => {
      const result = buildContentMetadata("books/document.pdf", "PDF", 1000);
      expect(result).toEqual({
        contentType: "application/pdf",
        contentLength: 1000,
        filename: "document.pdf",
        acceptRanges: true,
      });
    });

    it("should build metadata for EPUB file", () => {
      const result = buildContentMetadata("books/book.epub", "EPUB", 5000);
      expect(result).toEqual({
        contentType: "application/epub+zip",
        contentLength: 5000,
        filename: "book.epub",
        acceptRanges: true,
      });
    });

    it("should build metadata for DOCX file", () => {
      const result = buildContentMetadata("books/doc.docx", "DOCX", 2000);
      expect(result.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      expect(result.contentLength).toBe(2000);
      expect(result.filename).toBe("doc.docx");
    });

    it("should build metadata for DOC file", () => {
      const result = buildContentMetadata("books/old.doc", "DOC", 1500);
      expect(result.contentType).toBe("application/msword");
    });

    it("should build metadata for TXT file", () => {
      const result = buildContentMetadata("books/text.txt", "TXT", 500);
      expect(result.contentType).toBe("text/plain");
    });

    it("should build metadata for HTML file", () => {
      const result = buildContentMetadata("books/page.html", "HTML", 800);
      expect(result.contentType).toBe("text/html");
    });
  });

  describe("null file type", () => {
    it("should use octet-stream for null fileType", () => {
      const result = buildContentMetadata("books/unknown", null, 1000);
      expect(result.contentType).toBe("application/octet-stream");
    });
  });

  describe("content length variations", () => {
    it("should handle zero content length", () => {
      const result = buildContentMetadata("books/empty.pdf", "PDF", 0);
      expect(result.contentLength).toBe(0);
    });

    it("should handle large content length", () => {
      const largeSize = 1024 * 1024 * 100; // 100MB
      const result = buildContentMetadata("books/large.pdf", "PDF", largeSize);
      expect(result.contentLength).toBe(largeSize);
    });

    it("should handle very large content length", () => {
      const hugeSize = 1024 * 1024 * 1024 * 5; // 5GB
      const result = buildContentMetadata("books/huge.pdf", "PDF", hugeSize);
      expect(result.contentLength).toBe(hugeSize);
    });
  });

  describe("file path variations", () => {
    it("should extract filename from nested path", () => {
      const result = buildContentMetadata(
        "users/u123/books/b456/file.pdf",
        "PDF",
        1000
      );
      expect(result.filename).toBe("file.pdf");
    });

    it("should handle filename with spaces", () => {
      const result = buildContentMetadata("books/my book.pdf", "PDF", 1000);
      expect(result.filename).toBe("my book.pdf");
    });
  });

  describe("acceptRanges", () => {
    it("should always set acceptRanges to true", () => {
      const result1 = buildContentMetadata("a.pdf", "PDF", 100);
      const result2 = buildContentMetadata("b.txt", "TXT", 200);
      const result3 = buildContentMetadata("c.epub", "EPUB", 300);

      expect(result1.acceptRanges).toBe(true);
      expect(result2.acceptRanges).toBe(true);
      expect(result3.acceptRanges).toBe(true);
    });
  });
});

// ============================================================================
// formatContentRange Tests
// ============================================================================

describe("formatContentRange", () => {
  describe("standard ranges", () => {
    it("should format range 0-499/1000", () => {
      expect(formatContentRange(0, 499, 1000)).toBe("bytes 0-499/1000");
    });

    it("should format range 500-999/1000", () => {
      expect(formatContentRange(500, 999, 1000)).toBe("bytes 500-999/1000");
    });

    it("should format full file range", () => {
      expect(formatContentRange(0, 999, 1000)).toBe("bytes 0-999/1000");
    });

    it("should format single byte range", () => {
      expect(formatContentRange(100, 100, 1000)).toBe("bytes 100-100/1000");
    });
  });

  describe("large values", () => {
    it("should handle large byte positions", () => {
      const result = formatContentRange(1000000, 1999999, 10000000);
      expect(result).toBe("bytes 1000000-1999999/10000000");
    });

    it("should handle very large total size", () => {
      const total = 1024 * 1024 * 1024 * 10; // 10GB
      const result = formatContentRange(0, 1023, total);
      expect(result).toBe(`bytes 0-1023/${total}`);
    });
  });

  describe("edge cases", () => {
    it("should handle zero start", () => {
      expect(formatContentRange(0, 0, 1)).toBe("bytes 0-0/1");
    });

    it("should handle last byte of file", () => {
      expect(formatContentRange(999, 999, 1000)).toBe("bytes 999-999/1000");
    });
  });
});

// ============================================================================
// extractRangeFromBuffer Tests
// ============================================================================

describe("extractRangeFromBuffer", () => {
  // Create a test buffer with known content
  const testBuffer = Buffer.from("0123456789ABCDEF");

  describe("standard ranges", () => {
    it("should extract first 5 bytes", () => {
      const result = extractRangeFromBuffer(testBuffer, 0, 4);
      expect(result.toString()).toBe("01234");
    });

    it("should extract middle bytes", () => {
      const result = extractRangeFromBuffer(testBuffer, 5, 9);
      expect(result.toString()).toBe("56789");
    });

    it("should extract last 5 bytes", () => {
      const result = extractRangeFromBuffer(testBuffer, 11, 15);
      expect(result.toString()).toBe("BCDEF");
    });

    it("should extract single byte", () => {
      const result = extractRangeFromBuffer(testBuffer, 5, 5);
      expect(result.toString()).toBe("5");
    });

    it("should extract entire buffer", () => {
      const result = extractRangeFromBuffer(testBuffer, 0, 15);
      expect(result.toString()).toBe("0123456789ABCDEF");
    });
  });

  describe("buffer length verification", () => {
    it("should return correct length for range 0-4", () => {
      const result = extractRangeFromBuffer(testBuffer, 0, 4);
      expect(result.length).toBe(5); // 0, 1, 2, 3, 4 = 5 bytes
    });

    it("should return correct length for range 5-9", () => {
      const result = extractRangeFromBuffer(testBuffer, 5, 9);
      expect(result.length).toBe(5);
    });

    it("should return 1 for single byte range", () => {
      const result = extractRangeFromBuffer(testBuffer, 7, 7);
      expect(result.length).toBe(1);
    });
  });

  describe("binary data", () => {
    it("should correctly extract binary data", () => {
      const binaryBuffer = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
      const result = extractRangeFromBuffer(binaryBuffer, 2, 4);
      expect(result[0]).toBe(0x02);
      expect(result[1]).toBe(0xff);
      expect(result[2]).toBe(0xfe);
    });
  });

  describe("edge cases", () => {
    it("should handle zero-length buffer gracefully", () => {
      const emptyBuffer = Buffer.from([]);
      const result = extractRangeFromBuffer(emptyBuffer, 0, 0);
      expect(result.length).toBe(0);
    });

    it("should handle range starting at buffer end", () => {
      const result = extractRangeFromBuffer(testBuffer, 15, 15);
      expect(result.toString()).toBe("F");
    });
  });

  describe("large buffers", () => {
    it("should handle large buffer correctly", () => {
      const largeBuffer = Buffer.alloc(10000, "x");
      const result = extractRangeFromBuffer(largeBuffer, 1000, 1999);
      expect(result.length).toBe(1000);
      expect(result.every((byte) => byte === 0x78)).toBe(true); // 'x' = 0x78
    });
  });
});

// ============================================================================
// Type Checks
// ============================================================================

describe("Type exports", () => {
  it("should export ParsedRange type", () => {
    const range: ParsedRange = { start: 0, end: 100 };
    expect(range.start).toBeDefined();
    expect(range.end).toBeDefined();
  });

  it("should export ContentMetadata type", () => {
    const metadata: ContentMetadata = {
      contentType: "application/pdf",
      contentLength: 1000,
      filename: "test.pdf",
      acceptRanges: true,
    };
    expect(metadata.contentType).toBeDefined();
    expect(metadata.contentLength).toBeDefined();
    expect(metadata.filename).toBeDefined();
    expect(metadata.acceptRanges).toBeDefined();
  });
});

// ============================================================================
// Integration-style Tests for Helper Functions
// ============================================================================

describe("Helper function integration", () => {
  describe("parseRangeHeader + extractRangeFromBuffer", () => {
    it("should work together for a valid range request", () => {
      const buffer = Buffer.from("Hello, World!");
      const range = parseRangeHeader("bytes=0-4", buffer.length);

      expect(range).not.toBeNull();
      if (range) {
        const extracted = extractRangeFromBuffer(
          buffer,
          range.start,
          range.end
        );
        expect(extracted.toString()).toBe("Hello");
      }
    });

    it("should handle open-ended range", () => {
      const buffer = Buffer.from("Hello, World!");
      const range = parseRangeHeader("bytes=7-", buffer.length);

      expect(range).not.toBeNull();
      if (range) {
        const extracted = extractRangeFromBuffer(
          buffer,
          range.start,
          range.end
        );
        expect(extracted.toString()).toBe("World!");
      }
    });
  });

  describe("buildContentMetadata + formatContentRange", () => {
    it("should produce valid Content-Range for partial response", () => {
      const metadata = buildContentMetadata("books/test.pdf", "PDF", 1000);
      const range = { start: 0, end: 499 };
      const contentRange = formatContentRange(
        range.start,
        range.end,
        metadata.contentLength
      );

      expect(contentRange).toBe("bytes 0-499/1000");
    });
  });
});

// ============================================================================
// Real-world Scenario Tests
// ============================================================================

describe("Real-world scenarios", () => {
  describe("PDF streaming", () => {
    it("should handle typical PDF range request", () => {
      const pdfSize = 5 * 1024 * 1024; // 5MB PDF
      const range = parseRangeHeader("bytes=0-65535", pdfSize); // First 64KB

      expect(range).toEqual({ start: 0, end: 65535 });
    });
  });

  describe("EPUB chapter loading", () => {
    it("should handle EPUB metadata", () => {
      const metadata = buildContentMetadata(
        "users/123/books/456/great-gatsby.epub",
        "EPUB",
        2048576
      );

      expect(metadata.contentType).toBe("application/epub+zip");
      expect(metadata.filename).toBe("great-gatsby.epub");
    });
  });

  describe("Resume download scenario", () => {
    it("should handle interrupted download resume", () => {
      const fileSize = 10 * 1024 * 1024; // 10MB
      const alreadyDownloaded = 5 * 1024 * 1024; // 5MB already downloaded
      const range = parseRangeHeader(`bytes=${alreadyDownloaded}-`, fileSize);

      expect(range).not.toBeNull();
      if (range) {
        expect(range.start).toBe(alreadyDownloaded);
        expect(range.end).toBe(fileSize - 1);
      }
    });
  });
});
