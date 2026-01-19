/**
 * Types and utilities for annotation export (MD, PDF)
 */

import type {
  Annotation,
  AnnotationType,
  HighlightColor,
} from "./annotationTypes";
import { isHighlight, isNote, isBookmark, colorToHex } from "./annotationTypes";

// =============================================================================
// EXPORT FORMAT TYPES
// =============================================================================

/**
 * Supported export formats
 */
export type ExportFormat = "markdown" | "pdf";

/**
 * Export filter options
 */
export interface ExportFilters {
  /** Filter by annotation types */
  types?: AnnotationType[];
  /** Include only public annotations */
  publicOnly?: boolean;
  /** Filter by highlight colors */
  colors?: HighlightColor[];
  /** Include context (surrounding text) */
  includeContext?: boolean;
  /** Maximum context length per annotation */
  contextLength?: number;
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Export format */
  format: ExportFormat;
  /** Book title for header */
  bookTitle: string;
  /** Book author for header */
  bookAuthor?: string;
  /** Export filters */
  filters?: ExportFilters;
  /** Include table of contents */
  includeToc?: boolean;
  /** Include statistics summary */
  includeStats?: boolean;
  /** Date format for timestamps */
  dateFormat?: "short" | "long" | "iso";
}

/**
 * Annotation with context for export
 */
export type AnnotationWithContext = Annotation & {
  /** Surrounding context text */
  context?: string;
  /** Chapter/section title if available */
  chapterTitle?: string;
};

/**
 * Export result
 */
