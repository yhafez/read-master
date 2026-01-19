/**
 * GET /api/curriculums/browse
 *
 * Browse public curriculums with filtering, sorting, search, and pagination.
 *
 * This endpoint:
 * - Returns only PUBLIC visibility curriculums
 * - Supports filtering by category and difficulty
 * - Supports sorting by popularity, recent, or rating
 * - Supports search by title and description
 * - Uses pagination with configurable limits
 * - Caches results for performance
 *
 * @example
 * ```bash
 * # Browse all public curriculums
 * curl -X GET "/api/curriculums/browse" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Filter by category and difficulty
 * curl -X GET "/api/curriculums/browse?category=Philosophy&difficulty=Beginner" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Sort by popularity
 * curl -X GET "/api/curriculums/browse?sortBy=popularity&page=1&limit=20" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Search curriculums
 * curl -X GET "/api/curriculums/browse?search=classics&sortBy=recent" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import type { Prisma, Visibility } from "@read-master/database";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendSuccess,
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
 * Maximum search query length
 */
export const MAX_SEARCH_LENGTH = 200;

/**
 * Maximum category length
 */
export const MAX_CATEGORY_LENGTH = 100;

/**
 * Maximum difficulty length
 */
export const MAX_DIFFICULTY_LENGTH = 50;

/**
 * Cache TTL for browse results (5 minutes)
 */
export const BROWSE_CACHE_TTL = CacheTTL.SHORT;

/**
 * Valid sort options for browsing
 */
export const BrowseSortOptions = {
  POPULARITY: "popularity",
  RECENT: "recent",
  RATING: "rating",
  FOLLOWERS: "followers",
  ITEMS: "items",
} as const;

/**
 * Valid sort option values
 */
export const VALID_SORT_OPTIONS = Object.values(BrowseSortOptions);

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
 * Query parameters for browsing curriculums
 */
export type BrowseCurriculumsQueryParams = {
  page: number;
  limit: number;
  sortBy: string;
  category: string | null;
  difficulty: string | null;
  search: string | null;
  tag: string | null;
};

/**
 * User info in browse response
 */
export type BrowseUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Curriculum summary for browse response
 */
export type BrowseCurriculumSummary = {
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
  creator: BrowseUserInfo;
  isFollowing: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Pagination info
 */
export type BrowsePaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

/**
 * Browse response
 */
export type BrowseCurriculumsResponse = {
  curriculums: BrowseCurriculumSummary[];
  pagination: BrowsePaginationInfo;
  filters: {
    category: string | null;
    difficulty: string | null;
    search: string | null;
    tag: string | null;
    sortBy: string;
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse page number from query
 */
export function parsePage(value: unknown): number {
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1) {
      return num;
    }
  }
  if (typeof value === "number" && value >= 1) {
    return Math.floor(value);
  }
  return 1;
}

/**
 * Parse limit from query
 */
export function parseLimit(value: unknown): number {
  if (typeof value === "string") {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= MIN_LIMIT && num <= MAX_LIMIT) {
      return num;
    }
  }
  if (typeof value === "number" && value >= MIN_LIMIT && value <= MAX_LIMIT) {
    return Math.floor(value);
  }
  return DEFAULT_LIMIT;
}

/**
 * Parse sort option from query
 */
export function parseSortBy(value: unknown): string {
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (
      lower === BrowseSortOptions.POPULARITY ||
      lower === "popular" ||
      lower === "top"
    ) {
      return BrowseSortOptions.POPULARITY;
    }
    if (
      lower === BrowseSortOptions.RECENT ||
      lower === "newest" ||
      lower === "latest" ||
      lower === "new"
    ) {
      return BrowseSortOptions.RECENT;
    }
    if (lower === BrowseSortOptions.RATING || lower === "rated") {
      return BrowseSortOptions.RATING;
    }
    if (lower === BrowseSortOptions.FOLLOWERS || lower === "followed") {
      return BrowseSortOptions.FOLLOWERS;
    }
    if (lower === BrowseSortOptions.ITEMS || lower === "size") {
      return BrowseSortOptions.ITEMS;
    }
  }
  // Default to popularity for browse
  return BrowseSortOptions.POPULARITY;
}

