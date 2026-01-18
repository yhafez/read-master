/**
 * Tests for AddBookModal type definitions and validation functions
 */

import { describe, it, expect } from "vitest";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME_TYPES,
  ALL_ALLOWED_MIME_TYPES,
  FILE_EXTENSIONS,
  ALLOWED_FILE_EXTENSIONS,
  TAB_CONFIGS,
  INITIAL_UPLOAD_STATE,
  INITIAL_URL_STATE,
  INITIAL_PASTE_STATE,
  INITIAL_SEARCH_STATE,
  validateFile,
  validateUrl,
  validatePastedContent,
  validateTitle,
  getFormatFromFile,
  formatFileSize,
  type AddBookTab,
  type SupportedFileFormat,
  type BookSearchSource,
  type BookSearchResult,
  type UploadTabState,
  type UrlTabState,
  type PasteTabState,
  type SearchTabState,
  type AddBookFormData,
  type TabPanelProps,
  type ValidationError,
  type TabConfig,
} from "./types";

describe("Constants", () => {
  describe("MAX_FILE_SIZE_BYTES", () => {
    it("should be 50MB in bytes", () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(52428800);
    });
  });

  describe("MAX_FILE_SIZE_MB", () => {
    it("should be 50", () => {
      expect(MAX_FILE_SIZE_MB).toBe(50);
    });

    it("should match MAX_FILE_SIZE_BYTES / (1024 * 1024)", () => {
      expect(MAX_FILE_SIZE_MB).toBe(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    });
  });

  describe("ALLOWED_MIME_TYPES", () => {
    it("should have all supported formats", () => {
      expect(Object.keys(ALLOWED_MIME_TYPES)).toEqual([
        "epub",
        "pdf",
        "doc",
        "docx",
        "txt",
        "html",
      ]);
    });

    it("should have correct MIME types for each format", () => {
      expect(ALLOWED_MIME_TYPES.epub).toContain("application/epub+zip");
      expect(ALLOWED_MIME_TYPES.pdf).toContain("application/pdf");
      expect(ALLOWED_MIME_TYPES.doc).toContain("application/msword");
      expect(ALLOWED_MIME_TYPES.txt).toContain("text/plain");
      expect(ALLOWED_MIME_TYPES.html).toContain("text/html");
    });
  });

  describe("ALL_ALLOWED_MIME_TYPES", () => {
    it("should be a flat array of all MIME types", () => {
      expect(Array.isArray(ALL_ALLOWED_MIME_TYPES)).toBe(true);
      expect(ALL_ALLOWED_MIME_TYPES).toContain("application/pdf");
      expect(ALL_ALLOWED_MIME_TYPES).toContain("text/plain");
    });
  });

  describe("FILE_EXTENSIONS", () => {
    it("should have correct extensions for each format", () => {
      expect(FILE_EXTENSIONS.epub).toBe(".epub");
      expect(FILE_EXTENSIONS.pdf).toBe(".pdf");
      expect(FILE_EXTENSIONS.doc).toBe(".doc");
      expect(FILE_EXTENSIONS.docx).toBe(".docx");
      expect(FILE_EXTENSIONS.txt).toBe(".txt");
      expect(FILE_EXTENSIONS.html).toBe(".html");
    });
  });

  describe("ALLOWED_FILE_EXTENSIONS", () => {
    it("should be a comma-separated string of extensions", () => {
      expect(ALLOWED_FILE_EXTENSIONS).toContain(".epub");
      expect(ALLOWED_FILE_EXTENSIONS).toContain(".pdf");
      expect(ALLOWED_FILE_EXTENSIONS).toContain(",");
    });
  });

  describe("TAB_CONFIGS", () => {
    it("should have 4 tabs", () => {
      expect(TAB_CONFIGS).toHaveLength(4);
    });

    it("should have correct tab IDs", () => {
      const tabIds = TAB_CONFIGS.map((t) => t.id);
      expect(tabIds).toEqual(["upload", "url", "paste", "search"]);
    });

    it("should have labelKey and icon for each tab", () => {
      TAB_CONFIGS.forEach((tab) => {
        expect(tab.labelKey).toBeTruthy();
        expect(tab.icon).toBeTruthy();
      });
    });
  });

  describe("Initial states", () => {
    it("INITIAL_UPLOAD_STATE should have correct defaults", () => {
      expect(INITIAL_UPLOAD_STATE).toEqual({
        file: null,
        title: "",
        author: "",
        isDragging: false,
        error: null,
      });
    });

    it("INITIAL_URL_STATE should have correct defaults", () => {
      expect(INITIAL_URL_STATE).toEqual({
        url: "",
        title: "",
        author: "",
        error: null,
      });
    });

    it("INITIAL_PASTE_STATE should have correct defaults", () => {
      expect(INITIAL_PASTE_STATE).toEqual({
        content: "",
        title: "",
        author: "",
        error: null,
      });
    });

    it("INITIAL_SEARCH_STATE should have correct defaults", () => {
      expect(INITIAL_SEARCH_STATE).toEqual({
        query: "",
        results: [],
        selectedBook: null,
        isSearching: false,
        error: null,
      });
    });
  });
});

