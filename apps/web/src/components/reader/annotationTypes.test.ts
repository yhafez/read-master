/**
 * Tests for annotationTypes utilities
 */

import { describe, it, expect } from "vitest";
import {
  colorToHex,
  hexToColor,
  isHighlight,
  isNote,
  isBookmark,
  getAnnotationIcon,
  getAnnotationLabel,
  sortAnnotations,
  filterAnnotations,
  groupAnnotationsByType,
  getAnnotationsInRange,
  getAnnotationAtPosition,
  validateSelection,
  createHighlightInput,
  createNoteInput,
  createBookmarkInput,
  getExcerptText,
  formatAnnotationDate,
  countAnnotationsByType,
  HIGHLIGHT_COLOR_VALUES,
  DEFAULT_HIGHLIGHT_COLOR,
  type Annotation,
  type HighlightAnnotation,
  type NoteAnnotation,
  type BookmarkAnnotation,
  type TextSelectionInfo,
} from "./annotationTypes";

// =============================================================================
// TEST DATA
// =============================================================================

const mockHighlight: HighlightAnnotation = {
  id: "highlight-1",
  bookId: "book-1",
  type: "HIGHLIGHT",
  startOffset: 0,
  endOffset: 50,
  selectedText: "This is highlighted text",
  color: "yellow",
  note: "A note on the highlight",
  isPublic: false,
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: "2024-01-01T10:00:00Z",
};

const mockNote: NoteAnnotation = {
  id: "note-1",
  bookId: "book-1",
  type: "NOTE",
  startOffset: 100,
  endOffset: 150,
  note: "This is a standalone note",
  selectedText: "Some selected text",
  isPublic: true,
  createdAt: "2024-01-02T10:00:00Z",
  updatedAt: "2024-01-02T10:00:00Z",
};

const mockBookmark: BookmarkAnnotation = {
  id: "bookmark-1",
  bookId: "book-1",
  type: "BOOKMARK",
  startOffset: 200,
  endOffset: 200,
  note: "Important section",
  isPublic: false,
  createdAt: "2024-01-03T10:00:00Z",
  updatedAt: "2024-01-03T10:00:00Z",
};

const mockAnnotations: Annotation[] = [mockHighlight, mockNote, mockBookmark];

const mockSelection: TextSelectionInfo = {
  text: "Selected text content",
  startOffset: 50,
  endOffset: 100,
  position: { x: 100, y: 200, width: 150, height: 20 },
};

// =============================================================================
// COLOR UTILITIES
// =============================================================================

describe("colorToHex", () => {
  it("should convert yellow to hex", () => {
    expect(colorToHex("yellow")).toBe("#fff176");
  });

  it("should convert green to hex", () => {
    expect(colorToHex("green")).toBe("#a5d6a7");
  });

  it("should convert blue to hex", () => {
    expect(colorToHex("blue")).toBe("#90caf9");
  });

  it("should convert pink to hex", () => {
    expect(colorToHex("pink")).toBe("#f48fb1");
  });

  it("should convert purple to hex", () => {
    expect(colorToHex("purple")).toBe("#ce93d8");
  });

  it("should convert orange to hex", () => {
    expect(colorToHex("orange")).toBe("#ffcc80");
  });
});

describe("hexToColor", () => {
  it("should convert hex to yellow", () => {
    expect(hexToColor("#fff176")).toBe("yellow");
  });

  it("should handle case insensitivity", () => {
    expect(hexToColor("#FFF176")).toBe("yellow");
  });

  it("should return null for unknown hex", () => {
    expect(hexToColor("#123456")).toBeNull();
  });

  it("should return null for invalid input", () => {
    expect(hexToColor("invalid")).toBeNull();
  });
});

describe("DEFAULT_HIGHLIGHT_COLOR", () => {
  it("should be yellow", () => {
    expect(DEFAULT_HIGHLIGHT_COLOR).toBe("yellow");
  });
});

