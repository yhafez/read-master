/**
 * Zod schemas for Curriculum operations
 *
 * These schemas validate curriculum-related API requests for:
 * - Creating and managing curriculums (Pro/Scholar only)
 * - Adding and ordering curriculum items
 * - Following and progress tracking
 * - Browsing and searching public curriculums
 *
 * Profanity filtering is applied to public-facing content (title, description).
 *
 * @example
 * ```typescript
 * import { createCurriculumSchema, curriculumQuerySchema } from '@read-master/shared/schemas';
 *
 * // Validate curriculum creation
 * const result = createCurriculumSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 * ```
 */

import { z } from "zod";

import { containsProfanity } from "../utils/moderation";

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

/**
 * Visibility enum - controls who can see content
 */
export const visibilitySchema = z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]);
export type VisibilitySchema = z.infer<typeof visibilitySchema>;

/**
 * Difficulty level enum for curriculums
 */
export const difficultySchema = z.enum([
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
]);
export type DifficultySchema = z.infer<typeof difficultySchema>;

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * Curriculum ID validation (CUID format)
 */
export const curriculumIdSchema = z
  .string()
  .min(1, "Curriculum ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid curriculum ID format");
export type CurriculumIdInput = z.infer<typeof curriculumIdSchema>;

/**
 * Curriculum item ID validation (CUID format)
 */
export const curriculumItemIdSchema = z
  .string()
  .min(1, "Curriculum item ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid curriculum item ID format");
export type CurriculumItemIdInput = z.infer<typeof curriculumItemIdSchema>;

/**
 * Book ID validation (optional for curriculum items)
 */
export const curriculumBookIdSchema = z
  .string()
  .regex(/^c[a-z0-9]+$/, "Invalid book ID format")
  .optional()
  .nullable();

/**
 * Curriculum title validation (1-200 chars)
 * - Required field
 * - Trimmed of whitespace
 */
export const curriculumTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(200, "Title must be at most 200 characters");
export type CurriculumTitleInput = z.infer<typeof curriculumTitleSchema>;

/**
 * Curriculum title with profanity filter (for public curriculums)
 */
export const curriculumTitlePublicSchema = curriculumTitleSchema.refine(
  (val) => !containsProfanity(val),
  "Title contains inappropriate language"
);

/**
 * Curriculum description validation
 * - Required field
 * - Max 10,000 characters
 * - Trimmed of whitespace
 */
export const curriculumDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Description is required")
  .max(10000, "Description must be at most 10,000 characters");
export type CurriculumDescriptionInput = z.infer<
  typeof curriculumDescriptionSchema
>;

/**
 * Curriculum description with profanity filter (for public curriculums)
 */
export const curriculumDescriptionPublicSchema =
  curriculumDescriptionSchema.refine(
    (val) => !containsProfanity(val),
    "Description contains inappropriate language"
  );

/**
 * Category validation for curriculums
 */
export const curriculumCategorySchema = z
  .string()
  .trim()
  .max(100, "Category must be at most 100 characters")
  .optional()
  .nullable();

/**
 * Tag validation for curriculums
 */
export const curriculumTagSchema = z
  .string()
  .min(1, "Tag cannot be empty")
  .max(50, "Tag must be at most 50 characters")
  .trim()
  .regex(
    /^[a-zA-Z0-9\s\-_]+$/,
    "Tags can only contain letters, numbers, spaces, hyphens, and underscores"
  );

/**
 * Tags array validation for curriculums
 */
export const curriculumTagsArraySchema = z
  .array(curriculumTagSchema)
  .max(20, "Maximum 20 tags allowed")
  .default([]);

/**
 * Cover image URL validation
 */
export const curriculumCoverImageSchema = z
  .string()
  .url("Invalid cover image URL")
  .max(2000, "URL must be at most 2000 characters")
  .optional()
  .nullable();

/**
 * Order index validation (for curriculum items)
 */
export const orderIndexSchema = z
  .number()
  .int("Order index must be an integer")
  .nonnegative("Order index must be non-negative");

