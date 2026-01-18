/**
 * Book Parsing Service
 *
 * Provides parsing functionality for various book file formats.
 * This module handles EPUB parsing with text extraction, chapter identification,
 * metadata extraction, word count calculation, and cover image extraction.
 */

import EPub from "epub";
import { PDFParse, type InfoResult } from "pdf-parse";
import mammoth from "mammoth";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";

// =============================================================================
// Types
// =============================================================================

/**
 * Metadata extracted from a book file
 */
export type BookMetadata = {
  title: string;
  author: string;
  language: string;
  description: string;
  publisher: string;
  publicationDate: string;
  isbn: string;
  subjects: string[];
  rights: string;
  identifier: string;
};

/**
 * Chapter information extracted from a book
 */
export type ChapterInfo = {
  id: string;
  title: string;
  order: number;
  level: number;
  href: string;
  wordCount: number;
  content: string;
};

/**
 * Cover image information
 */
export type CoverImage = {
  data: Buffer;
  mimeType: string;
  filename: string;
};

/**
 * Result of parsing a book file
 */
export type ParsedBook = {
  metadata: BookMetadata;
  chapters: ChapterInfo[];
  totalWordCount: number;
  coverImage: CoverImage | null;
  rawContent: string;
  estimatedReadingTimeMinutes: number;
  hasDRM: boolean;
};

/**
 * Options for parsing a book
 */
export type ParseOptions = {
  extractCover?: boolean;
  extractContent?: boolean;
  maxChapters?: number;
};

/**
 * Result wrapper for parsing operations
 */
export type ParseResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * PDF-specific metadata
 */
export type PDFMetadata = {
  title: string;
  author: string;
  subject: string;
  creator: string;
  producer: string;
  creationDate: string;
  modificationDate: string;
  pageCount: number;
  pdfVersion: string;
  isEncrypted: boolean;
};

/**
 * Detected section in PDF content
 */
export type PDFSection = {
  id: string;
  title: string;
  order: number;
  level: number;
  startOffset: number;
  endOffset: number;
  wordCount: number;
  content: string;
};

/**
 * Result of parsing a PDF file
 */
export type ParsedPDF = {
  metadata: PDFMetadata;
  sections: PDFSection[];
  totalWordCount: number;
  rawContent: string;
  estimatedReadingTimeMinutes: number;
  pageCount: number;
};

/**
 * Options for parsing a PDF
 */
export type PDFParseOptions = {
  extractContent?: boolean;
  detectSections?: boolean;
  maxPages?: number;
};

/**
 * Default PDF parsing options
 */
export const DEFAULT_PDF_PARSE_OPTIONS: Required<PDFParseOptions> = {
  extractContent: true,
  detectSections: true,
  maxPages: 5000,
};

/**
 * DOCX-specific metadata
 */
export type DOCXMetadata = {
  title: string;
  author: string;
  description: string;
  subject: string;
  creator: string;
  lastModifiedBy: string;
  revision: string;
  created: string;
  modified: string;
};

/**
 * Detected section in DOCX content
 */
export type DOCXSection = {
  id: string;
  title: string;
  order: number;
  level: number;
  startOffset: number;
  endOffset: number;
  wordCount: number;
  content: string;
};

/**
 * Result of parsing a DOCX file
 */
export type ParsedDOCX = {
  metadata: DOCXMetadata;
  sections: DOCXSection[];
  totalWordCount: number;
  rawContent: string;
  htmlContent: string;
  estimatedReadingTimeMinutes: number;
  messages: DOCXParseMessage[];
};

/**
 * Message from DOCX parsing (warnings or errors)
 */
export type DOCXParseMessage = {
  type: "warning" | "error";
  message: string;
};

/**
 * Options for parsing a DOCX
 */
export type DOCXParseOptions = {
  extractContent?: boolean;
  detectSections?: boolean;
  includeHtml?: boolean;
};

/**
 * Default DOCX parsing options
 */
export const DEFAULT_DOCX_PARSE_OPTIONS: Required<DOCXParseOptions> = {
  extractContent: true,
  detectSections: true,
  includeHtml: true,
};

// =============================================================================
// Constants
// =============================================================================

/**
 * Average words per minute for reading time estimation
 */
export const AVERAGE_READING_WPM = 250;

/**
 * Default parsing options
 */