describe("HIGHLIGHT_COLOR_VALUES", () => {
  it("should have all 6 colors", () => {
    expect(Object.keys(HIGHLIGHT_COLOR_VALUES)).toHaveLength(6);
  });

  it("should have valid hex values", () => {
    for (const hex of Object.values(HIGHLIGHT_COLOR_VALUES)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

// =============================================================================
// TYPE GUARDS
// =============================================================================

describe("isHighlight", () => {
  it("should return true for highlights", () => {
    expect(isHighlight(mockHighlight)).toBe(true);
  });

  it("should return false for notes", () => {
    expect(isHighlight(mockNote)).toBe(false);
  });

  it("should return false for bookmarks", () => {
    expect(isHighlight(mockBookmark)).toBe(false);
  });
});

describe("isNote", () => {
  it("should return true for notes", () => {
    expect(isNote(mockNote)).toBe(true);
  });

  it("should return false for highlights", () => {
    expect(isNote(mockHighlight)).toBe(false);
  });

  it("should return false for bookmarks", () => {
    expect(isNote(mockBookmark)).toBe(false);
  });
});

describe("isBookmark", () => {
  it("should return true for bookmarks", () => {
    expect(isBookmark(mockBookmark)).toBe(true);
  });

  it("should return false for highlights", () => {
    expect(isBookmark(mockHighlight)).toBe(false);
  });

  it("should return false for notes", () => {
    expect(isBookmark(mockNote)).toBe(false);
  });
});

// =============================================================================
// ICON AND LABEL HELPERS
// =============================================================================

describe("getAnnotationIcon", () => {
  it("should return highlight icon", () => {
    expect(getAnnotationIcon("HIGHLIGHT")).toBe("highlight");
  });

  it("should return note icon", () => {
    expect(getAnnotationIcon("NOTE")).toBe("note");
  });

  it("should return bookmark icon", () => {
    expect(getAnnotationIcon("BOOKMARK")).toBe("bookmark");
  });
});

describe("getAnnotationLabel", () => {
  it("should return Highlight label", () => {
    expect(getAnnotationLabel("HIGHLIGHT")).toBe("Highlight");
  });

  it("should return Note label", () => {
    expect(getAnnotationLabel("NOTE")).toBe("Note");
  });

  it("should return Bookmark label", () => {
    expect(getAnnotationLabel("BOOKMARK")).toBe("Bookmark");
  });
});

// =============================================================================
// SORTING
// =============================================================================

describe("sortAnnotations", () => {
  it("should sort by startOffset ascending", () => {
    const sorted = sortAnnotations(mockAnnotations, {
      field: "startOffset",
      direction: "asc",
    });
    expect(sorted[0]?.id).toBe("highlight-1"); // offset 0
    expect(sorted[1]?.id).toBe("note-1"); // offset 100
    expect(sorted[2]?.id).toBe("bookmark-1"); // offset 200
  });

  it("should sort by startOffset descending", () => {
    const sorted = sortAnnotations(mockAnnotations, {
      field: "startOffset",
      direction: "desc",
    });
    expect(sorted[0]?.id).toBe("bookmark-1"); // offset 200
    expect(sorted[2]?.id).toBe("highlight-1"); // offset 0
  });

  it("should sort by createdAt ascending", () => {
    const sorted = sortAnnotations(mockAnnotations, {
      field: "createdAt",
      direction: "asc",
    });
    expect(sorted[0]?.id).toBe("highlight-1"); // Jan 1
    expect(sorted[1]?.id).toBe("note-1"); // Jan 2
    expect(sorted[2]?.id).toBe("bookmark-1"); // Jan 3
  });

  it("should sort by createdAt descending", () => {
    const sorted = sortAnnotations(mockAnnotations, {
      field: "createdAt",
      direction: "desc",
    });
    expect(sorted[0]?.id).toBe("bookmark-1"); // Jan 3
    expect(sorted[2]?.id).toBe("highlight-1"); // Jan 1
  });

  it("should sort by type", () => {
    const sorted = sortAnnotations(mockAnnotations, {
      field: "type",
      direction: "asc",
    });
    // BOOKMARK < HIGHLIGHT < NOTE (alphabetically)
    expect(sorted[0]?.type).toBe("BOOKMARK");
    expect(sorted[1]?.type).toBe("HIGHLIGHT");
    expect(sorted[2]?.type).toBe("NOTE");
  });

  it("should not mutate original array", () => {
    const original = [...mockAnnotations];
    sortAnnotations(mockAnnotations, {
      field: "startOffset",
      direction: "desc",
    });
    expect(mockAnnotations).toEqual(original);
  });
});

// =============================================================================
// FILTERING
// =============================================================================

describe("filterAnnotations", () => {
  it("should filter by type HIGHLIGHT", () => {
    const filtered = filterAnnotations(mockAnnotations, { type: "HIGHLIGHT" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.type).toBe("HIGHLIGHT");
  });

  it("should filter by type NOTE", () => {
    const filtered = filterAnnotations(mockAnnotations, { type: "NOTE" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.type).toBe("NOTE");
  });

  it("should filter by type BOOKMARK", () => {
    const filtered = filterAnnotations(mockAnnotations, { type: "BOOKMARK" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.type).toBe("BOOKMARK");
  });

  it("should filter by hasNote true", () => {
    const filtered = filterAnnotations(mockAnnotations, { hasNote: true });
    expect(filtered).toHaveLength(3); // All have notes
  });

  it("should filter by hasNote false", () => {
    const highlightWithoutNote: HighlightAnnotation = {
      ...mockHighlight,
    };
    // Delete the note property properly
    delete (highlightWithoutNote as { note?: string }).note;
    const annotationsWithoutNote: Annotation[] = [highlightWithoutNote];
    const filtered = filterAnnotations(annotationsWithoutNote, {
      hasNote: false,
    });
    expect(filtered).toHaveLength(1);
  });

  it("should filter by search in note", () => {
    const filtered = filterAnnotations(mockAnnotations, {
      search: "standalone",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("note-1");
  });

  it("should filter by search in selectedText", () => {
    const filtered = filterAnnotations(mockAnnotations, {
      search: "highlighted",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("highlight-1");
  });

  it("should handle case insensitive search", () => {
    const filtered = filterAnnotations(mockAnnotations, {
      search: "STANDALONE",
    });
    expect(filtered).toHaveLength(1);
  });

  it("should combine multiple filters", () => {
    const filtered = filterAnnotations(mockAnnotations, {
      type: "HIGHLIGHT",
      hasNote: true,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("highlight-1");
  });

  it("should return all with empty filter", () => {
    const filtered = filterAnnotations(mockAnnotations, {});
    expect(filtered).toHaveLength(3);
  });
});

// =============================================================================
// GROUPING
// =============================================================================

describe("groupAnnotationsByType", () => {
  it("should group annotations correctly", () => {
    const groups = groupAnnotationsByType(mockAnnotations);
    expect(groups.HIGHLIGHT).toHaveLength(1);
    expect(groups.NOTE).toHaveLength(1);
    expect(groups.BOOKMARK).toHaveLength(1);
  });

  it("should handle empty array", () => {
    const groups = groupAnnotationsByType([]);
    expect(groups.HIGHLIGHT).toHaveLength(0);
    expect(groups.NOTE).toHaveLength(0);
    expect(groups.BOOKMARK).toHaveLength(0);
  });

  it("should handle multiple of same type", () => {
    const multiple = [mockHighlight, { ...mockHighlight, id: "highlight-2" }];
    const groups = groupAnnotationsByType(multiple);
    expect(groups.HIGHLIGHT).toHaveLength(2);
  });
});

// =============================================================================
// RANGE QUERIES
// =============================================================================

describe("getAnnotationsInRange", () => {
  it("should find annotations overlapping range", () => {
    const found = getAnnotationsInRange(mockAnnotations, 0, 60);
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe("highlight-1"); // 0-50 overlaps 0-60
  });

  it("should find multiple overlapping annotations", () => {
    const found = getAnnotationsInRange(mockAnnotations, 0, 250);
    expect(found).toHaveLength(3);
  });

  it("should return empty for non-overlapping range", () => {
    const found = getAnnotationsInRange(mockAnnotations, 300, 400);
    expect(found).toHaveLength(0);
  });

  it("should handle exact range match", () => {
    const found = getAnnotationsInRange(mockAnnotations, 0, 50);
    expect(found).toHaveLength(1);
  });

  it("should handle partial overlap", () => {
    const found = getAnnotationsInRange(mockAnnotations, 40, 60);
    expect(found).toHaveLength(1);
    expect(found[0]?.id).toBe("highlight-1");
  });
});

describe("getAnnotationAtPosition", () => {
  it("should find annotation at position", () => {
    const found = getAnnotationAtPosition(mockAnnotations, 25);
    expect(found?.id).toBe("highlight-1");
  });

  it("should return undefined for position outside annotations", () => {
    const found = getAnnotationAtPosition(mockAnnotations, 75);
    expect(found).toBeUndefined();
  });

  it("should find at edge positions", () => {
    const found = getAnnotationAtPosition(mockAnnotations, 0);
    expect(found?.id).toBe("highlight-1");
  });

  it("should find at bookmark position", () => {
    const found = getAnnotationAtPosition(mockAnnotations, 200);
    expect(found?.id).toBe("bookmark-1");
  });
});

// =============================================================================
// SELECTION VALIDATION
// =============================================================================

describe("validateSelection", () => {
  it("should return valid for valid selection", () => {
    const result = validateSelection(mockSelection);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should return invalid for null selection", () => {
    const result = validateSelection(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("No text selected");
  });

  it("should return invalid for empty text", () => {
    const result = validateSelection({ ...mockSelection, text: "   " });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Selection is empty");
  });

  it("should return invalid for negative start offset", () => {
    const result = validateSelection({ ...mockSelection, startOffset: -1 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid start offset");
  });

  it("should return invalid when end <= start", () => {
    const result = validateSelection({
      ...mockSelection,
      startOffset: 100,
      endOffset: 50,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid selection range");
  });
});

// =============================================================================
// ANNOTATION INPUT CREATION
// =============================================================================

describe("createHighlightInput", () => {
  it("should create highlight input with defaults", () => {
    const input = createHighlightInput("book-1", mockSelection);
    expect(input.bookId).toBe("book-1");
    expect(input.type).toBe("HIGHLIGHT");
    expect(input.startOffset).toBe(50);
    expect(input.endOffset).toBe(100);
    expect(input.selectedText).toBe("Selected text content");
    expect(input.color).toBe("yellow");
    expect(input.isPublic).toBe(false);
  });

  it("should use provided color", () => {
    const input = createHighlightInput("book-1", mockSelection, "green");
    expect(input.color).toBe("green");
  });

  it("should include note if provided", () => {
    const input = createHighlightInput(
      "book-1",
      mockSelection,
      "yellow",
      "My note"
    );
    expect(input.note).toBe("My note");
  });
});

describe("createNoteInput", () => {
  it("should create note input", () => {
    const input = createNoteInput("book-1", mockSelection, "Note content");
    expect(input.bookId).toBe("book-1");
    expect(input.type).toBe("NOTE");
    expect(input.startOffset).toBe(50);
    expect(input.endOffset).toBe(100);
    expect(input.selectedText).toBe("Selected text content");
    expect(input.note).toBe("Note content");
    expect(input.isPublic).toBe(false);
  });
});

describe("createBookmarkInput", () => {
  it("should create bookmark input", () => {
    const input = createBookmarkInput("book-1", 500);
    expect(input.bookId).toBe("book-1");
    expect(input.type).toBe("BOOKMARK");
    expect(input.startOffset).toBe(500);
    expect(input.endOffset).toBe(500);
    expect(input.isPublic).toBe(false);
  });

  it("should include note if provided", () => {
    const input = createBookmarkInput("book-1", 500, "Important!");
    expect(input.note).toBe("Important!");
  });
});

// =============================================================================
// TEXT UTILITIES
// =============================================================================

describe("getExcerptText", () => {
  it("should return full text if short", () => {
    const result = getExcerptText("Short text");
    expect(result).toBe("Short text");
  });

  it("should truncate long text with ellipsis", () => {
    const longText = "A".repeat(150);
    const result = getExcerptText(longText, 100);
    expect(result).toHaveLength(100);
    expect(result.endsWith("...")).toBe(true);
  });

  it("should use default max length of 100", () => {
    const longText = "A".repeat(150);
    const result = getExcerptText(longText);
    expect(result).toHaveLength(100);
  });

  it("should handle exact max length", () => {
    const text = "A".repeat(100);
    const result = getExcerptText(text, 100);
    expect(result).toBe(text);
  });
});

describe("formatAnnotationDate", () => {
  const now = new Date();

  it("should return Today for today's date", () => {
    const today = now.toISOString();
    const result = formatAnnotationDate(today);
    expect(result).toBe("Today");
  });

  it("should return Yesterday for yesterday's date", () => {
    const yesterday = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();
    const result = formatAnnotationDate(yesterday);
    expect(result).toBe("Yesterday");
  });

  it("should return X days ago for recent dates", () => {
    const threeDaysAgo = new Date(
      now.getTime() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    const result = formatAnnotationDate(threeDaysAgo);
    expect(result).toBe("3 days ago");
  });

  it("should return formatted date for old dates", () => {
    const oldDate = "2020-01-15T10:00:00Z";
    const result = formatAnnotationDate(oldDate);
    expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });
});

// =============================================================================
// COUNTING
// =============================================================================

describe("countAnnotationsByType", () => {
  it("should count annotations by type", () => {
    const counts = countAnnotationsByType(mockAnnotations);
    expect(counts.HIGHLIGHT).toBe(1);
    expect(counts.NOTE).toBe(1);
    expect(counts.BOOKMARK).toBe(1);
  });

  it("should handle empty array", () => {
    const counts = countAnnotationsByType([]);
    expect(counts.HIGHLIGHT).toBe(0);
    expect(counts.NOTE).toBe(0);
    expect(counts.BOOKMARK).toBe(0);
  });

  it("should count multiple of same type", () => {
    const multiple = [
      mockHighlight,
      { ...mockHighlight, id: "h2" },
      { ...mockHighlight, id: "h3" },
    ];
    const counts = countAnnotationsByType(multiple);
    expect(counts.HIGHLIGHT).toBe(3);
  });
});