/**
 * Check if sort option is valid
 */
export function isValidSortOption(value: string): boolean {
  return VALID_SORT_OPTIONS.includes(
    value as (typeof VALID_SORT_OPTIONS)[number]
  );
}

/**
 * Parse category from query
 */
export function parseCategory(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length <= MAX_CATEGORY_LENGTH) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Parse difficulty from query
 */
export function parseDifficulty(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Check against valid options (case-insensitive)
    const normalized = DIFFICULTY_OPTIONS.find(
      (opt) => opt.toLowerCase() === trimmed.toLowerCase()
    );
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

/**
 * Check if difficulty is valid
 */
export function isValidDifficulty(value: string): boolean {
  return DIFFICULTY_OPTIONS.some(
    (opt) => opt.toLowerCase() === value.toLowerCase()
  );
}

/**
 * Parse search query
 */
export function parseSearch(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length <= MAX_SEARCH_LENGTH) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Parse tag filter
 */
export function parseTag(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.length > 0 && trimmed.length <= 50) {
      return trimmed;
    }
  }
  return null;
}

/**
 * Parse all browse query parameters
 */
export function parseBrowseQuery(query: {
  page?: unknown;
  limit?: unknown;
  sortBy?: unknown;
  category?: unknown;
  difficulty?: unknown;
  search?: unknown;
  tag?: unknown;
}): BrowseCurriculumsQueryParams {
  return {
    page: parsePage(query.page),
    limit: parseLimit(query.limit),
    sortBy: parseSortBy(query.sortBy),
    category: parseCategory(query.category),
    difficulty: parseDifficulty(query.difficulty),
    search: parseSearch(query.search),
    tag: parseTag(query.tag),
  };
}

/**
 * Build cache key for browse results
 */
export function buildBrowseCacheKey(
  params: BrowseCurriculumsQueryParams
): string {
  const parts = [
    `${CacheKeyPrefix.USER}:curriculums:browse`,
    `p${params.page}`,
    `l${params.limit}`,
    `s${params.sortBy}`,
  ];
  if (params.category) parts.push(`cat-${params.category.toLowerCase()}`);
  if (params.difficulty) parts.push(`diff-${params.difficulty.toLowerCase()}`);
  if (params.search) parts.push(`q-${params.search.toLowerCase()}`);
  if (params.tag) parts.push(`tag-${params.tag}`);
  return parts.join(":");
}

/**
 * Format date as ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Map user to browse response format
 */