/**
 * Estimated time validation (in minutes)
 */
export const estimatedTimeSchema = z
  .number()
  .int("Estimated time must be an integer")
  .positive("Estimated time must be positive")
  .max(10000, "Estimated time is too long")
  .optional()
  .nullable();

// =============================================================================
// CREATE CURRICULUM SCHEMAS
// =============================================================================

/**
 * Create curriculum schema (base, without profanity filter)
 * Used for internal/system operations
 */
export const createCurriculumBaseSchema = z.object({
  title: curriculumTitleSchema,
  description: curriculumDescriptionSchema,
  coverImage: curriculumCoverImageSchema,
  category: curriculumCategorySchema,
  tags: curriculumTagsArraySchema.optional(),
  difficulty: difficultySchema.optional(),
  visibility: visibilitySchema.default("PRIVATE"),
});
export type CreateCurriculumBaseInput = z.infer<
  typeof createCurriculumBaseSchema
>;

/**
 * Create curriculum schema (with profanity filter for public content)
 * Used for user-facing API
 */
export const createCurriculumSchema = z
  .object({
    title: curriculumTitleSchema,
    description: curriculumDescriptionSchema,
    coverImage: curriculumCoverImageSchema,
    category: curriculumCategorySchema,
    tags: curriculumTagsArraySchema.optional(),
    difficulty: difficultySchema.optional(),
    visibility: visibilitySchema.default("PRIVATE"),
  })
  .refine(
    (data) => {
      // Only check profanity for public/unlisted curriculums
      if (data.visibility === "PRIVATE") {
        return true;
      }
      return (
        !containsProfanity(data.title) && !containsProfanity(data.description)
      );
    },
    {
      message: "Content contains inappropriate language",
      path: ["title"], // Point to the first field as the error location
    }
  );
export type CreateCurriculumInput = z.infer<typeof createCurriculumSchema>;

// =============================================================================
// UPDATE CURRICULUM SCHEMAS
// =============================================================================

/**
 * Update curriculum schema (base, without profanity filter)
 */
