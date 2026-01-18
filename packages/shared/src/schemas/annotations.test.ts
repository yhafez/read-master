/**
 * Tests for Annotation Zod schemas
 *
 * These tests verify that annotation validation schemas correctly:
 * - Validate annotation types (HIGHLIGHT, NOTE, BOOKMARK)
 * - Enforce field constraints (note max 5000 chars, color as hex)
 * - Apply profanity filter for public annotations
 * - Handle edge cases and boundary conditions
 */

import { describe, expect, it } from "vitest";

import {
  annotationTypeSchema,
  annotationBookIdSchema,
  annotationIdSchema,
  startOffsetSchema,
  endOffsetSchema,
  selectedTextSchema,
  annotationNoteSchema,
  annotationNotePublicSchema,
  colorSchema,
  isPublicSchema,
  createHighlightSchema,
  createHighlightPublicSchema,
  createNoteSchema,
  createNotePublicSchema,
  createBookmarkSchema,
  createBookmarkPublicSchema,
  createAnnotationSchema,
  createAnnotationPublicSchema,
  updateAnnotationSchema,
  updateAnnotationPublicSchema,
  annotationQuerySchema,
  annotationSortFieldSchema,
  annotationIdParamsSchema,
  bookAnnotationIdParamsSchema,
  bulkDeleteAnnotationsSchema,
  exportAnnotationsSchema,
  annotationSchemas,
} from "./annotations";

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

describe("annotationTypeSchema", () => {
  it("should accept valid annotation types", () => {
    expect(annotationTypeSchema.parse("HIGHLIGHT")).toBe("HIGHLIGHT");
    expect(annotationTypeSchema.parse("NOTE")).toBe("NOTE");
    expect(annotationTypeSchema.parse("BOOKMARK")).toBe("BOOKMARK");
  });

  it("should reject invalid annotation types", () => {
    expect(() => annotationTypeSchema.parse("COMMENT")).toThrow();
    expect(() => annotationTypeSchema.parse("highlight")).toThrow();
    expect(() => annotationTypeSchema.parse("")).toThrow();
  });
});

// =============================================================================
// ID SCHEMAS
// =============================================================================

describe("annotationBookIdSchema", () => {
  it("should accept valid CUID format", () => {
    expect(annotationBookIdSchema.parse("cjld2cjxh0000qzrmn831i7rn")).toBe(
      "cjld2cjxh0000qzrmn831i7rn"
    );
    expect(annotationBookIdSchema.parse("cm5abc123def456")).toBe(
      "cm5abc123def456"
    );
  });

  it("should reject invalid book IDs", () => {
    expect(() => annotationBookIdSchema.parse("")).toThrow(
      "Book ID is required"
    );
    expect(() => annotationBookIdSchema.parse("abc123")).toThrow(
      "Invalid book ID format"
    );
    expect(() => annotationBookIdSchema.parse("C123abc")).toThrow(
      "Invalid book ID format"
    );
  });
});

describe("annotationIdSchema", () => {
  it("should accept valid CUID format", () => {
    expect(annotationIdSchema.parse("cjld2cjxh0000qzrmn831i7rn")).toBe(
      "cjld2cjxh0000qzrmn831i7rn"
    );
  });

  it("should reject invalid annotation IDs", () => {
    expect(() => annotationIdSchema.parse("")).toThrow(
      "Annotation ID is required"
    );
    expect(() => annotationIdSchema.parse("invalid")).toThrow(
      "Invalid annotation ID format"
    );
  });
});

// =============================================================================
// OFFSET SCHEMAS
// =============================================================================

describe("startOffsetSchema", () => {
  it("should accept non-negative integers", () => {
    expect(startOffsetSchema.parse(0)).toBe(0);
    expect(startOffsetSchema.parse(100)).toBe(100);
    expect(startOffsetSchema.parse(999999)).toBe(999999);
  });

  it("should reject negative values", () => {
    expect(() => startOffsetSchema.parse(-1)).toThrow();
  });

  it("should reject non-integers", () => {
    expect(() => startOffsetSchema.parse(1.5)).toThrow();
    expect(() => startOffsetSchema.parse(100.99)).toThrow();
  });
});

