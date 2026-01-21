/**
 * POST /api/books/upload
 *
 * Upload a book file (PDF, EPUB, DOCX) to the user's library.
 *
 * This endpoint:
 * - Accepts multipart/form-data with file and optional metadata
 * - Validates file type and size (max 50MB)
 * - Checks user's tier limits (free: 3 books)
 * - Parses the file to extract content and metadata
 * - Uploads the file to R2 storage
 * - Creates a Book record in the database
 *
 * @example
 * ```bash
 * curl -X POST /api/books/upload \
 *   -H "Authorization: Bearer <token>" \
 *   -F "file=@book.pdf" \
 *   -F "title=My Book" \
 *   -F "author=John Doe"
 * ```
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendCreated,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import {
  storage,
  storageUtils,
  MaxFileSize,
  BookExtensions,
} from "../../src/services/storage.js";
import {
  parseEPUBFromBuffer,
  parsePDFFromBuffer,
  parseDOCXFromBuffer,
  countWords,
  calculateReadingTime,
} from "../../src/services/books.js";
import { getTierLimits, isWithinLimit } from "@read-master/shared";
import type { FileType, BookSource } from "@read-master/database";

// ============================================================================
// Types
// ============================================================================

/**
 * Uploaded file information from multipart form
 */
type UploadedFile = {
  filename: string;
  contentType: string;
  data: Buffer;
  size: number;
};

/**
 * Form fields from multipart form
 */
type FormFields = {
  title?: string;
  author?: string;
  description?: string;
  genre?: string;
  tags?: string;
  language?: string;
  isPublic?: string;
};

/**
 * Parsed book data for database creation
 */
type ParsedBookData = {
  title: string;
  author: string | null;
  description: string | null;
  wordCount: number;
  estimatedReadTime: number;
  rawContent: string;
  coverImageData?: Buffer | undefined;
  coverImageMimeType?: string | undefined;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Upload metadata validation schema
 */
const uploadMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(500, "Title must be at most 500 characters")
    .optional(),
  author: z
    .string()
    .trim()
    .max(200, "Author must be at most 200 characters")
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(50000, "Description must be at most 50,000 characters")
    .optional()
    .nullable(),
  genre: z
    .string()
    .trim()
    .max(100, "Genre must be at most 100 characters")
    .optional()
    .nullable(),
  tags: z
    .string()
    .transform((val) =>
      val
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    )
    .pipe(z.array(z.string().max(50)).max(20))
    .optional(),
  language: z.string().length(2).default("en").optional(),
  isPublic: z
    .string()
    .transform((val) => val === "true")
    .default("false")
    .optional(),
});

// ============================================================================
// Constants
// ============================================================================

/**
 * Allowed MIME types for book uploads
 */
const ALLOWED_MIME_TYPES: Record<string, FileType> = {
  "application/pdf": "PDF",
  "application/epub+zip": "EPUB",
  "application/epub": "EPUB",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "application/msword": "DOC",
  "text/plain": "TXT",
  "text/html": "HTML",
};

/**
 * File extension to FileType mapping
 */
const EXTENSION_TO_FILE_TYPE: Record<string, FileType> = {
  pdf: "PDF",
  epub: "EPUB",
  docx: "DOCX",
  doc: "DOC",
  txt: "TXT",
  html: "HTML",
  htm: "HTML",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get file extension from filename
 */
function getExtensionFromFilename(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.pop() || "").toLowerCase() : "";
}

/**
 * Parse multipart/form-data from request body
 *
 * Vercel serverless functions automatically parse multipart/form-data
 * but we need to handle the file data properly.
 */
async function parseMultipartForm(
  req: VercelRequest
): Promise<{ file: UploadedFile | null; fields: FormFields }> {
  const body = req.body as Record<string, unknown>;
  const files = (req as unknown as { files?: Record<string, unknown[]> }).files;

  let file: UploadedFile | null = null;
  const fields: FormFields = {};

  // Handle file from various possible locations
  // Vercel may place file data in different structures
  if (files && files.file && Array.isArray(files.file) && files.file[0]) {
    const uploadedFile = files.file[0] as {
      originalFilename?: string;
      filepath?: string;
      mimetype?: string;
      size?: number;
    };

    // Read file from filepath if provided
    if (uploadedFile.filepath) {
      const fs = await import("fs/promises");
      const data = await fs.readFile(uploadedFile.filepath);
      file = {
        filename: uploadedFile.originalFilename || "unknown",
        contentType: uploadedFile.mimetype || "application/octet-stream",
        data,
        size: data.length,
      };
    }
  } else if (body.file) {
    // Handle base64 encoded file data
    if (typeof body.file === "string") {
      const matches = body.file.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1] || "application/octet-stream";
        const base64Data = matches[2] || "";
        const data = Buffer.from(base64Data, "base64");
        file = {
          filename: (body.filename as string) || "upload",
          contentType: mimeType,
          data,
          size: data.length,
        };
      }
    } else if (Buffer.isBuffer(body.file)) {
      file = {
        filename: (body.filename as string) || "upload",
        contentType: (body.contentType as string) || "application/octet-stream",
        data: body.file,
        size: body.file.length,
      };
    }
  }

  // Extract form fields
  if (typeof body.title === "string") fields.title = body.title;
  if (typeof body.author === "string") fields.author = body.author;
  if (typeof body.description === "string")
    fields.description = body.description;
  if (typeof body.genre === "string") fields.genre = body.genre;
  if (typeof body.tags === "string") fields.tags = body.tags;
  if (typeof body.language === "string") fields.language = body.language;
  if (typeof body.isPublic === "string") fields.isPublic = body.isPublic;

  return { file, fields };
}

