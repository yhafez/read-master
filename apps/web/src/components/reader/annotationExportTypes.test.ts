/**
 * Tests for annotation export types and utilities
 */

import { describe, it, expect } from "vitest";
import type {
  Annotation,
  HighlightAnnotation,
  NoteAnnotation,
  BookmarkAnnotation,
} from "./annotationTypes";
import type { ExportFilters, ExportOptions } from "./annotationExportTypes";
import {
  DEFAULT_EXPORT_OPTIONS,
  DATE_FORMATS,
  PDF_PAGE,
  formatExportDate,
  generateExportFilename,
  calculateExportStats,
  filterAnnotationsForExport,
  sortAnnotationsForExport,
  getExportTypeLabel,
  getColorDisplayName,
  truncateText,
  escapeMarkdown,
  wrapTextForPdf,
  generateMarkdownHeader,
  generateMarkdownStats,
  generateMarkdownToc,
  formatAnnotationAsMarkdown,
  generateMarkdownExport,
  getPdfContentWidth,
  getCharsPerLine,
  getPdfGenerationOptions,
  formatAnnotationForPdf,
  prepareAnnotationsForPdf,
  validateExportOptions,
} from "./annotationExportTypes";

// =============================================================================
// TEST DATA
// =============================================================================

const createHighlight = (
  overrides: Partial<HighlightAnnotation> = {}
): HighlightAnnotation => ({
  id: "h1",
  bookId: "book1",
  type: "HIGHLIGHT",
  startOffset: 0,
  endOffset: 100,
  selectedText: "Test highlighted text",
  color: "yellow",
  isPublic: false,
  likeCount: 0,
  isLikedByCurrentUser: false,
  createdAt: "2024-01-15T10:00:00.000Z",
  updatedAt: "2024-01-15T10:00:00.000Z",
  ...overrides,
});

const createNote = (
  overrides: Partial<NoteAnnotation> = {}
): NoteAnnotation => ({
  id: "n1",
  bookId: "book1",
  type: "NOTE",
  startOffset: 200,
  endOffset: 300,
  note: "This is my note",
  selectedText: "Related text",
  isPublic: false,
  likeCount: 0,
  isLikedByCurrentUser: false,
  createdAt: "2024-01-16T10:00:00.000Z",
  updatedAt: "2024-01-16T10:00:00.000Z",
  ...overrides,
});

const createBookmark = (
  overrides: Partial<BookmarkAnnotation> = {}
): BookmarkAnnotation => ({
  id: "b1",
  bookId: "book1",
  type: "BOOKMARK",
  startOffset: 500,
  endOffset: 500,
  isPublic: false,
  likeCount: 0,
  isLikedByCurrentUser: false,
  createdAt: "2024-01-17T10:00:00.000Z",
  updatedAt: "2024-01-17T10:00:00.000Z",
  ...overrides,
});