describe("endOffsetSchema", () => {
  it("should accept non-negative integers", () => {
    expect(endOffsetSchema.parse(0)).toBe(0);
    expect(endOffsetSchema.parse(500)).toBe(500);
  });

  it("should reject negative values", () => {
    expect(() => endOffsetSchema.parse(-10)).toThrow();
  });
});

// =============================================================================
// TEXT FIELD SCHEMAS
// =============================================================================

describe("selectedTextSchema", () => {
  it("should accept valid text", () => {
    expect(selectedTextSchema.parse("Hello world")).toBe("Hello world");
    expect(
      selectedTextSchema.parse("This is a longer piece of selected text.")
    ).toBe("This is a longer piece of selected text.");
  });

  it("should accept null and undefined", () => {
    expect(selectedTextSchema.parse(null)).toBeNull();
    expect(selectedTextSchema.parse(undefined)).toBeUndefined();
  });

  it("should reject empty string", () => {
    expect(() => selectedTextSchema.parse("")).toThrow(
      "Selected text cannot be empty"
    );
  });
});

describe("annotationNoteSchema", () => {
  it("should accept valid notes", () => {
    expect(annotationNoteSchema.parse("This is a note")).toBe("This is a note");
    expect(annotationNoteSchema.parse("   Trimmed note   ")).toBe(
      "Trimmed note"
    );
  });

  it("should accept notes up to 5000 characters", () => {
    const maxNote = "a".repeat(5000);
    expect(annotationNoteSchema.parse(maxNote)).toBe(maxNote);
  });

  it("should reject notes over 5000 characters", () => {
    const tooLong = "a".repeat(5001);
    expect(() => annotationNoteSchema.parse(tooLong)).toThrow(
      "Note must be at most 5,000 characters"
    );
  });

  it("should accept null and undefined", () => {
    expect(annotationNoteSchema.parse(null)).toBeNull();
    expect(annotationNoteSchema.parse(undefined)).toBeUndefined();
  });
});

describe("annotationNotePublicSchema", () => {
  it("should accept clean notes", () => {
    expect(annotationNotePublicSchema.parse("Clean note")).toBe("Clean note");
  });

  it("should reject notes with profanity", () => {
    expect(() =>
      annotationNotePublicSchema.parse("This is fucking great")
    ).toThrow("Note contains inappropriate language");
  });

  it("should accept null and undefined for optional profanity check", () => {
    expect(annotationNotePublicSchema.parse(null)).toBeNull();
    expect(annotationNotePublicSchema.parse(undefined)).toBeUndefined();
  });

  it("should still enforce max length", () => {
    const tooLong = "a".repeat(5001);
    expect(() => annotationNotePublicSchema.parse(tooLong)).toThrow(
      "Note must be at most 5,000 characters"
    );
  });
});

// =============================================================================
// COLOR SCHEMA
// =============================================================================

describe("colorSchema", () => {
  it("should accept valid hex colors", () => {
    expect(colorSchema.parse("#FFFF00")).toBe("#FFFF00");
    expect(colorSchema.parse("#ff0000")).toBe("#FF0000"); // normalized to uppercase
    expect(colorSchema.parse("#aabbcc")).toBe("#AABBCC");
    expect(colorSchema.parse("#123456")).toBe("#123456");
  });

  it("should reject invalid hex colors", () => {
    expect(() => colorSchema.parse("FFFF00")).toThrow(); // missing #
    expect(() => colorSchema.parse("#FFF")).toThrow(); // too short
    expect(() => colorSchema.parse("#FFFF00FF")).toThrow(); // too long (8 chars)
    expect(() => colorSchema.parse("#GGGGGG")).toThrow(); // invalid hex chars
    expect(() => colorSchema.parse("yellow")).toThrow(); // color name
  });

  it("should accept null and undefined", () => {
    expect(colorSchema.parse(null)).toBeNull();
    expect(colorSchema.parse(undefined)).toBeUndefined();
  });
});

describe("isPublicSchema", () => {
  it("should accept boolean values", () => {
    expect(isPublicSchema.parse(true)).toBe(true);
    expect(isPublicSchema.parse(false)).toBe(false);
  });

  it("should default to false", () => {
    expect(isPublicSchema.parse(undefined)).toBe(false);
  });
});

// =============================================================================
// CREATE HIGHLIGHT SCHEMAS
// =============================================================================

