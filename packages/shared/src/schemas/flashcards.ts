/**
 * Zod schemas for Flashcard and SRS operations
 *
 * These schemas validate flashcard-related API requests for:
 * - Creating flashcards (manual and AI-generated)
 * - Updating flashcard content
 * - Reviewing flashcards with SM-2 algorithm ratings
 * - Querying/filtering flashcards
 *
 * Validation rules follow the database schema:
 * - Front: 1-1,000 characters (required)
 * - Back: 1-5,000 characters (required)
 * - Rating: 1-4 (Again, Hard, Good, Easy)
 *
 * @example
 * ```typescript
 * import { createFlashcardSchema, reviewFlashcardSchema } from '@read-master/shared/schemas';
 *
 * // Validate flashcard creation
 * const result = createFlashcardSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 *
 * // Validate review submission
 * const reviewResult = reviewFlashcardSchema.safeParse({ rating: 3 });
 * ```
 */

import { z } from "zod";

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

/**
 * Flashcard type enum - category of the flashcard
 */
export const flashcardTypeSchema = z.enum([
  "VOCABULARY",
  "CONCEPT",
  "COMPREHENSION",
  "QUOTE",
  "CUSTOM",
]);
export type FlashcardTypeSchema = z.infer<typeof flashcardTypeSchema>;

/**
 * Flashcard status enum - current state in the SRS system
 */
export const flashcardStatusSchema = z.enum([
  "NEW",
  "LEARNING",
  "REVIEW",
  "SUSPENDED",
]);
export type FlashcardStatusSchema = z.infer<typeof flashcardStatusSchema>;

/**
 * SRS Rating enum - user's response quality rating
 * 1 = Again (complete failure, reset)
 * 2 = Hard (correct but difficult, shorter interval)
 * 3 = Good (correct with some effort, normal interval)
 * 4 = Easy (effortless recall, longer interval)
 */
export const srsRatingSchema = z
  .number()
  .int("Rating must be an integer")
  .min(1, "Rating must be at least 1 (Again)")
  .max(4, "Rating must be at most 4 (Easy)");
export type SrsRating = z.infer<typeof srsRatingSchema>;

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * Flashcard ID validation (CUID format)
 */
export const flashcardIdSchema = z
  .string()
  .min(1, "Flashcard ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid flashcard ID format");
export type FlashcardIdInput = z.infer<typeof flashcardIdSchema>;

/**
 * Book ID validation (CUID format) - optional for flashcards
 */
export const flashcardBookIdSchema = z
  .string()
  .regex(/^c[a-z0-9]+$/, "Invalid book ID format")
  .optional()
  .nullable();

/**
 * Flashcard front (question/prompt) validation
 * - Required field
 * - 1-1,000 characters (matching database VarChar(1000))
 * - Trimmed of whitespace
 */
export const flashcardFrontSchema = z
  .string()
  .trim()
  .min(1, "Front side content is required")
  .max(1000, "Front must be at most 1,000 characters");
export type FlashcardFrontInput = z.infer<typeof flashcardFrontSchema>;

/**
 * Flashcard back (answer/content) validation
 * - Required field
 * - 1-5,000 characters (database Text field, app enforces max)
 * - Trimmed of whitespace
 */
export const flashcardBackSchema = z
  .string()
  .trim()
  .min(1, "Back side content is required")
  .max(5000, "Back must be at most 5,000 characters");
export type FlashcardBackInput = z.infer<typeof flashcardBackSchema>;

/**
 * Tag validation for flashcards
 * - Max 50 characters per tag
 * - Alphanumeric with hyphens and underscores allowed
 */
export const flashcardTagSchema = z
  .string()
  .min(1, "Tag cannot be empty")
  .max(50, "Tag must be at most 50 characters")
  .trim()
  .regex(
    /^[a-zA-Z0-9\s\-_]+$/,
    "Tags can only contain letters, numbers, spaces, hyphens, and underscores"
  );

/**
 * Tags array validation for flashcards
 * - Array of valid tags
 * - Max 20 tags per flashcard
 */
export const flashcardTagsArraySchema = z
  .array(flashcardTagSchema)
  .max(20, "Maximum 20 tags allowed")
  .default([]);