const sampleAnnotations: Annotation[] = [
  createHighlight({ id: "h1", startOffset: 0, endOffset: 100 }),
  createHighlight({
    id: "h2",
    startOffset: 150,
    endOffset: 200,
    color: "blue",
    note: "Important",
  }),
  createNote({ id: "n1", startOffset: 250, endOffset: 300 }),
  createNote({ id: "n2", startOffset: 400, endOffset: 450, isPublic: true }),
  createBookmark({ id: "b1", startOffset: 600, note: "Good stopping point" }),
];

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  describe("DEFAULT_EXPORT_OPTIONS", () => {
    it("has expected default values", () => {
      expect(DEFAULT_EXPORT_OPTIONS.includeToc).toBe(true);
      expect(DEFAULT_EXPORT_OPTIONS.includeStats).toBe(true);
      expect(DEFAULT_EXPORT_OPTIONS.dateFormat).toBe("long");
    });

    it("has default filters", () => {
      expect(DEFAULT_EXPORT_OPTIONS.filters).toBeDefined();
      expect(DEFAULT_EXPORT_OPTIONS.filters?.includeContext).toBe(true);
      expect(DEFAULT_EXPORT_OPTIONS.filters?.contextLength).toBe(100);
    });
  });

  describe("DATE_FORMATS", () => {
    it("has short format options", () => {
      expect(DATE_FORMATS.short).toBeDefined();
    });

    it("has long format options", () => {
      expect(DATE_FORMATS.long).toBeDefined();
    });

    it("has undefined for iso (uses toISOString)", () => {
      expect(DATE_FORMATS.iso).toBeUndefined();
    });
  });

  describe("PDF_PAGE", () => {
    it("has A4 dimensions", () => {
      expect(PDF_PAGE.width).toBe(210);
      expect(PDF_PAGE.height).toBe(297);
    });

    it("has margins", () => {
      expect(PDF_PAGE.marginTop).toBe(20);
      expect(PDF_PAGE.marginBottom).toBe(20);
      expect(PDF_PAGE.marginLeft).toBe(20);
      expect(PDF_PAGE.marginRight).toBe(20);
    });

    it("has font sizes", () => {
      expect(PDF_PAGE.titleFontSize).toBe(18);
      expect(PDF_PAGE.headingFontSize).toBe(14);
      expect(PDF_PAGE.bodyFontSize).toBe(11);
      expect(PDF_PAGE.smallFontSize).toBe(9);
    });
  });
});

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe("formatExportDate", () => {
  it("formats with long format by default", () => {
    const result = formatExportDate("2024-01-15T10:00:00.000Z", "long");
    expect(result).toContain("January");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("formats with short format", () => {
    const result = formatExportDate("2024-01-15T10:00:00.000Z", "short");
    expect(result).toMatch(/01.*15.*2024|2024.*01.*15/);
  });

  it("formats with ISO format", () => {
    const result = formatExportDate("2024-01-15T10:00:00.000Z", "iso");
    expect(result).toBe("2024-01-15");
  });
});

describe("generateExportFilename", () => {
  it("generates markdown filename", () => {
    const result = generateExportFilename("My Book Title", "markdown");
    expect(result).toMatch(/^my-book-title-annotations-\d{4}-\d{2}-\d{2}\.md$/);
  });

  it("generates PDF filename", () => {
    const result = generateExportFilename("My Book Title", "pdf");
    expect(result).toMatch(
      /^my-book-title-annotations-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("sanitizes special characters", () => {
    const result = generateExportFilename("Book: A Story!", "markdown");
    expect(result).not.toContain(":");
    expect(result).not.toContain("!");
  });

  it("truncates long titles", () => {
    const longTitle = "A".repeat(100);
    const result = generateExportFilename(longTitle, "markdown");
    const beforeAnnotations = result.split("-annotations")[0];
    expect(beforeAnnotations).toBeDefined();
    expect(beforeAnnotations?.length ?? 0).toBeLessThanOrEqual(50);
  });
});

describe("calculateExportStats", () => {
  it("counts all annotation types", () => {
    const stats = calculateExportStats(sampleAnnotations);
    expect(stats.totalAnnotations).toBe(5);
    expect(stats.highlights).toBe(2);
    expect(stats.notes).toBe(2);
    expect(stats.bookmarks).toBe(1);
  });

  it("counts annotations with notes", () => {
    const stats = calculateExportStats(sampleAnnotations);
    expect(stats.withNotes).toBe(4); // h2, n1, n2 have notes, b1 has note
  });

  it("counts public annotations", () => {
    const stats = calculateExportStats(sampleAnnotations);
    expect(stats.publicAnnotations).toBe(1); // n2 is public
  });

  it("returns empty stats for empty array", () => {
    const stats = calculateExportStats([]);
    expect(stats.totalAnnotations).toBe(0);
    expect(stats.highlights).toBe(0);
    expect(stats.notes).toBe(0);
    expect(stats.bookmarks).toBe(0);
  });

  it("includes export date", () => {
    const stats = calculateExportStats(sampleAnnotations);
    expect(stats.exportDate).toBeDefined();
    expect(new Date(stats.exportDate).getTime()).not.toBeNaN();
  });
});

describe("filterAnnotationsForExport", () => {
  it("returns all annotations when no filters", () => {
    const result = filterAnnotationsForExport(sampleAnnotations, undefined);
    expect(result.length).toBe(5);
  });

  it("filters by type", () => {
    const filters: ExportFilters = { types: ["HIGHLIGHT"] };
    const result = filterAnnotationsForExport(sampleAnnotations, filters);
    expect(result.length).toBe(2);
    expect(result.every((a) => a.type === "HIGHLIGHT")).toBe(true);
  });

  it("filters by multiple types", () => {
    const filters: ExportFilters = { types: ["HIGHLIGHT", "BOOKMARK"] };
    const result = filterAnnotationsForExport(sampleAnnotations, filters);
    expect(result.length).toBe(3);
  });

  it("filters public only", () => {
    const filters: ExportFilters = { publicOnly: true };
    const result = filterAnnotationsForExport(sampleAnnotations, filters);
    expect(result.length).toBe(1);
    expect(result[0]?.isPublic).toBe(true);
  });

  it("filters by highlight color", () => {
    const filters: ExportFilters = { colors: ["blue"] };
    const result = filterAnnotationsForExport(sampleAnnotations, filters);
    expect(result.length).toBe(1);
    expect((result[0] as HighlightAnnotation).color).toBe("blue");
  });

  it("returns all when empty types array", () => {
    const filters: ExportFilters = { types: [] };
    const result = filterAnnotationsForExport(sampleAnnotations, filters);
    expect(result.length).toBe(5);
  });
});

describe("sortAnnotationsForExport", () => {
  it("sorts by startOffset ascending", () => {
    const unsorted: Annotation[] = [
      createHighlight({ id: "h1", startOffset: 300 }),
      createNote({ id: "n1", startOffset: 100 }),
      createBookmark({ id: "b1", startOffset: 200 }),
    ];
    const result = sortAnnotationsForExport(unsorted);
    expect(result[0]?.startOffset).toBe(100);
    expect(result[1]?.startOffset).toBe(200);
    expect(result[2]?.startOffset).toBe(300);
  });

  it("does not mutate original array", () => {
    const original = [...sampleAnnotations];
    sortAnnotationsForExport(sampleAnnotations);
    expect(sampleAnnotations).toEqual(original);
  });
});

describe("getExportTypeLabel", () => {
  it("returns Highlight for HIGHLIGHT", () => {
    expect(getExportTypeLabel("HIGHLIGHT")).toBe("Highlight");
  });

  it("returns Note for NOTE", () => {
    expect(getExportTypeLabel("NOTE")).toBe("Note");
  });

  it("returns Bookmark for BOOKMARK", () => {
    expect(getExportTypeLabel("BOOKMARK")).toBe("Bookmark");
  });
});

describe("getColorDisplayName", () => {
  it("capitalizes color name", () => {
    expect(getColorDisplayName("yellow")).toBe("Yellow");
    expect(getColorDisplayName("blue")).toBe("Blue");
    expect(getColorDisplayName("pink")).toBe("Pink");
  });
});

describe("truncateText", () => {
  it("returns original text if shorter than max", () => {
    expect(truncateText("Hello", 10)).toBe("Hello");
  });

  it("truncates with ellipsis if longer", () => {
    expect(truncateText("Hello World", 8)).toBe("Hello...");
  });

  it("handles exact length", () => {
    expect(truncateText("Hello", 5)).toBe("Hello");
  });
});

describe("escapeMarkdown", () => {
  it("escapes backslash", () => {
    expect(escapeMarkdown("a\\b")).toBe("a\\\\b");
  });

  it("escapes asterisk", () => {
    expect(escapeMarkdown("*bold*")).toBe("\\*bold\\*");
  });

  it("escapes underscore", () => {
    expect(escapeMarkdown("_italic_")).toBe("\\_italic\\_");
  });

  it("escapes multiple characters", () => {
    expect(escapeMarkdown("[link](url)")).toBe("\\[link\\]\\(url\\)");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeMarkdown("plain text")).toBe("plain text");
  });
});

describe("wrapTextForPdf", () => {
  it("returns single line for short text", () => {
    const result = wrapTextForPdf("Hello", 20);
    expect(result).toEqual(["Hello"]);
  });

  it("wraps long text into multiple lines", () => {
    const text = "This is a longer piece of text that should wrap";
    const result = wrapTextForPdf(text, 15);
    expect(result.length).toBeGreaterThan(1);
    expect(result.every((line) => line.length <= 15)).toBe(true);
  });

  it("handles words longer than max width", () => {
    const result = wrapTextForPdf("supercalifragilisticexpialidocious", 10);
    expect(result.length).toBe(1); // Single long word stays on one line
  });

  it("handles empty text", () => {
    const result = wrapTextForPdf("", 20);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// MARKDOWN EXPORT TESTS
// =============================================================================

describe("generateMarkdownHeader", () => {
  it("includes book title", () => {
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test Book",
    };
    const result = generateMarkdownHeader(options);
    expect(result).toContain("# Test Book");
  });

  it("includes author if provided", () => {
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test Book",
      bookAuthor: "John Doe",
    };
    const result = generateMarkdownHeader(options);
    expect(result).toContain("**Author:** John Doe");
  });

  it("omits author if not provided", () => {
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test Book",
    };
    const result = generateMarkdownHeader(options);
    expect(result).not.toContain("**Author:**");
  });
});

describe("generateMarkdownStats", () => {
  it("includes all counts", () => {
    const stats = calculateExportStats(sampleAnnotations);
    const result = generateMarkdownStats(stats);
    expect(result).toContain("## Summary");
    expect(result).toContain(
      `**Total Annotations:** ${stats.totalAnnotations}`
    );
    expect(result).toContain(`**Highlights:** ${stats.highlights}`);
    expect(result).toContain(`**Notes:** ${stats.notes}`);
    expect(result).toContain(`**Bookmarks:** ${stats.bookmarks}`);
  });

  it("includes export date", () => {
    const stats = calculateExportStats(sampleAnnotations);
    const result = generateMarkdownStats(stats);
    expect(result).toContain("**Exported:**");
  });
});

describe("generateMarkdownToc", () => {
  it("includes section links with counts", () => {
    const result = generateMarkdownToc(sampleAnnotations);
    expect(result).toContain("## Table of Contents");
    expect(result).toContain("[Highlights](#highlights) (2)");
    expect(result).toContain("[Notes](#notes) (2)");
    expect(result).toContain("[Bookmarks](#bookmarks) (1)");
  });

  it("omits sections with no items", () => {
    const highlightsOnly = [createHighlight()];
    const result = generateMarkdownToc(highlightsOnly);
    expect(result).toContain("Highlights");
    expect(result).not.toContain("Notes");
    expect(result).not.toContain("Bookmarks");
  });
});

describe("formatAnnotationAsMarkdown", () => {
  it("formats highlight with color and text", () => {
    const highlight = createHighlight({
      selectedText: "Important text",
      color: "blue",
    });
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test",
      dateFormat: "long",
    };
    const result = formatAnnotationAsMarkdown(highlight, options, 1);
    expect(result).toContain("### 1. Highlight");
    expect(result).toContain("> Important text");
    expect(result).toContain("**Color:** Blue");
  });

  it("formats note with content", () => {
    const note = createNote({ note: "My note content" });
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test",
      dateFormat: "long",
    };
    const result = formatAnnotationAsMarkdown(note, options, 1);
    expect(result).toContain("### 1. Note");
    expect(result).toContain("My note content");
  });

  it("formats bookmark with position", () => {
    const bookmark = createBookmark({ startOffset: 123 });
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test",
      dateFormat: "long",
    };
    const result = formatAnnotationAsMarkdown(bookmark, options, 1);
    expect(result).toContain("### 1. Bookmark");
    expect(result).toContain("**Position:** 123");
  });

  it("includes highlight note if present", () => {
    const highlight = createHighlight({ note: "Extra note" });
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test",
      dateFormat: "long",
    };
    const result = formatAnnotationAsMarkdown(highlight, options, 1);
    expect(result).toContain("**Note:** Extra note");
  });
});

describe("generateMarkdownExport", () => {
  it("generates complete markdown document", () => {
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test Book",
      bookAuthor: "Author Name",
      includeToc: true,
      includeStats: true,
    };
    const result = generateMarkdownExport(sampleAnnotations, options);
    expect(result).toContain("# Test Book");
    expect(result).toContain("## Summary");
    expect(result).toContain("## Table of Contents");
    expect(result).toContain("## Highlights");
    expect(result).toContain("## Notes");
    expect(result).toContain("## Bookmarks");
    expect(result).toContain("Exported from Read Master");
  });

  it("respects filter options", () => {
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test Book",
      filters: { types: ["HIGHLIGHT"] },
    };
    const result = generateMarkdownExport(sampleAnnotations, options);
    expect(result).toContain("## Highlights");
    expect(result).not.toContain("## Notes");
    expect(result).not.toContain("## Bookmarks");
  });

  it("can exclude TOC", () => {
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test Book",
      includeToc: false,
    };
    const result = generateMarkdownExport(sampleAnnotations, options);
    expect(result).not.toContain("## Table of Contents");
  });

  it("can exclude stats", () => {
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "Test Book",
      includeStats: false,
    };
    const result = generateMarkdownExport(sampleAnnotations, options);
    expect(result).not.toContain("## Summary");
  });
});