describe("createHighlightSchema", () => {
  const validHighlight = {
    bookId: "cm5abc123def456",
    type: "HIGHLIGHT" as const,
    startOffset: 100,
    endOffset: 200,
    selectedText: "This is highlighted text",
    color: "#FFFF00",
    isPublic: false,
  };

  it("should accept valid highlight data", () => {
    const result = createHighlightSchema.parse(validHighlight);
    expect(result.type).toBe("HIGHLIGHT");
    expect(result.selectedText).toBe("This is highlighted text");
    expect(result.color).toBe("#FFFF00");
  });

  it("should require selected text for highlights", () => {
    const { selectedText: _selectedText, ...withoutText } = validHighlight;
    expect(() => createHighlightSchema.parse(withoutText)).toThrow();
  });

  it("should reject empty selected text for highlights", () => {
    const emptyText = { ...validHighlight, selectedText: "" };
    expect(() => createHighlightSchema.parse(emptyText)).toThrow(
      "Selected text is required for highlights"
    );
  });

  it("should allow optional note", () => {
    const withNote = { ...validHighlight, note: "My note about this" };
    const result = createHighlightSchema.parse(withNote);
    expect(result.note).toBe("My note about this");
  });

  it("should allow optional color", () => {
    const { color: _color, ...withoutColor } = validHighlight;
    const result = createHighlightSchema.parse(withoutColor);
    expect(result.color).toBeUndefined();
  });
});

describe("createHighlightPublicSchema", () => {
  const validPublicHighlight = {
    bookId: "cm5abc123def456",
    type: "HIGHLIGHT" as const,
    startOffset: 100,
    endOffset: 200,
    selectedText: "Clean text",
    isPublic: true,
  };

  it("should accept clean public highlights", () => {
    const result = createHighlightPublicSchema.parse(validPublicHighlight);
    expect(result.selectedText).toBe("Clean text");
  });

  it("should reject highlights with profane notes", () => {
    const withProfaneNote = {
      ...validPublicHighlight,
      note: "This is bullshit",
    };
    expect(() => createHighlightPublicSchema.parse(withProfaneNote)).toThrow(
      "Note contains inappropriate language"
    );
  });
});

// =============================================================================
// CREATE NOTE SCHEMAS
// =============================================================================

describe("createNoteSchema", () => {
  const validNote = {
    bookId: "cm5abc123def456",
    type: "NOTE" as const,
    startOffset: 100,
    endOffset: 100, // Notes can be at a single point
    note: "This is my note content",
    isPublic: false,
  };

  it("should accept valid note data", () => {
    const result = createNoteSchema.parse(validNote);
    expect(result.type).toBe("NOTE");
    expect(result.note).toBe("This is my note content");
  });

  it("should require note content", () => {
    const { note: _note, ...withoutNote } = validNote;
    expect(() => createNoteSchema.parse(withoutNote)).toThrow();
  });

  it("should reject empty note", () => {
    const emptyNote = { ...validNote, note: "" };
    expect(() => createNoteSchema.parse(emptyNote)).toThrow(
      "Note content is required"
    );
  });

  it("should allow optional selected text", () => {
    const withSelectedText = {
      ...validNote,
      selectedText: "The text this note refers to",
    };
    const result = createNoteSchema.parse(withSelectedText);
    expect(result.selectedText).toBe("The text this note refers to");
  });
});

describe("createNotePublicSchema", () => {
  const validPublicNote = {
    bookId: "cm5abc123def456",
    type: "NOTE" as const,
    startOffset: 100,
    endOffset: 100,
    note: "Clean note content",
    isPublic: true,
  };

  it("should accept clean public notes", () => {
    const result = createNotePublicSchema.parse(validPublicNote);
    expect(result.note).toBe("Clean note content");
  });

  it("should reject notes with profanity", () => {
    const profaneNote = { ...validPublicNote, note: "This shit is confusing" };
    expect(() => createNotePublicSchema.parse(profaneNote)).toThrow(
      "Note contains inappropriate language"
    );
  });
});

// =============================================================================
// CREATE BOOKMARK SCHEMAS
// =============================================================================

