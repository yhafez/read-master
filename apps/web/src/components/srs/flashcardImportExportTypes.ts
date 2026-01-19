/**
 * Flashcard Import/Export Types
 *
 * Type definitions and utility functions for importing/exporting flashcards
 * in CSV format. Supports parsing, validation, and generation of CSV files.
 */

import type { FlashcardStatus, FlashcardType } from "./flashcardDeckTypes";

// =============================================================================
// CSV STRUCTURE TYPES
// =============================================================================

/**
 * CSV column headers (in order)
 */
export const CSV_HEADERS = ["front", "back", "type", "tags", "book"] as const;

export type CSVHeader = (typeof CSV_HEADERS)[number];

/**
 * CSV row data structure (for import)
 */
export type CSVRow = {
  /** Front side content (question) - required */
  front: string;
  /** Back side content (answer) - required */
  back: string;
  /** Card type - optional, defaults to CUSTOM */
  type: string;
  /** Comma-separated tags - optional */
  tags: string;
  /** Book title or ID - optional */
  book: string;
};

/**
 * Validated import card ready for creation
 */
export type ValidatedImportCard = {
  /** Front side content */
  front: string;
  /** Back side content */
  back: string;
  /** Validated card type */
  type: FlashcardType;
  /** Array of tags */
  tags: string[];
  /** Book ID if matched, null otherwise */
  bookId: string | null;
  /** Original book value from CSV (for display) */
  bookOriginal: string | null;
};

/**
 * Import card with validation result
 */
export type ImportCardResult = {
  /** Row number (1-indexed) */
  rowNumber: number;
  /** Whether the row is valid */
  isValid: boolean;
  /** Validation errors if any */
  errors: string[];
  /** Warnings (non-fatal issues) */
  warnings: string[];
  /** Validated card data (null if invalid) */
  card: ValidatedImportCard | null;
  /** Original row data */
  original: CSVRow;
};

/**
 * Import result summary
 */
export type ImportResult = {
  /** Total rows processed */
  totalRows: number;
  /** Valid rows count */
  validCount: number;
  /** Invalid rows count */
  invalidCount: number;
  /** Rows with warnings count */
  warningCount: number;
  /** All processed rows */
  rows: ImportCardResult[];
  /** Whether import can proceed (has at least one valid row) */
  canImport: boolean;
};

// =============================================================================
// EXPORT TYPES
// =============================================================================

/**
 * Card data for export
 */
export type ExportCard = {
  /** Front side content */
  front: string;
  /** Back side content */
  back: string;
  /** Card type */
  type: FlashcardType;
  /** Card status */
  status: FlashcardStatus;
  /** Tags */
  tags: string[];
  /** Book title if any */
  bookTitle: string | null;
  /** Ease factor */
  easeFactor: number;
  /** Interval in days */
  interval: number;
  /** Due date ISO string */
  dueDate: string;
  /** Created date ISO string */
  createdAt: string;
};

/**
 * Export options
 */
export type ExportOptions = {
  /** Include card statistics (ease, interval, due date) */
  includeStats: boolean;
  /** Include status column */
  includeStatus: boolean;
  /** Include created date */
  includeCreatedAt: boolean;
  /** CSV delimiter */
  delimiter: "," | ";" | "\t";
  /** Quote character */
  quoteChar: '"' | "'";
};

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeStats: false,
  includeStatus: false,
  includeCreatedAt: false,
  delimiter: ",",
  quoteChar: '"',
};

// =============================================================================
// IMPORT DIALOG TYPES
// =============================================================================

/**
 * Import dialog step
 */
export type ImportStep = "upload" | "preview" | "confirm";

/**
 * Import state
 */
export type ImportState = {
  /** Current step */
  step: ImportStep;
  /** Selected file */
  file: File | null;
  /** Raw file content */
  rawContent: string | null;
  /** Parsed and validated result */
  result: ImportResult | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Selected valid rows for import (indices) */
  selectedRows: Set<number>;
};

/**
 * Initial import state
 */