// =============================================================================
// PDF EXPORT TESTS
// =============================================================================

describe("getPdfContentWidth", () => {
  it("calculates content width from page and margins", () => {
    const expected =
      PDF_PAGE.width - PDF_PAGE.marginLeft - PDF_PAGE.marginRight;
    expect(getPdfContentWidth()).toBe(expected);
  });
});

describe("getCharsPerLine", () => {
  it("returns more characters for smaller font", () => {
    const small = getCharsPerLine(9);
    const large = getCharsPerLine(14);
    expect(small).toBeGreaterThan(large);
  });

  it("returns positive value", () => {
    expect(getCharsPerLine(11)).toBeGreaterThan(0);
  });
});

describe("getPdfGenerationOptions", () => {
  it("returns portrait A4 options", () => {
    const options: ExportOptions = { format: "pdf", bookTitle: "Test" };
    const result = getPdfGenerationOptions(options);
    expect(result.orientation).toBe("portrait");
    expect(result.unit).toBe("mm");
    expect(result.format).toBe("a4");
  });

  it("includes title and author", () => {
    const options: ExportOptions = {
      format: "pdf",
      bookTitle: "My Book",
      bookAuthor: "Author",
    };
    const result = getPdfGenerationOptions(options);
    expect(result.title).toBe("My Book");
    expect(result.author).toBe("Author");
  });
});