describe("createBookmarkSchema", () => {
  const validBookmark = {
    bookId: "cm5abc123def456",
    type: "BOOKMARK" as const,
    startOffset: 500,
    endOffset: 500, // Bookmarks are at a single point
    isPublic: false,
  };

  it("should accept valid bookmark data", () => {
    const result = createBookmarkSchema.parse(validBookmark);
    expect(result.type).toBe("BOOKMARK");
    expect(result.startOffset).toBe(500);
  });

  it("should allow optional note", () => {
    const withNote = { ...validBookmark, note: "Bookmark note" };
    const result = createBookmarkSchema.parse(withNote);
    expect(result.note).toBe("Bookmark note");
  });

  it("should not require selected text or color", () => {
    const result = createBookmarkSchema.parse(validBookmark);
    expect(result).not.toHaveProperty("selectedText");
    expect(result).not.toHaveProperty("color");
  });
});

describe("createBookmarkPublicSchema", () => {
  it("should reject bookmarks with profane notes", () => {
    const profaneBookmark = {
      bookId: "cm5abc123def456",
      type: "BOOKMARK" as const,
      startOffset: 500,
      endOffset: 500,
      note: "Fucking important",
      isPublic: true,
    };
    expect(() => createBookmarkPublicSchema.parse(profaneBookmark)).toThrow(
      "Note contains inappropriate language"
    );
  });
});

// =============================================================================
// COMBINED CREATE ANNOTATION SCHEMAS
// =============================================================================

describe("createAnnotationSchema", () => {
  it("should validate highlights", () => {
    const result = createAnnotationSchema.parse({
      bookId: "cm5abc123def456",
      type: "HIGHLIGHT",
      startOffset: 0,
      endOffset: 100,
      selectedText: "Highlighted text",
      isPublic: false,
    });
    expect(result.type).toBe("HIGHLIGHT");
  });

  it("should validate notes", () => {
    const result = createAnnotationSchema.parse({
      bookId: "cm5abc123def456",
      type: "NOTE",
      startOffset: 50,
      endOffset: 50,
      note: "My note",
      isPublic: false,
    });
    expect(result.type).toBe("NOTE");
  });

  it("should validate bookmarks", () => {
    const result = createAnnotationSchema.parse({
      bookId: "cm5abc123def456",
      type: "BOOKMARK",
      startOffset: 1000,
      endOffset: 1000,
      isPublic: false,
    });
    expect(result.type).toBe("BOOKMARK");
  });

  it("should reject when startOffset > endOffset", () => {
    expect(() =>
      createAnnotationSchema.parse({
        bookId: "cm5abc123def456",
        type: "BOOKMARK",
        startOffset: 200,
        endOffset: 100,
        isPublic: false,
      })
    ).toThrow("Start offset must be less than or equal to end offset");
  });
});

describe("createAnnotationPublicSchema", () => {
  it("should reject any annotation type with profane content", () => {
    expect(() =>
      createAnnotationPublicSchema.parse({
        bookId: "cm5abc123def456",
        type: "NOTE",
        startOffset: 0,
        endOffset: 0,
        note: "What the fuck",
        isPublic: true,
      })
    ).toThrow("Note contains inappropriate language");
  });
});

// =============================================================================
// UPDATE ANNOTATION SCHEMAS
// =============================================================================

describe("updateAnnotationSchema", () => {
  it("should accept valid updates", () => {
    const result = updateAnnotationSchema.parse({
      note: "Updated note",
    });
    expect(result.note).toBe("Updated note");
  });

  it("should accept color updates", () => {
    const result = updateAnnotationSchema.parse({
      color: "#00FF00",
    });
    expect(result.color).toBe("#00FF00");
  });

  it("should accept visibility updates", () => {
    const result = updateAnnotationSchema.parse({
      isPublic: true,
    });
    expect(result.isPublic).toBe(true);
  });

  it("should require at least one field", () => {
    expect(() => updateAnnotationSchema.parse({})).toThrow(
      "At least one field must be provided for update"
    );
  });

  it("should validate offset consistency when both provided", () => {
    expect(() =>
      updateAnnotationSchema.parse({
        startOffset: 200,
        endOffset: 100,
      })
    ).toThrow("Start offset must be less than or equal to end offset");
  });

  it("should allow updating just one offset", () => {
    const result = updateAnnotationSchema.parse({
      startOffset: 50,
    });
    expect(result.startOffset).toBe(50);
  });
});

