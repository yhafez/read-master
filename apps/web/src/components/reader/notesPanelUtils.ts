/**
 * Utilities for the split-screen notes panel
 *
 * Provides types and helper functions for note editing, filtering, and panel layout.
 */

import type {
  Annotation,
  AnnotationFilters,
  AnnotationSort,
  AnnotationType,
} from "./annotationTypes";
import {
  filterAnnotations,
  sortAnnotations,
  isHighlight,
  isNote,
} from "./annotationTypes";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Panel position options
 */
export type PanelPosition = "right" | "bottom";

/**
 * Panel resize constraints
 */
export interface PanelConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  defaultWidth: number;
  defaultHeight: number;
}

/**
 * Default panel constraints
 */
export const DEFAULT_PANEL_CONSTRAINTS: PanelConstraints = {
  minWidth: 280,
  maxWidth: 600,
  minHeight: 200,
  maxHeight: 500,
  defaultWidth: 360,
  defaultHeight: 300,
};

/**
 * Panel state
 */
export interface NotesPanelState {
  isOpen: boolean;
  position: PanelPosition;
  width: number;
  height: number;
  selectedAnnotationId: string | null;
  isEditing: boolean;
}

/**
 * Note filter preset types
 */
export type NoteFilterPreset = "all" | "notes-only" | "with-notes" | "recent";

/**
 * Panel settings to persist
 */
