/**
 * Types for the Text Reader component
 * Handles plain text, DOC, DOCX, and pasted content
 */

/**
 * Text location information (character offset based)
 */
export interface TextLocation {
  /** Current character offset from start */
  charOffset: number;
  /** Current position as percentage (0-1) */
  percentage: number;
  /** Total character count */
  totalChars: number;
  /** Current paragraph index */
  paragraphIndex: number;
  /** Total paragraphs */
  totalParagraphs: number;
  /** Estimated current page (based on chars per page) */
  estimatedPage: number;
  /** Estimated total pages */
  estimatedTotalPages: number;
}

/**
 * Text selection information
 */
export interface TextReaderSelection {
  /** Selected text content */
  text: string;
  /** Start character offset */
  startOffset: number;
  /** End character offset */
  endOffset: number;
  /** Display position for toolbar/popover */
  position: {
    x: number;
    y: number;
  };
}

/**
 * Highlight annotation for text
 */
export interface TextHighlight {
  /** Unique identifier */
  id: string;
  /** Start character offset */
  startOffset: number;
  /** End character offset */
  endOffset: number;
  /** Highlight color */
  color: TextHighlightColor;
  /** Optional note attached to highlight */
  note?: string;
}

/**
 * Available highlight colors
 */
export type TextHighlightColor =
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "purple";

/**
 * Text reader state
 */
export interface TextReaderState {
  /** Whether the content is loaded */
  isLoaded: boolean;
  /** Whether there was an error */
  hasError: boolean;
  /** Error message if any */
  errorMessage: string | null;
  /** Current location */
  location: TextLocation | null;
  /** Current text selection */
  selection: TextReaderSelection | null;
  /** Whether navigation is possible */
  canGoNext: boolean;
  /** Whether navigation is possible */
  canGoPrev: boolean;
  /** Active highlights */
  highlights: TextHighlight[];
  /** Font size multiplier */
  fontSize: number;
  /** Line height multiplier */
  lineHeight: number;
}

/**
 * Content type for text reader
 */
export type TextContentType = "plain" | "doc" | "docx" | "rtf" | "html";

/**
 * Props for the TextReader component
 */
export interface TextReaderProps {
  /** Text content to display */
  content: string;
  /** Content type for parsing */
  contentType?: TextContentType;
  /** Initial character offset to restore */
  initialOffset?: number;
  /** Pre-existing highlights to display */
  highlights?: TextHighlight[];
  /** Callback when location changes */
  onLocationChange?: (location: TextLocation) => void;
  /** Callback when text is selected */
  onTextSelect?: (selection: TextReaderSelection) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Callback when content is loaded */
  onLoad?: (totalChars: number) => void;
  /** Callback when a highlight is created */
  onHighlightCreate?: (highlight: Omit<TextHighlight, "id">) => void;
  /** Callback when a highlight is removed */
  onHighlightRemove?: (highlightId: string) => void;
}

/**
 * Reader error types
 */
export type TextReaderErrorType =
  | "load_failed"
  | "parse_failed"
  | "render_failed"
  | "invalid_content"
  | "unsupported_format";

/**
 * Initial reader state
 */
export const INITIAL_TEXT_READER_STATE: TextReaderState = {
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
};

/**
 * Default characters per page for pagination calculation
 */
export const CHARS_PER_PAGE = 1500;

/**
 * Default scroll amount for page navigation (in viewport heights)
 */
export const SCROLL_AMOUNT = 0.9;

/**
 * Minimum font size multiplier
 */
export const MIN_FONT_SIZE = 0.75;

/**
 * Maximum font size multiplier
 */
export const MAX_FONT_SIZE = 2.0;

/**
 * Font size step
 */
export const FONT_SIZE_STEP = 0.1;

/**
 * Highlight colors map with hex values
 */
export const HIGHLIGHT_COLORS: Record<TextHighlightColor, string> = {
  yellow: "#fff176",
  green: "#a5d6a7",
  blue: "#90caf9",
  pink: "#f48fb1",
  purple: "#ce93d8",
};

/**
 * Create a text reader error
 */
export function createTextReaderError(
  type: TextReaderErrorType,
  message: string
): Error {
  const error = new Error(message);
  error.name = type;
  return error;
}

