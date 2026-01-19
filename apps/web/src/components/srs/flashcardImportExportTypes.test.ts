/**
 * Tests for Flashcard Import/Export Types and Utilities
 *
 * Comprehensive test coverage for CSV parsing, validation, and export functions.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { FlashcardType } from "./flashcardDeckTypes";
import type {
  CSVRow,
  ExportCard,
  ImportResult,
} from "./flashcardImportExportTypes";
import {
  // Constants
  CSV_HEADERS,
  DEFAULT_EXPORT_OPTIONS,
  INITIAL_IMPORT_STATE,
  IMPORT_MAX_BACK_LENGTH,
  MAX_FILE_SIZE,
  IMPORT_MAX_FRONT_LENGTH,
  MAX_IMPORT_ROWS,
  IMPORT_MAX_TAG_LENGTH,
  IMPORT_MAX_TAGS_PER_CARD,
  IMPORT_MIN_BACK_LENGTH,
  IMPORT_MIN_FRONT_LENGTH,
  TYPE_ALIASES,
  VALID_TYPES,
  // CSV Parsing
  escapeCSVValue,
  unescapeCSVValue,
  parseCSVLine,
  detectDelimiter,
  parseCSVContent,
  // Validation
  normalizeCardType,
  parseTags,
  validateImportRow,
  validateImport,
  // Export
  generateCSVHeader,
  generateCSVRow,
  generateCSVContent,
  generateExportFilename,
  downloadCSV,
  // File handling
  readFileAsText,
  isValidCSVFile,
  isValidFileSize,
  // Template
  generateCSVTemplate,
  downloadCSVTemplate,
  // Summary
  getImportSummaryText,
  getTypeLabelKey,
  hasErrors,
  hasWarnings,
  getValidCards,
  getSelectedValidCards,
  formatFileSize,
  createEmptyExportCard,
  createMockExportCards,
} from "./flashcardImportExportTypes";

// =============================================================================
// CONSTANTS TESTS
// =============================================================================

describe("Constants", () => {
  it("should have correct CSV headers", () => {
    expect(CSV_HEADERS).toEqual(["front", "back", "type", "tags", "book"]);
  });

  it("should have correct default export options", () => {
    expect(DEFAULT_EXPORT_OPTIONS).toEqual({
      includeStats: false,
      includeStatus: false,
      includeCreatedAt: false,
      delimiter: ",",
      quoteChar: '"',
    });
  });

  it("should have correct initial import state", () => {
    expect(INITIAL_IMPORT_STATE.step).toBe("upload");
    expect(INITIAL_IMPORT_STATE.file).toBeNull();
    expect(INITIAL_IMPORT_STATE.result).toBeNull();
    expect(INITIAL_IMPORT_STATE.isLoading).toBe(false);
    expect(INITIAL_IMPORT_STATE.selectedRows).toBeInstanceOf(Set);
  });

  it("should have valid types", () => {
    expect(VALID_TYPES).toContain("VOCABULARY");
    expect(VALID_TYPES).toContain("CONCEPT");
    expect(VALID_TYPES).toContain("COMPREHENSION");
    expect(VALID_TYPES).toContain("QUOTE");
    expect(VALID_TYPES).toContain("CUSTOM");
  });

  it("should have type aliases mapping", () => {
    expect(TYPE_ALIASES["vocabulary"]).toBe("VOCABULARY");
    expect(TYPE_ALIASES["vocab"]).toBe("VOCABULARY");
    expect(TYPE_ALIASES["concept"]).toBe("CONCEPT");
    expect(TYPE_ALIASES[""]).toBe("CUSTOM");
  });

  it("should have correct validation limits", () => {
    expect(IMPORT_MIN_FRONT_LENGTH).toBe(1);
    expect(IMPORT_MAX_FRONT_LENGTH).toBe(1000);
    expect(IMPORT_MIN_BACK_LENGTH).toBe(1);
    expect(IMPORT_MAX_BACK_LENGTH).toBe(5000);
    expect(IMPORT_MAX_TAGS_PER_CARD).toBe(10);
    expect(IMPORT_MAX_TAG_LENGTH).toBe(50);
    expect(MAX_IMPORT_ROWS).toBe(1000);
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });
});

// =============================================================================
// CSV PARSING TESTS
// =============================================================================

describe("CSV Parsing", () => {
  describe("escapeCSVValue", () => {
    it("should return empty string for empty input", () => {
      expect(escapeCSVValue("")).toBe("");
    });

    it("should return value unchanged if no special characters", () => {
      expect(escapeCSVValue("simple text")).toBe("simple text");
    });

    it("should quote value with delimiter", () => {
      expect(escapeCSVValue("hello,world")).toBe('"hello,world"');
    });

    it("should quote value with newline", () => {
      expect(escapeCSVValue("hello\nworld")).toBe('"hello\nworld"');
    });

    it("should escape quotes by doubling them", () => {
      expect(escapeCSVValue('say "hello"')).toBe('"say ""hello"""');
    });

    it("should handle custom delimiter", () => {
      expect(escapeCSVValue("a;b", ";")).toBe('"a;b"');
      expect(escapeCSVValue("a,b", ";")).toBe("a,b");
    });

    it("should handle custom quote character", () => {
      expect(escapeCSVValue("it's ok", ",", "'")).toBe("'it''s ok'");
    });
  });

  describe("unescapeCSVValue", () => {
    it("should return empty string for empty input", () => {
      expect(unescapeCSVValue("")).toBe("");
    });

    it("should remove surrounding quotes", () => {
      expect(unescapeCSVValue('"hello"')).toBe("hello");
    });

    it("should unescape doubled quotes", () => {
      expect(unescapeCSVValue('"say ""hello"""')).toBe('say "hello"');
    });

    it("should trim whitespace", () => {
      expect(unescapeCSVValue("  hello  ")).toBe("hello");
    });

    it("should handle single-character values", () => {
      expect(unescapeCSVValue("a")).toBe("a");
      expect(unescapeCSVValue('"a"')).toBe("a");
    });
  });

  describe("parseCSVLine", () => {
    it("should parse simple comma-separated values", () => {
      expect(parseCSVLine("a,b,c")).toEqual(["a", "b", "c"]);
    });

    it("should handle quoted values", () => {
      expect(parseCSVLine('"hello, world",test')).toEqual([
        "hello, world",
        "test",
      ]);
    });

    it("should handle escaped quotes", () => {
      expect(parseCSVLine('"say ""hi""",test')).toEqual(['say "hi"', "test"]);
    });

    it("should handle empty values", () => {
      expect(parseCSVLine("a,,c")).toEqual(["a", "", "c"]);
    });

    it("should handle custom delimiter", () => {
      expect(parseCSVLine("a;b;c", ";")).toEqual(["a", "b", "c"]);
    });

    it("should handle tab delimiter", () => {
      expect(parseCSVLine("a\tb\tc", "\t")).toEqual(["a", "b", "c"]);
    });

    it("should handle newline in quoted value", () => {
      expect(parseCSVLine('"line1\nline2",test')).toEqual([
        "line1\nline2",
        "test",
      ]);
    });
  });

  describe("detectDelimiter", () => {
    it("should detect comma", () => {
      expect(detectDelimiter("a,b,c")).toBe(",");
    });

    it("should detect semicolon", () => {
      expect(detectDelimiter("a;b;c")).toBe(";");
    });

    it("should detect tab", () => {
      expect(detectDelimiter("a\tb\tc")).toBe("\t");
    });

    it("should prefer tab when most common", () => {
      expect(detectDelimiter("a\tb\tc\td")).toBe("\t");
    });

    it("should prefer semicolon over comma when more common", () => {
      expect(detectDelimiter("a;b;c;d")).toBe(";");
    });

    it("should default to comma for empty content", () => {
      expect(detectDelimiter("")).toBe(",");
    });
  });

  describe("parseCSVContent", () => {
    it("should parse simple CSV", () => {
      const content = "a,b,c\n1,2,3\n4,5,6";
      const rows = parseCSVContent(content);
      // First row is detected as headers due to lack of "front" keyword
      expect(rows.length).toBe(3);
    });

    it("should detect headers and skip them", () => {
      const content = "front,back,type\nquestion,answer,vocab";
      const rows = parseCSVContent(content);
      expect(rows.length).toBe(1);
      expect(rows[0]?.front).toBe("question");
    });

    it("should handle empty lines", () => {
      const content = "a,b\n\nc,d";
      const rows = parseCSVContent(content);
      expect(rows.length).toBe(2);
    });

    it("should handle CRLF line endings", () => {
      const content = "a,b\r\nc,d";
      const rows = parseCSVContent(content);
      expect(rows.length).toBe(2);
    });

    it("should use provided delimiter", () => {
      const content = "a;b;c";
      const rows = parseCSVContent(content, ";");
      expect(rows[0]?.front).toBe("a");
      expect(rows[0]?.back).toBe("b");
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("Validation", () => {
  describe("normalizeCardType", () => {
    it("should return CUSTOM for empty input", () => {
      expect(normalizeCardType("")).toBe("CUSTOM");
    });

    it("should normalize lowercase types", () => {
      expect(normalizeCardType("vocabulary")).toBe("VOCABULARY");
      expect(normalizeCardType("concept")).toBe("CONCEPT");
    });

    it("should handle uppercase types", () => {
      expect(normalizeCardType("VOCABULARY")).toBe("VOCABULARY");
    });

    it("should use aliases", () => {
      expect(normalizeCardType("vocab")).toBe("VOCABULARY");
      expect(normalizeCardType("word")).toBe("VOCABULARY");
      expect(normalizeCardType("idea")).toBe("CONCEPT");
    });

    it("should default to CUSTOM for unknown types", () => {
      expect(normalizeCardType("unknown")).toBe("CUSTOM");
      expect(normalizeCardType("xyz")).toBe("CUSTOM");
    });

    it("should handle mixed case", () => {
      expect(normalizeCardType("Vocabulary")).toBe("VOCABULARY");
      expect(normalizeCardType("VOCAB")).toBe("VOCABULARY");
    });
  });

  describe("parseTags", () => {
    it("should return empty array for empty input", () => {
      expect(parseTags("")).toEqual([]);
    });

    it("should parse comma-separated tags", () => {
      expect(parseTags("tag1,tag2,tag3")).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should trim whitespace", () => {
      expect(parseTags(" tag1 , tag2 ")).toEqual(["tag1", "tag2"]);
    });

    it("should filter empty tags", () => {
      expect(parseTags("tag1,,tag2")).toEqual(["tag1", "tag2"]);
    });

    it("should limit number of tags", () => {
      const manyTags = Array(15).fill("tag").join(",");
      const result = parseTags(manyTags);
      expect(result.length).toBe(IMPORT_MAX_TAGS_PER_CARD);
    });

    it("should filter tags exceeding max length", () => {
      const longTag = "a".repeat(IMPORT_MAX_TAG_LENGTH + 1);
      expect(parseTags(`short,${longTag}`)).toEqual(["short"]);
    });
  });

  describe("validateImportRow", () => {
    it("should validate valid row", () => {
      const row: CSVRow = {
        front: "Question",
        back: "Answer",
        type: "vocabulary",
        tags: "tag1,tag2",
        book: "",
      };

      const result = validateImportRow(row, 1);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.card).not.toBeNull();
      expect(result.card?.type).toBe("VOCABULARY");
    });

    it("should reject empty front", () => {
      const row: CSVRow = {
        front: "",
        back: "Answer",
        type: "",
        tags: "",
        book: "",
      };

      const result = validateImportRow(row, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Front content is required");
    });

    it("should reject empty back", () => {
      const row: CSVRow = {
        front: "Question",
        back: "",
        type: "",
        tags: "",
        book: "",
      };

      const result = validateImportRow(row, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Back content is required");
    });

    it("should warn for unknown type", () => {
      const row: CSVRow = {
        front: "Question",
        back: "Answer",
        type: "unknown_type",
        tags: "",
        book: "",
      };

      const result = validateImportRow(row, 1);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should match book by title", () => {
      const row: CSVRow = {
        front: "Question",
        back: "Answer",
        type: "",
        tags: "",
        book: "My Book",
      };
      const books = [{ id: "book-1", title: "My Book" }];

      const result = validateImportRow(row, 1, books);
      expect(result.card?.bookId).toBe("book-1");
    });

    it("should warn when book not found", () => {
      const row: CSVRow = {
        front: "Question",
        back: "Answer",
        type: "",
        tags: "",
        book: "Unknown Book",
      };
      const books = [{ id: "book-1", title: "My Book" }];

      const result = validateImportRow(row, 1, books);
      expect(result.warnings).toContainEqual(
        expect.stringContaining("not found")
      );
    });

    it("should include row number", () => {
      const row: CSVRow = {
        front: "Q",
        back: "A",
        type: "",
        tags: "",
        book: "",
      };

      const result = validateImportRow(row, 5);
      expect(result.rowNumber).toBe(5);
    });
  });

  describe("validateImport", () => {
    it("should validate multiple rows", () => {
      const rows: CSVRow[] = [
        { front: "Q1", back: "A1", type: "", tags: "", book: "" },
        { front: "Q2", back: "A2", type: "", tags: "", book: "" },
      ];

      const result = validateImport(rows);
      expect(result.totalRows).toBe(2);
      expect(result.validCount).toBe(2);
      expect(result.canImport).toBe(true);
    });

    it("should count invalid rows", () => {
      const rows: CSVRow[] = [
        { front: "Q1", back: "A1", type: "", tags: "", book: "" },
        { front: "", back: "", type: "", tags: "", book: "" },
      ];

      const result = validateImport(rows);
      expect(result.validCount).toBe(1);
      expect(result.invalidCount).toBe(1);
    });

    it("should limit rows to MAX_IMPORT_ROWS", () => {
      const rows: CSVRow[] = Array(MAX_IMPORT_ROWS + 100).fill({
        front: "Q",
        back: "A",
        type: "",
        tags: "",
        book: "",
      });

      const result = validateImport(rows);
      expect(result.totalRows).toBe(MAX_IMPORT_ROWS);
    });

    it("should set canImport to false when no valid rows", () => {
      const rows: CSVRow[] = [
        { front: "", back: "", type: "", tags: "", book: "" },
      ];

      const result = validateImport(rows);
      expect(result.canImport).toBe(false);
    });
  });
});

// =============================================================================
// EXPORT TESTS
// =============================================================================

describe("Export", () => {
  describe("generateCSVHeader", () => {
    it("should generate basic header", () => {
      const header = generateCSVHeader(DEFAULT_EXPORT_OPTIONS);
      expect(header).toBe("front,back,type,tags,book");
    });

    it("should include status when requested", () => {
      const header = generateCSVHeader({
        ...DEFAULT_EXPORT_OPTIONS,
        includeStatus: true,
      });
      expect(header).toContain("status");
    });

    it("should include stats when requested", () => {
      const header = generateCSVHeader({
        ...DEFAULT_EXPORT_OPTIONS,
        includeStats: true,
      });
      expect(header).toContain("easeFactor");
      expect(header).toContain("interval");
      expect(header).toContain("dueDate");
    });

    it("should include createdAt when requested", () => {
      const header = generateCSVHeader({
        ...DEFAULT_EXPORT_OPTIONS,
        includeCreatedAt: true,
      });
      expect(header).toContain("createdAt");
    });

    it("should use custom delimiter", () => {
      const header = generateCSVHeader({
        ...DEFAULT_EXPORT_OPTIONS,
        delimiter: ";",
      });
      expect(header).toBe("front;back;type;tags;book");
    });
  });

  describe("generateCSVRow", () => {
    const baseCard: ExportCard = {
      front: "Question",
      back: "Answer",
      type: "VOCABULARY",
      status: "NEW",
      tags: ["tag1", "tag2"],
      bookTitle: "My Book",
      easeFactor: 2.5,
      interval: 7,
      dueDate: "2024-01-15T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
    };

    it("should generate basic row", () => {
      const row = generateCSVRow(baseCard, DEFAULT_EXPORT_OPTIONS);
      expect(row).toBe('Question,Answer,VOCABULARY,"tag1,tag2",My Book');
    });

    it("should include status when requested", () => {
      const row = generateCSVRow(baseCard, {
        ...DEFAULT_EXPORT_OPTIONS,
        includeStatus: true,
      });
      expect(row).toContain("NEW");
    });

    it("should include stats when requested", () => {
      const row = generateCSVRow(baseCard, {
        ...DEFAULT_EXPORT_OPTIONS,
        includeStats: true,
      });
      expect(row).toContain("2.5");
      expect(row).toContain("7");
    });

    it("should handle null book title", () => {
      const card = { ...baseCard, bookTitle: null };
      const row = generateCSVRow(card, DEFAULT_EXPORT_OPTIONS);
      expect(row).not.toContain("null");
    });

    it("should escape special characters", () => {
      const card = { ...baseCard, front: 'Say "hello"' };
      const row = generateCSVRow(card, DEFAULT_EXPORT_OPTIONS);
      expect(row).toContain('""hello""');
    });
  });

  describe("generateCSVContent", () => {
    it("should generate complete CSV with header and rows", () => {
      const cards = createMockExportCards(2);
      const content = generateCSVContent(cards);

      const lines = content.split("\n");
      expect(lines[0]).toBe("front,back,type,tags,book");
      expect(lines.length).toBe(3); // header + 2 rows
    });

    it("should handle empty cards array", () => {
      const content = generateCSVContent([]);
      const lines = content.split("\n");
      expect(lines.length).toBe(1); // just header
    });
  });

  describe("generateExportFilename", () => {
    it("should generate filename with date", () => {
      const filename = generateExportFilename();
      expect(filename).toMatch(/^flashcards_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it("should use custom prefix", () => {
      const filename = generateExportFilename("my-cards");
      expect(filename).toMatch(/^my-cards_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it("should use custom extension", () => {
      const filename = generateExportFilename("data", "txt");
      expect(filename).toMatch(/\.txt$/);
    });
  });

  describe("downloadCSV", () => {
    let createObjectURLSpy: ReturnType<typeof vi.fn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      createObjectURLSpy = vi.fn().mockReturnValue("blob:test");
      revokeObjectURLSpy = vi.fn();
      vi.stubGlobal("URL", {
        createObjectURL: createObjectURLSpy,
        revokeObjectURL: revokeObjectURLSpy,
      });

      // Mock document methods
      const link = {
        href: "",
        download: "",
        style: { display: "" },
        click: vi.fn(),
      };
      vi.spyOn(document, "createElement").mockReturnValue(
        link as unknown as HTMLElement
      );
      vi.spyOn(document.body, "appendChild").mockImplementation(
        () => link as unknown as HTMLElement
      );
      vi.spyOn(document.body, "removeChild").mockImplementation(
        () => link as unknown as HTMLElement
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should create and click download link", () => {
      downloadCSV("test content", "test.csv");

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// FILE HANDLING TESTS
// =============================================================================

describe("File Handling", () => {
  describe("isValidCSVFile", () => {
    it("should accept CSV files", () => {
      const file = new File([""], "test.csv", { type: "text/csv" });
      expect(isValidCSVFile(file)).toBe(true);
    });

    it("should accept TXT files", () => {
      const file = new File([""], "test.txt", { type: "text/plain" });
      expect(isValidCSVFile(file)).toBe(true);
    });

    it("should accept files with CSV extension and no type", () => {
      const file = new File([""], "test.csv", { type: "" });
      expect(isValidCSVFile(file)).toBe(true);
    });

    it("should reject PDF files", () => {
      const file = new File([""], "test.pdf", { type: "application/pdf" });
      expect(isValidCSVFile(file)).toBe(false);
    });
  });

  describe("isValidFileSize", () => {
    it("should accept files within limit", () => {
      const file = new File(["x".repeat(1000)], "test.csv");
      expect(isValidFileSize(file)).toBe(true);
    });

    it("should reject files exceeding limit", () => {
      // Create a mock file with size property
      const file = { size: MAX_FILE_SIZE + 1 } as File;
      expect(isValidFileSize(file)).toBe(false);
    });
  });

  describe("readFileAsText", () => {
    it("should read file content", async () => {
      const content = "test content";
      const file = new File([content], "test.txt");

      const result = await readFileAsText(file);
      expect(result).toBe(content);
    });
  });
});

// =============================================================================
// TEMPLATE TESTS
// =============================================================================

describe("Template", () => {
  describe("generateCSVTemplate", () => {
    it("should generate valid CSV template", () => {
      const template = generateCSVTemplate();
      const lines = template.split("\n");

      expect(lines[0]).toBe("front,back,type,tags,book");
      expect(lines.length).toBeGreaterThan(1);
    });

    it("should include sample data", () => {
      const template = generateCSVTemplate();
      expect(template).toContain("photosynthesis");
      expect(template).toContain("VOCABULARY");
    });
  });

  describe("downloadCSVTemplate", () => {
    beforeEach(() => {
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      const link = {
        href: "",
        download: "",
        style: { display: "" },
        click: vi.fn(),
      };
      vi.spyOn(document, "createElement").mockReturnValue(
        link as unknown as HTMLElement
      );
      vi.spyOn(document.body, "appendChild").mockImplementation(
        () => link as unknown as HTMLElement
      );
      vi.spyOn(document.body, "removeChild").mockImplementation(
        () => link as unknown as HTMLElement
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should download template file", () => {
      expect(() => downloadCSVTemplate()).not.toThrow();
    });
  });
});

// =============================================================================
// SUMMARY UTILITY TESTS
// =============================================================================

describe("Summary Utilities", () => {
  describe("getImportSummaryText", () => {
    it("should format summary text", () => {
      const result: ImportResult = {
        totalRows: 10,
        validCount: 8,
        invalidCount: 2,
        warningCount: 1,
        rows: [],
        canImport: true,
      };

      const text = getImportSummaryText(result);
      expect(text).toContain("8 valid cards");
      expect(text).toContain("2 invalid cards");
      expect(text).toContain("1 card with warnings");
    });

    it("should handle singular form", () => {
      const result: ImportResult = {
        totalRows: 1,
        validCount: 1,
        invalidCount: 0,
        warningCount: 0,
        rows: [],
        canImport: true,
      };

      const text = getImportSummaryText(result);
      expect(text).toBe("1 valid card");
    });
  });

  describe("getTypeLabelKey", () => {
    it("should return correct label key", () => {
      expect(getTypeLabelKey("VOCABULARY")).toBe(
        "flashcards.browse.type.vocabulary"
      );
      expect(getTypeLabelKey("CONCEPT")).toBe("flashcards.browse.type.concept");
    });
  });

  describe("hasErrors", () => {
    it("should return true when errors exist", () => {
      const row = {
        rowNumber: 1,
        isValid: false,
        errors: ["Error 1"],
        warnings: [],
        card: null,
        original: { front: "", back: "", type: "", tags: "", book: "" },
      };
      expect(hasErrors(row)).toBe(true);
    });

    it("should return false when no errors", () => {
      const row = {
        rowNumber: 1,
        isValid: true,
        errors: [],
        warnings: [],
        card: null,
        original: { front: "", back: "", type: "", tags: "", book: "" },
      };
      expect(hasErrors(row)).toBe(false);
    });
  });

  describe("hasWarnings", () => {
    it("should return true when warnings exist", () => {
      const row = {
        rowNumber: 1,
        isValid: true,
        errors: [],
        warnings: ["Warning 1"],
        card: null,
        original: { front: "", back: "", type: "", tags: "", book: "" },
      };
      expect(hasWarnings(row)).toBe(true);
    });
  });

  describe("getValidCards", () => {
    it("should extract valid cards", () => {
      const result: ImportResult = {
        totalRows: 2,
        validCount: 1,
        invalidCount: 1,
        warningCount: 0,
        rows: [
          {
            rowNumber: 1,
            isValid: true,
            errors: [],
            warnings: [],
            card: {
              front: "Q",
              back: "A",
              type: "CUSTOM" as FlashcardType,
              tags: [],
              bookId: null,
              bookOriginal: null,
            },
            original: { front: "Q", back: "A", type: "", tags: "", book: "" },
          },
          {
            rowNumber: 2,
            isValid: false,
            errors: ["Error"],
            warnings: [],
            card: null,
            original: { front: "", back: "", type: "", tags: "", book: "" },
          },
        ],
        canImport: true,
      };

      const cards = getValidCards(result);
      expect(cards.length).toBe(1);
      expect(cards[0]?.front).toBe("Q");
    });
  });

  describe("getSelectedValidCards", () => {
    it("should return only selected valid cards", () => {
      const result: ImportResult = {
        totalRows: 3,
        validCount: 3,
        invalidCount: 0,
        warningCount: 0,
        rows: [
          {
            rowNumber: 1,
            isValid: true,
            errors: [],
            warnings: [],
            card: {
              front: "Q1",
              back: "A1",
              type: "CUSTOM" as FlashcardType,
              tags: [],
              bookId: null,
              bookOriginal: null,
            },
            original: { front: "Q1", back: "A1", type: "", tags: "", book: "" },
          },
          {
            rowNumber: 2,
            isValid: true,
            errors: [],
            warnings: [],
            card: {
              front: "Q2",
              back: "A2",
              type: "CUSTOM" as FlashcardType,
              tags: [],
              bookId: null,
              bookOriginal: null,
            },
            original: { front: "Q2", back: "A2", type: "", tags: "", book: "" },
          },
          {
            rowNumber: 3,
            isValid: true,
            errors: [],
            warnings: [],
            card: {
              front: "Q3",
              back: "A3",
              type: "CUSTOM" as FlashcardType,
              tags: [],
              bookId: null,
              bookOriginal: null,
            },
            original: { front: "Q3", back: "A3", type: "", tags: "", book: "" },
          },
        ],
        canImport: true,
      };

      const selected = new Set([1, 3]);
      const cards = getSelectedValidCards(result, selected);
      expect(cards.length).toBe(2);
      expect(cards[0]?.front).toBe("Q1");
      expect(cards[1]?.front).toBe("Q3");
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(1500)).toBe("1.5 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(1500000)).toBe("1.4 MB");
    });
  });

  describe("createEmptyExportCard", () => {
    it("should create empty card with defaults", () => {
      const card = createEmptyExportCard();
      expect(card.front).toBe("");
      expect(card.back).toBe("");
      expect(card.type).toBe("CUSTOM");
      expect(card.status).toBe("NEW");
      expect(card.tags).toEqual([]);
      expect(card.easeFactor).toBe(2.5);
    });
  });

  describe("createMockExportCards", () => {
    it("should create specified number of cards", () => {
      const cards = createMockExportCards(5);
      expect(cards.length).toBe(5);
    });

    it("should use different types", () => {
      const cards = createMockExportCards(5);
      const types = new Set(cards.map((c) => c.type));
      expect(types.size).toBeGreaterThan(1);
    });
  });
});
