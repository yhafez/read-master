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

// Annotation Types and Utilities
export type {
  AnnotationType,
  HighlightColor,
  AnnotationBase,
  HighlightAnnotation,
  NoteAnnotation,
  BookmarkAnnotation,
  Annotation,
  SelectionPosition,
  TextSelectionInfo,
  AnnotationAction,
  CreateAnnotationInput,
  UpdateAnnotationInput,
  AnnotationFilters,
  AnnotationSortField,
  AnnotationSortDirection,
  AnnotationSort,
  AnnotationViewMode,
} from "./annotationTypes";
export {
  HIGHLIGHT_COLOR_VALUES,
  DEFAULT_HIGHLIGHT_COLOR,
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
} from "./annotationTypes";

// Annotation UI Components
export { AnnotationToolbar, useSelectionAnchor } from "./AnnotationToolbar";
export type { AnnotationToolbarProps } from "./AnnotationToolbar";
export { NoteEditorDialog } from "./NoteEditorDialog";
export type { NoteEditorDialogProps } from "./NoteEditorDialog";
export { AnnotationSidebar } from "./AnnotationSidebar";
export type { AnnotationSidebarProps } from "./AnnotationSidebar";

// Annotation Export Types and Utilities
export type {
  ExportFormat,
  ExportFilters,
  ExportOptions,
  AnnotationWithContext,
  ExportResult,
  ExportStats,
  PdfGenerationOptions,
  PdfAnnotationBlock,
} from "./annotationExportTypes";
export {
  DEFAULT_EXPORT_OPTIONS,
  DATE_FORMATS,
  PDF_PAGE,
  formatExportDate,
  generateExportFilename,
  calculateExportStats,
  filterAnnotationsForExport,
  sortAnnotationsForExport,
  getExportTypeLabel,
  getColorDisplayName,
  truncateText,
  escapeMarkdown,
  wrapTextForPdf,
  generateMarkdownHeader,
  generateMarkdownStats,
  generateMarkdownToc,
  formatAnnotationAsMarkdown,
  generateMarkdownExport,
  getPdfContentWidth,
  getCharsPerLine,
  getPdfGenerationOptions,
  formatAnnotationForPdf,
  prepareAnnotationsForPdf,
  downloadMarkdown,
  downloadBlob,
  validateExportOptions,
} from "./annotationExportTypes";

// Annotation Export Dialog
export { AnnotationExportDialog } from "./AnnotationExportDialog";
export type { AnnotationExportDialogProps } from "./AnnotationExportDialog";