describe("validateFile", () => {
  it("should return null for valid file", () => {
    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });
    expect(validateFile(file)).toBeNull();
  });

  it("should return error for file exceeding size limit", () => {
    // Create a mock file with overridden size property using Object.defineProperty
    const file = new File(["test"], "large.pdf", {
      type: "application/pdf",
    });
    // Override the size property to simulate a large file
    Object.defineProperty(file, "size", {
      value: MAX_FILE_SIZE_BYTES + 1,
      writable: false,
    });
    const error = validateFile(file);
    expect(error).not.toBeNull();
    expect(error?.field).toBe("file");
    expect(error?.message).toContain("exceeds maximum");
  });

  it("should return error for unsupported file type", () => {
    const file = new File(["test"], "test.exe", {
      type: "application/octet-stream",
    });
    const error = validateFile(file);
    expect(error).not.toBeNull();
    expect(error?.field).toBe("file");
    expect(error?.message).toContain("Unsupported file format");
  });

  it("should accept valid file by extension even if MIME is wrong", () => {
    // Some browsers may not set correct MIME type
    const file = new File(["test"], "test.epub", { type: "" });
    expect(validateFile(file)).toBeNull();
  });

  it("should accept epub files", () => {
    const file = new File(["test"], "book.epub", {
      type: "application/epub+zip",
    });
    expect(validateFile(file)).toBeNull();
  });

  it("should accept txt files", () => {
    const file = new File(["test"], "book.txt", { type: "text/plain" });
    expect(validateFile(file)).toBeNull();
  });

  it("should accept html files", () => {
    const file = new File(["<html></html>"], "article.html", {
      type: "text/html",
    });
    expect(validateFile(file)).toBeNull();
  });

  it("should accept doc files", () => {
    const file = new File(["test"], "document.doc", {
      type: "application/msword",
    });
    expect(validateFile(file)).toBeNull();
  });

  it("should accept docx files", () => {
    const file = new File(["test"], "document.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(validateFile(file)).toBeNull();
  });
});

describe("validateUrl", () => {
  it("should return null for valid HTTP URL", () => {
    expect(validateUrl("http://example.com/article")).toBeNull();
  });

  it("should return null for valid HTTPS URL", () => {
    expect(validateUrl("https://example.com/article")).toBeNull();
  });

  it("should return error for empty URL", () => {
    const error = validateUrl("");
    expect(error?.field).toBe("url");
    expect(error?.message).toBe("URL is required");
  });

  it("should return error for whitespace-only URL", () => {
    const error = validateUrl("   ");
    expect(error?.field).toBe("url");
    expect(error?.message).toBe("URL is required");
  });

  it("should return error for invalid URL format", () => {
    const error = validateUrl("not a url");
    expect(error?.field).toBe("url");
    expect(error?.message).toBe("Please enter a valid URL");
  });

  it("should return error for non-HTTP protocols", () => {
    const error = validateUrl("ftp://example.com/file");
    expect(error?.field).toBe("url");
    expect(error?.message).toContain("HTTP or HTTPS");
  });

  it("should return error for file protocol", () => {
    const error = validateUrl("file:///path/to/file");
    expect(error?.field).toBe("url");
    expect(error?.message).toContain("HTTP or HTTPS");
  });

  it("should accept URLs with query parameters", () => {
    expect(validateUrl("https://example.com/article?id=123")).toBeNull();
  });

  it("should accept URLs with fragments", () => {
    expect(validateUrl("https://example.com/article#section")).toBeNull();
  });
});

