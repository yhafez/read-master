/**
 * Zod schemas for Book operations
 *
 * These schemas validate book-related API requests for:
 * - Creating books (upload, URL import, paste)
 * - Updating book metadata
 * - Querying/filtering books
 *
 * Validation rules follow the database schema:
 * - Title: 1-500 characters (required)
 * - Author: 1-200 characters (optional)
 * - Description: max 50,000 characters (optional)
 * - Tags: array of strings, max 20 tags, each max 50 characters
 *
 * @example
 * ```typescript
 * import { createBookSchema, bookQuerySchema } from '@read-master/shared/schemas';
 *
 * // Validate book creation
 * const result = createBookSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 *
 * // Validate query parameters
 * const query = bookQuerySchema.parse(req.query);
 * ```
 */

import { z } from "zod";

import { containsProfanity } from "../utils/moderation";

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

/**
 * Book source enum - where the book content came from
 */
export const bookSourceSchema = z.enum([
  "UPLOAD",
  "URL",
  "PASTE",
  "GOOGLE_BOOKS",
  "OPEN_LIBRARY",
]);
export type BookSourceSchema = z.infer<typeof bookSourceSchema>;

/**
 * File type enum - supported file formats
 */
export const fileTypeSchema = z.enum([
  "PDF",
  "EPUB",
  "DOC",
  "DOCX",
  "TXT",
  "HTML",
]);
export type FileTypeSchema = z.infer<typeof fileTypeSchema>;

/**
 * Reading status enum - user's reading status for a book
 */
export const readingStatusSchema = z.enum([
  "WANT_TO_READ",
  "READING",
  "COMPLETED",
  "ABANDONED",
]);
export type ReadingStatusSchema = z.infer<typeof readingStatusSchema>;

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * Book title validation
 * - Required field
 * - 1-500 characters (matching database VarChar(500))
 * - Trimmed of whitespace
 * - Cannot be whitespace-only
 */
export const bookTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(500, "Title must be at most 500 characters");

/**
 * Book title validation with profanity filter for public books
 */
export const bookTitlePublicSchema = bookTitleSchema.refine(
  (val) => !containsProfanity(val),
  { message: "Title contains inappropriate language" }
);

/**
 * Book author validation
 * - Optional field
 * - 1-200 characters when provided (matching database VarChar(200))
 * - Trimmed of whitespace
 */
export const bookAuthorSchema = z
  .string()
  .min(1, "Author name cannot be empty")
  .max(200, "Author name must be at most 200 characters")
  .trim()
  .optional()
  .nullable();

/**
 * Book description validation
 * - Optional field
 * - Max 50,000 characters for long descriptions
 * - Trimmed of whitespace
 */
export const bookDescriptionSchema = z
  .string()
  .max(50000, "Description must be at most 50,000 characters")
  .trim()
  .optional()
  .nullable();

/**
 * Book description with profanity filter for public books
 */
export const bookDescriptionPublicSchema = z
  .string()
  .max(50000, "Description must be at most 50,000 characters")
  .trim()
  .refine((val) => !val || !containsProfanity(val), {
    message: "Description contains inappropriate language",
  })
  .optional()
  .nullable();

/**
 * Tag validation
 * - Max 50 characters per tag
 * - Alphanumeric with hyphens and underscores allowed
 */
export const tagSchema = z
  .string()
  .min(1, "Tag cannot be empty")
  .max(50, "Tag must be at most 50 characters")
  .trim()
  .regex(
    /^[a-zA-Z0-9\s\-_]+$/,
    "Tags can only contain letters, numbers, spaces, hyphens, and underscores"
  );

/**
 * Tags array validation
 * - Array of valid tags
 * - Max 20 tags per book
 */
export const tagsArraySchema = z
  .array(tagSchema)
  .max(20, "Maximum 20 tags allowed")
  .default([]);

/**
 * Genre validation
 * - Optional field
 * - Max 100 characters
 */
export const genreSchema = z
  .string()
  .max(100, "Genre must be at most 100 characters")
  .trim()
  .optional()
  .nullable();

/**
 * Language code validation
 * - ISO 639-1 language code (2 characters)
 * - Defaults to 'en'
 */
export const languageCodeSchema = z
  .string()
  .length(2, "Language code must be 2 characters (ISO 639-1)")
  .toLowerCase()
  .default("en");

/**
 * URL validation for book imports
 */
export const urlSchema = z
  .string()
  .url("Invalid URL format")
  .max(2000, "URL is too long");