describe("formatAnnotationForPdf", () => {
  it("formats highlight with color info", () => {
    const highlight = createHighlight({
      selectedText: "Selected",
      color: "green",
    });
    const options: ExportOptions = { format: "pdf", bookTitle: "Test" };
    const result = formatAnnotationForPdf(highlight, options, 1);
    expect(result.type).toBe("HIGHLIGHT");
    expect(result.typeLabel).toBe("Highlight");
    expect(result.index).toBe(1);
    expect(result.content).toBe("Selected");
    expect(result.colorName).toBe("Green");
  });

  it("formats note with content", () => {
    const note = createNote({ note: "My note" });
    const options: ExportOptions = { format: "pdf", bookTitle: "Test" };
    const result = formatAnnotationForPdf(note, options, 2);
    expect(result.type).toBe("NOTE");
    expect(result.content).toBe("My note");
  });

  it("formats bookmark with position", () => {
    const bookmark = createBookmark({ startOffset: 999 });
    const options: ExportOptions = { format: "pdf", bookTitle: "Test" };
    const result = formatAnnotationForPdf(bookmark, options, 3);
    expect(result.type).toBe("BOOKMARK");
    expect(result.position).toBe(999);
  });
});

describe("prepareAnnotationsForPdf", () => {
  it("groups annotations by type", () => {
    const options: ExportOptions = { format: "pdf", bookTitle: "Test" };
    const result = prepareAnnotationsForPdf(sampleAnnotations, options);
    expect(result.highlights.length).toBe(2);
    expect(result.notes.length).toBe(2);
    expect(result.bookmarks.length).toBe(1);
  });

  it("includes stats", () => {
    const options: ExportOptions = { format: "pdf", bookTitle: "Test" };
    const result = prepareAnnotationsForPdf(sampleAnnotations, options);
    expect(result.stats.totalAnnotations).toBe(5);
  });

  it("sorts annotations by position", () => {
    const unsorted: Annotation[] = [
      createHighlight({ id: "h1", startOffset: 300 }),
      createHighlight({ id: "h2", startOffset: 100 }),
    ];
    const options: ExportOptions = { format: "pdf", bookTitle: "Test" };
    const result = prepareAnnotationsForPdf(unsorted, options);
    expect(result.highlights[0]?.index).toBe(1);
    expect(result.highlights[1]?.index).toBe(2);
  });

  it("applies filters", () => {
    const options: ExportOptions = {
      format: "pdf",
      bookTitle: "Test",
      filters: { types: ["HIGHLIGHT"] },
    };
    const result = prepareAnnotationsForPdf(sampleAnnotations, options);
    expect(result.highlights.length).toBe(2);
    expect(result.notes.length).toBe(0);
    expect(result.bookmarks.length).toBe(0);
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("validateExportOptions", () => {
  it("validates correct options", () => {
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "My Book",
    };
    const result = validateExportOptions(options);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("fails for empty book title", () => {
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "",
    };
    const result = validateExportOptions(options);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("title");
  });

  it("fails for whitespace-only book title", () => {
    const options: ExportOptions = {
      format: "markdown",
      bookTitle: "   ",
    };
    const result = validateExportOptions(options);
    expect(result.valid).toBe(false);
  });

  it("fails for invalid format", () => {
    const options = {
      format: "invalid" as ExportOptions["format"],
      bookTitle: "Test",
    };
    const result = validateExportOptions(options);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("format");
  });

  it("accepts pdf format", () => {
    const options: ExportOptions = {
      format: "pdf",
      bookTitle: "Test Book",
    };
    const result = validateExportOptions(options);
    expect(result.valid).toBe(true);
  });
});