export const updateCurriculumBaseSchema = z
  .object({
    title: curriculumTitleSchema.optional(),
    description: curriculumDescriptionSchema.optional(),
    coverImage: curriculumCoverImageSchema,
    category: curriculumCategorySchema,
    tags: curriculumTagsArraySchema.optional(),
    difficulty: difficultySchema.optional(),
    visibility: visibilitySchema.optional(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  );
export type UpdateCurriculumBaseInput = z.infer<
  typeof updateCurriculumBaseSchema
>;

/**
 * Update curriculum schema (with profanity filter for public content)
 */
export const updateCurriculumSchema = z
  .object({
    title: curriculumTitleSchema.optional(),
    description: curriculumDescriptionSchema.optional(),
    coverImage: curriculumCoverImageSchema,
    category: curriculumCategorySchema,
    tags: curriculumTagsArraySchema.optional(),
    difficulty: difficultySchema.optional(),
    visibility: visibilitySchema.optional(),
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
      // Only check profanity if visibility is public/unlisted or being changed to it
      if (data.visibility === "PRIVATE") {
        return true;
      }
      const titleClean = !data.title || !containsProfanity(data.title);
      const descClean =
        !data.description || !containsProfanity(data.description);
      return titleClean && descClean;
    },
    {
      message: "Content contains inappropriate language",
      path: ["title"],
    }
  );
export type UpdateCurriculumInput = z.infer<typeof updateCurriculumSchema>;

// =============================================================================
// CURRICULUM ITEM SCHEMAS
// =============================================================================

/**
 * External resource fields schema (for items not in the system)
 */
export const externalResourceSchema = z.object({
  externalTitle: z
    .string()
    .trim()
    .min(1)
    .max(500, "Title must be at most 500 characters"),
  externalAuthor: z
    .string()
    .trim()
    .max(200, "Author must be at most 200 characters")
    .optional()
    .nullable(),
  externalUrl: z.string().url("Invalid URL").max(2000).optional().nullable(),
  externalIsbn: z
    .string()
    .regex(/^[\d-]{10,20}$/, "Invalid ISBN format")
    .optional()
    .nullable(),
});
export type ExternalResource = z.infer<typeof externalResourceSchema>;

/**
 * Curriculum item notes schema
 */
export const curriculumItemNotesSchema = z
  .string()
  .trim()
  .max(5000, "Notes must be at most 5,000 characters")
  .optional()
  .nullable();

/**
 * Curriculum item notes with profanity filter (for public curriculums)
 */
export const curriculumItemNotesPublicSchema = curriculumItemNotesSchema.refine(
  (val) => !val || !containsProfanity(val),
  "Notes contain inappropriate language"
);

/**
 * Add curriculum item schema (book reference)
 */
export const addBookItemSchema = z.object({
  bookId: z.string().regex(/^c[a-z0-9]+$/, "Invalid book ID format"),
  orderIndex: orderIndexSchema.optional(),
  notes: curriculumItemNotesSchema,
  estimatedTime: estimatedTimeSchema,
  isOptional: z.boolean().default(false),
});
export type AddBookItemInput = z.infer<typeof addBookItemSchema>;

/**
 * Add curriculum item schema (external resource)
 */
export const addExternalItemSchema = externalResourceSchema.extend({
  orderIndex: orderIndexSchema.optional(),
  notes: curriculumItemNotesSchema,
  estimatedTime: estimatedTimeSchema,
  isOptional: z.boolean().default(false),
});
export type AddExternalItemInput = z.infer<typeof addExternalItemSchema>;

/**
 * Add curriculum item schema (combined - either book or external)
 */
export const addCurriculumItemSchema = z
  .object({
    bookId: z
      .string()
      .regex(/^c[a-z0-9]+$/)
      .optional()
      .nullable(),
    externalTitle: z.string().trim().max(500).optional().nullable(),
    externalAuthor: z.string().trim().max(200).optional().nullable(),
    externalUrl: z.string().url().max(2000).optional().nullable(),
    externalIsbn: z
      .string()
      .regex(/^[\d-]{10,20}$/)
      .optional()
      .nullable(),
    orderIndex: orderIndexSchema.optional(),
    notes: curriculumItemNotesSchema,
    estimatedTime: estimatedTimeSchema,
    isOptional: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // Either bookId OR externalTitle must be provided
      return Boolean(data.bookId) || Boolean(data.externalTitle);
    },
    {
      message: "Either bookId or externalTitle is required",
      path: ["bookId"],
    }
  );
export type AddCurriculumItemInput = z.infer<typeof addCurriculumItemSchema>;

/**
 * Update curriculum item schema
 */
export const updateCurriculumItemSchema = z
  .object({
    orderIndex: orderIndexSchema.optional(),
    notes: curriculumItemNotesSchema,
    estimatedTime: estimatedTimeSchema,
    isOptional: z.boolean().optional(),
    // Can update external fields if it's an external resource
    externalTitle: z.string().trim().max(500).optional(),
    externalAuthor: z.string().trim().max(200).optional().nullable(),
    externalUrl: z.string().url().max(2000).optional().nullable(),
  })
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  );
export type UpdateCurriculumItemInput = z.infer<
  typeof updateCurriculumItemSchema
>;

/**
 * Reorder curriculum items schema
 */
export const reorderCurriculumItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: curriculumItemIdSchema,
        orderIndex: orderIndexSchema,
      })
    )
    .min(1, "At least one item is required")
    .max(500, "Maximum 500 items can be reordered at once"),
});
export type ReorderCurriculumItemsInput = z.infer<
  typeof reorderCurriculumItemsSchema
>;

// =============================================================================
// CURRICULUM FOLLOW SCHEMAS
// =============================================================================

/**
 * Follow curriculum schema
 */
export const followCurriculumSchema = z.object({
  curriculumId: curriculumIdSchema,
});
export type FollowCurriculumInput = z.infer<typeof followCurriculumSchema>;

