/**
 * Forum Categories API
 *
 * GET /api/forum/categories - List all active forum categories
 *   - Returns categories sorted by sortOrder
 *   - Includes post counts and last post info
 *   - Results are cached for 5 minutes
 *
 * @example
 * ```bash
 * # List categories
 * curl -X GET "/api/forum/categories" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";

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
import { cache, CacheKeyPrefix } from "../../src/services/redis.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Cache TTL for categories data (5 minutes)
 */
export const CATEGORIES_CACHE_TTL = 60 * 5;

/**
 * Cache key for categories list
 */
export const CATEGORIES_CACHE_KEY = `${CacheKeyPrefix.USER}:forum:categories`;

// ============================================================================
// Types
// ============================================================================

/**
 * Last post info in category
 */
export type CategoryLastPostInfo = {
  id: string;
  title: string;
  authorId: string;
  authorUsername: string | null;
  createdAt: string;
};

/**
 * Category summary for list response
 */
export type ForumCategorySummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  isLocked: boolean;
  minTierToPost: string;
  postsCount: number;
  lastPostAt: string | null;
  lastPost: CategoryLastPostInfo | null;
};

/**
 * Categories list response
 */
export type ForumCategoriesResponse = {
  categories: ForumCategorySummary[];
  total: number;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format date as ISO string
 */
export function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

/**
 * Format required date as ISO string
 */
export function formatDateRequired(date: Date): string {
  return date.toISOString();
}

/**
 * Map database category to response format
 */
export function mapToCategorySummary(category: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  isLocked: boolean;
  minTierToPost: string;
  postsCount: number;
  lastPostAt: Date | null;
  lastPostId: string | null;
  lastPostAuthorId: string | null;
  posts?: Array<{
    id: string;
    title: string;
    user: {
      id: string;
      username: string | null;
    };
    createdAt: Date;
  }>;
}): ForumCategorySummary {
  // Get last post info from joined posts if available
  let lastPost: CategoryLastPostInfo | null = null;
  const firstPost = category.posts?.[0];
  if (firstPost) {
    lastPost = {
      id: firstPost.id,
      title: firstPost.title,
      authorId: firstPost.user.id,
      authorUsername: firstPost.user.username,
      createdAt: formatDateRequired(firstPost.createdAt),
    };
  }

  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    icon: category.icon,
    color: category.color,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    isLocked: category.isLocked,
    minTierToPost: category.minTierToPost,
    postsCount: category.postsCount,
    lastPostAt: formatDate(category.lastPostAt),
    lastPost,
  };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * List all active forum categories
 */
async function listCategories() {
  return db.forumCategory.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      color: true,
      sortOrder: true,
      isActive: true,
      isLocked: true,
      minTierToPost: true,
      postsCount: true,
      lastPostAt: true,
      lastPostId: true,
      lastPostAuthorId: true,
      // Include last post with author info
      posts: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          title: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          createdAt: true,
        },
      },
    },
  });
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/forum/categories
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

  if (req.method !== "GET") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET.",
      405
    );
    return;
  }

  try {
    // Try cache first
    const cached =
      await cache.get<ForumCategoriesResponse>(CATEGORIES_CACHE_KEY);
    if (cached) {
      sendSuccess(res, cached);
      return;
    }

    // Fetch from database
    const categories = await listCategories();

    const response: ForumCategoriesResponse = {
      categories: categories.map(mapToCategorySummary),
      total: categories.length,
    };

    // Cache the response
    await cache.set(CATEGORIES_CACHE_KEY, response, {
      ttl: CATEGORIES_CACHE_TTL,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error listing forum categories", {
      userId: user.id,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to list categories. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