/**
 * Cover image URL validation
 */
export const coverImageSchema = z
  .string()
  .max(2000, "Cover image URL is too long")
  .optional()
  .nullable();

// =============================================================================
// CREATE BOOK SCHEMAS
// =============================================================================

/**
 * Base fields for all book creation operations
 */
const createBookBaseSchema = z.object({
  title: bookTitleSchema,
  author: bookAuthorSchema,
  description: bookDescriptionSchema,
  tags: tagsArraySchema.optional(),
  genre: genreSchema,
  language: languageCodeSchema.optional(),
  isPublic: z.boolean().default(false),
});

/**
 * Create book from file upload
 */
export const createBookUploadSchema = createBookBaseSchema.extend({
  source: z.literal("UPLOAD"),
  fileType: fileTypeSchema,
  // Note: actual file is handled separately via multipart/form-data
});
export type CreateBookUploadInput = z.infer<typeof createBookUploadSchema>;

/**
 * Create book from URL import
 */
export const createBookUrlSchema = createBookBaseSchema.extend({
  source: z.literal("URL"),
  sourceUrl: urlSchema,
});
export type CreateBookUrlInput = z.infer<typeof createBookUrlSchema>;

/**
 * Create book from pasted text
 * - Content is required for paste
 * - Min 10 characters of content
 * - Max 5 million characters (reasonable for very long books)
 */
export const createBookPasteSchema = createBookBaseSchema.extend({
  source: z.literal("PASTE"),
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(5000000, "Content is too long (max 5 million characters)"),
});
export type CreateBookPasteInput = z.infer<typeof createBookPasteSchema>;

/**
 * Create book from Google Books
 */
export const createBookGoogleBooksSchema = createBookBaseSchema.extend({
  source: z.literal("GOOGLE_BOOKS"),
  sourceId: z.string().min(1, "Google Books ID is required"),
});
export type CreateBookGoogleBooksInput = z.infer<
  typeof createBookGoogleBooksSchema
>;

/**
 * Create book from Open Library
 */
export const createBookOpenLibrarySchema = createBookBaseSchema.extend({
  source: z.literal("OPEN_LIBRARY"),
  sourceId: z.string().min(1, "Open Library ID is required"),
});
export type CreateBookOpenLibraryInput = z.infer<
  typeof createBookOpenLibrarySchema
>;

/**
 * Combined create book schema (discriminated union)
 * Use this when you need to validate any book creation request
 */
export const createBookSchema = z.discriminatedUnion("source", [
  createBookUploadSchema,
  createBookUrlSchema,
  createBookPasteSchema,
  createBookGoogleBooksSchema,
  createBookOpenLibrarySchema,
]);
export type CreateBookInput = z.infer<typeof createBookSchema>;

// =============================================================================
// UPDATE BOOK SCHEMA
// =============================================================================

/**
 * Update book metadata
 * All fields are optional - only provided fields are updated
 */
export const updateBookSchema = z
  .object({
    title: bookTitleSchema.optional(),
    author: bookAuthorSchema,
    description: bookDescriptionSchema,
    status: readingStatusSchema.optional(),
    genre: genreSchema,
    tags: tagsArraySchema.optional(),
    coverImage: coverImageSchema,
    isPublic: z.boolean().optional(),
    language: languageCodeSchema.optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  );
export type UpdateBookInput = z.infer<typeof updateBookSchema>;

/**
 * Update book schema with profanity filter for public books
 * Use this when updating a book that is or will be public
 */
export const updateBookPublicSchema = z
  .object({
    title: bookTitlePublicSchema.optional(),
    author: bookAuthorSchema,
    description: bookDescriptionPublicSchema,
    status: readingStatusSchema.optional(),
    genre: genreSchema,
    tags: tagsArraySchema.optional(),
    coverImage: coverImageSchema,
    isPublic: z.boolean().optional(),
    language: languageCodeSchema.optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  );
export type UpdateBookPublicInput = z.infer<typeof updateBookPublicSchema>;

// =============================================================================
// BOOK QUERY SCHEMA
// =============================================================================

/**
 * Book sort fields
 */
export const bookSortFieldSchema = z.enum([
  "title",
  "author",
  "createdAt",
  "updatedAt",
  "lastReadAt",
  "progress",
  "wordCount",
]);
export type BookSortField = z.infer<typeof bookSortFieldSchema>;

/**
 * Sort direction
 */
export const sortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

/**
 * Book list query parameters
 * For filtering, sorting, and paginating book lists
 */
export const bookQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: bookSortFieldSchema.default("createdAt"),
  sortDirection: sortDirectionSchema.default("desc"),

  // Filters
  status: readingStatusSchema.optional(),
  source: bookSourceSchema.optional(),
  genre: z.string().max(100).optional(),
  language: z.string().length(2).optional(),
  tags: z
    .string()
    .transform((val) => val.split(",").map((t) => t.trim()))
    .pipe(z.array(z.string().max(50)))
    .optional(),

  // Search
  search: z.string().max(200).trim().optional(),

  // Include soft-deleted
  includeDeleted: z.coerce.boolean().default(false),
});
export type BookQueryInput = z.infer<typeof bookQuerySchema>;

