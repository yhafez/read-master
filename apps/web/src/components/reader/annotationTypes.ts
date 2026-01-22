/**
 * Types and utilities for the Annotation UI
 * Handles highlights, notes, and bookmarks
 */

/**
 * Annotation types
 */
export type AnnotationType = "HIGHLIGHT" | "NOTE" | "BOOKMARK";

/**
 * Highlight color options
 */
export type HighlightColor =
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "purple"
  | "orange";

/**
 * Highlight color hex values for rendering
 */
export const HIGHLIGHT_COLOR_VALUES: Record<HighlightColor, string> = {
  yellow: "#fff176",
  green: "#a5d6a7",
  blue: "#90caf9",
  pink: "#f48fb1",
  purple: "#ce93d8",
  orange: "#ffcc80",
};

/**
 * Convert highlight color name to hex
 */
export function colorToHex(color: HighlightColor): string {
  return HIGHLIGHT_COLOR_VALUES[color];
}

/**
 * Convert hex to highlight color name (if valid)
 */
export function hexToColor(hex: string): HighlightColor | null {
  const normalized = hex.toLowerCase();
  for (const [color, value] of Object.entries(HIGHLIGHT_COLOR_VALUES)) {
    if (value.toLowerCase() === normalized) {
      return color as HighlightColor;
    }
  }
  return null;
}

/**
 * Default highlight color
 */
export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = "yellow";

/**
 * Base annotation interface
 */
export interface AnnotationBase {
  /** Unique identifier */
  id: string;
  /** Book ID */
  bookId: string;
  /** Annotation type */
  type: AnnotationType;
  /** Start character offset */
  startOffset: number;
  /** End character offset */
  endOffset: number;
  /** Optional note */
  note?: string;
  /** Whether the annotation is public */
  isPublic: boolean;
  /** Number of likes */
  likeCount: number;
  /** Whether current user has liked this annotation */
  isLikedByCurrentUser: boolean;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

/**
 * Highlight annotation
 */
export interface HighlightAnnotation extends AnnotationBase {
  type: "HIGHLIGHT";
  /** The highlighted text */
  selectedText: string;
  /** Highlight color */
  color: HighlightColor;
}

/**
 * Note annotation
 */
export interface NoteAnnotation extends AnnotationBase {
  type: "NOTE";
  /** Required note content */
  note: string;
  /** Optional selected text */
  selectedText?: string;
}

/**
 * Bookmark annotation
 */
export interface BookmarkAnnotation extends AnnotationBase {
  type: "BOOKMARK";
}

/**
 * Union type for all annotations
 */
export type Annotation =
  | HighlightAnnotation
  | NoteAnnotation
  | BookmarkAnnotation;

/**
 * Selection position for toolbar placement
 */
export interface SelectionPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Text selection information for creating annotations
 */
export interface TextSelectionInfo {
  /** Selected text */
  text: string;
  /** Start offset in content */
  startOffset: number;
  /** End offset in content */
  endOffset: number;
  /** Position for toolbar placement */
  position: SelectionPosition;
}

/**
 * Annotation toolbar action types
 */
export type AnnotationAction =
  | "highlight"
  | "note"
  | "bookmark"
  | "copy"
  | "lookup"
  | "explain";

/**
 * Create annotation input (for API calls)
 */
export interface CreateAnnotationInput {
  bookId: string;
  type: AnnotationType;
  startOffset: number;
  endOffset: number;
  selectedText?: string | undefined;
  note?: string | undefined;
  color?: HighlightColor | undefined;
  isPublic?: boolean | undefined;
}

/**
 * Update annotation input (for API calls)
 */
export interface UpdateAnnotationInput {
  note?: string;
  color?: HighlightColor;
  isPublic?: boolean;
}

/**
 * Annotation filter options
 */
export interface AnnotationFilters {
  type?: AnnotationType;
  hasNote?: boolean;
  search?: string;
}

/**
 * Annotation sort options
 */
export type AnnotationSortField =
  | "createdAt"
  | "updatedAt"
  | "startOffset"
  | "type";
export type AnnotationSortDirection = "asc" | "desc";

export interface AnnotationSort {
  field: AnnotationSortField;
  direction: AnnotationSortDirection;
}

/**
 * Annotation sidebar view mode
 */
export type AnnotationViewMode = "all" | "highlights" | "notes" | "bookmarks";

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if an annotation is a highlight
 */
export function isHighlight(
  annotation: Annotation
): annotation is HighlightAnnotation {
  return annotation.type === "HIGHLIGHT";
}

/**
 * Check if an annotation is a note
 */
export function isNote(annotation: Annotation): annotation is NoteAnnotation {
  return annotation.type === "NOTE";
}

/**
 * Check if an annotation is a bookmark
 */
export function isBookmark(
  annotation: Annotation
): annotation is BookmarkAnnotation {
  return annotation.type === "BOOKMARK";
}

/**
 * Get annotation icon name based on type
 */
export function getAnnotationIcon(type: AnnotationType): string {
  switch (type) {
    case "HIGHLIGHT":
      return "highlight";
    case "NOTE":
      return "note";
    case "BOOKMARK":
      return "bookmark";
  }
}

/**
 * Get annotation label based on type
 */
export function getAnnotationLabel(type: AnnotationType): string {
  switch (type) {
    case "HIGHLIGHT":
      return "Highlight";
    case "NOTE":
      return "Note";
    case "BOOKMARK":
      return "Bookmark";
  }
}

/**
 * Sort annotations by field
 */
export function sortAnnotations(
  annotations: Annotation[],
  sort: AnnotationSort
): Annotation[] {
  const sorted = [...annotations].sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "updatedAt":
        comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "startOffset":
        comparison = a.startOffset - b.startOffset;
        break;
      case "type":
        comparison = a.type.localeCompare(b.type);
        break;
    }