/**
 * Determine file type from MIME type or extension
 */
function getFileType(contentType: string, filename: string): FileType | null {
  // First try MIME type
  const mimeFileType = ALLOWED_MIME_TYPES[contentType.toLowerCase()];
  if (mimeFileType) {
    return mimeFileType;
  }

  // Fall back to extension
  const ext = getExtensionFromFilename(filename);
  return EXTENSION_TO_FILE_TYPE[ext] || null;
}

/**
 * Parse book file and extract content/metadata
 */
async function parseBookFile(
  data: Buffer,
  fileType: FileType,
  filename: string
): Promise<ParsedBookData | { error: string }> {
  try {
    switch (fileType) {
      case "PDF": {
        const result = await parsePDFFromBuffer(data);
        if (!result.success || !result.data) {
          return { error: result.error || "Failed to parse PDF" };
        }
        return {
          title: result.data.metadata.title || filename.replace(/\.pdf$/i, ""),
          author: result.data.metadata.author || null,
          description: result.data.metadata.subject || null,
          wordCount: result.data.totalWordCount,
          estimatedReadTime: result.data.estimatedReadingTimeMinutes,
          rawContent: result.data.rawContent,
        };
      }

      case "EPUB": {
        const result = await parseEPUBFromBuffer(data);
        if (!result.success || !result.data) {
          return { error: result.error || "Failed to parse EPUB" };
        }
        return {
          title: result.data.metadata.title || filename.replace(/\.epub$/i, ""),
          author: result.data.metadata.author || null,
          description: result.data.metadata.description || null,
          wordCount: result.data.totalWordCount,
          estimatedReadTime: result.data.estimatedReadingTimeMinutes,
          rawContent: result.data.rawContent,
          coverImageData: result.data.coverImage?.data,
          coverImageMimeType: result.data.coverImage?.mimeType,
        };
      }

      case "DOCX":
      case "DOC": {
        const result = await parseDOCXFromBuffer(data);
        if (!result.success || !result.data) {
          return { error: result.error || "Failed to parse DOCX" };
        }
        return {
          title:
            result.data.metadata.title || filename.replace(/\.docx?$/i, ""),
          author: result.data.metadata.author || null,
          description: result.data.metadata.description || null,
          wordCount: result.data.totalWordCount,
          estimatedReadTime: result.data.estimatedReadingTimeMinutes,
          rawContent: result.data.rawContent,
        };
      }

      case "TXT":
      case "HTML": {
        const content = data.toString("utf-8");
        const wordCount = countWords(content);
        return {
          title: filename.replace(/\.(txt|html?)$/i, ""),
          author: null,
          description: null,
          wordCount,
          estimatedReadTime: calculateReadingTime(wordCount),
          rawContent: content,
        };
      }

      default:
        return { error: `Unsupported file type: ${fileType}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error parsing book file", {
      fileType,
      filename,
      error: message,
    });
    return { error: `Failed to parse file: ${message}` };
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle book file upload
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST.",
      405
    );
    return;
  }

  const { userId } = req.auth;

  try {
    // Get user from database with books count
    const user = await getUserByClerkId(userId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Get book count for tier limit check
    const bookCount = await db.book.count({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    // Check tier limits
    if (!isWithinLimit(bookCount, user.tier, "maxBooks")) {
      const limits = getTierLimits(user.tier);
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        `You have reached your book limit (${limits.maxBooks} books). Upgrade to Pro for unlimited books.`,
        403
      );
      return;
    }

    // Parse multipart form data
    const { file, fields } = await parseMultipartForm(req);

    if (!file) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "No file provided. Please upload a file.",
        400
      );
      return;
    }

    // Validate file size
    if (!storageUtils.isValidFileSize(file.size, MaxFileSize.BOOK)) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        `File size exceeds maximum allowed (${MaxFileSize.BOOK / 1024 / 1024}MB)`,
        400
      );
      return;
    }

    // Determine and validate file type
    const fileType = getFileType(file.contentType, file.filename);
    if (!fileType) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        `Unsupported file type. Allowed types: ${BookExtensions.join(", ")}`,
        400
      );
      return;
    }

    // Validate metadata
    const metadataResult = uploadMetadataSchema.safeParse(fields);
    if (!metadataResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid metadata",
        400,
        metadataResult.error.flatten()
      );
      return;
    }
    const metadata = metadataResult.data;

    // Parse the book file
    const parsedResult = await parseBookFile(
      file.data,
      fileType,
      file.filename
    );
    if ("error" in parsedResult) {
      sendError(res, ErrorCodes.VALIDATION_ERROR, parsedResult.error, 400);
      return;
    }

    // Upload file to R2
    const storageKey = storage.buildBookKey(
      user.id,
      `${Date.now()}`,
      file.filename
    );
    const uploadResult = await storage.uploadFile(storageKey, file.data, {
      contentType: file.contentType,
      metadata: {
        userId: user.id,
        originalFilename: file.filename,
      },
    });

    if (!uploadResult.success) {
      logger.error("Failed to upload file to R2", {
        userId: user.id,
        error: uploadResult.error,
      });
      sendError(
        res,
        ErrorCodes.INTERNAL_ERROR,
        "Failed to store file. Please try again.",
        500
      );
      return;
    }

    // Upload cover image if extracted
    let coverImageUrl: string | null = null;
    if (parsedResult.coverImageData && parsedResult.coverImageMimeType) {
      const coverFilename = `cover.${parsedResult.coverImageMimeType.split("/")[1] || "jpg"}`;
      const coverKey = storage.buildCoverKey(`${Date.now()}`, coverFilename);
      const coverResult = await storage.uploadFile(
        coverKey,
        parsedResult.coverImageData,
        {
          contentType: parsedResult.coverImageMimeType,
          cacheControl: "public, max-age=31536000",
        }
      );
      if (coverResult.success && coverResult.publicUrl) {
        coverImageUrl = coverResult.publicUrl;
      }
    }

    // For text-based formats (DOC, DOCX, TXT, HTML), also store the parsed text content
    // Stored with .txt extension alongside the original file for easy retrieval
    if (
      (fileType === "DOC" ||
        fileType === "DOCX" ||
        fileType === "TXT" ||
        fileType === "HTML") &&
      parsedResult.rawContent
    ) {
      const textBuffer = Buffer.from(parsedResult.rawContent, "utf-8");
      // Store with .txt suffix: e.g., "books/userId/timestamp/file.docx" → "books/userId/timestamp/file.docx.txt"
      const textKey = `${storageKey}.txt`;
      const textResult = await storage.uploadFile(textKey, textBuffer, {
        contentType: "text/plain; charset=utf-8",
        metadata: {
          userId: user.id,
          originalFilename: `${file.filename}.txt`,
          isExtractedContent: "true",
        },
      });

      if (!textResult.success) {
        logger.warn("Failed to upload extracted text content", {
          userId: user.id,
          error: textResult.error,
        });
        // Don't fail the upload, original file is still usable
      }
    }

    // Create book record in database
    const book = await db.book.create({
      data: {
        userId: user.id,
        title: metadata.title || parsedResult.title,
        author: metadata.author ?? parsedResult.author,
        description: metadata.description ?? parsedResult.description,
        source: "UPLOAD" as BookSource,
        fileType,
        filePath: storageKey,
        coverImage: coverImageUrl,
        wordCount: parsedResult.wordCount,
        estimatedReadTime: parsedResult.estimatedReadTime,
        rawContent: parsedResult.rawContent ?? null, // Store full text for search
        genre: metadata.genre ?? null,
        tags: metadata.tags ?? [],
        language: metadata.language ?? "en",
        isPublic: metadata.isPublic ?? false,
        status: "WANT_TO_READ",
      },
      include: {
        chapters: true,
      },
    });

    // Log the upload
    logger.info("Book uploaded successfully", {
      userId: user.id,
      bookId: book.id,
      fileType,
      fileSize: file.size,
      wordCount: parsedResult.wordCount,
    });

    // Return created book
    sendCreated(res, {
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      source: book.source,
      fileType: book.fileType,
      coverImage: book.coverImage,
      wordCount: book.wordCount,
      estimatedReadTime: book.estimatedReadTime,
      genre: book.genre,
      tags: book.tags,
      language: book.language,
      isPublic: book.isPublic,
      status: book.status,
      createdAt: book.createdAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error uploading book", { userId, error: message });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to upload book. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
