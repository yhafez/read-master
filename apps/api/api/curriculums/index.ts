/**
 * Curriculum API - List and Create
 *
 * GET /api/curriculums - List user's curriculums
 *   - Returns curriculums created by the user
 *   - Supports filtering and pagination
 *
 * POST /api/curriculums - Create a curriculum
 *   - Requires Pro or Scholar tier
 *   - Applies profanity filter to title and description
 *
 * @example
 * ```bash
 * # List curriculums
 * curl -X GET "/api/curriculums?page=1&limit=20" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Create curriculum
 * curl -X POST "/api/curriculums" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"title":"My Learning Path","description":"A curated curriculum","visibility":"PUBLIC"}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import type { Prisma, Visibility } from "@read-master/database";
import {
  containsProfanity,
  validateFieldsNoProfanity,
  getTierLimits,
} from "@read-master/shared";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendSuccess,
  sendPaginated,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import { cache, CacheKeyPrefix, CacheTTL } from "../../src/services/redis.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Default number of items per page
 */
export const DEFAULT_LIMIT = 20;

/**
 * Maximum number of items per page
 */
export const MAX_LIMIT = 50;

/**
 * Minimum number of items per page
 */
export const MIN_LIMIT = 1;

/**
 * Maximum title length
 */
export const MAX_TITLE_LENGTH = 200;

/**
 * Maximum description length
 */
export const MAX_DESCRIPTION_LENGTH = 5000;

/**
 * Maximum category length
 */
export const MAX_CATEGORY_LENGTH = 100;

/**
 * Maximum difficulty length
 */
export const MAX_DIFFICULTY_LENGTH = 50;

/**
 * Maximum tags allowed
 */
export const MAX_TAGS = 10;

/**
 * Maximum tag length
 */
export const MAX_TAG_LENGTH = 50;

/**
 * Cache TTL for curriculum lists
 */
export const CURRICULUMS_CACHE_TTL = CacheTTL.SHORT;

/**
 * Valid visibility options
 */
export const VISIBILITY_OPTIONS = ["PUBLIC", "PRIVATE", "UNLISTED"] as const;

/**
 * Valid difficulty options
 */