/**
 * Update curriculum progress schema
 */
export const updateCurriculumProgressSchema = z.object({
  currentItemIndex: z.number().int().nonnegative().optional(),
  completedItems: z.number().int().nonnegative().optional(),
});
export type UpdateCurriculumProgressInput = z.infer<
  typeof updateCurriculumProgressSchema
>;

/**
 * Mark curriculum item complete schema
 */
export const markItemCompleteSchema = z.object({
  itemId: curriculumItemIdSchema,
});
export type MarkItemCompleteInput = z.infer<typeof markItemCompleteSchema>;

// =============================================================================
// CURRICULUM QUERY SCHEMAS
// =============================================================================

/**
 * Sort fields for curriculums
 */
export const curriculumSortFieldSchema = z.enum([
  "createdAt",
  "updatedAt",
  "title",
  "followersCount",
  "totalItems",
]);
export type CurriculumSortField = z.infer<typeof curriculumSortFieldSchema>;

/**
 * Sort direction
 */
export const curriculumSortDirectionSchema = z.enum(["asc", "desc"]);
export type CurriculumSortDirection = z.infer<
  typeof curriculumSortDirectionSchema
>;

/**
 * Curriculum list query parameters (user's own curriculums)
 */
export const curriculumQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: curriculumSortFieldSchema.default("createdAt"),
  sortDirection: curriculumSortDirectionSchema.default("desc"),

  // Filters
  visibility: visibilitySchema.optional(),
  category: z.string().max(100).optional(),
  difficulty: difficultySchema.optional(),
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
export type CurriculumQueryInput = z.infer<typeof curriculumQuerySchema>;

/**
 * Browse public curriculums query parameters
 */
export const browseCurriculumsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: z
    .enum(["createdAt", "followersCount", "title", "totalItems"])
    .default("followersCount"),
  sortDirection: curriculumSortDirectionSchema.default("desc"),

  // Filters (public curriculums only)
  category: z.string().max(100).optional(),
  difficulty: difficultySchema.optional(),
  tags: z
    .string()
    .transform((val) => val.split(",").map((t) => t.trim()))
    .pipe(z.array(z.string().max(50)))
    .optional(),

  // Search
  search: z.string().max(200).trim().optional(),

  // Minimum followers
  minFollowers: z.coerce.number().int().nonnegative().optional(),
});
export type BrowseCurriculumsQueryInput = z.infer<
  typeof browseCurriculumsQuerySchema
>;

/**
 * Following curriculums query parameters
 */
export const followingCurriculumsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Filters
  completed: z.coerce.boolean().optional(), // Filter by completion status
  inProgress: z.coerce.boolean().optional(),
});
export type FollowingCurriculumsQueryInput = z.infer<
  typeof followingCurriculumsQuerySchema
>;

// =============================================================================
// CURRICULUM ID PARAMS SCHEMAS
// =============================================================================

/**
 * Curriculum ID params schema (for route params)
 */
export const curriculumIdParamsSchema = z.object({
  id: curriculumIdSchema,
});
export type CurriculumIdParamsInput = z.infer<typeof curriculumIdParamsSchema>;

/**
 * Curriculum and item ID params schema (for nested routes)
 */
export const curriculumItemIdParamsSchema = z.object({
  curriculumId: curriculumIdSchema,
  itemId: curriculumItemIdSchema,
});
export type CurriculumItemIdParamsInput = z.infer<
  typeof curriculumItemIdParamsSchema
>;

// =============================================================================
// BULK OPERATIONS SCHEMAS
// =============================================================================

/**
 * Bulk delete curriculum items schema
 */
export const bulkDeleteCurriculumItemsSchema = z.object({
  itemIds: z
    .array(curriculumItemIdSchema)
    .min(1, "At least one item ID is required")
    .max(100, "Maximum 100 items can be deleted at once"),
});
export type BulkDeleteCurriculumItemsInput = z.infer<
  typeof bulkDeleteCurriculumItemsSchema
>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Curriculum item response schema
 */