/**
 * Get user-friendly error message
 */
export function getTextReaderErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.name) {
      case "load_failed":
        return "Failed to load the content. Please try again.";
      case "parse_failed":
        return "Failed to parse the content format.";
      case "render_failed":
        return "Failed to render the content.";
      case "invalid_content":
        return "The content provided is invalid or empty.";
      case "unsupported_format":
        return "This content format is not supported.";
      default:
        return error.message || "An unknown error occurred.";
    }
  }
  return "An unknown error occurred.";
}

/**
 * Validate content is not empty
 */
export function validateContent(content: string): boolean {
  return typeof content === "string" && content.trim().length > 0;
}

/**
 * Calculate location from character offset
 */
export function calculateLocation(
  charOffset: number,
  content: string,
  paragraphs: string[]
): TextLocation {
  const totalChars = content.length;
  const percentage = totalChars > 0 ? charOffset / totalChars : 0;

  // Calculate paragraph index
  let currentOffset = 0;
  let paragraphIndex = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    if (para === undefined) continue;
    const paraLength = para.length + 1; // +1 for newline
    if (currentOffset + paraLength > charOffset) {
      paragraphIndex = i;
      break;
    }
    currentOffset += paraLength;
  }

  // Estimate page based on chars per page
  const estimatedPage = Math.floor(charOffset / CHARS_PER_PAGE) + 1;
  const estimatedTotalPages = Math.ceil(totalChars / CHARS_PER_PAGE);

  return {
    charOffset,
    percentage,
    totalChars,
    paragraphIndex,
    totalParagraphs: paragraphs.length,
    estimatedPage,
    estimatedTotalPages,
  };
}

/**
 * Parse content into paragraphs
 */
export function parseIntoParagraphs(content: string): string[] {
  if (!content || typeof content !== "string") {
    return [];
  }

  // Split by double newlines or single newlines
  const paragraphs = content
    .split(/\n\n+|\r\n\r\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // If no paragraph breaks, split by single newlines
  if (paragraphs.length <= 1 && content.includes("\n")) {
    return content
      .split(/\n|\r\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  return paragraphs;
}

/**
 * Clamp font size to valid range
 */
export function clampFontSize(size: number): number {
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Get character offset at scroll position
 */
export function getOffsetAtScrollPosition(
  scrollTop: number,
  scrollHeight: number,
  totalChars: number
): number {
  if (scrollHeight <= 0) return 0;
  const percentage = scrollTop / scrollHeight;
  return Math.floor(percentage * totalChars);
}

/**
 * Calculate scroll position from character offset
 */
export function getScrollPositionFromOffset(
  charOffset: number,
  totalChars: number,
  scrollHeight: number
): number {
  if (totalChars <= 0) return 0;
  const percentage = charOffset / totalChars;
  return Math.floor(percentage * scrollHeight);
}

/**
 * Check if two ranges overlap
 */
export function rangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && end1 > start2;
}

/**
 * Get highlights that overlap with a range
 */
export function getOverlappingHighlights(
  highlights: TextHighlight[],
  start: number,
  end: number
): TextHighlight[] {
  return highlights.filter((h) =>
    rangesOverlap(h.startOffset, h.endOffset, start, end)
  );
}

/**
 * Merge overlapping highlights (for rendering)
 */
export function mergeOverlappingHighlights(
  highlights: TextHighlight[]
): { start: number; end: number; colors: TextHighlightColor[] }[] {
  if (highlights.length === 0) return [];

  // Sort by start offset
  const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

  const merged: { start: number; end: number; colors: TextHighlightColor[] }[] =
    [];

  for (const highlight of sorted) {
    const last = merged[merged.length - 1];

    if (
      last &&
      rangesOverlap(
        last.start,
        last.end,
        highlight.startOffset,
        highlight.endOffset
      )
    ) {
      // Extend the range and add color
      last.end = Math.max(last.end, highlight.endOffset);
      if (!last.colors.includes(highlight.color)) {
        last.colors.push(highlight.color);
      }
    } else {
      merged.push({
        start: highlight.startOffset,
        end: highlight.endOffset,
        colors: [highlight.color],
      });
    }
  }

  return merged;
}