export const INITIAL_IMPORT_STATE: ImportState = {
  step: "upload",
  file: null,
  rawContent: null,
  result: null,
  isLoading: false,
  error: null,
  selectedRows: new Set(),
};

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for ImportExportFlashcardsDialog
 */
export type ImportExportFlashcardsDialogProps = {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Initial mode (import or export) */
  initialMode?: "import" | "export";
  /** Available books for matching imports */
  books?: Array<{ id: string; title: string }>;
  /** Cards to export (for export mode) */
  cardsToExport?: ExportCard[];
  /** Callback after successful import */
  onImportSuccess?: (count: number) => void;
  /** Callback after successful export */
  onExportSuccess?: () => void;
};

// =============================================================================
// VALIDATION CONSTANTS (Import-specific, more lenient than creation)
// =============================================================================

/**
 * Minimum front content length for import
 */
export const IMPORT_MIN_FRONT_LENGTH = 1;

/**
 * Maximum front content length for import (more lenient than creation)
 */
export const IMPORT_MAX_FRONT_LENGTH = 1000;

/**
 * Minimum back content length for import
 */
export const IMPORT_MIN_BACK_LENGTH = 1;

/**
 * Maximum back content length for import (more lenient than creation)
 */
export const IMPORT_MAX_BACK_LENGTH = 5000;

/**
 * Maximum tags per card for import
 */
export const IMPORT_MAX_TAGS_PER_CARD = 10;

/**
 * Maximum tag length for import
 */
export const IMPORT_MAX_TAG_LENGTH = 50;

/**
 * Maximum rows per import
 */
export const MAX_IMPORT_ROWS = 1000;

/**
 * Valid flashcard types (uppercase)
 */
export const VALID_TYPES: FlashcardType[] = [
  "VOCABULARY",
  "CONCEPT",
  "COMPREHENSION",
  "QUOTE",
  "CUSTOM",
];

/**
 * Type aliases for CSV (case-insensitive matching)
 */
export const TYPE_ALIASES: Record<string, FlashcardType> = {
  vocabulary: "VOCABULARY",
  vocab: "VOCABULARY",
  word: "VOCABULARY",
  concept: "CONCEPT",
  idea: "CONCEPT",
  comprehension: "COMPREHENSION",
  understanding: "COMPREHENSION",
  quote: "QUOTE",
  passage: "QUOTE",
  custom: "CUSTOM",
  other: "CUSTOM",
  "": "CUSTOM",
};

// =============================================================================
// UTILITY FUNCTIONS - CSV PARSING
// =============================================================================

/**
 * Escape a value for CSV output
 */
export function escapeCSVValue(
  value: string,
  delimiter: string = ",",
  quoteChar: string = '"'
): string {
  if (!value) return "";

  // Check if quoting is needed
  const needsQuoting =
    value.includes(delimiter) ||
    value.includes(quoteChar) ||
    value.includes("\n") ||
    value.includes("\r");

  if (!needsQuoting) return value;

  // Escape quote characters by doubling them
  const escaped = value.replace(
    new RegExp(quoteChar, "g"),
    quoteChar + quoteChar
  );
  return quoteChar + escaped + quoteChar;
}

/**
 * Unescape a CSV value
 */
export function unescapeCSVValue(
  value: string,
  quoteChar: string = '"'
): string {
  if (!value) return "";

  let result = value.trim();

  // Remove surrounding quotes if present
  if (
    result.length >= 2 &&
    result.startsWith(quoteChar) &&
    result.endsWith(quoteChar)
  ) {
    result = result.slice(1, -1);
  }

  // Unescape doubled quote characters
  return result.replace(new RegExp(quoteChar + quoteChar, "g"), quoteChar);
}

/**
 * Parse a single CSV line into fields, handling quoted values
 */
