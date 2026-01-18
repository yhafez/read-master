/**
 * Zod schemas for Annotation operations
 *
 * These schemas validate annotation-related API requests for:
 * - Creating annotations (highlights, notes, bookmarks)
 * - Updating annotations
 * - Querying/filtering annotations
 *
 * Validation rules follow the database schema:
 * - Note: max 5,000 characters (optional)
 * - Color: 7-character hex code (e.g., "#FFFF00")
 * - Offsets: non-negative integers representing character positions
 *
 * Profanity filtering is applied to notes when annotations are public.
 *
 * @example
 * ```typescript
 * import { createAnnotationSchema, updateAnnotationSchema } from '@read-master/shared/schemas';
 *
 * // Validate annotation creation
 * const result = createAnnotationSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 *
 * // For public annotations, use the public schema
 * const publicResult = createAnnotationPublicSchema.safeParse(requestBody);
 * ```
 */

import { z } from "zod";

import { containsProfanity } from "../utils/moderation";

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

/**
 * Annotation type enum - the kind of annotation
 */
export const annotationTypeSchema = z.enum(["HIGHLIGHT", "NOTE", "BOOKMARK"]);
export type AnnotationTypeSchema = z.infer<typeof annotationTypeSchema>;

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * Book ID validation (CUID format)
 * Reuses the same pattern as books.ts
 */
export const annotationBookIdSchema = z
  .string()
  .min(1, "Book ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid book ID format");

/**
 * Annotation ID validation (CUID format)
 */
export const annotationIdSchema = z
  .string()
  .min(1, "Annotation ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid annotation ID format");

/**
 * Text offset validation
 * - Must be a non-negative integer
 * - Represents character position in the book content
 */
export const offsetSchema = z
  .number()
  .int("Offset must be an integer")
  .nonnegative("Offset must be non-negative");

/**
 * Start offset validation
 */
export const startOffsetSchema = offsetSchema.describe(
  "Start character offset"
);

/**
 * End offset validation
 */
export const endOffsetSchema = offsetSchema.describe("End character offset");

/**
 * Selected text validation
 * - Optional field (required for highlights, optional for bookmarks/notes)
 * - No maximum length (can be multiple paragraphs)
 */
export const selectedTextSchema = z
  .string()
  .min(1, "Selected text cannot be empty")
  .optional()
  .nullable();

/**
 * Annotation note validation
 * - Optional field
 * - Max 5,000 characters
 * - Trimmed of whitespace
 */
export const annotationNoteSchema = z
  .string()
  .max(5000, "Note must be at most 5,000 characters")
  .trim()
  .optional()
  .nullable();

/**
 * Annotation note with profanity filter for public annotations
 */
export const annotationNotePublicSchema = z
  .string()
  .max(5000, "Note must be at most 5,000 characters")
  .trim()
  .refine((val) => !val || !containsProfanity(val), {
    message: "Note contains inappropriate language",
  })
  .optional()
  .nullable();

/**
 * Color validation for highlights
 * - 7-character hex code format (e.g., "#FFFF00")
 * - Case-insensitive (normalized to uppercase)
 */
export const colorSchema = z
  .string()
  .regex(
    /^#[0-9A-Fa-f]{6}$/,
    "Color must be a valid 7-character hex code (e.g., #FFFF00)"
  )
  .transform((val) => val.toUpperCase())
  .optional()
  .nullable();

/**
 * Visibility validation
 * - Boolean flag for public/private
 * - Defaults to false (private)
 */
export const isPublicSchema = z.boolean().default(false);

// =============================================================================
// CREATE ANNOTATION SCHEMAS
// =============================================================================

/**
 * Create annotation base schema
 * All annotation types share these fields
 */
const createAnnotationBaseSchema = z.object({
  bookId: annotationBookIdSchema,
  type: annotationTypeSchema,
  startOffset: startOffsetSchema,
  endOffset: endOffsetSchema,
  isPublic: isPublicSchema,
});

/**
 * Create highlight annotation
 * - Requires selected text
 * - Optional color (defaults to yellow if not provided)
 * - Optional note
 */
export const createHighlightSchema = createAnnotationBaseSchema.extend({
  type: z.literal("HIGHLIGHT"),
  selectedText: z.string().min(1, "Selected text is required for highlights"),
  color: colorSchema,
  note: annotationNoteSchema,
});
export type CreateHighlightInput = z.infer<typeof createHighlightSchema>;

/**
 * Create highlight annotation with profanity filter (for public highlights)
 */