export interface NotesPanelSettings {
  position: PanelPosition;
  width: number;
  height: number;
  filterPreset: NoteFilterPreset;
  sortField: AnnotationSort["field"];
  sortDirection: AnnotationSort["direction"];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get default panel settings
 */
export function getDefaultPanelSettings(): NotesPanelSettings {
  return {
    position: "right",
    width: DEFAULT_PANEL_CONSTRAINTS.defaultWidth,
    height: DEFAULT_PANEL_CONSTRAINTS.defaultHeight,
    filterPreset: "all",
    sortField: "createdAt",
    sortDirection: "desc",
  };
}

/**
 * Clamp panel size to constraints
 */
export function clampPanelSize(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp width to constraints
 */
export function clampWidth(
  width: number,
  constraints: PanelConstraints = DEFAULT_PANEL_CONSTRAINTS
): number {
  return clampPanelSize(width, constraints.minWidth, constraints.maxWidth);
}

/**
 * Clamp height to constraints
 */
export function clampHeight(
  height: number,
  constraints: PanelConstraints = DEFAULT_PANEL_CONSTRAINTS
): number {
  return clampPanelSize(height, constraints.minHeight, constraints.maxHeight);
}

/**
 * Convert filter preset to AnnotationFilters
 */
export function presetToFilters(preset: NoteFilterPreset): AnnotationFilters {
  switch (preset) {
    case "notes-only":
      return { type: "NOTE" as AnnotationType };
    case "with-notes":
      return { hasNote: true };
    case "recent":
      // No specific filter, will rely on sort
      return {};
    case "all":
    default:
      return {};
  }
}

/**
 * Filter and sort annotations based on panel settings
 */
export function getFilteredAnnotations(
  annotations: Annotation[],
  settings: NotesPanelSettings,
  searchQuery?: string
): Annotation[] {
  const filters = presetToFilters(settings.filterPreset);

  // Add search query if provided
  if (searchQuery && searchQuery.trim()) {
    filters.search = searchQuery.trim();
  }

  const sort: AnnotationSort = {
    field: settings.sortField,
    direction: settings.sortDirection,
  };

  const filtered = filterAnnotations(annotations, filters);
  return sortAnnotations(filtered, sort);
}

/**
 * Get annotation display text for editing
 */
export function getAnnotationEditText(annotation: Annotation): string {
  // Notes and highlights can have note text
  if (annotation.note) {
    return annotation.note;
  }
  // Highlights show selected text as context
  if (isHighlight(annotation)) {
    return annotation.selectedText || "";
  }
  return "";
}

/**
 * Get annotation context text (what was highlighted/bookmarked)
 */
export function getAnnotationContext(annotation: Annotation): string | null {
  if (isHighlight(annotation)) {
    return annotation.selectedText;
  }
  if (isNote(annotation) && annotation.selectedText) {
    return annotation.selectedText;
  }
  return null;
}

/**
 * Check if annotation is editable (has note or can have note added)
 */
export function isAnnotationEditable(_annotation: Annotation): boolean {
  // All annotation types can have notes
  return true;
}

/**
 * Get annotation excerpt for list display
 */
export function getAnnotationListExcerpt(
  annotation: Annotation,
  maxLength: number = 80
): string {
  // Priority: note > selected text
  const text =
    annotation.note ||
    (isHighlight(annotation) ? annotation.selectedText : null) ||
    "";

  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Calculate panel layout based on position and container size
 */
export function calculatePanelLayout(
  position: PanelPosition,
  width: number,
  height: number,
  containerWidth: number,
  containerHeight: number
): {
  panelWidth: number;
  panelHeight: number;
  readerWidth: number;
  readerHeight: number;
} {
  if (position === "right") {
    const clampedWidth = clampWidth(width);
    return {
      panelWidth: clampedWidth,
      panelHeight: containerHeight,
      readerWidth: containerWidth - clampedWidth,
      readerHeight: containerHeight,
    };
  } else {
    const clampedHeight = clampHeight(height);
    return {
      panelWidth: containerWidth,
      panelHeight: clampedHeight,
      readerWidth: containerWidth,
      readerHeight: containerHeight - clampedHeight,
    };
  }
}

/**
 * Get filter preset display label key (for i18n)
 */
export function getFilterPresetLabelKey(preset: NoteFilterPreset): string {
  switch (preset) {
    case "notes-only":
      return "reader.notes.filters.notesOnly";
    case "with-notes":
      return "reader.notes.filters.withNotes";
    case "recent":
      return "reader.notes.filters.recent";
    case "all":
    default:
      return "reader.notes.filters.all";
  }
}

/**
 * Get sort field display label key (for i18n)
 */
export function getSortFieldLabelKey(field: AnnotationSort["field"]): string {
  switch (field) {
    case "createdAt":
      return "reader.notes.sort.created";
    case "updatedAt":
      return "reader.notes.sort.updated";
    case "startOffset":
      return "reader.notes.sort.position";
    case "type":
      return "reader.notes.sort.type";
    default:
      return "reader.notes.sort.created";
  }
}

/**
 * Get available filter presets
 */
export function getFilterPresets(): NoteFilterPreset[] {
  return ["all", "notes-only", "with-notes", "recent"];
}

/**
 * Get available sort fields
 */
export function getSortFields(): AnnotationSort["field"][] {
  return ["createdAt", "updatedAt", "startOffset", "type"];
}

/**
 * Validate panel settings
 */
export function validatePanelSettings(
  settings: Partial<NotesPanelSettings>
): NotesPanelSettings {
  const defaults = getDefaultPanelSettings();
  return {
    position: settings.position || defaults.position,
    width: clampWidth(settings.width ?? defaults.width),
    height: clampHeight(settings.height ?? defaults.height),
    filterPreset: settings.filterPreset || defaults.filterPreset,
    sortField: settings.sortField || defaults.sortField,
    sortDirection: settings.sortDirection || defaults.sortDirection,
  };
}

/**
 * Storage key for panel settings
 */
export const NOTES_PANEL_STORAGE_KEY = "readmaster.notesPanel";

/**
 * Save panel settings to localStorage
 */
export function savePanelSettings(settings: NotesPanelSettings): void {
  try {
    localStorage.setItem(NOTES_PANEL_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage not available or quota exceeded
  }
}

/**
 * Load panel settings from localStorage
 */
export function loadPanelSettings(): NotesPanelSettings {
  try {
    const stored = localStorage.getItem(NOTES_PANEL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return validatePanelSettings(parsed);
    }
  } catch {
    // Invalid data or storage not available
  }
  return getDefaultPanelSettings();
}

/**
 * Get note count by filter preset
 */
export function countByPreset(
  annotations: Annotation[],
  preset: NoteFilterPreset
): number {
  const filters = presetToFilters(preset);
  return filterAnnotations(annotations, filters).length;
}