export function parseCSVLine(
  line: string,
  delimiter: string = ",",
  quoteChar: string = '"'
): string[] {
  const fields: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === quoteChar) {
        if (nextChar === quoteChar) {
          // Escaped quote
          currentField += quoteChar;
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === quoteChar) {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        // Field separator
        fields.push(currentField.trim());
        currentField = "";
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Add the last field
  fields.push(currentField.trim());

  return fields;
}

/**
 * Detect CSV delimiter from content
 */
export function detectDelimiter(content: string): "," | ";" | "\t" {
  const firstLine = content.split(/\r?\n/)[0] || "";

  // Count occurrences of each delimiter
  const counts = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
  };

  // Return the delimiter with the most occurrences
  if (counts["\t"] > counts[","] && counts["\t"] > counts[";"]) return "\t";
  if (counts[";"] > counts[","]) return ";";
  return ",";
}

/**
 * Parse CSV content into rows
 */
export function parseCSVContent(
  content: string,
  delimiter?: "," | ";" | "\t"
): CSVRow[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length === 0) return [];

  // Detect delimiter if not provided
  const detectedDelimiter = delimiter || detectDelimiter(content);

  // Check if first line is headers
  const firstLineContent = lines[0] ?? "";
  const firstLine = firstLineContent.toLowerCase();
  const hasHeaders =
    firstLine.includes("front") || firstLine.includes("question");
  const dataLines = hasHeaders ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const fields = parseCSVLine(line, detectedDelimiter);

    return {
      front: unescapeCSVValue(fields[0] || ""),
      back: unescapeCSVValue(fields[1] || ""),
      type: unescapeCSVValue(fields[2] || ""),
      tags: unescapeCSVValue(fields[3] || ""),
      book: unescapeCSVValue(fields[4] || ""),
    };
  });
}

// =============================================================================
// UTILITY FUNCTIONS - VALIDATION
// =============================================================================

/**
 * Normalize card type from string input
 */
export function normalizeCardType(input: string): FlashcardType {
  if (!input) return "CUSTOM";

  const normalized = input.toLowerCase().trim();

  // Check aliases first
  const aliasedType = TYPE_ALIASES[normalized];
  if (aliasedType !== undefined) {
    return aliasedType;
  }

  // Check exact match (uppercase)
  const upper = input.toUpperCase().trim();
  if (VALID_TYPES.includes(upper as FlashcardType)) {
    return upper as FlashcardType;
  }

  return "CUSTOM";
}

/**
 * Parse tags from comma-separated string
 */
export function parseTags(input: string): string[] {
  if (!input) return [];

  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0 && tag.length <= IMPORT_MAX_TAG_LENGTH)
    .slice(0, IMPORT_MAX_TAGS_PER_CARD);
}

/**
 * Validate a single import row
 */
export function validateImportRow(
  row: CSVRow,
  rowNumber: number,
  books?: Array<{ id: string; title: string }>
): ImportCardResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate front
  const front = row.front.trim();
  if (!front) {
    errors.push("Front content is required");
  } else if (front.length < IMPORT_MIN_FRONT_LENGTH) {
    errors.push(`Front must be at least ${IMPORT_MIN_FRONT_LENGTH} character`);
  } else if (front.length > IMPORT_MAX_FRONT_LENGTH) {
    errors.push(`Front cannot exceed ${IMPORT_MAX_FRONT_LENGTH} characters`);
  }

  // Validate back
  const back = row.back.trim();
  if (!back) {
    errors.push("Back content is required");
  } else if (back.length < IMPORT_MIN_BACK_LENGTH) {
    errors.push(`Back must be at least ${IMPORT_MIN_BACK_LENGTH} character`);
  } else if (back.length > IMPORT_MAX_BACK_LENGTH) {
    errors.push(`Back cannot exceed ${IMPORT_MAX_BACK_LENGTH} characters`);
  }

  // Validate type (just warn if unknown)
  const normalizedType = normalizeCardType(row.type);
  if (
    row.type &&
    row.type.toUpperCase() !== normalizedType &&
    !TYPE_ALIASES[row.type.toLowerCase()]
  ) {
    warnings.push(`Unknown type "${row.type}", using CUSTOM`);
  }

  // Parse tags
  const tags = parseTags(row.tags);
  if (row.tags && tags.length === 0) {
    warnings.push("No valid tags found");
  }

  // Match book
  let bookId: string | null = null;
  const bookOriginal = row.book.trim() || null;

  if (bookOriginal && books) {
    const match = books.find(
      (b) =>
        b.title.toLowerCase() === bookOriginal.toLowerCase() ||
        b.id === bookOriginal
    );
    if (match) {
      bookId = match.id;
    } else {
      warnings.push(`Book "${bookOriginal}" not found`);
    }
  }

  const isValid = errors.length === 0;

  return {
    rowNumber,
    isValid,
    errors,
    warnings,
    card: isValid
      ? {
          front,
          back,
          type: normalizedType,
          tags,
          bookId,
          bookOriginal,
        }
      : null,
    original: row,
  };
}

