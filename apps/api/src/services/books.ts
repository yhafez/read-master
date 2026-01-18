/**
 * Book Parsing Service
 *
 * Provides parsing functionality for various book file formats.
 * This module handles EPUB parsing with text extraction, chapter identification,
 * metadata extraction, word count calculation, and cover image extraction.
 */

import EPub from "epub";
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
// Exports (Namespaced)
// =============================================================================

/**
 * Book parsing utilities object
 */
export const bookParser = {
  // Parsing functions
  parseEPUB,
  parseEPUBFromBuffer,

  // Validation
  isValidEPUB,

  // Utility functions
  countWords,
  stripHtmlTags,
  calculateReadingTime,
  generateContentHash,

  // Constants
  AVERAGE_READING_WPM,
  EPUB_MIME_TYPES,
  DEFAULT_PARSE_OPTIONS,
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
};
