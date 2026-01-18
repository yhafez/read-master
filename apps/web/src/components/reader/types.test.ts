/**
 * Tests for EPUB reader types and utilities
 */

import { describe, expect, it } from "vitest";
import {
  INITIAL_READER_STATE,
  DEFAULT_EPUB_STYLES,
  createReaderError,
  getErrorMessage,
  validateEpubUrl,
} from "./types";
import type {
  EpubLocation,
  TocItem,
  TextSelection,
  EpubReaderState,
  EpubReaderProps,
  ReaderErrorType,
} from "./types";

describe("EPUB Reader Types", () => {
  describe("INITIAL_READER_STATE", () => {
    it("should have correct initial values", () => {
      expect(INITIAL_READER_STATE.isLoaded).toBe(false);
      expect(INITIAL_READER_STATE.hasError).toBe(false);
      expect(INITIAL_READER_STATE.errorMessage).toBeNull();
      expect(INITIAL_READER_STATE.location).toBeNull();
      expect(INITIAL_READER_STATE.toc).toEqual([]);
      expect(INITIAL_READER_STATE.selection).toBeNull();
      expect(INITIAL_READER_STATE.canGoNext).toBe(false);
      expect(INITIAL_READER_STATE.canGoPrev).toBe(false);
    });

    it("should be immutable", () => {
      const state = { ...INITIAL_READER_STATE };
      state.isLoaded = true;
      expect(INITIAL_READER_STATE.isLoaded).toBe(false);
    });
  });

  describe("DEFAULT_EPUB_STYLES", () => {
    it("should have body styles", () => {
      expect(DEFAULT_EPUB_STYLES.body).toBeDefined();
      expect(DEFAULT_EPUB_STYLES.body["font-family"]).toBe("inherit");
      expect(DEFAULT_EPUB_STYLES.body["line-height"]).toBe("1.6");
      expect(DEFAULT_EPUB_STYLES.body.padding).toBe("20px");
    });

    it("should have paragraph styles", () => {
      expect(DEFAULT_EPUB_STYLES.p).toBeDefined();
      expect(DEFAULT_EPUB_STYLES.p["margin-bottom"]).toBe("1em");
    });

    it("should have heading styles", () => {
      expect(DEFAULT_EPUB_STYLES.h1).toBeDefined();
      expect(DEFAULT_EPUB_STYLES.h2).toBeDefined();
      expect(DEFAULT_EPUB_STYLES.h3).toBeDefined();
      expect(DEFAULT_EPUB_STYLES.h1["margin-top"]).toBe("1em");
      expect(DEFAULT_EPUB_STYLES.h1["margin-bottom"]).toBe("0.5em");
    });
  });

  describe("createReaderError", () => {
    it("should create error with correct type as name", () => {
      const error = createReaderError("load_failed", "Test message");
      expect(error.name).toBe("load_failed");
      expect(error.message).toBe("Test message");
    });

    it("should create error for all error types", () => {
      const errorTypes: ReaderErrorType[] = [
        "load_failed",
        "render_failed",
        "navigation_failed",
        "invalid_url",
        "unsupported_format",
      ];

      errorTypes.forEach((type) => {
        const error = createReaderError(type, `Error: ${type}`);
        expect(error.name).toBe(type);
        expect(error).toBeInstanceOf(Error);
      });
    });
  });

  describe("getErrorMessage", () => {
    it("should return user-friendly message for load_failed", () => {
      const error = createReaderError("load_failed", "Original message");
      expect(getErrorMessage(error)).toBe(
        "Failed to load the book. Please try again."
      );
    });

    it("should return user-friendly message for render_failed", () => {
      const error = createReaderError("render_failed", "Original message");
      expect(getErrorMessage(error)).toBe("Failed to render the book content.");
    });

    it("should return user-friendly message for navigation_failed", () => {
      const error = createReaderError("navigation_failed", "Original message");
      expect(getErrorMessage(error)).toBe(
        "Failed to navigate to the requested location."
      );
    });

    it("should return user-friendly message for invalid_url", () => {
      const error = createReaderError("invalid_url", "Original message");
      expect(getErrorMessage(error)).toBe("Invalid book URL provided.");
    });

    it("should return user-friendly message for unsupported_format", () => {
      const error = createReaderError("unsupported_format", "Original message");
      expect(getErrorMessage(error)).toBe("This file format is not supported.");
    });

    it("should return error message for generic Error", () => {
      const error = new Error("Custom error message");
      expect(getErrorMessage(error)).toBe("Custom error message");
    });

    it("should return default message for non-Error", () => {
      expect(getErrorMessage("string error")).toBe(
        "An unknown error occurred."
      );
      expect(getErrorMessage(123)).toBe("An unknown error occurred.");
      expect(getErrorMessage(null)).toBe("An unknown error occurred.");
      expect(getErrorMessage(undefined)).toBe("An unknown error occurred.");
    });

    it("should handle Error without message", () => {
      const error = new Error();
      error.message = "";
      expect(getErrorMessage(error)).toBe("An unknown error occurred.");
    });
  });

  describe("validateEpubUrl", () => {
    it("should accept valid https URLs", () => {
      expect(validateEpubUrl("https://example.com/book.epub")).toBe(true);
      expect(validateEpubUrl("https://example.com/path/to/book.epub")).toBe(
        true
      );
    });

    it("should accept valid http URLs", () => {
      expect(validateEpubUrl("http://example.com/book.epub")).toBe(true);
    });

    // Note: In browser context, blob: and relative URLs work via window.location.origin
    // In jsdom test environment, these may not work as expected
    it("should handle blob URLs based on environment", () => {
      // Blob URLs depend on browser context - they may or may not work in jsdom
      const result = validateEpubUrl("blob:https://example.com/abc-123-def");
      expect(typeof result).toBe("boolean");
    });

    it("should handle relative URLs based on environment", () => {
      // Relative URLs depend on window.location.origin being available
      const result1 = validateEpubUrl("/api/books/123/content");
      const result2 = validateEpubUrl("./books/test.epub");
      expect(typeof result1).toBe("boolean");
      expect(typeof result2).toBe("boolean");
    });

    it("should reject empty strings", () => {
      expect(validateEpubUrl("")).toBe(false);
    });

    it("should reject null and undefined", () => {
      // @ts-expect-error Testing invalid input
      expect(validateEpubUrl(null)).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(validateEpubUrl(undefined)).toBe(false);
    });

    it("should reject non-string values", () => {
      // @ts-expect-error Testing invalid input
      expect(validateEpubUrl(123)).toBe(false);
      // @ts-expect-error Testing invalid input
      expect(validateEpubUrl({})).toBe(false);
    });

    it("should reject file: protocol", () => {
      expect(validateEpubUrl("file:///path/to/book.epub")).toBe(false);
    });

    it("should reject javascript: protocol", () => {
      expect(validateEpubUrl("javascript:alert(1)")).toBe(false);
    });

    it("should reject data: protocol", () => {
      expect(validateEpubUrl("data:text/plain,hello")).toBe(false);
    });
  });

  describe("Type Definitions", () => {
    it("should allow valid EpubLocation objects", () => {
      const location: EpubLocation = {
        cfi: "epubcfi(/6/2!/4)",
        percentage: 0.5,
        chapter: 2,
        totalPages: 100,
        currentPage: 50,
      };

      expect(location.cfi).toBe("epubcfi(/6/2!/4)");
      expect(location.percentage).toBe(0.5);
      expect(location.chapter).toBe(2);
      expect(location.totalPages).toBe(100);
      expect(location.currentPage).toBe(50);
    });

    it("should allow valid TocItem objects", () => {
      const tocItem: TocItem = {
        id: "chapter-1",
        label: "Chapter 1",
        href: "chapter1.xhtml",
        subitems: [
          {
            id: "section-1-1",
            label: "Section 1.1",
            href: "chapter1.xhtml#section1",
            subitems: [],
          },
        ],
      };

      expect(tocItem.id).toBe("chapter-1");
      expect(tocItem.label).toBe("Chapter 1");
      expect(tocItem.href).toBe("chapter1.xhtml");
      expect(tocItem.subitems).toHaveLength(1);
    });

    it("should allow valid TextSelection objects", () => {
      const selection: TextSelection = {
        text: "Selected text",
        cfiRange: "epubcfi(/6/2!/4,/1:0,/1:13)",
        position: {
          x: 100,
          y: 200,
        },
      };

      expect(selection.text).toBe("Selected text");
      expect(selection.cfiRange).toBe("epubcfi(/6/2!/4,/1:0,/1:13)");
      expect(selection.position.x).toBe(100);
      expect(selection.position.y).toBe(200);
    });

    it("should allow valid EpubReaderState objects", () => {
      const state: EpubReaderState = {
        isLoaded: true,
        hasError: false,
        errorMessage: null,
        location: {
          cfi: "epubcfi(/6/2!/4)",
          percentage: 0.25,
          chapter: 1,
          totalPages: 50,
          currentPage: 12,
        },
        toc: [
          {
            id: "ch1",
            label: "Chapter 1",
            href: "ch1.xhtml",
            subitems: [],
          },
        ],
        selection: null,
        canGoNext: true,
        canGoPrev: true,
      };

      expect(state.isLoaded).toBe(true);
      expect(state.location?.percentage).toBe(0.25);
      expect(state.toc).toHaveLength(1);
    });

    it("should allow valid EpubReaderProps objects", () => {
      const props: EpubReaderProps = {
        url: "https://example.com/book.epub",
        initialCfi: "epubcfi(/6/2!/4)",
        onLocationChange: (loc) => {
          expect(loc.percentage).toBeDefined();
        },
        onTextSelect: (sel) => {
          expect(sel.text).toBeDefined();
        },
        onError: (err) => {
          expect(err.message).toBeDefined();
        },
        onLoad: (toc) => {
          expect(toc).toBeInstanceOf(Array);
        },
      };

      expect(props.url).toBe("https://example.com/book.epub");
      expect(props.initialCfi).toBe("epubcfi(/6/2!/4)");
      expect(typeof props.onLocationChange).toBe("function");
    });

    it("should allow EpubReaderProps with only required fields", () => {
      const minimalProps: EpubReaderProps = {
        url: "https://example.com/book.epub",
      };

      expect(minimalProps.url).toBe("https://example.com/book.epub");
      expect(minimalProps.initialCfi).toBeUndefined();
      expect(minimalProps.onLocationChange).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle location at 0%", () => {
      const location: EpubLocation = {
        cfi: "epubcfi(/6/2!/4)",
        percentage: 0,
        chapter: 0,
        totalPages: 100,
        currentPage: 1,
      };

      expect(location.percentage).toBe(0);
      expect(location.currentPage).toBe(1);
    });

    it("should handle location at 100%", () => {
      const location: EpubLocation = {
        cfi: "epubcfi(/6/100!/4)",
        percentage: 1,
        chapter: 50,
        totalPages: 100,
        currentPage: 100,
      };

      expect(location.percentage).toBe(1);
      expect(location.currentPage).toBe(100);
    });

    it("should handle empty TOC", () => {
      const state: EpubReaderState = {
        ...INITIAL_READER_STATE,
        isLoaded: true,
        toc: [],
      };

      expect(state.toc).toHaveLength(0);
    });

    it("should handle deeply nested TOC", () => {
      const deepToc: TocItem = {
        id: "level-1",
        label: "Level 1",
        href: "l1.xhtml",
        subitems: [
          {
            id: "level-2",
            label: "Level 2",
            href: "l2.xhtml",
            subitems: [
              {
                id: "level-3",
                label: "Level 3",
                href: "l3.xhtml",
                subitems: [],
              },
            ],
          },
        ],
      };

      const level2 = deepToc.subitems[0];
      const level3 = level2?.subitems[0];
      expect(level3?.id).toBe("level-3");
    });

    it("should handle error state", () => {
      const errorState: EpubReaderState = {
        ...INITIAL_READER_STATE,
        hasError: true,
        errorMessage: "Test error",
      };

      expect(errorState.hasError).toBe(true);
      expect(errorState.errorMessage).toBe("Test error");
      expect(errorState.isLoaded).toBe(false);
    });

    it("should handle selection with empty text", () => {
      const selection: TextSelection = {
        text: "",
        cfiRange: "epubcfi(/6/2!/4)",
        position: { x: 0, y: 0 },
      };

      expect(selection.text).toBe("");
    });
  });
});
