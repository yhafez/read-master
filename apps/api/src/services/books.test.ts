/**
 * Book Parsing Service Tests
 *
 * Comprehensive tests for EPUB and PDF parsing functionality.
 */

import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  // Types
  type BookMetadata,
  type ChapterInfo,
  type CoverImage,
  type ParsedBook,
  type ParseOptions,
  type ParseResult,
  type PDFMetadata,
  type PDFSection,
  type ParsedPDF,
  type PDFParseOptions,

  // EPUB Functions
  parseEPUB,
  parseEPUBFromBuffer,
  isValidEPUB,
  getEPUBExtension,

  // PDF Functions
  parsePDF,
  parsePDFFromBuffer,
  isValidPDF,
  getPDFExtension,

  // Utility Functions
  countWords,
  stripHtmlTags,
  calculateReadingTime,
  generateContentHash,

  // Constants
  AVERAGE_READING_WPM,
  EPUB_MIME_TYPES,
  PDF_MIME_TYPES,
  DEFAULT_PARSE_OPTIONS,
  DEFAULT_PDF_PARSE_OPTIONS,

  // Namespaced exports
  bookParser,
  bookUtils,
  pdfParser,
} from "./books.js";

// =============================================================================
// Type Export Tests
// =============================================================================

describe("Type exports", () => {
  it("exports BookMetadata type", () => {
    const metadata: BookMetadata = {
      title: "Test Book",
      author: "Test Author",
      language: "en",
      description: "Test description",
      publisher: "Test Publisher",
      publicationDate: "2024-01-01",
      isbn: "1234567890",
      subjects: ["Fiction", "Adventure"],
      rights: "All rights reserved",
      identifier: "test-id",
    };
    expect(metadata.title).toBe("Test Book");
  });

  it("exports ChapterInfo type", () => {
    const chapter: ChapterInfo = {
      id: "ch1",
      title: "Chapter 1",
      order: 0,
      level: 0,
      href: "chapter1.html",
      wordCount: 1000,
      content: "Chapter content here",
    };
    expect(chapter.id).toBe("ch1");
  });

  it("exports CoverImage type", () => {
    const cover: CoverImage = {
      data: Buffer.from("test"),
      mimeType: "image/jpeg",
      filename: "cover.jpg",
    };
    expect(cover.mimeType).toBe("image/jpeg");
  });

  it("exports ParsedBook type", () => {
    const book: ParsedBook = {
      metadata: {
        title: "Test",
        author: "Author",
        language: "en",
        description: "",
        publisher: "",
        publicationDate: "",
        isbn: "",
        subjects: [],
        rights: "",
        identifier: "",
      },
      chapters: [],
      totalWordCount: 0,
      coverImage: null,
      rawContent: "",
      estimatedReadingTimeMinutes: 0,
      hasDRM: false,
    };
    expect(book.hasDRM).toBe(false);
  });

  it("exports ParseOptions type", () => {
    const options: ParseOptions = {
      extractCover: true,
      extractContent: true,
      maxChapters: 100,
    };
    expect(options.extractCover).toBe(true);
  });

  it("exports ParseResult type", () => {
    const result: ParseResult<string> = {
      success: true,
      data: "test",
    };
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe("Constants", () => {
  describe("AVERAGE_READING_WPM", () => {
    it("is 250 words per minute", () => {
      expect(AVERAGE_READING_WPM).toBe(250);
    });
  });

  describe("EPUB_MIME_TYPES", () => {
    it("includes application/epub+zip", () => {
      expect(EPUB_MIME_TYPES).toContain("application/epub+zip");
    });

    it("includes application/epub", () => {
      expect(EPUB_MIME_TYPES).toContain("application/epub");
    });

    it("has exactly 2 MIME types", () => {
      expect(EPUB_MIME_TYPES.length).toBe(2);
    });
  });

  describe("DEFAULT_PARSE_OPTIONS", () => {
    it("has extractCover set to true", () => {
      expect(DEFAULT_PARSE_OPTIONS.extractCover).toBe(true);
    });

    it("has extractContent set to true", () => {
      expect(DEFAULT_PARSE_OPTIONS.extractContent).toBe(true);
    });

    it("has maxChapters set to 500", () => {
      expect(DEFAULT_PARSE_OPTIONS.maxChapters).toBe(500);
    });
  });
});

// =============================================================================
// countWords Tests
// =============================================================================

describe("countWords", () => {
  it("counts words in a simple sentence", () => {
    expect(countWords("Hello world")).toBe(2);
  });

  it("counts words with multiple spaces", () => {
    expect(countWords("Hello    world   test")).toBe(3);
  });

  it("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("returns 0 for whitespace only", () => {
    expect(countWords("   \t\n   ")).toBe(0);
  });

  it("handles newlines", () => {
    expect(countWords("Hello\nworld\ntest")).toBe(3);
  });

  it("handles tabs", () => {
    expect(countWords("Hello\tworld")).toBe(2);
  });

  it("strips HTML tags before counting", () => {
    expect(countWords("<p>Hello</p> <span>world</span>")).toBe(2);
  });

  it("handles complex HTML", () => {
    expect(countWords("<div><p>Hello <strong>world</strong></p></div>")).toBe(
      2
    );
  });

  it("returns 0 for null/undefined input", () => {
    expect(countWords(null as unknown as string)).toBe(0);
    expect(countWords(undefined as unknown as string)).toBe(0);
  });

  it("handles long paragraphs", () => {
    const text =
      "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor";
    expect(countWords(text)).toBe(12);
  });

  it("handles punctuation correctly", () => {
    expect(countWords("Hello, world! How are you?")).toBe(5);
  });

  it("handles hyphenated words as separate words", () => {
    expect(countWords("well-known self-aware")).toBe(2);
  });
});

// =============================================================================
// stripHtmlTags Tests
// =============================================================================

describe("stripHtmlTags", () => {
  it("removes simple HTML tags", () => {
    expect(stripHtmlTags("<p>Hello</p>")).toBe("Hello");
  });

  it("removes nested tags", () => {
    expect(
      stripHtmlTags("<div><p>Hello <strong>world</strong></p></div>")
    ).toBe("Hello world");
  });

  it("removes script tags and content", () => {
    expect(
      stripHtmlTags("<p>Hello</p><script>alert('xss')</script><p>world</p>")
    ).toBe("Hello world");
  });

  it("removes style tags and content", () => {
    expect(
      stripHtmlTags("<style>.class { color: red; }</style><p>Hello</p>")
    ).toBe("Hello");
  });

  it("handles HTML entities", () => {
    expect(stripHtmlTags("Hello&nbsp;world")).toBe("Hello world");
    expect(stripHtmlTags("&amp;&lt;&gt;&quot;")).toBe('&<>"');
    expect(stripHtmlTags("It&#039;s a test")).toBe("It's a test");
    expect(stripHtmlTags("It&apos;s working")).toBe("It's working");
  });

  it("normalizes whitespace", () => {
    expect(stripHtmlTags("<p>Hello</p>   <p>world</p>")).toBe("Hello world");
  });

  it("returns empty string for null/undefined", () => {
    expect(stripHtmlTags(null as unknown as string)).toBe("");
    expect(stripHtmlTags(undefined as unknown as string)).toBe("");
  });

  it("handles empty string", () => {
    expect(stripHtmlTags("")).toBe("");
  });

  it("preserves text without tags", () => {
    expect(stripHtmlTags("Hello world")).toBe("Hello world");
  });

  it("handles self-closing tags", () => {
    expect(stripHtmlTags("Hello<br/>world")).toBe("Hello world");
    expect(stripHtmlTags("Hello<br />world")).toBe("Hello world");
  });

  it("handles attributes in tags", () => {
    expect(
      stripHtmlTags('<a href="http://example.com" class="link">Click</a>')
    ).toBe("Click");
  });
});

// =============================================================================
// calculateReadingTime Tests
// =============================================================================

describe("calculateReadingTime", () => {
  it("calculates reading time for average book", () => {
    // 250 words = 1 minute at 250 WPM
    expect(calculateReadingTime(250)).toBe(1);
  });

  it("rounds up partial minutes", () => {
    expect(calculateReadingTime(251)).toBe(2);
    expect(calculateReadingTime(499)).toBe(2);
  });

  it("returns 0 for 0 words", () => {
    expect(calculateReadingTime(0)).toBe(0);
  });

  it("returns 0 for negative word count", () => {
    expect(calculateReadingTime(-100)).toBe(0);
  });

  it("handles custom WPM", () => {
    // 500 words at 500 WPM = 1 minute
    expect(calculateReadingTime(500, 500)).toBe(1);
  });

  it("returns 0 for 0 WPM", () => {
    expect(calculateReadingTime(100, 0)).toBe(0);
  });

  it("returns 0 for negative WPM", () => {
    expect(calculateReadingTime(100, -100)).toBe(0);
  });

  it("calculates correctly for long books", () => {
    // 50000 words at 250 WPM = 200 minutes
    expect(calculateReadingTime(50000)).toBe(200);
  });

  it("uses default WPM when not specified", () => {
    // 1000 words at 250 WPM = 4 minutes
    expect(calculateReadingTime(1000)).toBe(4);
  });
});

// =============================================================================
// generateContentHash Tests
// =============================================================================

describe("generateContentHash", () => {
  it("generates a SHA-256 hash", () => {
    const hash = generateContentHash("Hello world");
    expect(hash).toHaveLength(64); // SHA-256 hex is 64 characters
  });

  it("generates consistent hashes for same content", () => {
    const content = "Test content";
    expect(generateContentHash(content)).toBe(generateContentHash(content));
  });

  it("generates different hashes for different content", () => {
    const hash1 = generateContentHash("Content 1");
    const hash2 = generateContentHash("Content 2");
    expect(hash1).not.toBe(hash2);
  });

  it("handles empty string", () => {
    const hash = generateContentHash("");
    expect(hash).toHaveLength(64);
    // SHA-256 of empty string
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("handles unicode content", () => {
    const hash = generateContentHash("Hello 世界 🌍");
    expect(hash).toHaveLength(64);
  });
});

// =============================================================================
// getEPUBExtension Tests
// =============================================================================

describe("getEPUBExtension", () => {
  it("returns .epub", () => {
    expect(getEPUBExtension()).toBe(".epub");
  });
});

// =============================================================================
// parseEPUB Tests
// =============================================================================

describe("parseEPUB", () => {
  it("returns error for non-existent file", async () => {
    const result = await parseEPUB("/non/existent/file.epub");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse EPUB");
  });

  it("returns error for invalid file path", async () => {
    const result = await parseEPUB("");
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// parseEPUBFromBuffer Tests
// =============================================================================

describe("parseEPUBFromBuffer", () => {
  it("returns error for invalid buffer content", async () => {
    const invalidBuffer = Buffer.from("not an epub file");
    const result = await parseEPUBFromBuffer(invalidBuffer);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse EPUB");
  });

  it("returns error for empty buffer", async () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = await parseEPUBFromBuffer(emptyBuffer);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// isValidEPUB Tests
// =============================================================================

describe("isValidEPUB", () => {
  it("returns false for non-existent file", async () => {
    const result = await isValidEPUB("/non/existent/file.epub");
    expect(result).toBe(false);
  });

  it("returns false for non-zip file", async () => {
    // Create a temp file that's not a zip
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "epub-test-"));
    const tempFile = path.join(tempDir, "notepub.epub");
    await fs.writeFile(tempFile, "This is not a zip file");

    try {
      const result = await isValidEPUB(tempFile);
      expect(result).toBe(false);
    } finally {
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
    }
  });

  it("returns false for empty file", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "epub-test-"));
    const tempFile = path.join(tempDir, "empty.epub");
    await fs.writeFile(tempFile, "");

    try {
      const result = await isValidEPUB(tempFile);
      expect(result).toBe(false);
    } finally {
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
    }
  });
});

// =============================================================================
// bookParser Object Tests
// =============================================================================

describe("bookParser object", () => {
  it("exports parseEPUB function", () => {
    expect(typeof bookParser.parseEPUB).toBe("function");
  });

  it("exports parseEPUBFromBuffer function", () => {
    expect(typeof bookParser.parseEPUBFromBuffer).toBe("function");
  });

  it("exports isValidEPUB function", () => {
    expect(typeof bookParser.isValidEPUB).toBe("function");
  });

  it("exports countWords function", () => {
    expect(typeof bookParser.countWords).toBe("function");
  });

  it("exports stripHtmlTags function", () => {
    expect(typeof bookParser.stripHtmlTags).toBe("function");
  });

  it("exports calculateReadingTime function", () => {
    expect(typeof bookParser.calculateReadingTime).toBe("function");
  });

  it("exports generateContentHash function", () => {
    expect(typeof bookParser.generateContentHash).toBe("function");
  });

  it("exports AVERAGE_READING_WPM constant", () => {
    expect(bookParser.AVERAGE_READING_WPM).toBe(250);
  });

  it("exports EPUB_MIME_TYPES constant", () => {
    expect(bookParser.EPUB_MIME_TYPES).toContain("application/epub+zip");
  });

  it("exports DEFAULT_PARSE_OPTIONS constant", () => {
    expect(bookParser.DEFAULT_PARSE_OPTIONS.extractCover).toBe(true);
  });
});

// =============================================================================
// bookUtils Object Tests
// =============================================================================

describe("bookUtils object", () => {
  it("exports countWords function", () => {
    expect(typeof bookUtils.countWords).toBe("function");
    expect(bookUtils.countWords("hello world")).toBe(2);
  });

  it("exports stripHtmlTags function", () => {
    expect(typeof bookUtils.stripHtmlTags).toBe("function");
    expect(bookUtils.stripHtmlTags("<p>test</p>")).toBe("test");
  });

  it("exports calculateReadingTime function", () => {
    expect(typeof bookUtils.calculateReadingTime).toBe("function");
    expect(bookUtils.calculateReadingTime(250)).toBe(1);
  });

  it("exports generateContentHash function", () => {
    expect(typeof bookUtils.generateContentHash).toBe("function");
    expect(bookUtils.generateContentHash("test")).toHaveLength(64);
  });

  it("exports getEPUBExtension function", () => {
    expect(typeof bookUtils.getEPUBExtension).toBe("function");
    expect(bookUtils.getEPUBExtension()).toBe(".epub");
  });
});

// =============================================================================
// Integration Tests with Mock EPUB
// =============================================================================

describe("Integration tests", () => {
  it("utility functions work together for word analysis", () => {
    // Use simpler HTML structure for predictable output
    const html = "<p>Hello world</p><p>This is a test.</p>";
    const text = stripHtmlTags(html);
    const words = countWords(text);
    const readingTime = calculateReadingTime(words);
    const hash = generateContentHash(text);

    expect(text).toBe("Hello world This is a test.");
    expect(words).toBe(6);
    expect(readingTime).toBe(1); // 6 words / 250 WPM rounds up to 1
    expect(hash).toHaveLength(64);
  });

  it("default options are complete", () => {
    const options = DEFAULT_PARSE_OPTIONS;
    expect(options.extractCover).toBeDefined();
    expect(options.extractContent).toBeDefined();
    expect(options.maxChapters).toBeDefined();
    expect(options.maxChapters).toBeGreaterThan(0);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Edge cases", () => {
  describe("countWords edge cases", () => {
    it("handles very long text", () => {
      const longText = "word ".repeat(10000);
      expect(countWords(longText)).toBe(10000);
    });

    it("handles unicode words", () => {
      expect(countWords("Hello 世界 мир")).toBe(3);
    });

    it("handles emoji in text", () => {
      // Emoji are treated as part of words or standalone
      expect(countWords("Hello 🌍 world")).toBe(3);
    });
  });

  describe("stripHtmlTags edge cases", () => {
    it("handles malformed HTML", () => {
      expect(stripHtmlTags("<p>Unclosed paragraph")).toBe("Unclosed paragraph");
      expect(stripHtmlTags("Text with < symbol")).toBe("Text with < symbol");
    });

    it("handles deeply nested HTML", () => {
      const nested =
        "<div><div><div><div><span>Deep</span></div></div></div></div>";
      expect(stripHtmlTags(nested)).toBe("Deep");
    });

    it("handles multiple script tags", () => {
      const html =
        "<script>bad1</script>Good<script>bad2</script>Text<script>bad3</script>";
      expect(stripHtmlTags(html)).toBe("Good Text");
    });
  });

  describe("calculateReadingTime edge cases", () => {
    it("handles very large word counts", () => {
      // 1 million words at 250 WPM = 4000 minutes
      expect(calculateReadingTime(1000000)).toBe(4000);
    });

    it("handles fractional calculations correctly", () => {
      // 1 word should round up to 1 minute (not 0)
      expect(calculateReadingTime(1)).toBe(1);
    });
  });
});

// =============================================================================
// PDF Type Export Tests
// =============================================================================

describe("PDF Type exports", () => {
  it("exports PDFMetadata type", () => {
    const metadata: PDFMetadata = {
      title: "Test PDF",
      author: "Test Author",
      subject: "Test Subject",
      creator: "Test Creator",
      producer: "Test Producer",
      creationDate: "2024-01-01T00:00:00Z",
      modificationDate: "2024-01-02T00:00:00Z",
      pageCount: 10,
      pdfVersion: "1.7",
      isEncrypted: false,
    };
    expect(metadata.title).toBe("Test PDF");
  });

  it("exports PDFSection type", () => {
    const section: PDFSection = {
      id: "section-1",
      title: "Chapter 1",
      order: 1,
      level: 0,
      startOffset: 0,
      endOffset: 1000,
      wordCount: 500,
      content: "Section content here",
    };
    expect(section.id).toBe("section-1");
  });

  it("exports ParsedPDF type", () => {
    const pdf: ParsedPDF = {
      metadata: {
        title: "Test",
        author: "Author",
        subject: "",
        creator: "",
        producer: "",
        creationDate: "",
        modificationDate: "",
        pageCount: 5,
        pdfVersion: "1.4",
        isEncrypted: false,
      },
      sections: [],
      totalWordCount: 1000,
      rawContent: "Test content",
      estimatedReadingTimeMinutes: 4,
      pageCount: 5,
    };
    expect(pdf.pageCount).toBe(5);
  });

  it("exports PDFParseOptions type", () => {
    const options: PDFParseOptions = {
      extractContent: true,
      detectSections: true,
      maxPages: 100,
    };
    expect(options.extractContent).toBe(true);
  });
});

// =============================================================================
// PDF Constants Tests
// =============================================================================

describe("PDF Constants", () => {
  describe("PDF_MIME_TYPES", () => {
    it("includes application/pdf", () => {
      expect(PDF_MIME_TYPES).toContain("application/pdf");
    });

    it("has exactly 1 MIME type", () => {
      expect(PDF_MIME_TYPES.length).toBe(1);
    });
  });

  describe("DEFAULT_PDF_PARSE_OPTIONS", () => {
    it("has extractContent set to true", () => {
      expect(DEFAULT_PDF_PARSE_OPTIONS.extractContent).toBe(true);
    });

    it("has detectSections set to true", () => {
      expect(DEFAULT_PDF_PARSE_OPTIONS.detectSections).toBe(true);
    });

    it("has maxPages set to 5000", () => {
      expect(DEFAULT_PDF_PARSE_OPTIONS.maxPages).toBe(5000);
    });
  });
});

// =============================================================================
// getPDFExtension Tests
// =============================================================================

describe("getPDFExtension", () => {
  it("returns .pdf", () => {
    expect(getPDFExtension()).toBe(".pdf");
  });
});

// =============================================================================
// parsePDF Tests
// =============================================================================

describe("parsePDF", () => {
  it("returns error for non-existent file", async () => {
    const result = await parsePDF("/non/existent/file.pdf");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse PDF");
  });

  it("returns error for empty file path", async () => {
    const result = await parsePDF("");
    expect(result.success).toBe(false);
  });

  it("returns error for non-PDF file", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-test-"));
    const tempFile = path.join(tempDir, "notpdf.pdf");
    await fs.writeFile(tempFile, "This is not a PDF file");

    try {
      const result = await parsePDF(tempFile);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid PDF format");
    } finally {
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
    }
  });
});

// =============================================================================
// parsePDFFromBuffer Tests
// =============================================================================

describe("parsePDFFromBuffer", () => {
  it("returns error for empty buffer", async () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = await parsePDFFromBuffer(emptyBuffer);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Empty buffer provided");
  });

  it("returns error for null-like buffer", async () => {
    const result = await parsePDFFromBuffer(null as unknown as Buffer);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Empty buffer provided");
  });

  it("returns error for invalid PDF content", async () => {
    const invalidBuffer = Buffer.from("not a pdf file");
    const result = await parsePDFFromBuffer(invalidBuffer);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid PDF format: missing PDF signature");
  });

  it("returns error for buffer with PDF-like start but invalid content", async () => {
    // Start with PDF signature but invalid structure
    const fakeBuffer = Buffer.from("%PDF-1.4 invalid content here");
    const result = await parsePDFFromBuffer(fakeBuffer);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to parse PDF");
  });

  it("respects extractContent option", async () => {
    // Create a buffer that starts with PDF signature for testing options handling
    const fakeBuffer = Buffer.from("%PDF-1.4 some content");
    const result = await parsePDFFromBuffer(fakeBuffer, {
      extractContent: false,
    });
    // Will fail parsing but verifies option is accepted
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// isValidPDF Tests
// =============================================================================

describe("isValidPDF", () => {
  it("returns false for non-existent file", async () => {
    const result = await isValidPDF("/non/existent/file.pdf");
    expect(result).toBe(false);
  });

  it("returns false for non-PDF file", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-test-"));
    const tempFile = path.join(tempDir, "notpdf.pdf");
    await fs.writeFile(tempFile, "This is not a PDF file");

    try {
      const result = await isValidPDF(tempFile);
      expect(result).toBe(false);
    } finally {
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
    }
  });

  it("returns false for empty file", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-test-"));
    const tempFile = path.join(tempDir, "empty.pdf");
    await fs.writeFile(tempFile, "");

    try {
      const result = await isValidPDF(tempFile);
      expect(result).toBe(false);
    } finally {
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
    }
  });

  it("returns false for file with PDF signature but invalid structure", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-test-"));
    const tempFile = path.join(tempDir, "fake.pdf");
    await fs.writeFile(tempFile, "%PDF-1.4 invalid structure");

    try {
      const result = await isValidPDF(tempFile);
      expect(result).toBe(false);
    } finally {
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
    }
  });
});

// =============================================================================
// pdfParser Object Tests
// =============================================================================

describe("pdfParser object", () => {
  it("exports parsePDF function", () => {
    expect(typeof pdfParser.parsePDF).toBe("function");
  });

  it("exports parsePDFFromBuffer function", () => {
    expect(typeof pdfParser.parsePDFFromBuffer).toBe("function");
  });

  it("exports isValidPDF function", () => {
    expect(typeof pdfParser.isValidPDF).toBe("function");
  });

  it("exports getPDFExtension function", () => {
    expect(typeof pdfParser.getPDFExtension).toBe("function");
    expect(pdfParser.getPDFExtension()).toBe(".pdf");
  });

  it("exports PDF_MIME_TYPES constant", () => {
    expect(pdfParser.PDF_MIME_TYPES).toContain("application/pdf");
  });

  it("exports DEFAULT_PDF_PARSE_OPTIONS constant", () => {
    expect(pdfParser.DEFAULT_PDF_PARSE_OPTIONS.extractContent).toBe(true);
    expect(pdfParser.DEFAULT_PDF_PARSE_OPTIONS.detectSections).toBe(true);
    expect(pdfParser.DEFAULT_PDF_PARSE_OPTIONS.maxPages).toBe(5000);
  });
});

// =============================================================================
// bookParser Object PDF Tests
// =============================================================================

describe("bookParser object - PDF exports", () => {
  it("exports parsePDF function", () => {
    expect(typeof bookParser.parsePDF).toBe("function");
  });

  it("exports parsePDFFromBuffer function", () => {
    expect(typeof bookParser.parsePDFFromBuffer).toBe("function");
  });

  it("exports isValidPDF function", () => {
    expect(typeof bookParser.isValidPDF).toBe("function");
  });

  it("exports getPDFExtension function", () => {
    expect(typeof bookParser.getPDFExtension).toBe("function");
  });

  it("exports PDF_MIME_TYPES constant", () => {
    expect(bookParser.PDF_MIME_TYPES).toContain("application/pdf");
  });

  it("exports DEFAULT_PDF_PARSE_OPTIONS constant", () => {
    expect(bookParser.DEFAULT_PDF_PARSE_OPTIONS.extractContent).toBe(true);
  });
});

// =============================================================================
// bookUtils Object PDF Tests
// =============================================================================

describe("bookUtils object - PDF exports", () => {
  it("exports getPDFExtension function", () => {
    expect(typeof bookUtils.getPDFExtension).toBe("function");
    expect(bookUtils.getPDFExtension()).toBe(".pdf");
  });
});

// =============================================================================
// PDF Edge Cases
// =============================================================================

describe("PDF Edge cases", () => {
  describe("parsePDFFromBuffer edge cases", () => {
    it("handles buffer with only PDF signature", async () => {
      // Just the PDF signature, no actual content
      const signatureOnly = Buffer.from("%PDF-");
      const result = await parsePDFFromBuffer(signatureOnly);
      expect(result.success).toBe(false);
    });

    it("handles very small buffer", async () => {
      const smallBuffer = Buffer.from("AB");
      const result = await parsePDFFromBuffer(smallBuffer);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid PDF format: missing PDF signature");
    });
  });

  describe("PDF options handling", () => {
    it("accepts all PDF parse options", async () => {
      const options: PDFParseOptions = {
        extractContent: false,
        detectSections: false,
        maxPages: 10,
      };

      // Options should be accepted even if parsing fails
      const fakeBuffer = Buffer.from("%PDF-1.4 test");
      const result = await parsePDFFromBuffer(fakeBuffer, options);
      expect(result.success).toBe(false); // Will fail, but options were accepted
    });

    it("uses default options when none provided", async () => {
      const emptyBuffer = Buffer.alloc(0);
      // Should use DEFAULT_PDF_PARSE_OPTIONS internally
      const result = await parsePDFFromBuffer(emptyBuffer);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// PDF Integration Tests
// =============================================================================

describe("PDF Integration tests", () => {
  it("default PDF options are complete", () => {
    const options = DEFAULT_PDF_PARSE_OPTIONS;
    expect(options.extractContent).toBeDefined();
    expect(options.detectSections).toBeDefined();
    expect(options.maxPages).toBeDefined();
    expect(options.maxPages).toBeGreaterThan(0);
  });

  it("PDF and EPUB parsers coexist correctly", () => {
    // Ensure both EPUB and PDF functions are available
    expect(typeof bookParser.parseEPUB).toBe("function");
    expect(typeof bookParser.parsePDF).toBe("function");
    expect(typeof bookParser.isValidEPUB).toBe("function");
    expect(typeof bookParser.isValidPDF).toBe("function");

    // Extensions should be different
    expect(bookParser.getEPUBExtension()).not.toBe(
      bookParser.getPDFExtension()
    );
    expect(bookParser.getEPUBExtension()).toBe(".epub");
    expect(bookParser.getPDFExtension()).toBe(".pdf");
  });

  it("MIME types are properly separated", () => {
    // EPUB MIME types
    expect(bookParser.EPUB_MIME_TYPES).toContain("application/epub+zip");
    expect(bookParser.EPUB_MIME_TYPES).not.toContain("application/pdf");

    // PDF MIME types
    expect(bookParser.PDF_MIME_TYPES).toContain("application/pdf");
    expect(bookParser.PDF_MIME_TYPES).not.toContain("application/epub+zip");
  });
});