/**
 * Source chapter ID validation (for auto-generated cards)
 */
export const sourceChapterIdSchema = z
  .string()
  .regex(/^c[a-z0-9]+$/, "Invalid chapter ID format")
  .optional()
  .nullable();

/**
 * Source offset validation (character position in text)
 */
export const sourceOffsetSchema = z
  .number()
  .int("Source offset must be an integer")
  .nonnegative("Source offset must be non-negative")
  .optional()
  .nullable();

// =============================================================================
// SM-2 ALGORITHM FIELD SCHEMAS
// =============================================================================

/**
 * Ease factor validation
 * - Minimum 1.3 (SM-2 algorithm constraint)
 * - Default 2.5 for new cards
 */
export const easeFactorSchema = z
  .number()
  .min(1.3, "Ease factor must be at least 1.3")
  .default(2.5);

/**
 * Interval validation (in days)
 * - Non-negative integer
 * - 0 for new/learning cards
 */
export const intervalSchema = z
  .number()
  .int("Interval must be an integer")
  .nonnegative("Interval must be non-negative")
  .default(0);

/**
 * Repetitions count validation
 * - Non-negative integer
 * - Increments on successful reviews
 */
export const repetitionsSchema = z
  .number()
  .int("Repetitions must be an integer")
  .nonnegative("Repetitions must be non-negative")
  .default(0);

/**
 * Response time validation (in milliseconds)
 * - Optional tracking field
 * - Positive integer when provided
 */
export const responseTimeMsSchema = z
  .number()
  .int("Response time must be an integer")
  .positive("Response time must be positive")
  .optional()
  .nullable();

// =============================================================================
// CREATE FLASHCARD SCHEMAS
// =============================================================================

/**
 * Create flashcard schema (manual creation)
 * - Front and back are required
 * - Type defaults to CUSTOM
 * - Optional book association
 */
export const createFlashcardSchema = z.object({
  front: flashcardFrontSchema,
  back: flashcardBackSchema,
  type: flashcardTypeSchema.default("CUSTOM"),
  bookId: flashcardBookIdSchema,
  tags: flashcardTagsArraySchema.optional(),
  // For auto-generated cards, source reference
  sourceChapterId: sourceChapterIdSchema,
  sourceOffset: sourceOffsetSchema,
});
export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;

/**
 * Create multiple flashcards schema (batch creation)
 * Used when AI generates multiple cards at once
 */
export const createFlashcardsSchema = z.object({
  flashcards: z
    .array(createFlashcardSchema)
    .min(1, "At least one flashcard is required")
    .max(50, "Maximum 50 flashcards can be created at once"),
  // Common properties for all cards in the batch
  bookId: flashcardBookIdSchema,
  tags: flashcardTagsArraySchema.optional(),
});
export type CreateFlashcardsInput = z.infer<typeof createFlashcardsSchema>;

// =============================================================================
// UPDATE FLASHCARD SCHEMA
// =============================================================================

/**
 * Update flashcard schema
 * All fields are optional - only provided fields are updated
 * Cannot change the flashcard's bookId after creation
 */
