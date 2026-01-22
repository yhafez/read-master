/**
 * Tests for notesPanelUtils
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type {
  Annotation,
  HighlightAnnotation,
  NoteAnnotation,
  BookmarkAnnotation,
} from "./annotationTypes";
import {
  DEFAULT_PANEL_CONSTRAINTS,
  getDefaultPanelSettings,
  clampPanelSize,
  clampWidth,
  clampHeight,
  presetToFilters,
  getFilteredAnnotations,
  getAnnotationEditText,
  getAnnotationContext,
  isAnnotationEditable,
  getAnnotationListExcerpt,
  calculatePanelLayout,
  getFilterPresetLabelKey,
  getSortFieldLabelKey,
  getFilterPresets,
  getSortFields,
  validatePanelSettings,
  savePanelSettings,
  loadPanelSettings,
  countByPreset,
  NOTES_PANEL_STORAGE_KEY,
} from "./notesPanelUtils";
import type { NotesPanelSettings } from "./notesPanelUtils";

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createHighlight(
  overrides: Partial<HighlightAnnotation> = {}
): HighlightAnnotation {
  return {
    id: "h1",
    bookId: "book1",
    type: "HIGHLIGHT",
    startOffset: 0,
    endOffset: 10,
    selectedText: "Test highlight",
    color: "yellow",
    isPublic: false,
    likeCount: 0,
    isLikedByCurrentUser: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function createNote(overrides: Partial<NoteAnnotation> = {}): NoteAnnotation {
  return {
    id: "n1",
    bookId: "book1",
    type: "NOTE",
    startOffset: 0,
    endOffset: 10,
    note: "Test note",
    isPublic: false,
    likeCount: 0,
    isLikedByCurrentUser: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function createBookmark(
  overrides: Partial<BookmarkAnnotation> = {}
): BookmarkAnnotation {
  return {
    id: "b1",
    bookId: "book1",
    type: "BOOKMARK",
    startOffset: 0,
    endOffset: 0,
    isPublic: false,
    likeCount: 0,
    isLikedByCurrentUser: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const mockAnnotations: Annotation[] = [
  createHighlight({
    id: "h1",
    note: "Note on highlight",
    createdAt: "2024-01-03T00:00:00Z",
  }),
  createHighlight({ id: "h2", createdAt: "2024-01-01T00:00:00Z" }),
  createNote({
    id: "n1",
    note: "First note",
    createdAt: "2024-01-02T00:00:00Z",
  }),
  createNote({
    id: "n2",
    note: "Second note",
    selectedText: "Context text",
    createdAt: "2024-01-04T00:00:00Z",
  }),
  createBookmark({ id: "b1", createdAt: "2024-01-05T00:00:00Z" }),
];

// =============================================================================
// TESTS
// =============================================================================

describe("notesPanelUtils", () => {
  // ==========================================================================
  // Panel Settings
  // ==========================================================================

  describe("getDefaultPanelSettings", () => {
    it("returns default settings", () => {
      const settings = getDefaultPanelSettings();
      expect(settings.position).toBe("right");
      expect(settings.width).toBe(DEFAULT_PANEL_CONSTRAINTS.defaultWidth);
      expect(settings.height).toBe(DEFAULT_PANEL_CONSTRAINTS.defaultHeight);
      expect(settings.filterPreset).toBe("all");
      expect(settings.sortField).toBe("createdAt");
      expect(settings.sortDirection).toBe("desc");
    });
  });

  // ==========================================================================
  // Size Clamping
  // ==========================================================================

  describe("clampPanelSize", () => {
    it("clamps value below minimum", () => {
      expect(clampPanelSize(50, 100, 500)).toBe(100);
    });

    it("clamps value above maximum", () => {
      expect(clampPanelSize(600, 100, 500)).toBe(500);
    });

    it("returns value within range unchanged", () => {
      expect(clampPanelSize(300, 100, 500)).toBe(300);
    });

    it("handles edge case at minimum", () => {
      expect(clampPanelSize(100, 100, 500)).toBe(100);
    });

    it("handles edge case at maximum", () => {
      expect(clampPanelSize(500, 100, 500)).toBe(500);
    });
  });

  describe("clampWidth", () => {
    it("uses default constraints", () => {
      expect(clampWidth(100)).toBe(DEFAULT_PANEL_CONSTRAINTS.minWidth);
      expect(clampWidth(1000)).toBe(DEFAULT_PANEL_CONSTRAINTS.maxWidth);
    });

    it("uses custom constraints", () => {
      const constraints = {
        ...DEFAULT_PANEL_CONSTRAINTS,
        minWidth: 200,
        maxWidth: 400,
      };
      expect(clampWidth(100, constraints)).toBe(200);
      expect(clampWidth(500, constraints)).toBe(400);
    });
  });

  describe("clampHeight", () => {
    it("uses default constraints", () => {
      expect(clampHeight(50)).toBe(DEFAULT_PANEL_CONSTRAINTS.minHeight);
      expect(clampHeight(1000)).toBe(DEFAULT_PANEL_CONSTRAINTS.maxHeight);
    });

    it("uses custom constraints", () => {
      const constraints = {
        ...DEFAULT_PANEL_CONSTRAINTS,
        minHeight: 150,
        maxHeight: 400,
      };
      expect(clampHeight(50, constraints)).toBe(150);
      expect(clampHeight(500, constraints)).toBe(400);
    });
  });

  // ==========================================================================
  // Filter Presets
  // ==========================================================================

  describe("presetToFilters", () => {
    it("returns empty filters for 'all'", () => {
      expect(presetToFilters("all")).toEqual({});
    });

    it("returns type filter for 'notes-only'", () => {
      expect(presetToFilters("notes-only")).toEqual({ type: "NOTE" });
    });

    it("returns hasNote filter for 'with-notes'", () => {
      expect(presetToFilters("with-notes")).toEqual({ hasNote: true });
    });

    it("returns empty filters for 'recent'", () => {
      expect(presetToFilters("recent")).toEqual({});
    });
  });

  // ==========================================================================
  // Filtering and Sorting
  // ==========================================================================

  describe("getFilteredAnnotations", () => {
    const defaultSettings: NotesPanelSettings = {
      position: "right",
      width: 360,
      height: 300,
      filterPreset: "all",
      sortField: "createdAt",
      sortDirection: "desc",
    };

    it("returns all annotations with default settings", () => {
      const result = getFilteredAnnotations(mockAnnotations, defaultSettings);
      expect(result).toHaveLength(5);
    });

    it("filters to notes only", () => {
      const settings = {
        ...defaultSettings,
        filterPreset: "notes-only" as const,
      };
      const result = getFilteredAnnotations(mockAnnotations, settings);
      expect(result).toHaveLength(2);
      expect(result.every((a) => a.type === "NOTE")).toBe(true);
    });

    it("filters to annotations with notes", () => {
      const settings = {
        ...defaultSettings,
        filterPreset: "with-notes" as const,
      };
      const result = getFilteredAnnotations(mockAnnotations, settings);
      // h1 has note, n1 and n2 have notes = 3 total
      expect(result).toHaveLength(3);
      expect(result.every((a) => Boolean(a.note))).toBe(true);
    });

    it("applies search query", () => {
      const result = getFilteredAnnotations(
        mockAnnotations,
        defaultSettings,
        "First"
      );
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("n1");
    });

    it("sorts by createdAt descending", () => {
      const settings = {
        ...defaultSettings,
        sortField: "createdAt" as const,
        sortDirection: "desc" as const,
      };
      const result = getFilteredAnnotations(mockAnnotations, settings);
      expect(result[0]!.id).toBe("b1"); // 2024-01-05
      expect(result[1]!.id).toBe("n2"); // 2024-01-04
    });

    it("sorts by createdAt ascending", () => {
      const settings = {
        ...defaultSettings,
        sortField: "createdAt" as const,
        sortDirection: "asc" as const,
      };
      const result = getFilteredAnnotations(mockAnnotations, settings);
      expect(result[0]!.id).toBe("h2"); // 2024-01-01
      expect(result[1]!.id).toBe("n1"); // 2024-01-02
    });
  });

  // ==========================================================================
  // Annotation Text Helpers
  // ==========================================================================

  describe("getAnnotationEditText", () => {
    it("returns note if present", () => {
      const highlight = createHighlight({ note: "My note" });
      expect(getAnnotationEditText(highlight)).toBe("My note");
    });

    it("returns selected text for highlight without note", () => {
      const highlight = createHighlight({ selectedText: "Highlighted text" });
      expect(getAnnotationEditText(highlight)).toBe("Highlighted text");
    });

    it("returns note text for notes", () => {
      const note = createNote({ note: "Note content" });
      expect(getAnnotationEditText(note)).toBe("Note content");
    });

    it("returns empty string for bookmark without note", () => {
      const bookmark = createBookmark();
      expect(getAnnotationEditText(bookmark)).toBe("");
    });
  });

  describe("getAnnotationContext", () => {
    it("returns selected text for highlights", () => {
      const highlight = createHighlight({ selectedText: "Highlighted" });
      expect(getAnnotationContext(highlight)).toBe("Highlighted");
    });

    it("returns selected text for notes with context", () => {
      const note = createNote({ selectedText: "Context" });
      expect(getAnnotationContext(note)).toBe("Context");
    });

    it("returns null for notes without context", () => {
      const note = createNote();
      delete (note as Partial<NoteAnnotation>).selectedText;
      expect(getAnnotationContext(note)).toBeNull();
    });

    it("returns null for bookmarks", () => {
      const bookmark = createBookmark();
      expect(getAnnotationContext(bookmark)).toBeNull();
    });
  });

  describe("isAnnotationEditable", () => {
    it("returns true for all annotation types", () => {
      expect(isAnnotationEditable(createHighlight())).toBe(true);
      expect(isAnnotationEditable(createNote())).toBe(true);
      expect(isAnnotationEditable(createBookmark())).toBe(true);
    });
  });

  describe("getAnnotationListExcerpt", () => {
    it("returns note if present", () => {
      const highlight = createHighlight({ note: "Short note" });
      expect(getAnnotationListExcerpt(highlight)).toBe("Short note");
    });

    it("returns selected text for highlight without note", () => {
      const highlight = createHighlight({ selectedText: "Highlighted" });
      expect(getAnnotationListExcerpt(highlight)).toBe("Highlighted");
    });

    it("truncates long text", () => {
      const longText = "A".repeat(100);
      const note = createNote({ note: longText });
      const excerpt = getAnnotationListExcerpt(note, 50);
      expect(excerpt).toHaveLength(50);
      expect(excerpt.endsWith("...")).toBe(true);
    });

    it("does not truncate short text", () => {
      const note = createNote({ note: "Short" });
      expect(getAnnotationListExcerpt(note, 50)).toBe("Short");
    });
  });

  // ==========================================================================
  // Layout Calculation
  // ==========================================================================

  describe("calculatePanelLayout", () => {
    it("calculates right panel layout", () => {
      const layout = calculatePanelLayout("right", 360, 300, 1200, 800);
      expect(layout.panelWidth).toBe(360);
      expect(layout.panelHeight).toBe(800);
      expect(layout.readerWidth).toBe(840);
      expect(layout.readerHeight).toBe(800);
    });

    it("calculates bottom panel layout", () => {
      const layout = calculatePanelLayout("bottom", 360, 300, 1200, 800);
      expect(layout.panelWidth).toBe(1200);
      expect(layout.panelHeight).toBe(300);
      expect(layout.readerWidth).toBe(1200);
      expect(layout.readerHeight).toBe(500);
    });

    it("clamps width for right panel", () => {
      const layout = calculatePanelLayout("right", 1000, 300, 1200, 800);
      expect(layout.panelWidth).toBe(DEFAULT_PANEL_CONSTRAINTS.maxWidth);
    });

    it("clamps height for bottom panel", () => {
      const layout = calculatePanelLayout("bottom", 360, 1000, 1200, 800);
      expect(layout.panelHeight).toBe(DEFAULT_PANEL_CONSTRAINTS.maxHeight);
    });
  });

  // ==========================================================================
  // Label Keys
  // ==========================================================================

  describe("getFilterPresetLabelKey", () => {
    it("returns correct key for all presets", () => {
      expect(getFilterPresetLabelKey("all")).toBe("reader.notes.filters.all");
      expect(getFilterPresetLabelKey("notes-only")).toBe(
        "reader.notes.filters.notesOnly"
      );
      expect(getFilterPresetLabelKey("with-notes")).toBe(
        "reader.notes.filters.withNotes"
      );
      expect(getFilterPresetLabelKey("recent")).toBe(
        "reader.notes.filters.recent"
      );
    });
  });

  describe("getSortFieldLabelKey", () => {
    it("returns correct key for all sort fields", () => {
      expect(getSortFieldLabelKey("createdAt")).toBe(
        "reader.notes.sort.created"
      );
      expect(getSortFieldLabelKey("updatedAt")).toBe(
        "reader.notes.sort.updated"
      );
      expect(getSortFieldLabelKey("startOffset")).toBe(
        "reader.notes.sort.position"
      );
      expect(getSortFieldLabelKey("type")).toBe("reader.notes.sort.type");
    });
  });

  // ==========================================================================
  // Preset and Field Lists
  // ==========================================================================

  describe("getFilterPresets", () => {
    it("returns all presets", () => {
      const presets = getFilterPresets();
      expect(presets).toContain("all");
      expect(presets).toContain("notes-only");
      expect(presets).toContain("with-notes");
      expect(presets).toContain("recent");
    });
  });

  describe("getSortFields", () => {
    it("returns all sort fields", () => {
      const fields = getSortFields();
      expect(fields).toContain("createdAt");
      expect(fields).toContain("updatedAt");
      expect(fields).toContain("startOffset");
      expect(fields).toContain("type");
    });
  });

  // ==========================================================================
  // Settings Validation
  // ==========================================================================

  describe("validatePanelSettings", () => {
    it("returns valid settings unchanged", () => {
      const settings: NotesPanelSettings = {
        position: "bottom",
        width: 400,
        height: 350,
        filterPreset: "notes-only",
        sortField: "updatedAt",
        sortDirection: "asc",
      };
      expect(validatePanelSettings(settings)).toEqual(settings);
    });

    it("applies defaults for missing fields", () => {
      const result = validatePanelSettings({});
      const defaults = getDefaultPanelSettings();
      expect(result).toEqual(defaults);
    });

    it("clamps out-of-range width", () => {
      const result = validatePanelSettings({ width: 1000 });
      expect(result.width).toBe(DEFAULT_PANEL_CONSTRAINTS.maxWidth);
    });

    it("clamps out-of-range height", () => {
      const result = validatePanelSettings({ height: 50 });
      expect(result.height).toBe(DEFAULT_PANEL_CONSTRAINTS.minHeight);
    });
  });

  // ==========================================================================
  // Local Storage
  // ==========================================================================

  describe("savePanelSettings and loadPanelSettings", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it("saves and loads settings", () => {
      const settings: NotesPanelSettings = {
        position: "bottom",
        width: 400,
        height: 350,
        filterPreset: "notes-only",
        sortField: "updatedAt",
        sortDirection: "asc",
      };
      savePanelSettings(settings);
      const loaded = loadPanelSettings();
      expect(loaded).toEqual(settings);
    });

    it("returns defaults when storage is empty", () => {
      const loaded = loadPanelSettings();
      expect(loaded).toEqual(getDefaultPanelSettings());
    });

    it("returns defaults for invalid JSON", () => {
      localStorage.setItem(NOTES_PANEL_STORAGE_KEY, "invalid json");
      const loaded = loadPanelSettings();
      expect(loaded).toEqual(getDefaultPanelSettings());
    });

    it("validates loaded settings", () => {
      localStorage.setItem(
        NOTES_PANEL_STORAGE_KEY,
        JSON.stringify({ width: 1000 })
      );
      const loaded = loadPanelSettings();
      expect(loaded.width).toBe(DEFAULT_PANEL_CONSTRAINTS.maxWidth);
    });
  });

  // ==========================================================================
  // Count By Preset
  // ==========================================================================

  describe("countByPreset", () => {
    it("counts all annotations", () => {
      expect(countByPreset(mockAnnotations, "all")).toBe(5);
    });

    it("counts notes only", () => {
      expect(countByPreset(mockAnnotations, "notes-only")).toBe(2);
    });

    it("counts annotations with notes", () => {
      expect(countByPreset(mockAnnotations, "with-notes")).toBe(3);
    });

    it("counts recent (all for recent preset)", () => {
      expect(countByPreset(mockAnnotations, "recent")).toBe(5);
    });
  });
});