export const DEFAULT_PARSE_OPTIONS: Required<ParseOptions> = {
  extractCover: true,
  extractContent: true,
  maxChapters: 500,
};

/**
 * Supported EPUB MIME types
 */
export const EPUB_MIME_TYPES = [
  "application/epub+zip",
  "application/epub",
] as const;

/**
 * Supported PDF MIME types
 */
export const PDF_MIME_TYPES = ["application/pdf"] as const;

/**
 * Supported DOCX MIME types
 */
export const DOCX_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
] as const;

/**
 * PDF file signature (magic bytes)
 * PDF files start with "%PDF-"
 */
const PDF_SIGNATURE = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

/**
 * DOCX/ZIP file signature (magic bytes)
 * DOCX files are ZIP archives starting with "PK\x03\x04"
 */
const DOCX_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04

/**
 * Patterns for detecting chapter/section headings in PDF text
 */
const CHAPTER_PATTERNS = [
  /^(?:chapter|ch\.?)\s*(\d+|[ivxlcdm]+)/i,
  /^(?:part|pt\.?)\s*(\d+|[ivxlcdm]+)/i,
  /^(?:section|sec\.?)\s*(\d+\.?\d*)/i,
  /^(?:unit)\s*(\d+)/i,
  /^(\d+)\.?\s+[A-Z][a-z]/,
  /^(?:prologue|epilogue|introduction|preface|foreword|afterword|appendix|conclusion)/i,
];

/**
 * Common cover image IDs in EPUB files
 */
const COVER_IMAGE_IDS = [
  "cover",
  "cover-image",
  "coverimage",
  "cover_image",
  "bookcover",
  "frontcover",
  "cover-art",
  "cover_art",
];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Count words in a text string
 */
export function countWords(text: string): number {
  if (!text || typeof text !== "string") {
    return 0;
  }

  // Remove HTML tags
  const stripped = stripHtmlTags(text);

  // Split on whitespace and filter empty strings
  const words = stripped
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  return words.length;
}

/**
 * Strip HTML tags from a string
 */