export function mapToBrowseUserInfo(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}): BrowseUserInfo {
  return {
    id: user.id,
    username: user.username ?? "anonymous",
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Map curriculum to browse response format
 */
export function mapToBrowseCurriculumSummary(
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
): BrowseCurriculumSummary {
  const isFollowing =
    curriculum.followers?.some((f) => f.userId === currentUserId) ?? false;

  return {
    id: curriculum.id,
    title: curriculum.title,
    description: truncateDescription(curriculum.description, 300),
    coverImage: curriculum.coverImage,
    category: curriculum.category,
    tags: curriculum.tags,
    difficulty: curriculum.difficulty,
    visibility: curriculum.visibility,
    totalItems: curriculum.totalItems,
    followersCount: curriculum.followersCount,
    creator: mapToBrowseUserInfo(curriculum.user),
    isFollowing,
    createdAt: formatDate(curriculum.createdAt),
    updatedAt: formatDate(curriculum.updatedAt),
  };
}

/**
 * Truncate description to max length
 */
export function truncateDescription(
  description: string,
  maxLength: number
): string {
  if (description.length <= maxLength) {
    return description;
  }
  return description.slice(0, maxLength).trim() + "...";
}

/**
 * Calculate pagination info
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): BrowsePaginationInfo {
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
 * Build order by clause based on sort option
 */
export function buildOrderBy(
  sortBy: string
): Array<Record<string, "asc" | "desc">> {
  switch (sortBy) {
    case BrowseSortOptions.POPULARITY:
      // Sort by followers count descending, then by recent
      return [{ followersCount: "desc" }, { createdAt: "desc" }];
    case BrowseSortOptions.RECENT:
      // Sort by creation date descending
      return [{ createdAt: "desc" }];
    case BrowseSortOptions.RATING:
      // For now, use followers as a proxy for rating
      // In the future, this could be based on actual ratings
      return [{ followersCount: "desc" }, { createdAt: "desc" }];
    case BrowseSortOptions.FOLLOWERS:
      return [{ followersCount: "desc" }, { createdAt: "desc" }];
    case BrowseSortOptions.ITEMS:
      // Sort by total items descending (largest curriculums first)
      return [{ totalItems: "desc" }, { createdAt: "desc" }];
    default:
      return [{ followersCount: "desc" }, { createdAt: "desc" }];
  }
}

/**
 * Build where clause for browse query
 */
export function buildBrowseWhereClause(
  params: BrowseCurriculumsQueryParams
): Prisma.CurriculumWhereInput {
  // Always filter to PUBLIC only and not deleted
  const where: Prisma.CurriculumWhereInput = {
    visibility: "PUBLIC" as Visibility,
    deletedAt: null,
  };

  // Filter by category (case-insensitive)
  if (params.category) {
    where.category = {
      equals: params.category,
      mode: "insensitive",
    };
  }

  // Filter by difficulty (exact match from normalized input)
  if (params.difficulty) {
    where.difficulty = params.difficulty;
  }

  // Filter by tag (check if tag array contains the value)
  if (params.tag) {
    where.tags = {
      has: params.tag,
    };
  }

  // Search in title and description
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }

  return where;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/curriculums/browse
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET
  if (req.method !== "GET") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET.",
      405
    );
    return;
  }

  const { userId: clerkUserId } = req.auth;

  // Get current user
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  try {
    // Parse query parameters
    const params = parseBrowseQuery(req.query);

    // Try cache first
    const cacheKey = buildBrowseCacheKey(params);
    const cached = await cache.get<BrowseCurriculumsResponse>(cacheKey);

    if (cached) {
      // Re-check following status for cached results
      const curriculumIds = cached.curriculums.map((c) => c.id);
      const userFollows = await db.curriculumFollow.findMany({
        where: {
          userId: user.id,
          curriculumId: { in: curriculumIds },
        },
        select: { curriculumId: true },
      });
      const followedIds = new Set(userFollows.map((f) => f.curriculumId));

      // Update isFollowing status
      const updatedCurriculums = cached.curriculums.map((c) => ({
        ...c,
        isFollowing: followedIds.has(c.id),
      }));

      logger.debug("Curriculums browse cache hit", { userId: user.id });
      sendSuccess(res, { ...cached, curriculums: updatedCurriculums });
      return;
    }

    // Build query
    const where = buildBrowseWhereClause(params);
    const orderBy = buildOrderBy(params.sortBy);
    const skip = (params.page - 1) * params.limit;

    // Execute queries in parallel
    const [total, curriculums] = await Promise.all([
      db.curriculum.count({ where }),
      db.curriculum.findMany({
        where,
        orderBy,
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
            select: { userId: true },
          },
        },
      }),
    ]);

    // Map to response format
    const curriculumResponses = curriculums.map((curriculum) =>
      mapToBrowseCurriculumSummary(curriculum, user.id)
    );

    const response: BrowseCurriculumsResponse = {
      curriculums: curriculumResponses,
      pagination: calculatePagination(total, params.page, params.limit),
      filters: {
        category: params.category,
        difficulty: params.difficulty,
        search: params.search,
        tag: params.tag,
        sortBy: params.sortBy,
      },
    };

    // Cache the response (without user-specific isFollowing status)
    // We'll re-check following status on cache hit
    await cache.set(cacheKey, response, { ttl: BROWSE_CACHE_TTL });

    logger.info("Curriculums browse completed", {
      userId: user.id,
      params,
      count: curriculumResponses.length,
      total,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error browsing curriculums", {
      userId: user.id,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to browse curriculums. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