describe("validatePastedContent", () => {
  it("should return null for valid content", () => {
    const content =
      "This is a long enough piece of text that should pass validation easily.";
    expect(validatePastedContent(content)).toBeNull();
  });

  it("should return error for empty content", () => {
    const error = validatePastedContent("");
    expect(error?.field).toBe("content");
    expect(error?.message).toBe("Content is required");
  });

  it("should return error for whitespace-only content", () => {
    const error = validatePastedContent("   \n\t  ");
    expect(error?.field).toBe("content");
    expect(error?.message).toBe("Content is required");
  });

  it("should return error for content less than 50 characters", () => {
    const error = validatePastedContent("Short text");
    expect(error?.field).toBe("content");
    expect(error?.message).toContain("at least 50 characters");
  });

  it("should accept exactly 50 characters", () => {
    const content = "x".repeat(50);
    expect(validatePastedContent(content)).toBeNull();
  });

  it("should accept very long content", () => {
    const content = "x".repeat(10000);
    expect(validatePastedContent(content)).toBeNull();
  });
});

describe("validateTitle", () => {
  it("should return null for valid title", () => {
    expect(validateTitle("My Book Title")).toBeNull();
  });

  it("should return error for empty title", () => {
    const error = validateTitle("");
    expect(error?.field).toBe("title");
    expect(error?.message).toBe("Title is required");
  });

  it("should return error for whitespace-only title", () => {
    const error = validateTitle("   ");
    expect(error?.field).toBe("title");
    expect(error?.message).toBe("Title is required");
  });

  it("should return error for title over 200 characters", () => {
    const error = validateTitle("x".repeat(201));
    expect(error?.field).toBe("title");
    expect(error?.message).toContain("less than 200 characters");
  });

  it("should accept exactly 200 characters", () => {
    expect(validateTitle("x".repeat(200))).toBeNull();
  });

  it("should accept titles with special characters", () => {
    expect(validateTitle("The Book: A Novel (2024)")).toBeNull();
  });

  it("should accept titles with unicode", () => {
    expect(validateTitle("日本語のタイトル")).toBeNull();
  });
});

describe("getFormatFromFile", () => {
  it("should return epub for .epub files", () => {
    const file = new File([""], "book.epub");
    expect(getFormatFromFile(file)).toBe("epub");
  });

  it("should return pdf for .pdf files", () => {
    const file = new File([""], "document.pdf");
    expect(getFormatFromFile(file)).toBe("pdf");
  });

  it("should return txt for .txt files", () => {
    const file = new File([""], "text.txt");
    expect(getFormatFromFile(file)).toBe("txt");
  });

  it("should return html for .html files", () => {
    const file = new File([""], "page.html");
    expect(getFormatFromFile(file)).toBe("html");
  });

  it("should return doc for .doc files", () => {
    const file = new File([""], "document.doc");
    expect(getFormatFromFile(file)).toBe("doc");
  });

  it("should return docx for .docx files", () => {
    const file = new File([""], "document.docx");
    expect(getFormatFromFile(file)).toBe("docx");
  });

  it("should return null for unsupported extension", () => {
    const file = new File([""], "file.exe");
    expect(getFormatFromFile(file)).toBeNull();
  });

  it("should return null for file without extension", () => {
    const file = new File([""], "filename");
    expect(getFormatFromFile(file)).toBeNull();
  });

  it("should handle uppercase extensions", () => {
    const file = new File([""], "BOOK.EPUB");
    expect(getFormatFromFile(file)).toBe("epub");
  });

  it("should handle mixed case extensions", () => {
    const file = new File([""], "Book.Pdf");
    expect(getFormatFromFile(file)).toBe("pdf");
  });
});

describe("formatFileSize", () => {
  it("should format bytes correctly", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("should format kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("should format megabytes correctly", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatFileSize(10.5 * 1024 * 1024)).toBe("10.5 MB");
  });

  it("should handle edge cases", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1023)).toBe("1023 B");
    expect(formatFileSize(1024 * 1024 - 1)).toBe("1024.0 KB");
  });
});