export const updateFlashcardSchema = z
  .object({
    front: flashcardFrontSchema.optional(),
    back: flashcardBackSchema.optional(),
    type: flashcardTypeSchema.optional(),
    tags: flashcardTagsArraySchema.optional(),
    status: flashcardStatusSchema.optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  );
export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;

// =============================================================================
// REVIEW FLASHCARD SCHEMA
// =============================================================================

/**
 * Review flashcard schema (SM-2 algorithm input)
 * - Rating is required (1-4)
 * - Response time is optional but useful for analytics
 */
export const reviewFlashcardSchema = z.object({
  rating: srsRatingSchema,
  responseTimeMs: responseTimeMsSchema,
});
export type ReviewFlashcardInput = z.infer<typeof reviewFlashcardSchema>;

/**
 * Review flashcard response schema
 * Contains the updated SM-2 state after review
 */
export const reviewFlashcardResponseSchema = z.object({
  flashcardId: flashcardIdSchema,
  // Previous state
  previousEaseFactor: z.number(),
  previousInterval: z.number(),
  previousRepetitions: z.number(),
  // New state
  newEaseFactor: easeFactorSchema,
  newInterval: intervalSchema,
  newRepetitions: repetitionsSchema,
  newDueDate: z.string().datetime(),
  newStatus: flashcardStatusSchema,
  // XP awarded
  xpAwarded: z.number().int().nonnegative().optional(),
});
export type ReviewFlashcardResponse = z.infer<
  typeof reviewFlashcardResponseSchema
>;

// =============================================================================
// FLASHCARD QUERY SCHEMA
// =============================================================================

/**
 * Sort fields for flashcards
 */
export const flashcardSortFieldSchema = z.enum([
  "createdAt",
  "updatedAt",
  "dueDate",
  "easeFactor",
  "interval",
  "front",
]);
export type FlashcardSortField = z.infer<typeof flashcardSortFieldSchema>;

/**
 * Sort direction
 */
export const flashcardSortDirectionSchema = z.enum(["asc", "desc"]);
export type FlashcardSortDirection = z.infer<
  typeof flashcardSortDirectionSchema
>;

/**
 * Flashcard list query parameters
 * For filtering, sorting, and paginating flashcard lists
 */
export const flashcardQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: flashcardSortFieldSchema.default("dueDate"),
  sortDirection: flashcardSortDirectionSchema.default("asc"),

  // Filters
  bookId: z
    .string()
    .regex(/^c[a-z0-9]+$/)
    .optional(),
  status: flashcardStatusSchema.optional(),
  type: flashcardTypeSchema.optional(),
  tags: z
    .string()
    .transform((val) => val.split(",").map((t) => t.trim()))
    .pipe(z.array(z.string().max(50)))
    .optional(),

  // Due date filters
  dueOnly: z.coerce.boolean().default(false), // Only cards due for review
  dueBefore: z.coerce.date().optional(), // Cards due before this date

  // Search
  search: z.string().max(200).trim().optional(),

  // Include soft-deleted
  includeDeleted: z.coerce.boolean().default(false),
});
export type FlashcardQueryInput = z.infer<typeof flashcardQuerySchema>;

/**
 * Due flashcards query schema
 * Simplified query for fetching cards due for review
 */
export const dueFlashcardsQuerySchema = z.object({
  // Limit number of cards to review
  limit: z.coerce.number().int().positive().max(100).default(20),
  // Optional book filter
  bookId: z
    .string()
    .regex(/^c[a-z0-9]+$/)
    .optional(),
  // Optional type filter
  type: flashcardTypeSchema.optional(),
  // Include overdue cards first (default true)
  prioritizeOverdue: z.coerce.boolean().default(true),
});
export type DueFlashcardsQueryInput = z.infer<typeof dueFlashcardsQuerySchema>;

// =============================================================================
// FLASHCARD ID PARAMS SCHEMA
// =============================================================================

/**
 * Flashcard ID params schema (for route params)
 */
export const flashcardIdParamsSchema = z.object({
  id: flashcardIdSchema,
});
export type FlashcardIdParamsInput = z.infer<typeof flashcardIdParamsSchema>;

/**
 * Book and flashcard ID params schema (for nested routes)
 */
export const bookFlashcardIdParamsSchema = z.object({
  bookId: z.string().regex(/^c[a-z0-9]+$/, "Invalid book ID format"),
  flashcardId: flashcardIdSchema,
});
export type BookFlashcardIdParamsInput = z.infer<
  typeof bookFlashcardIdParamsSchema
>;

// =============================================================================
// BULK OPERATIONS SCHEMA
// =============================================================================

/**
 * Bulk status update schema
 * For suspending/unsuspending multiple cards
 */
export const bulkUpdateFlashcardStatusSchema = z.object({
  flashcardIds: z
    .array(flashcardIdSchema)
    .min(1, "At least one flashcard ID is required")
    .max(100, "Maximum 100 flashcards can be updated at once"),
  status: flashcardStatusSchema,
});
export type BulkUpdateFlashcardStatusInput = z.infer<
  typeof bulkUpdateFlashcardStatusSchema
>;

/**
 * Bulk delete flashcards schema
 */
