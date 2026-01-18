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
