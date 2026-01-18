/**
 * Tests for Annotation CRUD endpoints
 *
 * Tests helper functions and validation logic for annotations.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_HIGHLIGHT_COLOR,
  SUPPORTED_METHODS,
  formatAnnotationResponse,
  buildAnnotationWhereClause,
  buildAnnotationOrderBy,
  checkAnnotationProfanity,
} from "./index.js";
import type { AnnotationType } from "@read-master/database";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  describe("DEFAULT_HIGHLIGHT_COLOR", () => {
    it("should be yellow hex color", () => {
      expect(DEFAULT_HIGHLIGHT_COLOR).toBe("#FFFF00");
    });

    it("should be a valid 7-character hex color", () => {
      expect(DEFAULT_HIGHLIGHT_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe("SUPPORTED_METHODS", () => {
    it("should include GET, POST, PUT, DELETE", () => {
      expect(SUPPORTED_METHODS).toContain("GET");
      expect(SUPPORTED_METHODS).toContain("POST");
      expect(SUPPORTED_METHODS).toContain("PUT");
      expect(SUPPORTED_METHODS).toContain("DELETE");
    });

    it("should have exactly 4 methods", () => {
      expect(SUPPORTED_METHODS).toHaveLength(4);
    });
  });
});

// ============================================================================
// formatAnnotationResponse Tests
// ============================================================================

describe("formatAnnotationResponse", () => {
  const baseAnnotation = {
    id: "clxxxxxxxxxx",
    bookId: "clyyyyyyyyyy",
    userId: "clzzzzzzzzzz",
    type: "HIGHLIGHT" as AnnotationType,
    startOffset: 100,
    endOffset: 200,
    selectedText: "Important text",
    note: "My note",
    color: "#FF0000",
    isPublic: false,
    createdAt: new Date("2024-01-15T10:00:00.000Z"),
    updatedAt: new Date("2024-01-16T12:00:00.000Z"),
  };

  describe("Basic formatting", () => {
    it("should format all required fields correctly", () => {
      const result = formatAnnotationResponse(baseAnnotation);

      expect(result.id).toBe("clxxxxxxxxxx");
      expect(result.bookId).toBe("clyyyyyyyyyy");
      expect(result.userId).toBe("clzzzzzzzzzz");
      expect(result.type).toBe("HIGHLIGHT");
      expect(result.startOffset).toBe(100);
      expect(result.endOffset).toBe(200);
    });

    it("should format dates as ISO strings", () => {
      const result = formatAnnotationResponse(baseAnnotation);

      expect(result.createdAt).toBe("2024-01-15T10:00:00.000Z");
      expect(result.updatedAt).toBe("2024-01-16T12:00:00.000Z");
    });

    it("should include optional fields when present", () => {
      const result = formatAnnotationResponse(baseAnnotation);

      expect(result.selectedText).toBe("Important text");
      expect(result.note).toBe("My note");
      expect(result.color).toBe("#FF0000");
    });

    it("should include isPublic flag", () => {
      const result = formatAnnotationResponse(baseAnnotation);
      expect(result.isPublic).toBe(false);

      const publicAnnotation = { ...baseAnnotation, isPublic: true };
      const publicResult = formatAnnotationResponse(publicAnnotation);
      expect(publicResult.isPublic).toBe(true);
    });
  });

  describe("Null handling", () => {
    it("should handle null selectedText", () => {
      const annotation = { ...baseAnnotation, selectedText: null };
      const result = formatAnnotationResponse(annotation);
      expect(result.selectedText).toBeNull();
    });

    it("should handle null note", () => {
      const annotation = { ...baseAnnotation, note: null };
      const result = formatAnnotationResponse(annotation);
      expect(result.note).toBeNull();
    });

    it("should handle null color", () => {
      const annotation = { ...baseAnnotation, color: null };
      const result = formatAnnotationResponse(annotation);
      expect(result.color).toBeNull();
    });

    it("should handle all nullable fields as null", () => {
      const annotation = {
        ...baseAnnotation,
        selectedText: null,
        note: null,
        color: null,
      };
      const result = formatAnnotationResponse(annotation);

      expect(result.selectedText).toBeNull();
      expect(result.note).toBeNull();
      expect(result.color).toBeNull();
    });
  });

  describe("Annotation types", () => {
    it("should format HIGHLIGHT annotation", () => {
      const result = formatAnnotationResponse(baseAnnotation);
      expect(result.type).toBe("HIGHLIGHT");
    });

    it("should format NOTE annotation", () => {
      const noteAnnotation = {
        ...baseAnnotation,
        type: "NOTE" as AnnotationType,
      };
      const result = formatAnnotationResponse(noteAnnotation);
      expect(result.type).toBe("NOTE");
    });

    it("should format BOOKMARK annotation", () => {
      const bookmarkAnnotation = {
        ...baseAnnotation,
        type: "BOOKMARK" as AnnotationType,
        selectedText: null,
        color: null,
      };
      const result = formatAnnotationResponse(bookmarkAnnotation);
      expect(result.type).toBe("BOOKMARK");
    });
  });

  describe("Edge cases", () => {
    it("should handle zero offsets", () => {
      const annotation = { ...baseAnnotation, startOffset: 0, endOffset: 0 };
      const result = formatAnnotationResponse(annotation);
      expect(result.startOffset).toBe(0);
      expect(result.endOffset).toBe(0);
    });

    it("should handle large offsets", () => {
      const annotation = {
        ...baseAnnotation,
        startOffset: 1000000,
        endOffset: 2000000,
      };
      const result = formatAnnotationResponse(annotation);
      expect(result.startOffset).toBe(1000000);
      expect(result.endOffset).toBe(2000000);
    });

    it("should handle empty selected text", () => {
      const annotation = { ...baseAnnotation, selectedText: "" };
      const result = formatAnnotationResponse(annotation);
      expect(result.selectedText).toBe("");
    });

    it("should handle very long note", () => {
      const longNote = "x".repeat(5000);
      const annotation = { ...baseAnnotation, note: longNote };
      const result = formatAnnotationResponse(annotation);
      expect(result.note).toBe(longNote);
      expect(result.note?.length).toBe(5000);
    });

    it("should handle unicode in text", () => {
      const annotation = {
        ...baseAnnotation,
        selectedText: "日本語テキスト 🎉",
        note: "مرحبا بالعالم",
      };
      const result = formatAnnotationResponse(annotation);
      expect(result.selectedText).toBe("日本語テキスト 🎉");
      expect(result.note).toBe("مرحبا بالعالم");
    });
  });
});

// ============================================================================
// buildAnnotationWhereClause Tests
// ============================================================================

describe("buildAnnotationWhereClause", () => {
  const userId = "clxxxxxxxxxx";
  const bookId = "clyyyyyyyyyy";

  describe("Required fields", () => {
    it("should always include userId and bookId", () => {
      const where = buildAnnotationWhereClause(userId, { bookId });

      expect(where.userId).toBe(userId);
      expect(where.bookId).toBe(bookId);
    });

    it("should exclude soft deleted by default", () => {
      const where = buildAnnotationWhereClause(userId, { bookId });
      expect(where.deletedAt).toBeNull();
    });
  });

  describe("Type filter", () => {
    it("should filter by HIGHLIGHT type", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        type: "HIGHLIGHT",
      });
      expect(where.type).toBe("HIGHLIGHT");
    });

    it("should filter by NOTE type", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        type: "NOTE",
      });
      expect(where.type).toBe("NOTE");
    });

    it("should filter by BOOKMARK type", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        type: "BOOKMARK",
      });
      expect(where.type).toBe("BOOKMARK");
    });

    it("should not include type filter when not specified", () => {
      const where = buildAnnotationWhereClause(userId, { bookId });
      expect(where.type).toBeUndefined();
    });
  });

  describe("Visibility filter", () => {
    it("should filter by isPublic true", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        isPublic: true,
      });
      expect(where.isPublic).toBe(true);
    });

    it("should filter by isPublic false", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        isPublic: false,
      });
      expect(where.isPublic).toBe(false);
    });

    it("should not include isPublic filter when not specified", () => {
      const where = buildAnnotationWhereClause(userId, { bookId });
      expect(where.isPublic).toBeUndefined();
    });
  });

  describe("Has note filter", () => {
    it("should filter for annotations with notes", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        hasNote: true,
      });
      expect(where.note).toEqual({ not: null });
    });

    it("should filter for annotations without notes", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        hasNote: false,
      });
      expect(where.note).toBeNull();
    });
  });

  describe("Search filter", () => {
    it("should search in notes case-insensitively", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        search: "important",
      });
      expect(where.note).toEqual({
        contains: "important",
        mode: "insensitive",
      });
    });

    it("should handle empty search string", () => {
      const where = buildAnnotationWhereClause(userId, { bookId, search: "" });
      // Empty string is falsy, so note filter won't be applied
      expect(where.note).toBeUndefined();
    });
  });

  describe("Include deleted filter", () => {
    it("should include deleted when specified", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        includeDeleted: true,
      });
      expect(where.deletedAt).toBeUndefined();
    });

    it("should exclude deleted by default", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        includeDeleted: false,
      });
      expect(where.deletedAt).toBeNull();
    });
  });

  describe("Combined filters", () => {
    it("should combine multiple filters", () => {
      const where = buildAnnotationWhereClause(userId, {
        bookId,
        type: "HIGHLIGHT",
        isPublic: true,
        hasNote: true,
      });

      expect(where.userId).toBe(userId);
      expect(where.bookId).toBe(bookId);
      expect(where.type).toBe("HIGHLIGHT");
      expect(where.isPublic).toBe(true);
      expect(where.note).toEqual({ not: null });
      expect(where.deletedAt).toBeNull();
    });
  });
});

// ============================================================================
// buildAnnotationOrderBy Tests
// ============================================================================

describe("buildAnnotationOrderBy", () => {
  describe("Sort by createdAt", () => {
    it("should sort by createdAt ascending", () => {
      const orderBy = buildAnnotationOrderBy("createdAt", "asc");
      expect(orderBy.createdAt).toBe("asc");
    });

    it("should sort by createdAt descending", () => {
      const orderBy = buildAnnotationOrderBy("createdAt", "desc");
      expect(orderBy.createdAt).toBe("desc");
    });
  });

  describe("Sort by updatedAt", () => {
    it("should sort by updatedAt ascending", () => {
      const orderBy = buildAnnotationOrderBy("updatedAt", "asc");
      expect(orderBy.updatedAt).toBe("asc");
    });

    it("should sort by updatedAt descending", () => {
      const orderBy = buildAnnotationOrderBy("updatedAt", "desc");
      expect(orderBy.updatedAt).toBe("desc");
    });
  });

  describe("Sort by startOffset", () => {
    it("should sort by startOffset ascending", () => {
      const orderBy = buildAnnotationOrderBy("startOffset", "asc");
      expect(orderBy.startOffset).toBe("asc");
    });

    it("should sort by startOffset descending", () => {
      const orderBy = buildAnnotationOrderBy("startOffset", "desc");
      expect(orderBy.startOffset).toBe("desc");
    });
  });

  describe("Sort by type", () => {
    it("should sort by type ascending", () => {
      const orderBy = buildAnnotationOrderBy("type", "asc");
      expect(orderBy.type).toBe("asc");
    });

    it("should sort by type descending", () => {
      const orderBy = buildAnnotationOrderBy("type", "desc");
      expect(orderBy.type).toBe("desc");
    });
  });

  describe("Default sort", () => {
    it("should default to startOffset asc for unknown field", () => {
      const orderBy = buildAnnotationOrderBy("unknown", "desc");
      expect(orderBy.startOffset).toBe("asc");
    });

    it("should default to startOffset asc for empty field", () => {
      const orderBy = buildAnnotationOrderBy("", "desc");
      expect(orderBy.startOffset).toBe("asc");
    });
  });
});

// ============================================================================
// checkAnnotationProfanity Tests
// ============================================================================

describe("checkAnnotationProfanity", () => {
  describe("Private annotations", () => {
    it("should allow any content in private annotations", () => {
      const result = checkAnnotationProfanity({
        note: "This has bad words",
        isPublic: false,
      });
      expect(result.valid).toBe(true);
    });

    it("should allow when isPublic is undefined", () => {
      const result = checkAnnotationProfanity({
        note: "Any content here",
      });
      expect(result.valid).toBe(true);
    });

    it("should allow empty note in private", () => {
      const result = checkAnnotationProfanity({
        note: "",
        isPublic: false,
      });
      expect(result.valid).toBe(true);
    });

    it("should allow null note in private", () => {
      const result = checkAnnotationProfanity({
        note: null,
        isPublic: false,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("Public annotations - clean content", () => {
    it("should allow clean note in public annotation", () => {
      const result = checkAnnotationProfanity({
        note: "This is a thoughtful note about the passage.",
        isPublic: true,
      });
      expect(result.valid).toBe(true);
    });

    it("should allow empty note in public", () => {
      const result = checkAnnotationProfanity({
        note: "",
        isPublic: true,
      });
      expect(result.valid).toBe(true);
    });

    it("should allow null note in public", () => {
      const result = checkAnnotationProfanity({
        note: null,
        isPublic: true,
      });
      expect(result.valid).toBe(true);
    });

    it("should allow undefined note in public", () => {
      const result = checkAnnotationProfanity({
        isPublic: true,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("Public annotations - profane content", () => {
    it("should reject profane note in public annotation", () => {
      const result = checkAnnotationProfanity({
        note: "This is fucking terrible",
        isPublic: true,
      });
      expect(result.valid).toBe(false);
      expect(result.field).toBe("note");
    });

    it("should reject profanity with mixed case", () => {
      const result = checkAnnotationProfanity({
        note: "This is SHIT",
        isPublic: true,
      });
      expect(result.valid).toBe(false);
      expect(result.field).toBe("note");
    });

    it("should reject profanity at start of note", () => {
      const result = checkAnnotationProfanity({
        note: "Fuck this passage",
        isPublic: true,
      });
      expect(result.valid).toBe(false);
      expect(result.field).toBe("note");
    });

    it("should reject profanity at end of note", () => {
      const result = checkAnnotationProfanity({
        note: "What a piece of shit",
        isPublic: true,
      });
      expect(result.valid).toBe(false);
      expect(result.field).toBe("note");
    });
  });

  describe("Edge cases", () => {
    it("should handle very long clean note", () => {
      const longNote = "This is a clean and thoughtful note. ".repeat(100);
      const result = checkAnnotationProfanity({
        note: longNote,
        isPublic: true,
      });
      expect(result.valid).toBe(true);
    });

    it("should handle unicode content", () => {
      const result = checkAnnotationProfanity({
        note: "日本語のノート 🎉",
        isPublic: true,
      });
      expect(result.valid).toBe(true);
    });

    it("should handle words that contain profane substrings", () => {
      // "class" contains "ass" but should not be flagged
      const result = checkAnnotationProfanity({
        note: "This is a class example of good writing",
        isPublic: true,
      });
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// Response Structure Tests
// ============================================================================

describe("Response structure", () => {
  describe("AnnotationResponse type", () => {
    it("should have correct property count", () => {
      const annotation = {
        id: "clxxxxxxxxxx",
        bookId: "clyyyyyyyyyy",
        userId: "clzzzzzzzzzz",
        type: "HIGHLIGHT" as AnnotationType,
        startOffset: 100,
        endOffset: 200,
        selectedText: "Text",
        note: "Note",
        color: "#FF0000",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = formatAnnotationResponse(annotation);

      expect(Object.keys(result)).toHaveLength(12);
    });

    it("should have all expected properties", () => {
      const annotation = {
        id: "clxxxxxxxxxx",
        bookId: "clyyyyyyyyyy",
        userId: "clzzzzzzzzzz",
        type: "HIGHLIGHT" as AnnotationType,
        startOffset: 100,
        endOffset: 200,
        selectedText: "Text",
        note: "Note",
        color: "#FF0000",
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = formatAnnotationResponse(annotation);

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("bookId");
      expect(result).toHaveProperty("userId");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("startOffset");
      expect(result).toHaveProperty("endOffset");
      expect(result).toHaveProperty("selectedText");
      expect(result).toHaveProperty("note");
      expect(result).toHaveProperty("color");
      expect(result).toHaveProperty("isPublic");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
    });
  });
});

// ============================================================================
// Real-world Scenario Tests
// ============================================================================

describe("Real-world scenarios", () => {
  describe("Creating study highlights", () => {
    it("should format highlight with color and note", () => {
      const highlight = {
        id: "clhighlight1",
        bookId: "clbook12345",
        userId: "cluser12345",
        type: "HIGHLIGHT" as AnnotationType,
        startOffset: 5420,
        endOffset: 5580,
        selectedText:
          "The mitochondria is the powerhouse of the cell. This fundamental concept is essential for understanding cellular respiration.",
        note: "Key concept for exam - memorize this!",
        color: "#90EE90", // Light green
        isPublic: false,
        createdAt: new Date("2024-03-15T14:30:00.000Z"),
        updatedAt: new Date("2024-03-15T14:30:00.000Z"),
      };

      const result = formatAnnotationResponse(highlight);

      expect(result.type).toBe("HIGHLIGHT");
      expect(result.color).toBe("#90EE90");
      expect(result.note).toContain("exam");
      expect(result.selectedText).toContain("mitochondria");
    });
  });

  describe("Creating bookmarks", () => {
    it("should format bookmark without text or color", () => {
      const bookmark = {
        id: "clbookmark1",
        bookId: "clbook12345",
        userId: "cluser12345",
        type: "BOOKMARK" as AnnotationType,
        startOffset: 12500,
        endOffset: 12500,
        selectedText: null,
        note: "Continue reading from here",
        color: null,
        isPublic: false,
        createdAt: new Date("2024-03-15T22:00:00.000Z"),
        updatedAt: new Date("2024-03-15T22:00:00.000Z"),
      };

      const result = formatAnnotationResponse(bookmark);

      expect(result.type).toBe("BOOKMARK");
      expect(result.selectedText).toBeNull();
      expect(result.color).toBeNull();
      expect(result.note).toBe("Continue reading from here");
    });
  });

  describe("Creating notes", () => {
    it("should format note with reference text", () => {
      const note = {
        id: "clnote12345",
        bookId: "clbook12345",
        userId: "cluser12345",
        type: "NOTE" as AnnotationType,
        startOffset: 8900,
        endOffset: 9100,
        selectedText: "The author argues that...",
        note: "This contradicts what was said in Chapter 2. Need to reconcile these two views in my essay.",
        color: null,
        isPublic: false,
        createdAt: new Date("2024-03-16T10:15:00.000Z"),
        updatedAt: new Date("2024-03-16T11:30:00.000Z"),
      };

      const result = formatAnnotationResponse(note);

      expect(result.type).toBe("NOTE");
      expect(result.selectedText).toBe("The author argues that...");
      expect(result.note).toContain("Chapter 2");
    });
  });

  describe("Filtering for study session", () => {
    it("should build where clause for highlights only", () => {
      const where = buildAnnotationWhereClause("cluser12345", {
        bookId: "clbook12345",
        type: "HIGHLIGHT",
        hasNote: true,
      });

      expect(where.type).toBe("HIGHLIGHT");
      expect(where.note).toEqual({ not: null });
      expect(where.deletedAt).toBeNull();
    });

    it("should build where clause for public annotations", () => {
      const where = buildAnnotationWhereClause("cluser12345", {
        bookId: "clbook12345",
        isPublic: true,
      });

      expect(where.isPublic).toBe(true);
    });
  });

  describe("Sorting for reading order", () => {
    it("should sort by position in book", () => {
      const orderBy = buildAnnotationOrderBy("startOffset", "asc");
      expect(orderBy.startOffset).toBe("asc");
    });

    it("should sort by most recent first", () => {
      const orderBy = buildAnnotationOrderBy("createdAt", "desc");
      expect(orderBy.createdAt).toBe("desc");
    });
  });
});
