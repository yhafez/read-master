/**
 * Types for the PDF reader component
 */

/**
 * PDF location information
 */
export interface PdfLocation {
  /** Current page number (1-indexed) */
  pageNumber: number;
  /** Total number of pages */
  totalPages: number;
  /** Current position as percentage (0-1) */
  percentage: number;
}

/**
 * PDF text selection information
 */
export interface PdfTextSelection {
  /** Selected text content */
  text: string;
  /** Page number where selection occurred */
  pageNumber: number;
  /** Display position for toolbar/popover */
  position: {
    x: number;
    y: number;
  };
}

/**
 * PDF reader state
 */
export interface PdfReaderState {
  /** Whether the document is loaded */
  isLoaded: boolean;
  /** Whether there was an error loading */
  hasError: boolean;
  /** Error message if any */
  errorMessage: string | null;
  /** Current location */
  location: PdfLocation | null;
  /** Current text selection */
  selection: PdfTextSelection | null;
  /** Current zoom level (1.0 = 100%) */
  scale: number;
  /** Whether navigation is possible */
  canGoNext: boolean;
  /** Whether navigation is possible */
  canGoPrev: boolean;
}

/**
 * Initial PDF reader state
 */
export const INITIAL_PDF_READER_STATE: PdfReaderState = {
  isLoaded: false,
  hasError: false,
  errorMessage: null,
  location: null,
  selection: null,
  scale: 1.0,
  canGoNext: false,
  canGoPrev: false,
};

/**
 * Props for the PdfReader component
 */
export interface PdfReaderProps {
  /** URL to the PDF file */
  url: string;
  /** Initial page number to display (1-indexed) */
  initialPage?: number | undefined;
  /** Initial zoom level (1.0 = 100%) */
  initialScale?: number | undefined;
  /** Callback when location changes */
  onLocationChange?: ((location: PdfLocation) => void) | undefined;
  /** Callback when text is selected */
  onTextSelect?: ((selection: PdfTextSelection) => void) | undefined;
  /** Callback when an error occurs */
  onError?: ((error: Error) => void) | undefined;
  /** Callback when document is loaded */
  onLoad?: ((totalPages: number) => void) | undefined;
}

/**
 * PDF error types
 */
export type PdfErrorType =
  | "load_failed"
  | "render_failed"
  | "navigation_failed"
  | "invalid_url"
  | "password_required"
  | "corrupted_file";

/**
 * Create a PDF reader error
 */
export function createPdfError(type: PdfErrorType, message: string): Error {
  const error = new Error(message);
  error.name = type;
  return error;
}

/**
 * Parse PDF error to user-friendly message
 */
export function getPdfErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.name) {
      case "load_failed":
        return "Failed to load the PDF. Please try again.";
      case "render_failed":
        return "Failed to render the PDF page.";
      case "navigation_failed":
        return "Failed to navigate to the requested page.";
      case "invalid_url":
        return "Invalid PDF URL provided.";
      case "password_required":
        return "This PDF is password protected.";
      case "corrupted_file":
        return "The PDF file appears to be corrupted.";
      default:
        // Check for PDF.js specific errors
        if (error.message?.includes("password")) {
          return "This PDF is password protected.";
        }
        if (error.message?.includes("Invalid PDF")) {
          return "The PDF file appears to be invalid or corrupted.";
        }
        return error.message || "An unknown error occurred.";
    }
  }
  return "An unknown error occurred.";
}

/**
 * Validate a PDF URL
 */
export function validatePdfUrl(url: string): boolean {
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
 * Zoom level presets
 */
export const ZOOM_PRESETS = {
  FIT_PAGE: "fit-page",
  FIT_WIDTH: "fit-width",
  ACTUAL_SIZE: 1.0,
  ZOOM_50: 0.5,
  ZOOM_75: 0.75,
  ZOOM_100: 1.0,
  ZOOM_125: 1.25,
  ZOOM_150: 1.5,
  ZOOM_200: 2.0,
} as const;

/**
 * Minimum zoom level
 */
export const MIN_ZOOM = 0.25;

/**
 * Maximum zoom level
 */
export const MAX_ZOOM = 4.0;

/**
 * Zoom step for increment/decrement
 */
export const ZOOM_STEP = 0.25;

/**
 * Clamp zoom level to valid range
 */
export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/**
 * Calculate zoom level for "fit width" mode
 */
export function calculateFitWidthZoom(
  pageWidth: number,
  containerWidth: number,
  padding: number = 40
): number {
  const availableWidth = containerWidth - padding;
  if (availableWidth <= 0 || pageWidth <= 0) {
    return 1.0;
  }
  return clampZoom(availableWidth / pageWidth);
}

/**
 * Calculate zoom level for "fit page" mode
 */
export function calculateFitPageZoom(
  pageWidth: number,
  pageHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding: number = 40
): number {
  const availableWidth = containerWidth - padding;
  const availableHeight = containerHeight - padding;

  if (
    availableWidth <= 0 ||
    availableHeight <= 0 ||
    pageWidth <= 0 ||
    pageHeight <= 0
  ) {
    return 1.0;
  }

  const widthRatio = availableWidth / pageWidth;
  const heightRatio = availableHeight / pageHeight;

  return clampZoom(Math.min(widthRatio, heightRatio));
}

/**
 * Format zoom level as percentage string
 */
export function formatZoomPercent(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}