// =============================================================================
// BOOK ID SCHEMA
// =============================================================================

/**
 * Book ID validation (CUID format)
 */
export const bookIdSchema = z
  .string()
  .min(1, "Book ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid book ID format");
export type BookIdInput = z.infer<typeof bookIdSchema>;

/**
 * Book ID params schema (for route params)
 */
export const bookIdParamsSchema = z.object({
  id: bookIdSchema,
});
export type BookIdParamsInput = z.infer<typeof bookIdParamsSchema>;

// =============================================================================
// EXTERNAL BOOK SEARCH SCHEMAS
// =============================================================================

/**
 * External book search query
 */
export const externalBookSearchSchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(200, "Search query is too long")
    .trim(),
  maxResults: z.coerce.number().int().positive().max(40).default(10),
  startIndex: z.coerce.number().int().nonnegative().default(0),
});
export type ExternalBookSearchInput = z.infer<typeof externalBookSearchSchema>;

/**
 * Add book from external library
 */
export const addFromLibrarySchema = z.object({
  source: z.enum(["GOOGLE_BOOKS", "OPEN_LIBRARY"]),
  sourceId: z.string().min(1, "Book ID from source is required"),
  // Optional overrides for metadata
  title: bookTitleSchema.optional(),
  author: bookAuthorSchema,
  tags: tagsArraySchema.optional(),
});
export type AddFromLibraryInput = z.infer<typeof addFromLibrarySchema>;

// =============================================================================
// READING PROGRESS SCHEMA
// =============================================================================

/**
 * Update reading progress
 */
export const updateReadingProgressSchema = z.object({
  bookId: bookIdSchema,
  currentPosition: z
    .number()
    .int()
    .nonnegative("Position must be non-negative"),
  percentage: z
    .number()
    .min(0)
    .max(100, "Percentage must be between 0 and 100")
    .optional(),
  readTimeSeconds: z
    .number()
    .int()
    .nonnegative("Read time must be non-negative")
    .optional(),
});
export type UpdateReadingProgressInput = z.infer<
  typeof updateReadingProgressSchema
>;

// =============================================================================
// SCHEMA INDEX (convenient re-exports)
// =============================================================================

/**
 * All book-related schemas for convenient importing
 */
export const bookSchemas = {
  // Enums
  bookSource: bookSourceSchema,
  fileType: fileTypeSchema,
  readingStatus: readingStatusSchema,

  // Field schemas
  title: bookTitleSchema,
  titlePublic: bookTitlePublicSchema,
  author: bookAuthorSchema,
  description: bookDescriptionSchema,
  descriptionPublic: bookDescriptionPublicSchema,
  tags: tagsArraySchema,
  genre: genreSchema,
  language: languageCodeSchema,
  url: urlSchema,
  coverImage: coverImageSchema,
  bookId: bookIdSchema,

  // Create schemas
  createUpload: createBookUploadSchema,
  createUrl: createBookUrlSchema,
  createPaste: createBookPasteSchema,
  createGoogleBooks: createBookGoogleBooksSchema,
  createOpenLibrary: createBookOpenLibrarySchema,
  create: createBookSchema,

  // Update schemas
  update: updateBookSchema,
  updatePublic: updateBookPublicSchema,

  // Query schemas
  query: bookQuerySchema,
  sortField: bookSortFieldSchema,
  sortDirection: sortDirectionSchema,
  idParams: bookIdParamsSchema,

  // External library schemas
  externalSearch: externalBookSearchSchema,
  addFromLibrary: addFromLibrarySchema,

  // Reading progress
  updateProgress: updateReadingProgressSchema,
} as const;