export function stripHtmlTags(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate estimated reading time in minutes
 */
export function calculateReadingTime(
  wordCount: number,
  wpm: number = AVERAGE_READING_WPM
): number {
  if (wordCount <= 0 || wpm <= 0) {
    return 0;
  }
  return Math.ceil(wordCount / wpm);
}

/**
 * Generate a content hash for deduplication
 */
export function generateContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Normalize a string for comparison (lowercase, trim, remove extra whitespace)
 */
function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Clean up metadata string (remove null chars, normalize whitespace)
 */
function cleanMetadataString(value: unknown): string {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.replace(/\0/g, "").trim();
}

// =============================================================================
// EPUB Parsing
// =============================================================================

/**
 * Parse an EPUB file and extract all content
 *
 * @param filePath - Path to the EPUB file
 * @param options - Parsing options
 * @returns Parsed book data or error
 */
export async function parseEPUB(
  filePath: string,
  options: ParseOptions = {}
): Promise<ParseResult<ParsedBook>> {
  const opts = { ...DEFAULT_PARSE_OPTIONS, ...options };

  try {
    // Verify file exists
    await fs.access(filePath);

    // Create EPUB parser instance
    const epub = new EPub(filePath);

    // Parse the EPUB file
    await parseEpubAsync(epub);

    // Check for DRM
    const hasDRM = epub.hasDRM();
    if (hasDRM) {
      return {
        success: false,
        error: "This EPUB file is DRM protected and cannot be parsed",
      };
    }

    // Extract metadata
    const metadata = extractMetadata(epub);

    // Extract chapters
    const chapters = opts.extractContent
      ? await extractChapters(epub, opts.maxChapters)
      : [];

    // Calculate total word count
    const totalWordCount = chapters.reduce(
      (sum, chapter) => sum + chapter.wordCount,
      0
    );

    // Extract raw content
    const rawContent = chapters.map((c) => c.content).join("\n\n");

    // Extract cover image
    const coverImage = opts.extractCover ? await extractCoverImage(epub) : null;

    // Calculate reading time
    const estimatedReadingTimeMinutes = calculateReadingTime(totalWordCount);

    return {
      success: true,
      data: {
        metadata,
        chapters,
        totalWordCount,
        coverImage,
        rawContent,
        estimatedReadingTimeMinutes,
        hasDRM,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parsing error";
    return {
      success: false,
      error: `Failed to parse EPUB: ${message}`,
    };
  }
}

/**
 * Parse EPUB from a buffer instead of a file path
 *
 * @param buffer - EPUB file content as a buffer
 * @param options - Parsing options
 * @returns Parsed book data or error
 */
export async function parseEPUBFromBuffer(
  buffer: Buffer,
  options: ParseOptions = {}
): Promise<ParseResult<ParsedBook>> {
  // Create a temporary file
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "epub-"));
  const tempFile = path.join(tempDir, "book.epub");

  try {
    // Write buffer to temp file
    await fs.writeFile(tempFile, buffer);

    // Parse the file
    const result = await parseEPUB(tempFile, options);

    return result;
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempFile);
      await fs.rmdir(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Promisified EPUB parsing
 */
function parseEpubAsync(epub: EPub): Promise<void> {
  return new Promise((resolve, reject) => {
    epub.on("end", resolve);
    epub.on("error", reject);
    epub.parse();
  });
}

/**
 * Extract metadata from parsed EPUB
 */
function extractMetadata(epub: EPub): BookMetadata {
  const meta = epub.metadata || {};
  // Cast to unknown first to access additional properties
  const metaRecord = meta as unknown as Record<string, unknown>;

  // Handle subject which could be string or array
  let subjects: string[] = [];
  if (meta.subject) {
    if (Array.isArray(meta.subject)) {
      subjects = meta.subject
        .map((s) => cleanMetadataString(s))
        .filter(Boolean);
    } else {
      const subject = cleanMetadataString(meta.subject);
      if (subject) {
        subjects = subject
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
  }

  return {
    title: cleanMetadataString(meta.title) || "Untitled",
    author: cleanMetadataString(meta.creator) || "Unknown Author",
    language: cleanMetadataString(meta.language) || "en",
    description: cleanMetadataString(meta.description) || "",
    publisher: cleanMetadataString(metaRecord.publisher) || "",
    publicationDate: cleanMetadataString(meta.date) || "",
    isbn: extractISBN(epub),
    subjects,
    rights: cleanMetadataString(metaRecord.rights) || "",
    identifier: extractIdentifier(epub),
  };
}

/**
 * Extract ISBN from EPUB metadata
 */
function extractISBN(epub: EPub): string {
  const meta = epub.metadata as unknown as Record<string, unknown>;

  // Check for ISBN in identifier
  const identifier = meta.identifier || meta.ISBN || meta.isbn;
  if (typeof identifier === "string") {
    // Extract ISBN-10 or ISBN-13 pattern
    const isbnMatch = identifier.match(
      /(?:ISBN[:\s-]?)?(97[89][\d-]{10,}|\d{9}[\dXx])/i
    );
    if (isbnMatch && isbnMatch[1]) {
      return isbnMatch[1].replace(/-/g, "");
    }
  }

  return "";
}

/**
 * Extract unique identifier from EPUB
 */
function extractIdentifier(epub: EPub): string {
  const meta = epub.metadata as unknown as Record<string, unknown>;
  const identifier = meta.identifier || meta.UUID || meta.uuid;

  if (typeof identifier === "string") {
    return cleanMetadataString(identifier);
  }

  return "";
}

/**
 * Extract chapters from EPUB
 */
async function extractChapters(
  epub: EPub,
  maxChapters: number
): Promise<ChapterInfo[]> {
  const chapters: ChapterInfo[] = [];

  // Use table of contents if available, otherwise use spine flow
  const tocItems = epub.toc && epub.toc.length > 0 ? epub.toc : epub.flow || [];

  // Limit chapters
  const itemsToProcess = tocItems.slice(0, maxChapters);

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    if (!item || !item.id) continue;

    try {
      const content = await getChapterContent(epub, item.id);
      const textContent = stripHtmlTags(content);
      const wordCount = countWords(textContent);

      chapters.push({
        id: item.id,
        title: item.title || `Chapter ${i + 1}`,
        order: item.order ?? i,
        level: item.level ?? 0,
        href: item.href || "",
        wordCount,
        content: textContent,
      });
    } catch {
      // Skip chapters that fail to extract
      continue;
    }
  }

  return chapters;
}

/**
 * Get chapter content by ID (promisified)
 */
function getChapterContent(epub: EPub, chapterId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    epub.getChapter(chapterId, (error, text) => {
      if (error) {
        reject(error);
      } else {
        resolve(text || "");
      }
    });
  });
}

/**
 * Extract cover image from EPUB
 */
async function extractCoverImage(epub: EPub): Promise<CoverImage | null> {
  const manifest = epub.manifest as
    | Record<string, { href: string; id: string; "media-type"?: string }>
    | undefined;

  if (!manifest) {
    return null;
  }

  // Look for cover image by ID
  for (const coverId of COVER_IMAGE_IDS) {
    const item = Object.values(manifest).find(
      (m) => normalizeString(m.id) === coverId
    );

    if (item && isImageMimeType(item["media-type"])) {
      try {
        const imageData = await getImage(epub, item.id);
        if (imageData) {
          return {
            data: imageData.data,
            mimeType: imageData.mimeType,
            filename: path.basename(item.href),
          };
        }
      } catch {
        continue;
      }
    }
  }

  // Look for cover in manifest by examining media type and href
  for (const [id, item] of Object.entries(manifest)) {
    if (!isImageMimeType(item["media-type"])) {
      continue;
    }

    // Check if the filename or path suggests it's a cover
    const href = item.href.toLowerCase();
    if (
      href.includes("cover") ||
      href.includes("frontcover") ||
      href.includes("book-cover")
    ) {
      try {
        const imageData = await getImage(epub, id);
        if (imageData) {
          return {
            data: imageData.data,
            mimeType: imageData.mimeType,
            filename: path.basename(item.href),
          };
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Get image from EPUB by ID (promisified)
 */
function getImage(
  epub: EPub,
  id: string
): Promise<{ data: Buffer; mimeType: string } | null> {
  return new Promise((resolve) => {
    epub.getImage(id, (error, data, mimeType) => {
      if (error || !data) {
        resolve(null);
      } else {
        resolve({ data, mimeType: mimeType || "image/jpeg" });
      }
    });
  });
}

/**
 * Check if a MIME type is an image type
 */
function isImageMimeType(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate that a file is a valid EPUB
 */
export async function isValidEPUB(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);

    // Read the first few bytes to check for ZIP signature
    const fd = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(4);
    await fd.read(buffer, 0, 4, 0);
    await fd.close();

    // ZIP files start with PK\x03\x04
    const isZip =
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04;

    if (!isZip) {
      return false;
    }

    // Try to parse it to verify it's a valid EPUB
    const epub = new EPub(filePath);
    await parseEpubAsync(epub);

    return true;
  } catch {
    return false;
  }
}

/**
 * Get file extension from EPUB (should be .epub)
 */
export function getEPUBExtension(): string {
  return ".epub";
}

// =============================================================================
// PDF Parsing
// =============================================================================

/**
 * Parse a PDF file and extract all content
 *
 * @param filePath - Path to the PDF file
 * @param options - Parsing options
 * @returns Parsed PDF data or error
 */
export async function parsePDF(
  filePath: string,
  options: PDFParseOptions = {}
): Promise<ParseResult<ParsedPDF>> {
  const opts = { ...DEFAULT_PDF_PARSE_OPTIONS, ...options };

  try {
    // Verify file exists
    await fs.access(filePath);

    // Read the file
    const dataBuffer = await fs.readFile(filePath);

    // Parse using the buffer function
    return parsePDFFromBuffer(dataBuffer, opts);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parsing error";
    return {
      success: false,
      error: `Failed to parse PDF: ${message}`,
    };
  }
}

/**
 * Parse PDF from a buffer instead of a file path
 *
 * @param buffer - PDF file content as a buffer
 * @param options - Parsing options
 * @returns Parsed PDF data or error
 */
export async function parsePDFFromBuffer(
  buffer: Buffer,
  options: PDFParseOptions = {}
): Promise<ParseResult<ParsedPDF>> {
  const opts = { ...DEFAULT_PDF_PARSE_OPTIONS, ...options };

  let parser: PDFParse | null = null;

  try {
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      return {
        success: false,
        error: "Empty buffer provided",
      };
    }

    // Check PDF signature
    if (!isPDFBuffer(buffer)) {
      return {
        success: false,
        error: "Invalid PDF format: missing PDF signature",
      };
    }

    // Create PDF parser with buffer data
    parser = new PDFParse({ data: buffer });

    // Get document info (metadata)
    const infoResult = await parser.getInfo();

    // Get text content
    const textResult = await parser.getText({
      last: opts.maxPages,
    });

    // Check for encryption (if we can't get text but have pages)
    const isEncrypted =
      infoResult.total > 0 && textResult.text.trim().length === 0;

    if (isEncrypted) {
      return {
        success: false,
        error: "PDF appears to be encrypted or password protected",
      };
    }

    // Extract metadata
    const metadata = extractPDFMetadata(infoResult);

    // Extract text content
    const rawContent = opts.extractContent ? textResult.text || "" : "";

    // Calculate word count
    const totalWordCount = countWords(rawContent);

    // Detect sections if requested
    const sections = opts.detectSections ? detectPDFSections(rawContent) : [];

    // Calculate reading time
    const estimatedReadingTimeMinutes = calculateReadingTime(totalWordCount);

    return {
      success: true,
      data: {
        metadata,
        sections,
        totalWordCount,
        rawContent,
        estimatedReadingTimeMinutes,
        pageCount: infoResult.total || 0,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parsing error";
    return {
      success: false,
      error: `Failed to parse PDF: ${message}`,
    };
  } finally {
    // Clean up parser resources
    if (parser) {
      await parser.destroy().catch(() => {
        // Ignore cleanup errors
      });
    }
  }
}

/**
 * Extract metadata from parsed PDF InfoResult
 */
function extractPDFMetadata(infoResult: InfoResult): PDFMetadata {
  const info = infoResult.info || {};

  // Get XMP/XAP metadata if available
  const metadata = infoResult.metadata;
  const metadataObj = metadata
    ? (metadata as unknown as Record<string, unknown>)
    : {};

  // Get date information
  const dateNode = infoResult.getDateNode();

  return {
    title:
      cleanMetadataString(info.Title) ||
      cleanMetadataString(metadataObj?.["dc:title"]) ||
      "",
    author:
      cleanMetadataString(info.Author) ||
      cleanMetadataString(metadataObj?.["dc:creator"]) ||
      "",
    subject:
      cleanMetadataString(info.Subject) ||
      cleanMetadataString(metadataObj?.["dc:subject"]) ||
      "",
    creator: cleanMetadataString(info.Creator) || "",
    producer: cleanMetadataString(info.Producer) || "",
    creationDate: dateNode.CreationDate
      ? dateNode.CreationDate.toISOString()
      : "",
    modificationDate: dateNode.ModDate ? dateNode.ModDate.toISOString() : "",
    pageCount: infoResult.total || 0,
    pdfVersion: cleanMetadataString(info.PDFFormatVersion) || "",
    isEncrypted: Boolean(info.IsAcroFormPresent),
  };
}

/**
 * Detect sections/chapters in PDF text content
 */
function detectPDFSections(text: string): PDFSection[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const sections: PDFSection[] = [];
  const lines = text.split("\n");

  let currentSection: PDFSection | null = null;
  let currentContent: string[] = [];
  let sectionOrder = 0;
  let currentOffset = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if this line matches a chapter/section pattern
    const isChapterHeading = CHAPTER_PATTERNS.some((pattern) =>
      pattern.test(trimmedLine)
    );

    // Also check for potential section headers:
    // - All caps lines that aren't too long
    // - Lines that look like titles (capitalized words)
    const isAllCaps =
      trimmedLine.length > 3 &&
      trimmedLine.length < 100 &&
      trimmedLine === trimmedLine.toUpperCase() &&
      /[A-Z]/.test(trimmedLine);

    const isPotentialHeader = isChapterHeading || isAllCaps;

    if (isPotentialHeader && trimmedLine.length > 0) {
      // Save the previous section
      if (currentSection) {
        currentSection.endOffset = currentOffset;
        currentSection.content = currentContent.join("\n").trim();
        currentSection.wordCount = countWords(currentSection.content);
        sections.push(currentSection);
      }

      // Start a new section
      sectionOrder++;
      currentSection = {
        id: `section-${sectionOrder}`,
        title: trimmedLine.substring(0, 200), // Limit title length
        order: sectionOrder,
        level: isAllCaps && !isChapterHeading ? 1 : 0,
        startOffset: currentOffset,
        endOffset: currentOffset,
        wordCount: 0,
        content: "",
      };
      currentContent = [];
    } else if (currentSection) {
      // Add line to current section content
      currentContent.push(line);
    }

    currentOffset += line.length + 1; // +1 for newline
  }

  // Save the last section
  if (currentSection) {
    currentSection.endOffset = currentOffset;
    currentSection.content = currentContent.join("\n").trim();
    currentSection.wordCount = countWords(currentSection.content);
    sections.push(currentSection);
  }

  // If no sections were detected, create a single section from all content
  if (sections.length === 0 && text.trim().length > 0) {
    sections.push({
      id: "section-1",
      title: "Main Content",
      order: 1,
      level: 0,
      startOffset: 0,
      endOffset: text.length,
      wordCount: countWords(text),
      content: text.trim(),
    });
  }

  return sections;
}

/**
 * Check if a buffer starts with PDF signature
 */
function isPDFBuffer(buffer: Buffer): boolean {
  if (buffer.length < PDF_SIGNATURE.length) {
    return false;
  }

  for (let i = 0; i < PDF_SIGNATURE.length; i++) {
    if (buffer[i] !== PDF_SIGNATURE[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Validate that a file is a valid PDF
 */
export async function isValidPDF(filePath: string): Promise<boolean> {
  let parser: PDFParse | null = null;

  try {
    await fs.access(filePath);

    // Read the first few bytes to check for PDF signature
    const fd = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(PDF_SIGNATURE.length);
    await fd.read(buffer, 0, PDF_SIGNATURE.length, 0);
    await fd.close();

    if (!isPDFBuffer(buffer)) {
      return false;
    }

    // Try to parse it to verify it's a valid PDF
    const dataBuffer = await fs.readFile(filePath);
    parser = new PDFParse({ data: dataBuffer });

    // Try to get info to verify the PDF is valid
    await parser.getInfo();

    return true;
  } catch {
    return false;
  } finally {
    if (parser) {
      await parser.destroy().catch(() => {
        // Ignore cleanup errors
      });
    }
  }
}

/**
 * Get file extension from PDF (should be .pdf)
 */
export function getPDFExtension(): string {
  return ".pdf";
}

// =============================================================================
// DOCX Parsing
// =============================================================================

/**
 * Parse a DOCX file and extract all content
 *
 * @param filePath - Path to the DOCX file
 * @param options - Parsing options
 * @returns Parsed DOCX data or error
 */
export async function parseDOCX(
  filePath: string,
  options: DOCXParseOptions = {}
): Promise<ParseResult<ParsedDOCX>> {
  const opts = { ...DEFAULT_DOCX_PARSE_OPTIONS, ...options };

  try {
    // Verify file exists
    await fs.access(filePath);

    // Read the file
    const dataBuffer = await fs.readFile(filePath);

    // Parse using the buffer function
    return parseDOCXFromBuffer(dataBuffer, opts);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parsing error";
    return {
      success: false,
      error: `Failed to parse DOCX: ${message}`,
    };
  }
}

/**
 * Parse DOCX from a buffer instead of a file path
 *
 * @param buffer - DOCX file content as a buffer
 * @param options - Parsing options
 * @returns Parsed DOCX data or error
 */
export async function parseDOCXFromBuffer(
  buffer: Buffer,
  options: DOCXParseOptions = {}
): Promise<ParseResult<ParsedDOCX>> {
  const opts = { ...DEFAULT_DOCX_PARSE_OPTIONS, ...options };

  try {
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      return {
        success: false,
        error: "Empty buffer provided",
      };
    }

    // Check DOCX signature (ZIP archive)
    if (!isDOCXBuffer(buffer)) {
      return {
        success: false,
        error: "Invalid DOCX format: missing ZIP signature",
      };
    }

    // Use mammoth to extract text and HTML
    let htmlResult: {
      value: string;
      messages: Array<{ type: string; message: string }>;
    };
    let textResult: {
      value: string;
      messages: Array<{ type: string; message: string }>;
    };

    try {
      // Extract HTML content
      htmlResult = await mammoth.convertToHtml({ buffer });

      // Extract raw text
      textResult = await mammoth.extractRawText({ buffer });
    } catch (mammothError) {
      const errorMsg =
        mammothError instanceof Error
          ? mammothError.message
          : "Unknown mammoth error";
      return {
        success: false,
        error: `Failed to parse DOCX content: ${errorMsg}`,
      };
    }

    // Get raw text content
    const rawContent = opts.extractContent ? textResult.value || "" : "";

    // Get HTML content
    const htmlContent = opts.includeHtml ? htmlResult.value || "" : "";

    // Convert mammoth messages to our format
    const messages: DOCXParseMessage[] = [
      ...htmlResult.messages,
      ...textResult.messages,
    ].map((msg) => ({
      type: msg.type as "warning" | "error",
      message: msg.message,
    }));

    // Calculate word count
    const totalWordCount = countWords(rawContent);

    // Detect sections if requested
    const sections = opts.detectSections
      ? detectDOCXSections(rawContent, htmlContent)
      : [];

    // Calculate reading time
    const estimatedReadingTimeMinutes = calculateReadingTime(totalWordCount);

    // Create empty metadata (DOCX doesn't expose metadata easily through mammoth)
    const metadata: DOCXMetadata = {
      title: "",
      author: "",
      description: "",
      subject: "",
      creator: "",
      lastModifiedBy: "",
      revision: "",
      created: "",
      modified: "",
    };

    return {
      success: true,
      data: {
        metadata,
        sections,
        totalWordCount,
        rawContent,
        htmlContent,
        estimatedReadingTimeMinutes,
        messages,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parsing error";
    return {
      success: false,
      error: `Failed to parse DOCX: ${message}`,
    };
  }
}

/**
 * Detect sections/headings in DOCX content
 * Uses both raw text patterns and HTML heading tags
 */
function detectDOCXSections(text: string, htmlContent: string): DOCXSection[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const sections: DOCXSection[] = [];

  // Try to extract headings from HTML first (more reliable)
  const headingPattern = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
  const headings: Array<{ level: number; title: string; index: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(htmlContent)) !== null) {
    const levelStr = match[1];
    const titleStr = match[2];
    if (levelStr && titleStr) {
      headings.push({
        level: parseInt(levelStr, 10),
        title: stripHtmlTags(titleStr).trim(),
        index: match.index,
      });
    }
  }

  // If we found headings in HTML, use them to create sections
  if (headings.length > 0) {
    const textLines = text.split("\n");
    let currentLineIndex = 0;
    let currentOffset = 0;

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];

      // Skip if heading is undefined (should not happen, but TypeScript requires this check)
      if (!heading) {
        continue;
      }

      // Find where this heading appears in the text
      let headingOffset = currentOffset;
      for (let j = currentLineIndex; j < textLines.length; j++) {
        const currentLine = textLines[j];
        if (currentLine !== undefined && currentLine.trim() === heading.title) {
          headingOffset = currentOffset;
          currentLineIndex = j + 1;
          break;
        }
        currentOffset += (currentLine?.length ?? 0) + 1;
      }

      // Find end offset (start of next heading or end of text)
      let endOffset = text.length;
      if (nextHeading) {
        // Search for next heading in remaining text
        const remainingText = text.substring(headingOffset);
        const nextIdx = remainingText.indexOf(nextHeading.title);
        if (nextIdx !== -1) {
          endOffset = headingOffset + nextIdx;
        }
      }

      // Extract content between this heading and next
      const sectionContent = text.substring(headingOffset, endOffset).trim();

      sections.push({
        id: `section-${i + 1}`,
        title: heading.title.substring(0, 200),
        order: i + 1,
        level: heading.level - 1,
        startOffset: headingOffset,
        endOffset,
        wordCount: countWords(sectionContent),
        content: sectionContent,
      });
    }

    return sections;
  }

  // Fallback: Use text-based pattern detection (similar to PDF)
  const lines = text.split("\n");
  let currentSection: DOCXSection | null = null;
  let currentContent: string[] = [];
  let sectionOrder = 0;
  let currentOffset = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for potential section headers
    const isChapterHeading = CHAPTER_PATTERNS.some((pattern) =>
      pattern.test(trimmedLine)
    );

    // All caps lines that aren't too long
    const isAllCaps =
      trimmedLine.length > 3 &&
      trimmedLine.length < 100 &&
      trimmedLine === trimmedLine.toUpperCase() &&
      /[A-Z]/.test(trimmedLine);

    const isPotentialHeader = isChapterHeading || isAllCaps;

    if (isPotentialHeader && trimmedLine.length > 0) {
      // Save the previous section
      if (currentSection) {
        currentSection.endOffset = currentOffset;
        currentSection.content = currentContent.join("\n").trim();
        currentSection.wordCount = countWords(currentSection.content);
        sections.push(currentSection);
      }

      // Start a new section
      sectionOrder++;
      currentSection = {
        id: `section-${sectionOrder}`,
        title: trimmedLine.substring(0, 200),
        order: sectionOrder,
        level: isAllCaps && !isChapterHeading ? 1 : 0,
        startOffset: currentOffset,
        endOffset: currentOffset,
        wordCount: 0,
        content: "",
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }

    currentOffset += line.length + 1;
  }

  // Save the last section
  if (currentSection) {
    currentSection.endOffset = currentOffset;
    currentSection.content = currentContent.join("\n").trim();
    currentSection.wordCount = countWords(currentSection.content);
    sections.push(currentSection);
  }

  // If no sections were detected, create a single section from all content
  if (sections.length === 0 && text.trim().length > 0) {
    sections.push({
      id: "section-1",
      title: "Main Content",
      order: 1,
      level: 0,
      startOffset: 0,
      endOffset: text.length,
      wordCount: countWords(text),
      content: text.trim(),
    });
  }

  return sections;
}

/**
 * Check if a buffer starts with DOCX/ZIP signature
 */
function isDOCXBuffer(buffer: Buffer): boolean {
  if (buffer.length < DOCX_SIGNATURE.length) {
    return false;
  }

  for (let i = 0; i < DOCX_SIGNATURE.length; i++) {
    if (buffer[i] !== DOCX_SIGNATURE[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Validate that a file is a valid DOCX
 */
export async function isValidDOCX(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);

    // Read the first few bytes to check for ZIP signature
    const fd = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(DOCX_SIGNATURE.length);
    await fd.read(buffer, 0, DOCX_SIGNATURE.length, 0);
    await fd.close();

    if (!isDOCXBuffer(buffer)) {
      return false;
    }

    // Try to parse it to verify it's a valid DOCX
    const dataBuffer = await fs.readFile(filePath);

    try {
      // If mammoth can extract text, it's a valid DOCX
      await mammoth.extractRawText({ buffer: dataBuffer });
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Get file extension from DOCX (should be .docx)
 */
export function getDOCXExtension(): string {
  return ".docx";
}

// =============================================================================
// Exports (Namespaced)
// =============================================================================

/**
 * Book parsing utilities object
 */
export const bookParser = {
  // EPUB parsing functions
  parseEPUB,
  parseEPUBFromBuffer,
  isValidEPUB,
  getEPUBExtension,

  // PDF parsing functions
  parsePDF,
  parsePDFFromBuffer,
  isValidPDF,
  getPDFExtension,

  // DOCX parsing functions
  parseDOCX,
  parseDOCXFromBuffer,
  isValidDOCX,
  getDOCXExtension,

  // Utility functions
  countWords,
  stripHtmlTags,
  calculateReadingTime,
  generateContentHash,

  // Constants
  AVERAGE_READING_WPM,
  EPUB_MIME_TYPES,
  PDF_MIME_TYPES,
  DOCX_MIME_TYPES,
  DEFAULT_PARSE_OPTIONS,
  DEFAULT_PDF_PARSE_OPTIONS,
  DEFAULT_DOCX_PARSE_OPTIONS,
};

/**
 * Book parsing utilities (alias for backward compatibility)
 */
export const bookUtils = {
  countWords,
  stripHtmlTags,
  calculateReadingTime,
  generateContentHash,
  getEPUBExtension,
  getPDFExtension,
  getDOCXExtension,
};

/**
 * PDF-specific parsing utilities
 */
export const pdfParser = {
  parsePDF,
  parsePDFFromBuffer,
  isValidPDF,
  getPDFExtension,
  PDF_MIME_TYPES,
  DEFAULT_PDF_PARSE_OPTIONS,
};

/**
 * DOCX-specific parsing utilities
 */
export const docxParser = {
  parseDOCX,
  parseDOCXFromBuffer,
  isValidDOCX,
  getDOCXExtension,
  DOCX_MIME_TYPES,
  DEFAULT_DOCX_PARSE_OPTIONS,
};