    return sort.direction === "desc" ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Filter annotations by criteria
 */
export function filterAnnotations(
  annotations: Annotation[],
  filters: AnnotationFilters
): Annotation[] {
  return annotations.filter((annotation) => {
    // Filter by type
    if (filters.type && annotation.type !== filters.type) {
      return false;
    }

    // Filter by hasNote
    if (filters.hasNote !== undefined) {
      const hasNote = Boolean(annotation.note && annotation.note.trim());
      if (filters.hasNote !== hasNote) {
        return false;
      }
    }

    // Filter by search text
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const noteMatch = annotation.note?.toLowerCase().includes(searchLower);
      const textMatch =
        isHighlight(annotation) &&
        annotation.selectedText.toLowerCase().includes(searchLower);
      if (!noteMatch && !textMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Group annotations by type
 */
export function groupAnnotationsByType(
  annotations: Annotation[]
): Record<AnnotationType, Annotation[]> {
  const groups: Record<AnnotationType, Annotation[]> = {
    HIGHLIGHT: [],
    NOTE: [],
    BOOKMARK: [],
  };

  for (const annotation of annotations) {
    groups[annotation.type].push(annotation);
  }

  return groups;
}

/**
 * Get annotations in a character range
 */
export function getAnnotationsInRange(
  annotations: Annotation[],
  startOffset: number,
  endOffset: number
): Annotation[] {
  return annotations.filter((annotation) => {
    // Check if ranges overlap
    return (
      annotation.startOffset < endOffset && annotation.endOffset > startOffset
    );
  });
}

/**
 * Get annotation at a specific position
 */
export function getAnnotationAtPosition(
  annotations: Annotation[],
  offset: number
): Annotation | undefined {
  return annotations.find(
    (annotation) =>
      offset >= annotation.startOffset && offset <= annotation.endOffset
  );
}

/**
 * Validate selection for annotation
 */
export function validateSelection(selection: TextSelectionInfo | null): {
  valid: boolean;
  error?: string;
} {
  if (!selection) {
    return { valid: false, error: "No text selected" };
  }

  if (selection.text.trim().length === 0) {
    return { valid: false, error: "Selection is empty" };
  }

  if (selection.startOffset < 0) {
    return { valid: false, error: "Invalid start offset" };
  }

  if (selection.endOffset <= selection.startOffset) {
    return { valid: false, error: "Invalid selection range" };
  }

  return { valid: true };
}

/**
 * Create a highlight annotation input from selection
 */
export function createHighlightInput(
  bookId: string,
  selection: TextSelectionInfo,
  color: HighlightColor = DEFAULT_HIGHLIGHT_COLOR,
  note?: string
): CreateAnnotationInput {
  return {
    bookId,
    type: "HIGHLIGHT",
    startOffset: selection.startOffset,
    endOffset: selection.endOffset,
    selectedText: selection.text,
    color,
    note,
    isPublic: false,
  };
}

/**
 * Create a note annotation input from selection
 */
export function createNoteInput(
  bookId: string,
  selection: TextSelectionInfo,
  note: string
): CreateAnnotationInput {
  return {
    bookId,
    type: "NOTE",
    startOffset: selection.startOffset,
    endOffset: selection.endOffset,
    selectedText: selection.text,
    note,
    isPublic: false,
  };
}

/**
 * Create a bookmark annotation input at position
 */
export function createBookmarkInput(
  bookId: string,
  offset: number,
  note?: string
): CreateAnnotationInput {
  return {
    bookId,
    type: "BOOKMARK",
    startOffset: offset,
    endOffset: offset,
    note,
    isPublic: false,
  };
}

/**
 * Get excerpt text for display (truncated if too long)
 */
export function getExcerptText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Format annotation date for display
 */
export function formatAnnotationDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Count annotations by type
 */
export function countAnnotationsByType(
  annotations: Annotation[]
): Record<AnnotationType, number> {
  const counts: Record<AnnotationType, number> = {
    HIGHLIGHT: 0,
    NOTE: 0,
    BOOKMARK: 0,
  };

  for (const annotation of annotations) {
    counts[annotation.type]++;
  }

  return counts;
}