export const DIFFICULTY_OPTIONS = [
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Query parameters for listing curriculums
 */
export type ListCurriculumsQueryParams = {
  visibility: Visibility | null;
  page: number;
  limit: number;
};

/**
 * User info in curriculum responses
 */
export type CurriculumUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Curriculum item info in responses
 */
export type CurriculumItemInfo = {
  id: string;
  orderIndex: number;
  bookId: string | null;
  externalTitle: string | null;
  externalAuthor: string | null;
  externalUrl: string | null;
  notes: string | null;
  estimatedTime: number | null;
  isOptional: boolean;
};

/**
 * Curriculum response data
 */
export type CurriculumResponse = {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  category: string | null;
  tags: string[];
  difficulty: string | null;
  visibility: Visibility;
  totalItems: number;
  followersCount: number;
  creator: CurriculumUserInfo;
  isFollowing: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Curriculum detail response (includes items)
 */
export type CurriculumDetailResponse = CurriculumResponse & {
  items: CurriculumItemInfo[];
};

/**
 * Create curriculum input
 */
export type CreateCurriculumInput = {
  title: string;
  description: string;
  coverImage?: string | null;
  category?: string | null;
  tags?: string[];
  difficulty?: string | null;
  visibility: Visibility;
};

/**
 * Pagination info
 */
export type CurriculumsPaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

/**
 * List curriculums response
 */
export type ListCurriculumsResponse = {
  curriculums: CurriculumResponse[];
  pagination: CurriculumsPaginationInfo;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for listing curriculums query parameters
 */
export const listCurriculumsQuerySchema = z.object({
  visibility: z
    .enum(VISIBILITY_OPTIONS)
    .optional()
    .nullable()
    .transform((val) => val ?? null),
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(MIN_LIMIT, `Limit must be at least ${MIN_LIMIT}`)
    .max(MAX_LIMIT, `Limit must be at most ${MAX_LIMIT}`)
    .default(DEFAULT_LIMIT),
});

/**
 * Schema for creating a curriculum
 */
export const createCurriculumSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(
      MAX_TITLE_LENGTH,
      `Title must be at most ${MAX_TITLE_LENGTH} characters`
    )
    .refine(
      (val) => !containsProfanity(val),
      "Title contains inappropriate language"
    ),
  description: z
    .string()
    .min(1, "Description is required")
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`
    )
    .refine(
      (val) => !containsProfanity(val),
      "Description contains inappropriate language"
    ),
  coverImage: z
    .string()
    .url("Cover image must be a valid URL")
    .optional()
    .nullable(),
  category: z
    .string()
    .max(
      MAX_CATEGORY_LENGTH,
      `Category must be at most ${MAX_CATEGORY_LENGTH} characters`
    )
    .optional()
    .nullable()
    .refine(
      (val) => !val || !containsProfanity(val),
      "Category contains inappropriate language"
    ),
  tags: z
    .array(
      z
        .string()
        .max(MAX_TAG_LENGTH, `Tag must be at most ${MAX_TAG_LENGTH} characters`)
    )
    .max(MAX_TAGS, `Maximum ${MAX_TAGS} tags allowed`)
    .optional()
    .default([]),
  difficulty: z.enum(DIFFICULTY_OPTIONS).optional().nullable(),
  visibility: z.enum(VISIBILITY_OPTIONS).default("PRIVATE"),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse query parameters for listing curriculums
 */
export function parseListCurriculumsQuery(
  query: Record<string, string | string[] | undefined>
): ListCurriculumsQueryParams {
  const result = listCurriculumsQuerySchema.safeParse(query);
  if (!result.success) {
    return {
      visibility: null,
      page: 1,
      limit: DEFAULT_LIMIT,
    };
  }
  return result.data;
}

/**
 * Build cache key for curriculum list
 */
export function buildCurriculumsListCacheKey(
  userId: string,
  params: ListCurriculumsQueryParams
): string {
  const parts = [
    CacheKeyPrefix.USER,
    userId,
    "curriculums",
    `page-${params.page}`,
    `limit-${params.limit}`,
  ];
  if (params.visibility) {
    parts.push(`visibility-${params.visibility}`);
  }
  return parts.join(":");
}

/**
 * Format date as ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Map user data to CurriculumUserInfo
 */
export function mapToCurriculumUserInfo(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}): CurriculumUserInfo {
  return {
    id: user.id,
    username: user.username ?? "anonymous",
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Map curriculum item to CurriculumItemInfo
 */
export function mapToCurriculumItemInfo(item: {
  id: string;
  orderIndex: number;
  bookId: string | null;
  externalTitle: string | null;
  externalAuthor: string | null;
  externalUrl: string | null;
  notes: string | null;
  estimatedTime: number | null;
  isOptional: boolean;
}): CurriculumItemInfo {
  return {
    id: item.id,
    orderIndex: item.orderIndex,
    bookId: item.bookId,
    externalTitle: item.externalTitle,
    externalAuthor: item.externalAuthor,
    externalUrl: item.externalUrl,
    notes: item.notes,
    estimatedTime: item.estimatedTime,
    isOptional: item.isOptional,
  };
}

/**
 * Map curriculum data to CurriculumResponse
 */
export function mapToCurriculumResponse(
  curriculum: {
    id: string;
    title: string;
    description: string;
    coverImage: string | null;
    category: string | null;
    tags: string[];
    difficulty: string | null;
    visibility: Visibility;
    totalItems: number;
    followersCount: number;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      username: string | null;
      displayName: string | null;
      avatarUrl: string | null;
    };
    followers?: Array<{
      userId: string;
    }>;
  },
  currentUserId: string
): CurriculumResponse {
  const isFollowing =
    curriculum.followers?.some((f) => f.userId === currentUserId) ?? false;

  return {
    id: curriculum.id,
    title: curriculum.title,
    description: curriculum.description,
    coverImage: curriculum.coverImage,
    category: curriculum.category,
    tags: curriculum.tags,
    difficulty: curriculum.difficulty,
    visibility: curriculum.visibility,
    totalItems: curriculum.totalItems,
    followersCount: curriculum.followersCount,
    creator: mapToCurriculumUserInfo(curriculum.user),
    isFollowing,
    createdAt: formatDate(curriculum.createdAt),
    updatedAt: formatDate(curriculum.updatedAt),
  };
}

/**
 * Calculate pagination info
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): CurriculumsPaginationInfo {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}

/**
 * Check if user can create curriculums based on tier
 */
export function canCreateCurriculum(tier: string): boolean {
  const limits = getTierLimits(tier as "FREE" | "PRO" | "SCHOLAR");
  return limits.canCreateCurriculums;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Build where clause for listing user's curriculums
 */
export function buildCurriculumsWhereClause(
  userId: string,
  params: ListCurriculumsQueryParams
): Prisma.CurriculumWhereInput {
  const where: Prisma.CurriculumWhereInput = {
    userId,
    deletedAt: null,
  };

  // Filter by visibility if specified
  if (params.visibility) {
    where.visibility = params.visibility;
  }

  return where;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET and POST /api/curriculums
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const { userId: clerkUserId } = req.auth;

  // Get current user
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  if (req.method === "GET") {
    await handleListCurriculums(req, res, user);
  } else if (req.method === "POST") {
    await handleCreateCurriculum(req, res, user);
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET or POST.",
      405
    );
  }
}

/**
 * Handle GET /api/curriculums - List curriculums
 */
async function handleListCurriculums(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string; tier: string }
): Promise<void> {
  try {
    // Parse query parameters
    const params = parseListCurriculumsQuery(
      req.query as Record<string, string | string[] | undefined>
    );

    // Try cache first
    const cacheKey = buildCurriculumsListCacheKey(user.id, params);
    const cached = await cache.get<{
      curriculums: CurriculumResponse[];
      total: number;
    }>(cacheKey);

    if (cached) {
      logger.info("Curriculums list cache hit", { userId: user.id });
      sendPaginated(
        res,
        cached.curriculums,
        params.page,
        params.limit,
        cached.total
      );
      return;
    }

    // Build query
    const where = buildCurriculumsWhereClause(user.id, params);
    const skip = (params.page - 1) * params.limit;

    // Execute queries in parallel
    const [total, curriculums] = await Promise.all([
      db.curriculum.count({ where }),
      db.curriculum.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: params.limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          followers: {
            where: { userId: user.id },
            select: {
              userId: true,
            },
          },
        },
      }),
    ]);

    // Map to response format
    const curriculumResponses = curriculums.map((curriculum) =>
      mapToCurriculumResponse(curriculum, user.id)
    );

    // Cache results
    await cache.set(
      cacheKey,
      { curriculums: curriculumResponses, total },
      { ttl: CURRICULUMS_CACHE_TTL }
    );

    logger.info("Curriculums listed", {
      userId: user.id,
      params,
      count: curriculumResponses.length,
      total,
    });

    sendPaginated(res, curriculumResponses, params.page, params.limit, total);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error listing curriculums", {
      userId: user.id,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to list curriculums. Please try again.",
      500
    );
  }
}

/**
 * Handle POST /api/curriculums - Create curriculum
 */
async function handleCreateCurriculum(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string; tier: string }
): Promise<void> {
  try {
    // Check tier permissions
    if (!canCreateCurriculum(user.tier)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Creating curriculums requires Pro or Scholar subscription",
        403
      );
      return;
    }

    // Validate input
    const validationResult = createCurriculumSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid input",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const input = validationResult.data;

    // Additional profanity check (belt and suspenders)
    const fieldsToCheck = [
      { value: input.title, name: "Title" },
      { value: input.description, name: "Description" },
    ];
    if (input.category) {
      fieldsToCheck.push({ value: input.category, name: "Category" });
    }

    const profanityCheck = validateFieldsNoProfanity(fieldsToCheck);
    if (!profanityCheck.valid) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        profanityCheck.errors[0] ?? "Content contains inappropriate language",
        400
      );
      return;
    }

    // Create curriculum
    const curriculum = await db.curriculum.create({
      data: {
        userId: user.id,
        title: input.title,
        description: input.description,
        coverImage: input.coverImage ?? null,
        category: input.category ?? null,
        tags: input.tags ?? [],
        difficulty: input.difficulty ?? null,
        visibility: input.visibility,
        totalItems: 0,
        followersCount: 0,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Invalidate cache
    const cachePattern = `${CacheKeyPrefix.USER}:${user.id}:curriculums:*`;
    await cache.invalidatePattern(cachePattern);

    // Build response
    const response = mapToCurriculumResponse(
      { ...curriculum, followers: [] },
      user.id
    );

    logger.info("Curriculum created", {
      userId: user.id,
      curriculumId: curriculum.id,
      title: curriculum.title,
      visibility: curriculum.visibility,
    });

    sendSuccess(res, response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error creating curriculum", {
      userId: user.id,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to create curriculum. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