/**
 * Validate all import rows
 */
export function validateImport(
  rows: CSVRow[],
  books?: Array<{ id: string; title: string }>
): ImportResult {
  // Enforce max rows
  const limitedRows = rows.slice(0, MAX_IMPORT_ROWS);

  const results = limitedRows.map((row, index) =>
    validateImportRow(row, index + 1, books)
  );

  const validCount = results.filter((r) => r.isValid).length;
  const invalidCount = results.filter((r) => !r.isValid).length;
  const warningCount = results.filter(
    (r) => r.isValid && r.warnings.length > 0
  ).length;

  return {
    totalRows: limitedRows.length,
    validCount,
    invalidCount,
    warningCount,
    rows: results,
    canImport: validCount > 0,
  };
}

// =============================================================================
// UTILITY FUNCTIONS - EXPORT
// =============================================================================

/**
 * Generate CSV header row
 */
export function generateCSVHeader(options: ExportOptions): string {
  const headers = ["front", "back", "type", "tags", "book"];

  if (options.includeStatus) {
    headers.push("status");
  }
  if (options.includeStats) {
    headers.push("easeFactor", "interval", "dueDate");
  }
  if (options.includeCreatedAt) {
    headers.push("createdAt");
  }

  return headers.join(options.delimiter);
}

/**
 * Generate CSV row from card
 */
export function generateCSVRow(
  card: ExportCard,
  options: ExportOptions
): string {
  const { delimiter, quoteChar } = options;

  const fields = [
    escapeCSVValue(card.front, delimiter, quoteChar),
    escapeCSVValue(card.back, delimiter, quoteChar),
    card.type,
    escapeCSVValue(card.tags.join(","), delimiter, quoteChar),
    escapeCSVValue(card.bookTitle || "", delimiter, quoteChar),
  ];

  if (options.includeStatus) {
    fields.push(card.status);
  }
  if (options.includeStats) {
    fields.push(
      card.easeFactor.toString(),
      card.interval.toString(),
      card.dueDate
    );
  }
  if (options.includeCreatedAt) {
    fields.push(card.createdAt);
  }

  return fields.join(delimiter);
}

/**
 * Generate full CSV content
 */
