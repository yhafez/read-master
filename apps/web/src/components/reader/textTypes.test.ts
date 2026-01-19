/**
 * Tests for text reader types and utilities
 */

import { describe, it, expect } from "vitest";
import {
  // Types
  type TextLocation,
  type TextReaderSelection,
  type TextHighlight,
  type TextHighlightColor,
  type TextReaderState,
  type TextContentType,
  type TextReaderProps,
  type TextReaderErrorType,
  // Constants
  INITIAL_TEXT_READER_STATE,
  CHARS_PER_PAGE,
  SCROLL_AMOUNT,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  FONT_SIZE_STEP,
  HIGHLIGHT_COLORS,
  // Functions
  createTextReaderError,
  getTextReaderErrorMessage,
  validateContent,
  calculateLocation,
  parseIntoParagraphs,
  clampFontSize,
  formatPercent,
  getOffsetAtScrollPosition,
  getScrollPositionFromOffset,
  rangesOverlap,
  getOverlappingHighlights,
  mergeOverlappingHighlights,
} from "./textTypes";

describe("textTypes", () => {
  describe("Type exports", () => {
    it("should export TextLocation type", () => {
      const location: TextLocation = {
        charOffset: 0,
        percentage: 0,
        totalChars: 1000,
        paragraphIndex: 0,
        totalParagraphs: 10,
        estimatedPage: 1,
        estimatedTotalPages: 5,
      };
      expect(location).toBeDefined();
    });

    it("should export TextReaderSelection type", () => {
      const selection: TextReaderSelection = {
        text: "selected text",
        startOffset: 0,
        endOffset: 12,
        position: { x: 100, y: 200 },
      };
      expect(selection).toBeDefined();
    });

    it("should export TextHighlight type", () => {
      const highlight: TextHighlight = {
        id: "h1",
        startOffset: 0,
        endOffset: 10,
        color: "yellow",
        note: "Test note",
      };
      expect(highlight).toBeDefined();
    });

    it("should export TextHighlightColor type", () => {
      const colors: TextHighlightColor[] = [
        "yellow",
        "green",
        "blue",
        "pink",
        "purple",
      ];
      expect(colors).toHaveLength(5);
    });

    it("should export TextReaderState type", () => {
      const state: TextReaderState = INITIAL_TEXT_READER_STATE;
      expect(state).toBeDefined();
    });

    it("should export TextContentType type", () => {
      const types: TextContentType[] = ["plain", "doc", "docx", "rtf", "html"];
      expect(types).toHaveLength(5);
    });

    it("should export TextReaderProps type", () => {
      const props: TextReaderProps = {
        content: "test content",
      };
      expect(props).toBeDefined();
    });

    it("should export TextReaderErrorType type", () => {
      const errorTypes: TextReaderErrorType[] = [
        "load_failed",
        "parse_failed",
        "render_failed",
        "invalid_content",
        "unsupported_format",
      ];
      expect(errorTypes).toHaveLength(5);
    });
  });

  describe("Constants", () => {
    it("should export INITIAL_TEXT_READER_STATE", () => {
      expect(INITIAL_TEXT_READER_STATE).toEqual({
        isLoaded: false,
        hasError: false,
        errorMessage: null,
        location: null,
        selection: null,
        canGoNext: false,
        canGoPrev: false,
        highlights: [],
        fontSize: 1.0,
        lineHeight: 1.6,
      });
    });

    it("should export CHARS_PER_PAGE", () => {
      expect(CHARS_PER_PAGE).toBe(1500);
    });

    it("should export SCROLL_AMOUNT", () => {
      expect(SCROLL_AMOUNT).toBe(0.9);
    });

    it("should export font size constants", () => {
      expect(MIN_FONT_SIZE).toBe(0.75);
      expect(MAX_FONT_SIZE).toBe(2.0);
      expect(FONT_SIZE_STEP).toBe(0.1);
    });

    it("should export HIGHLIGHT_COLORS", () => {
      expect(HIGHLIGHT_COLORS).toEqual({
        yellow: "#fff176",
        green: "#a5d6a7",
        blue: "#90caf9",
        pink: "#f48fb1",
        purple: "#ce93d8",
      });
    });
  });

  describe("createTextReaderError", () => {
    it("should create error with correct name and message", () => {
      const error = createTextReaderError("load_failed", "Could not load");
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("load_failed");
      expect(error.message).toBe("Could not load");
    });

    it("should work with all error types", () => {
      const types: TextReaderErrorType[] = [
        "load_failed",
        "parse_failed",
        "render_failed",
        "invalid_content",
        "unsupported_format",
      ];

      types.forEach((type) => {
        const error = createTextReaderError(type, "Test message");
        expect(error.name).toBe(type);
      });
    });
  });

  describe("getTextReaderErrorMessage", () => {
    it("should return correct message for load_failed", () => {
      const error = createTextReaderError("load_failed", "");
      expect(getTextReaderErrorMessage(error)).toBe(
        "Failed to load the content. Please try again."
      );
    });

    it("should return correct message for parse_failed", () => {
      const error = createTextReaderError("parse_failed", "");
      expect(getTextReaderErrorMessage(error)).toBe(
        "Failed to parse the content format."
      );
    });

    it("should return correct message for render_failed", () => {
      const error = createTextReaderError("render_failed", "");
      expect(getTextReaderErrorMessage(error)).toBe(
        "Failed to render the content."
      );
    });

    it("should return correct message for invalid_content", () => {
      const error = createTextReaderError("invalid_content", "");
      expect(getTextReaderErrorMessage(error)).toBe(
        "The content provided is invalid or empty."
      );
    });

    it("should return correct message for unsupported_format", () => {
      const error = createTextReaderError("unsupported_format", "");
      expect(getTextReaderErrorMessage(error)).toBe(
        "This content format is not supported."
      );
    });

    it("should return error message for generic errors", () => {
      const error = new Error("Custom error message");
      expect(getTextReaderErrorMessage(error)).toBe("Custom error message");
    });

    it("should return default message for non-error values", () => {
      expect(getTextReaderErrorMessage(null)).toBe(
        "An unknown error occurred."
      );
      expect(getTextReaderErrorMessage(undefined)).toBe(
        "An unknown error occurred."
      );
      expect(getTextReaderErrorMessage("string")).toBe(
        "An unknown error occurred."
      );
    });
  });

  describe("validateContent", () => {
    it("should return true for valid content", () => {
      expect(validateContent("Hello world")).toBe(true);
      expect(validateContent("a")).toBe(true);
      expect(validateContent("  text  ")).toBe(true);
    });

    it("should return false for empty content", () => {
      expect(validateContent("")).toBe(false);
      expect(validateContent("   ")).toBe(false);
      expect(validateContent("\n\t")).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(validateContent(null as unknown as string)).toBe(false);
      expect(validateContent(undefined as unknown as string)).toBe(false);
      expect(validateContent(123 as unknown as string)).toBe(false);
    });
  });

  describe("calculateLocation", () => {
    const content = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const paragraphs = [
      "First paragraph.",
      "Second paragraph.",
      "Third paragraph.",
    ];

    it("should calculate location at start", () => {
      const location = calculateLocation(0, content, paragraphs);
      expect(location.charOffset).toBe(0);
      expect(location.percentage).toBe(0);
      expect(location.paragraphIndex).toBe(0);
      expect(location.totalParagraphs).toBe(3);
    });

    it("should calculate location in middle", () => {
      const location = calculateLocation(25, content, paragraphs);
      expect(location.charOffset).toBe(25);
      expect(location.percentage).toBeCloseTo(25 / content.length, 5);
      expect(location.paragraphIndex).toBe(1);
    });

    it("should calculate estimated pages", () => {
      const location = calculateLocation(0, content, paragraphs);
      expect(location.estimatedPage).toBe(1);
      expect(location.estimatedTotalPages).toBe(1); // Short content
    });

    it("should handle longer content for page calculation", () => {
      const longContent = "x".repeat(3000);
      const location = calculateLocation(1600, longContent, ["x".repeat(3000)]);
      expect(location.estimatedPage).toBe(2);
      expect(location.estimatedTotalPages).toBe(2);
    });

    it("should handle empty content", () => {
      const location = calculateLocation(0, "", []);
      expect(location.charOffset).toBe(0);
      expect(location.percentage).toBe(0);
      expect(location.totalChars).toBe(0);
    });
  });

  describe("parseIntoParagraphs", () => {
    it("should split by double newlines", () => {
      const content = "First paragraph.\n\nSecond paragraph.";
      const paragraphs = parseIntoParagraphs(content);
      expect(paragraphs).toEqual(["First paragraph.", "Second paragraph."]);
    });

    it("should split by Windows-style double newlines", () => {
      const content = "First paragraph.\r\n\r\nSecond paragraph.";
      const paragraphs = parseIntoParagraphs(content);
      expect(paragraphs).toEqual(["First paragraph.", "Second paragraph."]);
    });

    it("should fall back to single newlines if no double newlines", () => {
      const content = "Line 1\nLine 2\nLine 3";
      const paragraphs = parseIntoParagraphs(content);
      expect(paragraphs).toEqual(["Line 1", "Line 2", "Line 3"]);
    });

    it("should trim whitespace", () => {
      const content = "  First paragraph.  \n\n  Second paragraph.  ";
      const paragraphs = parseIntoParagraphs(content);
      expect(paragraphs).toEqual(["First paragraph.", "Second paragraph."]);
    });

    it("should filter empty paragraphs", () => {
      const content = "First.\n\n\n\nSecond.";
      const paragraphs = parseIntoParagraphs(content);
      expect(paragraphs).toEqual(["First.", "Second."]);
    });

    it("should handle empty content", () => {
      expect(parseIntoParagraphs("")).toEqual([]);
      expect(parseIntoParagraphs(null as unknown as string)).toEqual([]);
      expect(parseIntoParagraphs(undefined as unknown as string)).toEqual([]);
    });

    it("should handle single paragraph", () => {
      const content = "Just one paragraph with no breaks.";
      const paragraphs = parseIntoParagraphs(content);
      expect(paragraphs).toEqual(["Just one paragraph with no breaks."]);
    });
  });

  describe("clampFontSize", () => {
    it("should return value within range", () => {
      expect(clampFontSize(1.0)).toBe(1.0);
      expect(clampFontSize(1.5)).toBe(1.5);
    });

    it("should clamp to minimum", () => {
      expect(clampFontSize(0.5)).toBe(MIN_FONT_SIZE);
      expect(clampFontSize(0)).toBe(MIN_FONT_SIZE);
      expect(clampFontSize(-1)).toBe(MIN_FONT_SIZE);
    });

    it("should clamp to maximum", () => {
      expect(clampFontSize(3.0)).toBe(MAX_FONT_SIZE);
      expect(clampFontSize(100)).toBe(MAX_FONT_SIZE);
    });
  });

  describe("formatPercent", () => {
    it("should format percentage correctly", () => {
      expect(formatPercent(0)).toBe("0%");
      expect(formatPercent(0.5)).toBe("50%");
      expect(formatPercent(1)).toBe("100%");
    });

    it("should round to nearest integer", () => {
      expect(formatPercent(0.333)).toBe("33%");
      expect(formatPercent(0.666)).toBe("67%");
    });
  });

  describe("getOffsetAtScrollPosition", () => {
    it("should calculate offset from scroll position", () => {
      expect(getOffsetAtScrollPosition(0, 1000, 5000)).toBe(0);
      expect(getOffsetAtScrollPosition(500, 1000, 5000)).toBe(2500);
      expect(getOffsetAtScrollPosition(1000, 1000, 5000)).toBe(5000);
    });

    it("should handle zero scroll height", () => {
      expect(getOffsetAtScrollPosition(100, 0, 5000)).toBe(0);
    });
  });

  describe("getScrollPositionFromOffset", () => {
    it("should calculate scroll position from offset", () => {
      expect(getScrollPositionFromOffset(0, 5000, 1000)).toBe(0);
      expect(getScrollPositionFromOffset(2500, 5000, 1000)).toBe(500);
      expect(getScrollPositionFromOffset(5000, 5000, 1000)).toBe(1000);
    });

    it("should handle zero total chars", () => {
      expect(getScrollPositionFromOffset(100, 0, 1000)).toBe(0);
    });
  });

  describe("rangesOverlap", () => {
    it("should return true for overlapping ranges", () => {
      expect(rangesOverlap(0, 10, 5, 15)).toBe(true);
      expect(rangesOverlap(5, 15, 0, 10)).toBe(true);
      expect(rangesOverlap(0, 10, 0, 10)).toBe(true);
      expect(rangesOverlap(0, 10, 5, 8)).toBe(true); // Contained
    });

    it("should return false for non-overlapping ranges", () => {
      expect(rangesOverlap(0, 10, 10, 20)).toBe(false);
      expect(rangesOverlap(0, 10, 15, 25)).toBe(false);
      expect(rangesOverlap(15, 25, 0, 10)).toBe(false);
    });

    it("should handle adjacent ranges", () => {
      // Adjacent ranges don't overlap
      expect(rangesOverlap(0, 10, 10, 20)).toBe(false);
    });
  });

  describe("getOverlappingHighlights", () => {
    const highlights: TextHighlight[] = [
      { id: "h1", startOffset: 0, endOffset: 10, color: "yellow" },
      { id: "h2", startOffset: 15, endOffset: 25, color: "green" },
      { id: "h3", startOffset: 30, endOffset: 40, color: "blue" },
    ];

    it("should find overlapping highlights", () => {
      const result = getOverlappingHighlights(highlights, 5, 20);
      expect(result).toHaveLength(2);
      expect(result.map((h) => h.id)).toEqual(["h1", "h2"]);
    });

    it("should return empty array for no overlaps", () => {
      const result = getOverlappingHighlights(highlights, 50, 60);
      expect(result).toHaveLength(0);
    });

    it("should handle empty highlights array", () => {
      const result = getOverlappingHighlights([], 0, 10);
      expect(result).toHaveLength(0);
    });
  });

  describe("mergeOverlappingHighlights", () => {
    it("should merge overlapping highlights", () => {
      const highlights: TextHighlight[] = [
        { id: "h1", startOffset: 0, endOffset: 10, color: "yellow" },
        { id: "h2", startOffset: 5, endOffset: 15, color: "green" },
      ];

      const result = mergeOverlappingHighlights(highlights);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        start: 0,
        end: 15,
        colors: ["yellow", "green"],
      });
    });

    it("should not merge non-overlapping highlights", () => {
      const highlights: TextHighlight[] = [
        { id: "h1", startOffset: 0, endOffset: 10, color: "yellow" },
        { id: "h2", startOffset: 20, endOffset: 30, color: "green" },
      ];

      const result = mergeOverlappingHighlights(highlights);
      expect(result).toHaveLength(2);
    });

    it("should handle empty array", () => {
      const result = mergeOverlappingHighlights([]);
      expect(result).toHaveLength(0);
    });

    it("should not duplicate colors", () => {
      const highlights: TextHighlight[] = [
        { id: "h1", startOffset: 0, endOffset: 10, color: "yellow" },
        { id: "h2", startOffset: 5, endOffset: 15, color: "yellow" },
      ];

      const result = mergeOverlappingHighlights(highlights);
      expect(result).toHaveLength(1);
      expect(result[0]?.colors).toEqual(["yellow"]);
    });

    it("should sort highlights by start offset", () => {
      const highlights: TextHighlight[] = [
        { id: "h1", startOffset: 20, endOffset: 30, color: "blue" },
        { id: "h2", startOffset: 0, endOffset: 10, color: "yellow" },
      ];

      const result = mergeOverlappingHighlights(highlights);
      expect(result).toHaveLength(2);
      expect(result[0]?.start).toBe(0);
      expect(result[1]?.start).toBe(20);
    });
  });

  describe("Edge cases", () => {
    it("should handle very long content", () => {
      const longContent = "x".repeat(100000);
      expect(validateContent(longContent)).toBe(true);

      const location = calculateLocation(50000, longContent, [longContent]);
      expect(location.percentage).toBeCloseTo(0.5, 5);
    });

    it("should handle content with special characters", () => {
      const content = "Hello 世界! 🌍 Special: <>&\"'";
      expect(validateContent(content)).toBe(true);

      const paragraphs = parseIntoParagraphs(content);
      expect(paragraphs).toHaveLength(1);
    });

    it("should handle multiple consecutive separators", () => {
      const content = "First\n\n\n\n\n\nSecond";
      const paragraphs = parseIntoParagraphs(content);
      expect(paragraphs).toHaveLength(2);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete reading flow", () => {
      const content =
        "Chapter 1: Introduction\n\nThis is the first paragraph.\n\nThis is the second paragraph.";

      // Parse content
      const paragraphs = parseIntoParagraphs(content);
      expect(paragraphs.length).toBeGreaterThan(0);

      // Calculate location at start
      const startLocation = calculateLocation(0, content, paragraphs);
      expect(startLocation.percentage).toBe(0);
      expect(startLocation.paragraphIndex).toBe(0);

      // Calculate location in middle
      const middleOffset = Math.floor(content.length / 2);
      const middleLocation = calculateLocation(
        middleOffset,
        content,
        paragraphs
      );
      expect(middleLocation.percentage).toBeCloseTo(0.5, 1);

      // Calculate location at end
      const endLocation = calculateLocation(
        content.length,
        content,
        paragraphs
      );
      expect(endLocation.percentage).toBe(1);
    });

    it("should handle highlight workflow", () => {
      const highlights: TextHighlight[] = [
        { id: "1", startOffset: 0, endOffset: 10, color: "yellow" },
        { id: "2", startOffset: 8, endOffset: 20, color: "green" },
        { id: "3", startOffset: 50, endOffset: 60, color: "blue" },
      ];

      // Find overlapping highlights for a range
      const overlapping = getOverlappingHighlights(highlights, 5, 15);
      expect(overlapping).toHaveLength(2);

      // Merge for rendering
      const merged = mergeOverlappingHighlights(highlights);
      expect(merged).toHaveLength(2); // Two groups (0-20 merged, 50-60 separate)
    });

    it("should handle scroll position conversion round trip", () => {
      const totalChars = 10000;
      const scrollHeight = 5000;

      for (const offset of [0, 2500, 5000, 7500, 10000]) {
        const scrollPos = getScrollPositionFromOffset(
          offset,
          totalChars,
          scrollHeight
        );
        const recoveredOffset = getOffsetAtScrollPosition(
          scrollPos,
          scrollHeight,
          totalChars
        );
        expect(recoveredOffset).toBe(offset);
      }
    });
  });
});