export const bulkDeleteFlashcardsSchema = z.object({
  flashcardIds: z
    .array(flashcardIdSchema)
    .min(1, "At least one flashcard ID is required")
    .max(100, "Maximum 100 flashcards can be deleted at once"),
});
export type BulkDeleteFlashcardsInput = z.infer<
  typeof bulkDeleteFlashcardsSchema
>;

// =============================================================================
// FLASHCARD STATISTICS SCHEMA
// =============================================================================

/**
 * Flashcard statistics response schema
 */
export const flashcardStatsSchema = z.object({
  // Card counts by status
  totalCards: z.number().int().nonnegative(),
  newCards: z.number().int().nonnegative(),
  learningCards: z.number().int().nonnegative(),
  reviewCards: z.number().int().nonnegative(),
  suspendedCards: z.number().int().nonnegative(),

  // Review statistics
  dueToday: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  reviewedToday: z.number().int().nonnegative(),
  correctToday: z.number().int().nonnegative(),

  // Retention metrics
  retentionRate: z.number().min(0).max(100), // Percentage
  averageEaseFactor: z.number().min(1.3).optional(),
  averageInterval: z.number().nonnegative().optional(),

  // Streak information
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
});
export type FlashcardStats = z.infer<typeof flashcardStatsSchema>;

/**
 * Stats query schema - for filtering stats
 */
export const flashcardStatsQuerySchema = z.object({
  bookId: z
    .string()
    .regex(/^c[a-z0-9]+$/)
    .optional(),
  // Date range for review statistics
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});
export type FlashcardStatsQueryInput = z.infer<
  typeof flashcardStatsQuerySchema
>;

// =============================================================================
// AI GENERATION SCHEMA
// =============================================================================

/**
 * Generate flashcards from text schema
 * Used when AI generates flashcards from book content
 */
export const generateFlashcardsSchema = z.object({
  bookId: z.string().regex(/^c[a-z0-9]+$/, "Invalid book ID format"),
  // Optional chapter scope
  chapterId: z
    .string()
    .regex(/^c[a-z0-9]+$/)
    .optional(),
  // Text to generate cards from (if not using full chapter)
  text: z
    .string()
    .min(50, "Text must be at least 50 characters")
    .max(50000)
    .optional(),
  // Card types to generate
  types: z.array(flashcardTypeSchema).min(1).default(["VOCABULARY", "CONCEPT"]),
  // Number of cards to generate
  count: z.number().int().positive().max(20).default(5),
});
export type GenerateFlashcardsInput = z.infer<typeof generateFlashcardsSchema>;

// =============================================================================
// SCHEMA INDEX (convenient re-exports)
// =============================================================================

/**
 * All flashcard-related schemas for convenient importing
 */
export const flashcardSchemas = {
  // Enums
  flashcardType: flashcardTypeSchema,
  flashcardStatus: flashcardStatusSchema,
  srsRating: srsRatingSchema,

  // Field schemas
  flashcardId: flashcardIdSchema,
  front: flashcardFrontSchema,
  back: flashcardBackSchema,
  tags: flashcardTagsArraySchema,
  easeFactor: easeFactorSchema,
  interval: intervalSchema,
  repetitions: repetitionsSchema,
  responseTimeMs: responseTimeMsSchema,

  // Create schemas
  create: createFlashcardSchema,
  createBatch: createFlashcardsSchema,

  // Update schemas
  update: updateFlashcardSchema,

  // Review schemas
  review: reviewFlashcardSchema,
  reviewResponse: reviewFlashcardResponseSchema,

  // Query schemas
  query: flashcardQuerySchema,
  dueQuery: dueFlashcardsQuerySchema,
  sortField: flashcardSortFieldSchema,
  sortDirection: flashcardSortDirectionSchema,

  // ID params
  idParams: flashcardIdParamsSchema,
  bookFlashcardIdParams: bookFlashcardIdParamsSchema,

  // Bulk operations
  bulkUpdateStatus: bulkUpdateFlashcardStatusSchema,
  bulkDelete: bulkDeleteFlashcardsSchema,

  // Statistics
  stats: flashcardStatsSchema,
  statsQuery: flashcardStatsQuerySchema,

  // AI generation
  generate: generateFlashcardsSchema,
} as const;