export function generateCSVContent(
  cards: ExportCard[],
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): string {
  const header = generateCSVHeader(options);
  const rows = cards.map((card) => generateCSVRow(card, options));

  return [header, ...rows].join("\n");
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  prefix: string = "flashcards",
  extension: string = "csv"
): string {
  const date = new Date();
  const timestamp = date.toISOString().split("T")[0];
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Download CSV content as file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// UTILITY FUNCTIONS - FILE HANDLING
// =============================================================================

/**
 * Read file content as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to read file as text"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Validate file is CSV
 */
export function isValidCSVFile(file: File): boolean {
  const validTypes = [
    "text/csv",
    "text/plain",
    "application/csv",
    "application/vnd.ms-excel",
  ];

  const validExtensions = [".csv", ".txt"];

  const hasValidType = validTypes.includes(file.type) || file.type === "";
  const hasValidExtension = validExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  return hasValidType || hasValidExtension;
}

/**
 * Maximum file size in bytes (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validate file size
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

// =============================================================================
// UTILITY FUNCTIONS - TEMPLATE
// =============================================================================

/**
 * Generate sample CSV template
 */
export function generateCSVTemplate(): string {
  const headers = CSV_HEADERS.join(",");
  const sampleRows = [
    '"What is photosynthesis?","The process by which plants convert sunlight into energy",VOCABULARY,"science,biology",""',
    '"Explain the water cycle","Water evaporates, forms clouds, falls as precipitation, and collects in bodies of water",CONCEPT,"science,earth",""',
    '"Who wrote 1984?","George Orwell",CUSTOM,"literature,quiz",""',
  ];

  return [headers, ...sampleRows].join("\n");
}

/**
 * Download CSV template
 */
export function downloadCSVTemplate(): void {
  const content = generateCSVTemplate();
  downloadCSV(content, "flashcard_template.csv");
}

// =============================================================================
// UTILITY FUNCTIONS - SUMMARY
// =============================================================================

/**
 * Get import summary text
 */
export function getImportSummaryText(result: ImportResult): string {
  const parts: string[] = [];

  if (result.validCount > 0) {
    parts.push(
      `${result.validCount} valid card${result.validCount !== 1 ? "s" : ""}`
    );
  }
  if (result.invalidCount > 0) {
    parts.push(
      `${result.invalidCount} invalid card${result.invalidCount !== 1 ? "s" : ""}`
    );
  }
  if (result.warningCount > 0) {
    parts.push(
      `${result.warningCount} card${result.warningCount !== 1 ? "s" : ""} with warnings`
    );
  }

  return parts.join(", ");
}

/**
 * Get type display label key
 */
export function getTypeLabelKey(type: FlashcardType): string {
  return `flashcards.browse.type.${type.toLowerCase()}`;
}

/**
 * Check if row has errors
 */
export function hasErrors(row: ImportCardResult): boolean {
  return row.errors.length > 0;
}

/**
 * Check if row has warnings
 */
export function hasWarnings(row: ImportCardResult): boolean {
  return row.warnings.length > 0;
}

/**
 * Get valid cards from import result
 */
export function getValidCards(result: ImportResult): ValidatedImportCard[] {
  return result.rows
    .filter((row) => row.isValid && row.card !== null)
    .map((row) => row.card as ValidatedImportCard);
}

/**
 * Get selected valid cards
 */
export function getSelectedValidCards(
  result: ImportResult,
  selectedRows: Set<number>
): ValidatedImportCard[] {
  return result.rows
    .filter(
      (row) =>
        row.isValid && row.card !== null && selectedRows.has(row.rowNumber)
    )
    .map((row) => row.card as ValidatedImportCard);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Create empty export card (for testing)
 */
export function createEmptyExportCard(): ExportCard {
  const now = new Date().toISOString();
  return {
    front: "",
    back: "",
    type: "CUSTOM",
    status: "NEW",
    tags: [],
    bookTitle: null,
    easeFactor: 2.5,
    interval: 0,
    dueDate: now,
    createdAt: now,
  };
}

/**
 * Create mock export cards for testing
 */
export function createMockExportCards(count: number = 5): ExportCard[] {
  const types: FlashcardType[] = [
    "VOCABULARY",
    "CONCEPT",
    "COMPREHENSION",
    "QUOTE",
    "CUSTOM",
  ];
  const statuses: FlashcardStatus[] = ["NEW", "LEARNING", "REVIEW"];

  return Array.from({ length: count }, (_, i): ExportCard => {
    const typeIndex = i % types.length;
    const statusIndex = i % statuses.length;
    return {
      front: `Question ${i + 1}`,
      back: `Answer ${i + 1}`,
      type: types[typeIndex] ?? "CUSTOM",
      status: statuses[statusIndex] ?? "NEW",
      tags: i % 2 === 0 ? ["tag1", "tag2"] : [],
      bookTitle: i % 3 === 0 ? "Sample Book" : null,
      easeFactor: 2.5,
      interval: i * 2,
      dueDate: new Date(Date.now() + i * 86400000).toISOString(),
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    };
  });
}
