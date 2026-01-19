/**
 * Reader components exports
 */

// EPUB Reader
export { EpubReader } from "./EpubReader";
export type {
  EpubReaderProps,
  EpubReaderState,
  EpubLocation,
  TocItem,
  TextSelection,
  ReaderErrorType,
} from "./types";
export {
  INITIAL_READER_STATE,
  DEFAULT_EPUB_STYLES,
  createReaderError,
  getErrorMessage,
  validateEpubUrl,
} from "./types";

// PDF Reader
export { PdfReader } from "./PdfReader";
export type {
  PdfReaderProps,
  PdfReaderState,
  PdfLocation,
  PdfTextSelection,
  PdfErrorType,
} from "./pdfTypes";
export {
  INITIAL_PDF_READER_STATE,
  ZOOM_PRESETS,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  createPdfError,
  getPdfErrorMessage,
  validatePdfUrl,
  clampZoom,
  calculateFitWidthZoom,
  calculateFitPageZoom,
  formatZoomPercent,
} from "./pdfTypes";

// Text Reader
export { TextReader } from "./TextReader";
export type {
  TextReaderProps,
  TextReaderState,
  TextLocation,
  TextReaderSelection,
  TextHighlight,
  TextHighlightColor,
  TextContentType,
  TextReaderErrorType,
} from "./textTypes";
export {
  INITIAL_TEXT_READER_STATE,
  CHARS_PER_PAGE,
  SCROLL_AMOUNT,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  FONT_SIZE_STEP,
  HIGHLIGHT_COLORS,
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

// Progress Tracker
export { ProgressTracker } from "./ProgressTracker";
export type {
  ProgressTrackerProps,
  ProgressData,
  ProgressDisplayMode,
  ProgressBarSegment,
  ReadingSession,
  TimeDisplayFormat,
} from "./progressTypes";
export {
  DEFAULT_WPM,
  MIN_WPM_THRESHOLD,
  MAX_WPM_THRESHOLD,
  MIN_TIME_FOR_WPM,
  READING_PAUSE_THRESHOLD,
  TIME_UNITS,
  DISPLAY_MODE_DEFAULTS,
  calculatePercentage,
  calculateWpm,
  estimateTimeRemaining,
  formatDuration,
  formatPercentage,
  formatWpm,
  calculateWordsRead,
  calculateProgressData,
  isReadingActive,
  createReadingSession,
  updateReadingSession,
  getDisplaySettings,
  createProgressSegments,
  validateProgressProps,
} from "./progressTypes";
