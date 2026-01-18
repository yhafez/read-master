/**
 * Types for the EPUB reader component
 */

/**
 * EPUB location information (CFI-based)
 */
export interface EpubLocation {
  /** Current CFI (Canonical Fragment Identifier) */
  cfi: string;
  /** Current position/percentage (0-1) */
  percentage: number;
  /** Current chapter/section index */
  chapter: number;
  /** Total number of pages (estimated) */
  totalPages: number;
  /** Current page number (estimated) */
  currentPage: number;
}

/**
 * EPUB table of contents item
 */
export interface TocItem {
  /** Unique ID of the TOC item */
  id: string;
  /** Display label */
  label: string;
  /** HREF reference in the EPUB */
  href: string;
  /** Subitems (nested chapters) */
  subitems: TocItem[];
}

/**
 * Text selection information
 */
export interface TextSelection {
  /** Selected text content */
  text: string;
  /** CFI of selection start */
  cfiRange: string;
  /** Display position for toolbar/popover */
  position: {
    x: number;
    y: number;
  };
}

/**
 * EPUB reader state
 */
export interface EpubReaderState {
  /** Whether the book is loaded */
  isLoaded: boolean;
  /** Whether there was an error loading */
  hasError: boolean;
  /** Error message if any */
  errorMessage: string | null;
  /** Current location */
  location: EpubLocation | null;
  /** Table of contents */
  toc: TocItem[];
  /** Current text selection */
  selection: TextSelection | null;
  /** Whether navigation is possible */
  canGoNext: boolean;
  /** Whether navigation is possible */
  canGoPrev: boolean;
}

/**
 * Initial reader state
 */
export const INITIAL_READER_STATE: EpubReaderState = {
  isLoaded: false,
  hasError: false,
  errorMessage: null,
  location: null,
  toc: [],
  selection: null,
  canGoNext: false,
  canGoPrev: false,
};

/**
 * Props for the EpubReader component
 */
export interface EpubReaderProps {
  /** URL to the EPUB file */
  url: string;
  /** Initial CFI location to restore */
  initialCfi?: string | undefined;
  /** Callback when location changes */
  onLocationChange?: ((location: EpubLocation) => void) | undefined;
  /** Callback when text is selected */
  onTextSelect?: ((selection: TextSelection) => void) | undefined;
  /** Callback when an error occurs */
  onError?: ((error: Error) => void) | undefined;
  /** Callback when book is loaded */
  onLoad?: ((toc: TocItem[]) => void) | undefined;
}

/**
 * Reader error types
 */
export type ReaderErrorType =
  | "load_failed"
  | "render_failed"
  | "navigation_failed"
  | "invalid_url"
  | "unsupported_format";

/**
 * Create a reader error
 */
export function createReaderError(
  type: ReaderErrorType,
  message: string
): Error {
  const error = new Error(message);
  error.name = type;
  return error;
}

/**
 * Parse error to user-friendly message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.name) {
      case "load_failed":
        return "Failed to load the book. Please try again.";
      case "render_failed":
        return "Failed to render the book content.";
      case "navigation_failed":
        return "Failed to navigate to the requested location.";
      case "invalid_url":
        return "Invalid book URL provided.";
      case "unsupported_format":
        return "This file format is not supported.";
      default:
        return error.message || "An unknown error occurred.";
    }
  }
  return "An unknown error occurred.";
}

/**
 * Validate an EPUB URL
 */
export function validateEpubUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    // Try to get base URL, falling back to a dummy origin for testing
    const baseUrl =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://localhost";

    const parsed = new URL(url, baseUrl);
    // Accept http, https, or blob URLs
    return ["http:", "https:", "blob:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Default theme styles for the EPUB rendition
 */
export const DEFAULT_EPUB_STYLES = {
  body: {
    "font-family": "inherit",
    "line-height": "1.6",
    padding: "20px",
  },
  p: {
    "margin-bottom": "1em",
  },
  h1: {
    "margin-top": "1em",
    "margin-bottom": "0.5em",
  },
  h2: {
    "margin-top": "1em",
    "margin-bottom": "0.5em",
  },
  h3: {
    "margin-top": "1em",
    "margin-bottom": "0.5em",
  },
} as const;