describe("Type definitions", () => {
  describe("AddBookTab", () => {
    it("should accept valid tab values", () => {
      const upload: AddBookTab = "upload";
      const url: AddBookTab = "url";
      const paste: AddBookTab = "paste";
      const search: AddBookTab = "search";
      expect([upload, url, paste, search]).toHaveLength(4);
    });
  });

  describe("SupportedFileFormat", () => {
    it("should accept valid formats", () => {
      const formats: SupportedFileFormat[] = [
        "epub",
        "pdf",
        "doc",
        "docx",
        "txt",
        "html",
      ];
      expect(formats).toHaveLength(6);
    });
  });

  describe("BookSearchSource", () => {
    it("should accept valid sources", () => {
      const google: BookSearchSource = "google_books";
      const openLib: BookSearchSource = "open_library";
      expect([google, openLib]).toHaveLength(2);
    });
  });

  describe("BookSearchResult", () => {
    it("should create valid search result", () => {
      const result: BookSearchResult = {
        externalId: "abc123",
        source: "google_books",
        title: "Test Book",
        authors: ["Author One"],
      };
      expect(result.externalId).toBe("abc123");
    });

    it("should accept all optional fields", () => {
      const result: BookSearchResult = {
        externalId: "abc123",
        source: "open_library",
        title: "Test Book",
        authors: ["Author One", "Author Two"],
        description: "A test description",
        coverUrl: "https://example.com/cover.jpg",
        publishedDate: "2024-01-01",
        pageCount: 300,
        categories: ["Fiction", "Drama"],
        isbn: "978-0-123456-78-9",
        isPublicDomain: true,
      };
      expect(result.authors).toHaveLength(2);
    });
  });

  describe("UploadTabState", () => {
    it("should create valid state", () => {
      const state: UploadTabState = {
        file: null,
        title: "Test",
        author: "Author",
        isDragging: false,
        error: null,
      };
      expect(state.file).toBeNull();
    });
  });

  describe("UrlTabState", () => {
    it("should create valid state", () => {
      const state: UrlTabState = {
        url: "https://example.com",
        title: "Test",
        author: "Author",
        error: null,
      };
      expect(state.url).toBe("https://example.com");
    });
  });

  describe("PasteTabState", () => {
    it("should create valid state", () => {
      const state: PasteTabState = {
        content: "Test content",
        title: "Test",
        author: "Author",
        error: null,
      };
      expect(state.content).toBe("Test content");
    });
  });

  describe("SearchTabState", () => {
    it("should create valid state", () => {
      const state: SearchTabState = {
        query: "test query",
        results: [],
        selectedBook: null,
        isSearching: false,
        error: null,
      };
      expect(state.results).toHaveLength(0);
    });
  });

  describe("AddBookFormData", () => {
    it("should create form data for upload", () => {
      const data: AddBookFormData = {
        title: "Test",
        author: "Author",
        file: new File([""], "test.pdf"),
      };
      expect(data.file).toBeDefined();
    });

    it("should create form data for URL import", () => {
      const data: AddBookFormData = {
        title: "Test",
        author: "Author",
        url: "https://example.com/article",
      };
      expect(data.url).toBe("https://example.com/article");
    });

    it("should create form data for paste", () => {
      const data: AddBookFormData = {
        title: "Test",
        author: "Author",
        content: "Pasted content here",
      };
      expect(data.content).toBe("Pasted content here");
    });

    it("should create form data for search result", () => {
      const data: AddBookFormData = {
        title: "Test Book",
        author: "Author",
        externalId: "abc123",
        source: "google_books",
      };
      expect(data.externalId).toBe("abc123");
    });
  });

  describe("ValidationError", () => {
    it("should create valid error object", () => {
      const error: ValidationError = {
        field: "title",
        message: "Title is required",
      };
      expect(error.field).toBe("title");
      expect(error.message).toBe("Title is required");
    });
  });

  describe("TabConfig", () => {
    it("should create valid config", () => {
      const config: TabConfig = {
        id: "upload",
        labelKey: "library.addBook.tabs.upload",
        icon: "upload",
      };
      expect(config.id).toBe("upload");
    });
  });

  describe("TabPanelProps", () => {
    it("should accept valid props", () => {
      const onSubmit = (_data: AddBookFormData): void => {
        // Handle submit
      };
      const props: TabPanelProps = {
        isActive: true,
        isLoading: false,
        onSubmit,
      };
      expect(props.isActive).toBe(true);
    });
  });
});