export const createHighlightPublicSchema = createAnnotationBaseSchema.extend({
  type: z.literal("HIGHLIGHT"),
  selectedText: z.string().min(1, "Selected text is required for highlights"),
  color: colorSchema,
  note: annotationNotePublicSchema,
});
export type CreateHighlightPublicInput = z.infer<
  typeof createHighlightPublicSchema
>;

/**
 * Create note annotation
 * - Requires note content
 * - Optional selected text (the text the note refers to)
 */
export const createNoteSchema = createAnnotationBaseSchema.extend({
  type: z.literal("NOTE"),
  note: z
    .string()
    .min(1, "Note content is required")
    .max(5000, "Note must be at most 5,000 characters")
    .trim(),
  selectedText: selectedTextSchema,
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

/**
 * Create note annotation with profanity filter (for public notes)
 */
export const createNotePublicSchema = createAnnotationBaseSchema.extend({
  type: z.literal("NOTE"),
  note: z
    .string()
    .min(1, "Note content is required")
    .max(5000, "Note must be at most 5,000 characters")
    .trim()
    .refine((val) => !containsProfanity(val), {
      message: "Note contains inappropriate language",
    }),
  selectedText: selectedTextSchema,
});
export type CreateNotePublicInput = z.infer<typeof createNotePublicSchema>;

/**
 * Create bookmark annotation
 * - Minimal annotation - just marks a position
 * - Optional note
 */
export const createBookmarkSchema = createAnnotationBaseSchema.extend({
  type: z.literal("BOOKMARK"),
  note: annotationNoteSchema,
  // Bookmark doesn't require selected text or color
});
export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;

/**
 * Create bookmark annotation with profanity filter (for public bookmarks)
 */
export const createBookmarkPublicSchema = createAnnotationBaseSchema.extend({
  type: z.literal("BOOKMARK"),
  note: annotationNotePublicSchema,
});
export type CreateBookmarkPublicInput = z.infer<
  typeof createBookmarkPublicSchema
>;

/**
 * Combined create annotation schema (discriminated union)
 * Use this when you need to validate any annotation creation request
 */
export const createAnnotationSchema = z
  .discriminatedUnion("type", [
    createHighlightSchema,
    createNoteSchema,
    createBookmarkSchema,
  ])
  .refine((data) => data.startOffset <= data.endOffset, {
    message: "Start offset must be less than or equal to end offset",
    path: ["startOffset"],
  });
export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;

/**
 * Combined create annotation schema with profanity filter (for public annotations)
 */
export const createAnnotationPublicSchema = z
  .discriminatedUnion("type", [
    createHighlightPublicSchema,
    createNotePublicSchema,
    createBookmarkPublicSchema,
  ])
  .refine((data) => data.startOffset <= data.endOffset, {
    message: "Start offset must be less than or equal to end offset",
    path: ["startOffset"],
  });
export type CreateAnnotationPublicInput = z.infer<
  typeof createAnnotationPublicSchema
>;

// =============================================================================
// UPDATE ANNOTATION SCHEMA
// =============================================================================

/**
 * Update annotation schema
 * All fields are optional - only provided fields are updated
 * Cannot change annotation type or book ID
 */
export const updateAnnotationSchema = z
  .object({
    note: annotationNoteSchema,
    color: colorSchema,
    isPublic: z.boolean().optional(),
    // Allow updating position if content changes
    startOffset: startOffsetSchema.optional(),
    endOffset: endOffsetSchema.optional(),
    selectedText: selectedTextSchema,
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  )
  .refine(
    (data) => {
      // If both offsets are provided, start must be <= end
      if (data.startOffset !== undefined && data.endOffset !== undefined) {
        return data.startOffset <= data.endOffset;
      }
      return true;
    },
    {
      message: "Start offset must be less than or equal to end offset",
      path: ["startOffset"],
    }
  );
export type UpdateAnnotationInput = z.infer<typeof updateAnnotationSchema>;

/**
 * Update annotation schema with profanity filter (for public annotations)
 */
export const updateAnnotationPublicSchema = z
  .object({
    note: annotationNotePublicSchema,
    color: colorSchema,
    isPublic: z.boolean().optional(),
    startOffset: startOffsetSchema.optional(),
    endOffset: endOffsetSchema.optional(),
    selectedText: selectedTextSchema,
  })
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  )
  .refine(
    (data) => {
      if (data.startOffset !== undefined && data.endOffset !== undefined) {
        return data.startOffset <= data.endOffset;
      }
      return true;
    },
    {
      message: "Start offset must be less than or equal to end offset",
      path: ["startOffset"],
    }
  );
export type UpdateAnnotationPublicInput = z.infer<
  typeof updateAnnotationPublicSchema
>;

// =============================================================================
// ANNOTATION QUERY SCHEMA
// =============================================================================

/**
 * Sort fields for annotations
 */
export const annotationSortFieldSchema = z.enum([
  "createdAt",
  "updatedAt",
  "startOffset",
  "type",
]);
export type AnnotationSortField = z.infer<typeof annotationSortFieldSchema>;

/**
 * Sort direction
 */
export const annotationSortDirectionSchema = z.enum(["asc", "desc"]);
export type AnnotationSortDirection = z.infer<
  typeof annotationSortDirectionSchema
>;

/**
 * Annotation list query parameters
 * For filtering, sorting, and paginating annotation lists
 */
export const annotationQuerySchema = z.object({
  // Book filter (required - annotations are always book-scoped)
  bookId: annotationBookIdSchema,

  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),

  // Sorting
  sortBy: annotationSortFieldSchema.default("startOffset"),
  sortDirection: annotationSortDirectionSchema.default("asc"),

  // Filters
  type: annotationTypeSchema.optional(),
  isPublic: z.coerce.boolean().optional(),
  hasNote: z.coerce.boolean().optional(),

  // Search within notes
  search: z.string().max(200).trim().optional(),

  // Include soft-deleted
  includeDeleted: z.coerce.boolean().default(false),
});
export type AnnotationQueryInput = z.infer<typeof annotationQuerySchema>;

// =============================================================================
// ANNOTATION ID PARAMS SCHEMA
// =============================================================================

/**
 * Annotation ID params schema (for route params)
 */
export const annotationIdParamsSchema = z.object({
  id: annotationIdSchema,
});
export type AnnotationIdParamsInput = z.infer<typeof annotationIdParamsSchema>;

/**
 * Book and annotation ID params schema (for nested routes)
 */
export const bookAnnotationIdParamsSchema = z.object({
  bookId: annotationBookIdSchema,
  annotationId: annotationIdSchema,
});
export type BookAnnotationIdParamsInput = z.infer<
  typeof bookAnnotationIdParamsSchema
>;

// =============================================================================
// BULK OPERATIONS SCHEMA
// =============================================================================

/**
 * Bulk delete annotations schema
 */
export const bulkDeleteAnnotationsSchema = z.object({
  annotationIds: z
    .array(annotationIdSchema)
    .min(1, "At least one annotation ID is required")
    .max(100, "Maximum 100 annotations can be deleted at once"),
});
export type BulkDeleteAnnotationsInput = z.infer<
  typeof bulkDeleteAnnotationsSchema
>;

/**
 * Export annotations schema
 */
export const exportAnnotationsSchema = z.object({
  bookId: annotationBookIdSchema,
  format: z.enum(["json", "markdown", "csv"]).default("json"),
  types: z.array(annotationTypeSchema).optional(),
  includeSelectedText: z.boolean().default(true),
});
export type ExportAnnotationsInput = z.infer<typeof exportAnnotationsSchema>;

// =============================================================================
// SCHEMA INDEX (convenient re-exports)
// =============================================================================

/**
 * All annotation-related schemas for convenient importing
 */
export const annotationSchemas = {
  // Enums
  annotationType: annotationTypeSchema,

  // Field schemas
  bookId: annotationBookIdSchema,
  annotationId: annotationIdSchema,
  startOffset: startOffsetSchema,
  endOffset: endOffsetSchema,
  selectedText: selectedTextSchema,
  note: annotationNoteSchema,
  notePublic: annotationNotePublicSchema,
  color: colorSchema,
  isPublic: isPublicSchema,

  // Create schemas
  createHighlight: createHighlightSchema,
  createHighlightPublic: createHighlightPublicSchema,
  createNote: createNoteSchema,
  createNotePublic: createNotePublicSchema,
  createBookmark: createBookmarkSchema,
  createBookmarkPublic: createBookmarkPublicSchema,
  create: createAnnotationSchema,
  createPublic: createAnnotationPublicSchema,

  // Update schemas
  update: updateAnnotationSchema,
  updatePublic: updateAnnotationPublicSchema,

  // Query schemas
  query: annotationQuerySchema,
  sortField: annotationSortFieldSchema,
  sortDirection: annotationSortDirectionSchema,

  // ID params
  idParams: annotationIdParamsSchema,
  bookAnnotationIdParams: bookAnnotationIdParamsSchema,

  // Bulk operations
  bulkDelete: bulkDeleteAnnotationsSchema,
  export: exportAnnotationsSchema,
} as const;