describe("updateAnnotationPublicSchema", () => {
  it("should reject profane note updates", () => {
    expect(() =>
      updateAnnotationPublicSchema.parse({
        note: "Updated with shit",
      })
    ).toThrow("Note contains inappropriate language");
  });

  it("should accept clean updates", () => {
    const result = updateAnnotationPublicSchema.parse({
      note: "Clean updated note",
    });
    expect(result.note).toBe("Clean updated note");
  });
});

// =============================================================================
// QUERY SCHEMA
// =============================================================================

describe("annotationQuerySchema", () => {
  it("should require bookId", () => {
    expect(() => annotationQuerySchema.parse({})).toThrow();
  });

  it("should apply defaults", () => {
    const result = annotationQuerySchema.parse({
      bookId: "cm5abc123def456",
    });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.sortBy).toBe("startOffset");
    expect(result.sortDirection).toBe("asc");
    expect(result.includeDeleted).toBe(false);
  });

  it("should accept valid query parameters", () => {
    const result = annotationQuerySchema.parse({
      bookId: "cm5abc123def456",
      page: 2,
      limit: 25,
      sortBy: "createdAt",
      sortDirection: "desc",
      type: "HIGHLIGHT",
      isPublic: true,
      hasNote: true,
      search: "important",
    });
    expect(result.type).toBe("HIGHLIGHT");
    expect(result.isPublic).toBe(true);
    expect(result.hasNote).toBe(true);
    expect(result.search).toBe("important");
  });

  it("should enforce maximum limit", () => {
    // Should accept values up to 100
    const result = annotationQuerySchema.parse({
      bookId: "cm5abc123def456",
      limit: 100,
    });
    expect(result.limit).toBe(100);

    // Should reject values over 100
    expect(() =>
      annotationQuerySchema.parse({
        bookId: "cm5abc123def456",
        limit: 101,
      })
    ).toThrow();
  });

  it("should coerce string values for pagination", () => {
    const result = annotationQuerySchema.parse({
      bookId: "cm5abc123def456",
      page: "3",
      limit: "20",
    } as unknown);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
  });
});

describe("annotationSortFieldSchema", () => {
  it("should accept valid sort fields", () => {
    expect(annotationSortFieldSchema.parse("createdAt")).toBe("createdAt");
    expect(annotationSortFieldSchema.parse("updatedAt")).toBe("updatedAt");
    expect(annotationSortFieldSchema.parse("startOffset")).toBe("startOffset");
    expect(annotationSortFieldSchema.parse("type")).toBe("type");
  });

  it("should reject invalid sort fields", () => {
    expect(() => annotationSortFieldSchema.parse("note")).toThrow();
    expect(() => annotationSortFieldSchema.parse("color")).toThrow();
  });
});

// =============================================================================
// ID PARAMS SCHEMAS
// =============================================================================

describe("annotationIdParamsSchema", () => {
  it("should validate annotation ID in params", () => {
    const result = annotationIdParamsSchema.parse({
      id: "cm5abc123def456",
    });
    expect(result.id).toBe("cm5abc123def456");
  });

  it("should reject invalid annotation ID", () => {
    expect(() =>
      annotationIdParamsSchema.parse({
        id: "invalid",
      })
    ).toThrow();
  });
});

describe("bookAnnotationIdParamsSchema", () => {
  it("should validate both book and annotation IDs", () => {
    const result = bookAnnotationIdParamsSchema.parse({
      bookId: "cm5book123",
      annotationId: "cm5annotation456",
    });
    expect(result.bookId).toBe("cm5book123");
    expect(result.annotationId).toBe("cm5annotation456");
  });
});

// =============================================================================
// BULK OPERATIONS SCHEMAS
// =============================================================================

describe("bulkDeleteAnnotationsSchema", () => {
  it("should accept array of annotation IDs", () => {
    const result = bulkDeleteAnnotationsSchema.parse({
      annotationIds: ["cm5abc1", "cm5abc2", "cm5abc3"],
    });
    expect(result.annotationIds).toHaveLength(3);
  });

  it("should require at least one ID", () => {
    expect(() =>
      bulkDeleteAnnotationsSchema.parse({
        annotationIds: [],
      })
    ).toThrow("At least one annotation ID is required");
  });

  it("should enforce maximum of 100 IDs", () => {
    const tooMany = Array.from({ length: 101 }, (_, i) => `cm5id${i}`);
    expect(() =>
      bulkDeleteAnnotationsSchema.parse({
        annotationIds: tooMany,
      })
    ).toThrow("Maximum 100 annotations can be deleted at once");
  });
});