export interface ExportResult {
  /** Success status */
  success: boolean;
  /** Generated content (for markdown) */
  content?: string;
  /** Blob (for PDF) */
  blob?: Blob;
  /** Filename suggestion */
  filename: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Export statistics
 */
export interface ExportStats {
  totalAnnotations: number;
  highlights: number;
  notes: number;
  bookmarks: number;
  withNotes: number;
  publicAnnotations: number;
  exportDate: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: Omit<
  ExportOptions,
  "format" | "bookTitle"
> = {
  includeToc: true,
  includeStats: true,
  dateFormat: "long",
  filters: {
    includeContext: true,
    contextLength: 100,
  },
};

/**
 * Date format options for export
 */
export const DATE_FORMATS = {
  short: { year: "numeric", month: "2-digit", day: "2-digit" },
  long: { year: "numeric", month: "long", day: "numeric" },
  iso: undefined, // Use toISOString
} as const;

/**
 * PDF page dimensions (in mm for jsPDF)
 */
export const PDF_PAGE = {
  width: 210, // A4 width
  height: 297, // A4 height
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 20,
  marginRight: 20,
  lineHeight: 7,
  titleFontSize: 18,
  headingFontSize: 14,
  bodyFontSize: 11,
  smallFontSize: 9,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format date for export
 */
export function formatExportDate(
  dateString: string,
  format: ExportOptions["dateFormat"] = "long"
): string {
  const date = new Date(dateString);
  const fmt = format ?? "long";
  if (fmt === "iso") {
    return date.toISOString().split("T")[0] ?? "";
  }
  const options = DATE_FORMATS[fmt];
  return date.toLocaleDateString("en-US", options);
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  bookTitle: string,
  format: ExportFormat
): string {
  const sanitized = bookTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const date = new Date().toISOString().split("T")[0];
  const extension = format === "markdown" ? "md" : "pdf";
  return `${sanitized}-annotations-${date}.${extension}`;
}

/**
 * Calculate export statistics
 */
export function calculateExportStats(annotations: Annotation[]): ExportStats {
  let highlights = 0;
  let notes = 0;
  let bookmarks = 0;
  let withNotes = 0;
  let publicAnnotations = 0;

  for (const annotation of annotations) {
    if (isHighlight(annotation)) highlights++;
    else if (isNote(annotation)) notes++;
    else if (isBookmark(annotation)) bookmarks++;

    if (annotation.note?.trim()) withNotes++;
    if (annotation.isPublic) publicAnnotations++;
  }

  return {
    totalAnnotations: annotations.length,
    highlights,
    notes,
    bookmarks,
    withNotes,
    publicAnnotations,
    exportDate: new Date().toISOString(),
  };
}

/**
 * Filter annotations for export
 */
export function filterAnnotationsForExport(
  annotations: Annotation[],
  filters?: ExportFilters
): Annotation[] {
  if (!filters) return annotations;

  return annotations.filter((annotation) => {
    // Filter by type
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(annotation.type)) {
        return false;
      }
    }

    // Filter by public only
    if (filters.publicOnly && !annotation.isPublic) {
      return false;
    }

    // Filter by highlight colors (only applies to highlights)
    if (filters.colors && filters.colors.length > 0) {
      // If color filter is specified, only keep highlights with matching colors
      if (!isHighlight(annotation)) {
        return false;
      }
      if (!filters.colors.includes(annotation.color)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort annotations by position for export
 */
export function sortAnnotationsForExport(
  annotations: Annotation[]
): Annotation[] {
  return [...annotations].sort((a, b) => a.startOffset - b.startOffset);
}

/**
 * Get annotation type label for export
 */
export function getExportTypeLabel(type: AnnotationType): string {
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
 * Get highlight color display name
 */
export function getColorDisplayName(color: HighlightColor): string {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Escape markdown special characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, "\\$1");
}

/**
 * Wrap text for PDF at specified width
 */
export function wrapTextForPdf(
  text: string,
  maxCharsPerLine: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

// =============================================================================
// MARKDOWN EXPORT FUNCTIONS
// =============================================================================

/**
 * Generate markdown header
 */
export function generateMarkdownHeader(options: ExportOptions): string {
  const lines: string[] = [];

  lines.push(`# ${options.bookTitle}`);
  if (options.bookAuthor) {
    lines.push(`**Author:** ${options.bookAuthor}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate markdown statistics section
 */
export function generateMarkdownStats(stats: ExportStats): string {
  const lines: string[] = [];

  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total Annotations:** ${stats.totalAnnotations}`);
  lines.push(`- **Highlights:** ${stats.highlights}`);
  lines.push(`- **Notes:** ${stats.notes}`);
  lines.push(`- **Bookmarks:** ${stats.bookmarks}`);
  lines.push(`- **Exported:** ${formatExportDate(stats.exportDate, "long")}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate markdown table of contents
 */
export function generateMarkdownToc(annotations: Annotation[]): string {
  const lines: string[] = [];
  const highlights = annotations.filter(isHighlight);
  const notes = annotations.filter(isNote);
  const bookmarks = annotations.filter(isBookmark);

  lines.push("## Table of Contents");
  lines.push("");

  if (highlights.length > 0) {
    lines.push(`- [Highlights](#highlights) (${highlights.length})`);
  }
  if (notes.length > 0) {
    lines.push(`- [Notes](#notes) (${notes.length})`);
  }
  if (bookmarks.length > 0) {
    lines.push(`- [Bookmarks](#bookmarks) (${bookmarks.length})`);
  }

  lines.push("");
  lines.push("---");
  lines.push("");

  return lines.join("\n");
}

/**
 * Format a single annotation as markdown
 */
export function formatAnnotationAsMarkdown(
  annotation: Annotation,
  options: ExportOptions,
  index: number
): string {
  const lines: string[] = [];
  const dateStr = formatExportDate(annotation.createdAt, options.dateFormat);

  if (isHighlight(annotation)) {
    lines.push(`### ${index}. Highlight`);
    lines.push("");
    lines.push(`> ${escapeMarkdown(annotation.selectedText)}`);
    lines.push("");
    lines.push(
      `**Color:** ${getColorDisplayName(annotation.color)} | **Date:** ${dateStr}`
    );
    if (annotation.note) {
      lines.push("");
      lines.push(`**Note:** ${annotation.note}`);
    }
  } else if (isNote(annotation)) {
    lines.push(`### ${index}. Note`);
    lines.push("");
    lines.push(annotation.note);
    if (annotation.selectedText) {
      lines.push("");
      lines.push(`> *${escapeMarkdown(annotation.selectedText)}*`);
    }
    lines.push("");
    lines.push(`**Date:** ${dateStr}`);
  } else if (isBookmark(annotation)) {
    lines.push(`### ${index}. Bookmark`);
    lines.push("");
    lines.push(
      `**Position:** ${annotation.startOffset} | **Date:** ${dateStr}`
    );
    if (annotation.note) {
      lines.push("");
      lines.push(`**Note:** ${annotation.note}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Generate complete markdown export
 */
export function generateMarkdownExport(
  annotations: Annotation[],
  options: ExportOptions
): string {
  const filtered = filterAnnotationsForExport(annotations, options.filters);
  const sorted = sortAnnotationsForExport(filtered);
  const stats = calculateExportStats(sorted);

  const parts: string[] = [];

  // Header
  parts.push(generateMarkdownHeader(options));

  // Statistics
  if (options.includeStats !== false) {
    parts.push(generateMarkdownStats(stats));
  }

  // Table of Contents
  if (options.includeToc !== false) {
    parts.push(generateMarkdownToc(sorted));
  }

  // Group by type
  const highlights = sorted.filter(isHighlight);
  const notes = sorted.filter(isNote);
  const bookmarks = sorted.filter(isBookmark);

  // Highlights section
  if (highlights.length > 0) {
    parts.push("## Highlights\n\n");
    highlights.forEach((annotation, idx) => {
      parts.push(formatAnnotationAsMarkdown(annotation, options, idx + 1));
    });
    parts.push("---\n\n");
  }

  // Notes section
  if (notes.length > 0) {
    parts.push("## Notes\n\n");
    notes.forEach((annotation, idx) => {
      parts.push(formatAnnotationAsMarkdown(annotation, options, idx + 1));
    });
    parts.push("---\n\n");
  }

  // Bookmarks section
  if (bookmarks.length > 0) {
    parts.push("## Bookmarks\n\n");
    bookmarks.forEach((annotation, idx) => {
      parts.push(formatAnnotationAsMarkdown(annotation, options, idx + 1));
    });
  }

  // Footer
  parts.push("\n---\n");
  parts.push(
    `*Exported from Read Master on ${formatExportDate(new Date().toISOString(), "long")}*`
  );

  return parts.join("");
}

// =============================================================================
// PDF EXPORT FUNCTIONS
// =============================================================================

/**
 * Calculate usable width for PDF content
 */
export function getPdfContentWidth(): number {
  return PDF_PAGE.width - PDF_PAGE.marginLeft - PDF_PAGE.marginRight;
}

/**
 * Estimate characters per line for PDF based on font size
 */
export function getCharsPerLine(fontSize: number): number {
  // Rough estimate: character width ≈ fontSize * 0.6 for average font
  const charWidth = fontSize * 0.5;
  return Math.floor(getPdfContentWidth() / charWidth);
}

/**
 * Create PDF document (returns jsPDF options)
 * Note: Actual jsPDF instantiation happens in the component
 */
export interface PdfGenerationOptions {
  orientation: "portrait" | "landscape";
  unit: "mm";
  format: "a4";
  title: string;
  author?: string;
}

/**
 * Get PDF generation options
 */
export function getPdfGenerationOptions(
  options: ExportOptions
): PdfGenerationOptions {
  const result: PdfGenerationOptions = {
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    title: options.bookTitle,
  };
  if (options.bookAuthor) {
    result.author = options.bookAuthor;
  }
  return result;
}

/**
 * Format annotation data for PDF rendering
 * Returns a structured object that can be used by jsPDF
 */
export interface PdfAnnotationBlock {
  type: AnnotationType;
  typeLabel: string;
  index: number;
  content: string;
  note?: string;
  selectedText?: string;
  color?: string;
  colorName?: string;
  date: string;
  position?: number;
}

/**
 * Format annotation for PDF rendering
 */
export function formatAnnotationForPdf(
  annotation: Annotation,
  options: ExportOptions,
  index: number
): PdfAnnotationBlock {
  const dateStr = formatExportDate(annotation.createdAt, options.dateFormat);

  const block: PdfAnnotationBlock = {
    type: annotation.type,
    typeLabel: getExportTypeLabel(annotation.type),
    index,
    content: "",
    date: dateStr,
  };

  if (isHighlight(annotation)) {
    block.content = annotation.selectedText;
    block.color = colorToHex(annotation.color);
    block.colorName = getColorDisplayName(annotation.color);
    block.selectedText = annotation.selectedText;
    if (annotation.note) {
      block.note = annotation.note;
    }
  } else if (isNote(annotation)) {
    block.content = annotation.note;
    block.note = annotation.note;
    if (annotation.selectedText) {
      block.selectedText = annotation.selectedText;
    }
  } else if (isBookmark(annotation)) {
    block.position = annotation.startOffset;
    block.content = annotation.note ?? `Position: ${annotation.startOffset}`;
    if (annotation.note) {
      block.note = annotation.note;
    }
  }

  return block;
}

/**
 * Prepare all annotations for PDF export
 */
export function prepareAnnotationsForPdf(
  annotations: Annotation[],
  options: ExportOptions
): {
  highlights: PdfAnnotationBlock[];
  notes: PdfAnnotationBlock[];
  bookmarks: PdfAnnotationBlock[];
  stats: ExportStats;
} {
  const filtered = filterAnnotationsForExport(annotations, options.filters);
  const sorted = sortAnnotationsForExport(filtered);
  const stats = calculateExportStats(sorted);

  const highlights: PdfAnnotationBlock[] = [];
  const notes: PdfAnnotationBlock[] = [];
  const bookmarks: PdfAnnotationBlock[] = [];

  let highlightIdx = 0;
  let noteIdx = 0;
  let bookmarkIdx = 0;

  for (const annotation of sorted) {
    if (isHighlight(annotation)) {
      highlights.push(
        formatAnnotationForPdf(annotation, options, ++highlightIdx)
      );
    } else if (isNote(annotation)) {
      notes.push(formatAnnotationForPdf(annotation, options, ++noteIdx));
    } else if (isBookmark(annotation)) {
      bookmarks.push(
        formatAnnotationForPdf(annotation, options, ++bookmarkIdx)
      );
    }
  }

  return { highlights, notes, bookmarks, stats };
}

// =============================================================================
// DOWNLOAD UTILITIES
// =============================================================================

/**
 * Download markdown as file
 */
export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, filename);
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate export options
 */
export function validateExportOptions(options: ExportOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options.bookTitle || options.bookTitle.trim().length === 0) {
    return { valid: false, error: "Book title is required" };
  }

  if (!["markdown", "pdf"].includes(options.format)) {
    return { valid: false, error: "Invalid export format" };
  }

  return { valid: true };
}