export const curriculumItemResponseSchema = z.object({
  id: curriculumItemIdSchema,
  orderIndex: z.number().int(),
  bookId: z.string().nullable(),
  book: z
    .object({
      id: z.string(),
      title: z.string(),
      author: z.string().nullable(),
      coverImage: z.string().nullable(),
    })
    .nullable()
    .optional(),
  externalTitle: z.string().nullable(),
  externalAuthor: z.string().nullable(),
  externalUrl: z.string().nullable(),
  externalIsbn: z.string().nullable(),
  notes: z.string().nullable(),
  estimatedTime: z.number().nullable(),
  isOptional: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CurriculumItemResponse = z.infer<
  typeof curriculumItemResponseSchema
>;

/**
 * Curriculum summary response schema
 */
export const curriculumSummarySchema = z.object({
  id: curriculumIdSchema,
  title: z.string(),
  description: z.string(),
  coverImage: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()),
  difficulty: difficultySchema.nullable(),
  visibility: visibilitySchema,
  totalItems: z.number().int(),
  followersCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  user: z
    .object({
      id: z.string(),
      username: z.string().nullable(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
    })
    .optional(),
});
export type CurriculumSummary = z.infer<typeof curriculumSummarySchema>;

/**
 * Full curriculum response schema (with items)
 */
export const curriculumResponseSchema = curriculumSummarySchema.extend({
  items: z.array(curriculumItemResponseSchema),
  isFollowing: z.boolean().optional(),
  followProgress: z
    .object({
      currentItemIndex: z.number().int(),
      completedItems: z.number().int(),
      startedAt: z.string().datetime(),
      completedAt: z.string().datetime().nullable(),
    })
    .optional(),
});
export type CurriculumResponse = z.infer<typeof curriculumResponseSchema>;

// =============================================================================
// SCHEMA INDEX (convenient re-exports)
// =============================================================================

/**
 * All curriculum-related schemas for convenient importing
 */
export const curriculumSchemas = {
  // Enums
  visibility: visibilitySchema,
  difficulty: difficultySchema,

  // Field schemas
  curriculumId: curriculumIdSchema,
  itemId: curriculumItemIdSchema,
  title: curriculumTitleSchema,
  titlePublic: curriculumTitlePublicSchema,
  description: curriculumDescriptionSchema,
  descriptionPublic: curriculumDescriptionPublicSchema,
  category: curriculumCategorySchema,
  tags: curriculumTagsArraySchema,
  coverImage: curriculumCoverImageSchema,
  orderIndex: orderIndexSchema,
  estimatedTime: estimatedTimeSchema,

  // Create schemas
  create: createCurriculumSchema,
  createBase: createCurriculumBaseSchema,

  // Update schemas
  update: updateCurriculumSchema,
  updateBase: updateCurriculumBaseSchema,

  // Item schemas
  addItem: addCurriculumItemSchema,
  addBookItem: addBookItemSchema,
  addExternalItem: addExternalItemSchema,
  updateItem: updateCurriculumItemSchema,
  reorderItems: reorderCurriculumItemsSchema,
  itemNotes: curriculumItemNotesSchema,
  itemNotesPublic: curriculumItemNotesPublicSchema,
  externalResource: externalResourceSchema,

  // Follow schemas
  follow: followCurriculumSchema,
  updateProgress: updateCurriculumProgressSchema,
  markItemComplete: markItemCompleteSchema,

  // Query schemas
  query: curriculumQuerySchema,
  browse: browseCurriculumsQuerySchema,
  following: followingCurriculumsQuerySchema,
  sortField: curriculumSortFieldSchema,
  sortDirection: curriculumSortDirectionSchema,

  // ID params
  idParams: curriculumIdParamsSchema,
  itemIdParams: curriculumItemIdParamsSchema,

  // Bulk operations
  bulkDeleteItems: bulkDeleteCurriculumItemsSchema,

  // Response schemas
  itemResponse: curriculumItemResponseSchema,
  summary: curriculumSummarySchema,
  response: curriculumResponseSchema,
} as const;