describe("exportAnnotationsSchema", () => {
  it("should accept valid export options", () => {
    const result = exportAnnotationsSchema.parse({
      bookId: "cm5abc123def456",
      format: "markdown",
      types: ["HIGHLIGHT", "NOTE"],
      includeSelectedText: false,
    });
    expect(result.format).toBe("markdown");
    expect(result.types).toEqual(["HIGHLIGHT", "NOTE"]);
    expect(result.includeSelectedText).toBe(false);
  });

  it("should apply defaults", () => {
    const result = exportAnnotationsSchema.parse({
      bookId: "cm5abc123def456",
    });
    expect(result.format).toBe("json");
    expect(result.includeSelectedText).toBe(true);
  });

  it("should reject invalid export format", () => {
    expect(() =>
      exportAnnotationsSchema.parse({
        bookId: "cm5abc123def456",
        format: "pdf",
      })
    ).toThrow();
  });
});

// =============================================================================
// SCHEMA INDEX
// =============================================================================

describe("annotationSchemas", () => {
  it("should export all schemas", () => {
    expect(annotationSchemas.annotationType).toBeDefined();
    expect(annotationSchemas.bookId).toBeDefined();
    expect(annotationSchemas.annotationId).toBeDefined();
    expect(annotationSchemas.startOffset).toBeDefined();
    expect(annotationSchemas.endOffset).toBeDefined();
    expect(annotationSchemas.selectedText).toBeDefined();
    expect(annotationSchemas.note).toBeDefined();
    expect(annotationSchemas.notePublic).toBeDefined();
    expect(annotationSchemas.color).toBeDefined();
    expect(annotationSchemas.isPublic).toBeDefined();
    expect(annotationSchemas.createHighlight).toBeDefined();
    expect(annotationSchemas.createHighlightPublic).toBeDefined();
    expect(annotationSchemas.createNote).toBeDefined();
    expect(annotationSchemas.createNotePublic).toBeDefined();
    expect(annotationSchemas.createBookmark).toBeDefined();
    expect(annotationSchemas.createBookmarkPublic).toBeDefined();
    expect(annotationSchemas.create).toBeDefined();
    expect(annotationSchemas.createPublic).toBeDefined();
    expect(annotationSchemas.update).toBeDefined();
    expect(annotationSchemas.updatePublic).toBeDefined();
    expect(annotationSchemas.query).toBeDefined();
    expect(annotationSchemas.sortField).toBeDefined();
    expect(annotationSchemas.sortDirection).toBeDefined();
    expect(annotationSchemas.idParams).toBeDefined();
    expect(annotationSchemas.bookAnnotationIdParams).toBeDefined();
    expect(annotationSchemas.bulkDelete).toBeDefined();
    expect(annotationSchemas.export).toBeDefined();
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe("edge cases", () => {
  it("should handle boundary note length (exactly 5000 chars)", () => {
    const maxNote = "a".repeat(5000);
    const result = annotationNoteSchema.parse(maxNote);
    expect(result).toBe(maxNote);
  });

  it("should handle zero offsets (start of document)", () => {
    const result = createAnnotationSchema.parse({
      bookId: "cm5abc123def456",
      type: "BOOKMARK",
      startOffset: 0,
      endOffset: 0,
      isPublic: false,
    });
    expect(result.startOffset).toBe(0);
    expect(result.endOffset).toBe(0);
  });

  it("should handle large offsets (end of long document)", () => {
    const result = createAnnotationSchema.parse({
      bookId: "cm5abc123def456",
      type: "BOOKMARK",
      startOffset: 10000000,
      endOffset: 10000000,
      isPublic: false,
    });
    expect(result.startOffset).toBe(10000000);
  });

  it("should handle color with mixed case", () => {
    const result = colorSchema.parse("#aAbBcC");
    expect(result).toBe("#AABBCC");
  });

  it("should handle whitespace in notes", () => {
    const result = annotationNoteSchema.parse("   Note with spaces   ");
    expect(result).toBe("Note with spaces");
  });

  it("should handle unicode in notes", () => {
    const result = annotationNoteSchema.parse("Note with emoji 📚 and 日本語");
    expect(result).toBe("Note with emoji 📚 and 日本語");
  });
});
