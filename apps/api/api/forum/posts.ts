/**
 * Forum Posts API
 *
 * GET /api/forum/posts - List forum posts with filtering and pagination
 *   - Supports filtering by category
 *   - Supports sorting (recent, popular, unanswered)
 *   - Results are cached for 5 minutes
 *   - Excludes soft-deleted posts
 *
 * @example
 * ```bash
 * # List recent posts
 * curl -X GET "/api/forum/posts?sortBy=recent&page=1&limit=20" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Filter by category
 * curl -X GET "/api/forum/posts?categoryId=abc123&sortBy=popular" \
 *   -H "Authorization: Bearer <token>"
 *
 * # List unanswered posts
 * curl -X GET "/api/forum/posts?sortBy=unanswered" \
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
 * Default page for pagination
 */
export const DEFAULT_PAGE = 1;

/**
 * Default limit for pagination
 */
export const DEFAULT_LIMIT = 20;

/**
 * Maximum limit for pagination
 */
export const MAX_LIMIT = 100;

/**
 * Minimum limit for pagination
 */
export const MIN_LIMIT = 1;

/**
 * Cache TTL for posts data (5 minutes)
 */
export const POSTS_CACHE_TTL = 60 * 5;

/**
 * Sort options for posts
 */
export const PostSortOptions = {
  RECENT: "recent",
  POPULAR: "popular",
  UNANSWERED: "unanswered",
  MOST_VIEWED: "mostViewed",
  LAST_REPLY: "lastReply",
} as const;

/**
 * Valid sort option values
 */
export const VALID_SORT_OPTIONS = Object.values(PostSortOptions);

// ============================================================================
// Types
// ============================================================================

/**
 * Query parameters for listing posts
 */
export type PostListQueryParams = {
  page: number;
  limit: number;
  sortBy: string;
  categoryId?: string | undefined;
  categorySlug?: string | undefined;
  search?: string | undefined;
  isPinned?: boolean | undefined;
  isFeatured?: boolean | undefined;
  isAnswered?: boolean | undefined;
  bookId?: string | undefined;
};

/**
 * User info in post response
 */
export type PostUserInfo = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Category info in post response
 */
export type PostCategoryInfo = {
  id: string;
  slug: string;
  name: string;
  color: string | null;
};

/**
 * Book info in post response
 */
export type PostBookInfo = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
};

/**
 * Post summary for list response
 */
export type ForumPostSummary = {
  id: string;
  title: string;
  contentPreview: string;
  categoryId: string;
  category: PostCategoryInfo;
  userId: string;
  user: PostUserInfo;
  bookId: string | null;
  book: PostBookInfo | null;
  isPinned: boolean;
  isLocked: boolean;
  isFeatured: boolean;
  isAnswered: boolean;
  upvotes: number;
  downvotes: number;
  voteScore: number;
  viewCount: number;
  repliesCount: number;
  lastReplyAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Pagination info
 */
export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

/**
 * Posts list response
 */
export type ForumPostsResponse = {
  posts: ForumPostSummary[];
  pagination: PaginationInfo;
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
 * Truncate content to preview length
 */
export function truncateContent(
  content: string,
  maxLength: number = 200
): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + "...";
}

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
  return DEFAULT_PAGE;
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
 * Parse sort option
 */
export function parseSortBy(value: unknown): string {
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (
      lower === PostSortOptions.RECENT ||
      lower === "newest" ||
      lower === "latest"
    ) {
      return PostSortOptions.RECENT;
    }
    if (
      lower === PostSortOptions.POPULAR ||
      lower === "top" ||
      lower === "votes"
    ) {
      return PostSortOptions.POPULAR;
    }
    if (lower === PostSortOptions.UNANSWERED || lower === "noreplies") {
      return PostSortOptions.UNANSWERED;
    }
    if (
      lower === PostSortOptions.MOST_VIEWED ||
      lower === "mostviewed" ||
      lower === "views"
    ) {
      return PostSortOptions.MOST_VIEWED;
    }
    if (
      lower === PostSortOptions.LAST_REPLY ||
      lower === "lastreply" ||
      lower === "active"
    ) {
      return PostSortOptions.LAST_REPLY;
    }
  }
  return PostSortOptions.RECENT;
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
 * Parse category ID from query
 */
export function parseCategoryId(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^c[a-z0-9]+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return undefined;
}

/**
 * Parse category slug from query
 */
export function parseCategorySlug(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (
      trimmed.length > 0 &&
      trimmed.length <= 100 &&
      /^[a-z0-9-]+$/.test(trimmed)
    ) {
      return trimmed;
    }
  }
  return undefined;
}

/**
 * Parse search query
 */
export function parseSearch(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length <= 200) {
      return trimmed;
    }
  }
  return undefined;
}

/**
 * Parse boolean value from query
 */
export function parseBoolean(value: unknown): boolean | undefined {
  if (value === "true" || value === true || value === "1") return true;
  if (value === "false" || value === false || value === "0") return false;
  return undefined;
}

/**
 * Parse book ID from query
 */
export function parseBookId(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^c[a-z0-9]+$/.test(trimmed)) {
      return trimmed;
    }
  }
  return undefined;
}

/**
 * Parse all query parameters for listing posts
 */
export function parseListPostsQuery(query: {
  page?: unknown;
  limit?: unknown;
  sortBy?: unknown;
  categoryId?: unknown;
  categorySlug?: unknown;
  search?: unknown;
  isPinned?: unknown;
  isFeatured?: unknown;
  isAnswered?: unknown;
  bookId?: unknown;
}): PostListQueryParams {
  return {
    page: parsePage(query.page),
    limit: parseLimit(query.limit),
    sortBy: parseSortBy(query.sortBy),
    categoryId: parseCategoryId(query.categoryId),
    categorySlug: parseCategorySlug(query.categorySlug),
    search: parseSearch(query.search),
    isPinned: parseBoolean(query.isPinned),
    isFeatured: parseBoolean(query.isFeatured),
    isAnswered: parseBoolean(query.isAnswered),
    bookId: parseBookId(query.bookId),
  };
}

/**
 * Build cache key for posts list
 */
export function buildPostsCacheKey(params: PostListQueryParams): string {
  const parts = [
    `${CacheKeyPrefix.USER}:forum:posts`,
    `p${params.page}`,
    `l${params.limit}`,
    `s${params.sortBy}`,
  ];
  if (params.categoryId) parts.push(`cat${params.categoryId}`);
  if (params.categorySlug) parts.push(`slug${params.categorySlug}`);
  if (params.search) parts.push(`q${params.search}`);
  if (params.isPinned !== undefined) parts.push(`pin${params.isPinned}`);
  if (params.isFeatured !== undefined) parts.push(`feat${params.isFeatured}`);
  if (params.isAnswered !== undefined) parts.push(`ans${params.isAnswered}`);
  if (params.bookId) parts.push(`book${params.bookId}`);
  return parts.join(":");
}

/**
 * Map user to response format
 */
export function mapToPostUserInfo(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}): PostUserInfo {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}

/**
 * Map category to response format
 */
export function mapToPostCategoryInfo(category: {
  id: string;
  slug: string;
  name: string;
  color: string | null;
}): PostCategoryInfo {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    color: category.color,
  };
}

/**
 * Map book to response format
 */
export function mapToPostBookInfo(
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null
): PostBookInfo | null {
  if (!book) return null;
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImage: book.coverImage,
  };
}

/**
 * Map database post to response format
 */
export function mapToPostSummary(post: {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  category: {
    id: string;
    slug: string;
    name: string;
    color: string | null;
  };
  userId: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  bookId: string | null;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null;
  isPinned: boolean;
  isLocked: boolean;
  isFeatured: boolean;
  isAnswered: boolean;
  upvotes: number;
  downvotes: number;
  voteScore: number;
  viewCount: number;
  repliesCount: number;
  lastReplyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ForumPostSummary {
  return {
    id: post.id,
    title: post.title,
    contentPreview: truncateContent(post.content, 200),
    categoryId: post.categoryId,
    category: mapToPostCategoryInfo(post.category),
    userId: post.userId,
    user: mapToPostUserInfo(post.user),
    bookId: post.bookId,
    book: mapToPostBookInfo(post.book),
    isPinned: post.isPinned,
    isLocked: post.isLocked,
    isFeatured: post.isFeatured,
    isAnswered: post.isAnswered,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    voteScore: post.voteScore,
    viewCount: post.viewCount,
    repliesCount: post.repliesCount,
    lastReplyAt: formatDate(post.lastReplyAt),
    createdAt: formatDateRequired(post.createdAt),
    updatedAt: formatDateRequired(post.updatedAt),
  };
}

/**
 * Calculate pagination info
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
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
  // Always pin pinned posts at top, then apply sort
  const baseOrder: Array<Record<string, "asc" | "desc">> = [
    { isPinned: "desc" },
  ];

  switch (sortBy) {
    case PostSortOptions.POPULAR:
      return [...baseOrder, { voteScore: "desc" }, { createdAt: "desc" }];
    case PostSortOptions.MOST_VIEWED:
      return [...baseOrder, { viewCount: "desc" }, { createdAt: "desc" }];
    case PostSortOptions.LAST_REPLY:
      return [...baseOrder, { lastReplyAt: "desc" }, { createdAt: "desc" }];
    case PostSortOptions.UNANSWERED:
      // For unanswered, we'll filter by repliesCount = 0 and sort by recent
      return [...baseOrder, { createdAt: "desc" }];
    case PostSortOptions.RECENT:
    default:
      return [...baseOrder, { createdAt: "desc" }];
  }
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get category by slug
 */
async function getCategoryBySlug(slug: string) {
  return db.forumCategory.findUnique({
    where: { slug },
    select: { id: true },
  });
}

/**
 * List forum posts with filters
 */
async function listPosts(
  params: PostListQueryParams,
  categoryIdFromSlug?: string
) {
  const {
    page,
    limit,
    sortBy,
    categoryId,
    search,
    isPinned,
    isFeatured,
    isAnswered,
    bookId,
  } = params;

  // Resolve category ID from slug or direct ID
  const resolvedCategoryId = categoryIdFromSlug || categoryId;

  // Build where clause
  type WhereClause = {
    deletedAt: null;
    categoryId?: string;
    bookId?: string;
    isPinned?: boolean;
    isFeatured?: boolean;
    isAnswered?: boolean;
    repliesCount?: number;
    OR?: Array<
      | { title: { contains: string; mode: "insensitive" } }
      | { content: { contains: string; mode: "insensitive" } }
    >;
    category?: { isActive: boolean };
  };

  const where: WhereClause = {
    deletedAt: null,
    category: { isActive: true },
  };

  if (resolvedCategoryId) {
    where.categoryId = resolvedCategoryId;
  }
  if (bookId) {
    where.bookId = bookId;
  }
  if (isPinned !== undefined) {
    where.isPinned = isPinned;
  }
  if (isFeatured !== undefined) {
    where.isFeatured = isFeatured;
  }
  if (isAnswered !== undefined) {
    where.isAnswered = isAnswered;
  }
  // For unanswered sort, filter to posts with no replies
  if (sortBy === PostSortOptions.UNANSWERED) {
    where.repliesCount = 0;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy = buildOrderBy(sortBy);
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    db.forumPost.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            slug: true,
            name: true,
            color: true,
          },
        },
        userId: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        bookId: true,
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImage: true,
          },
        },
        isPinned: true,
        isLocked: true,
        isFeatured: true,
        isAnswered: true,
        upvotes: true,
        downvotes: true,
        voteScore: true,
        viewCount: true,
        repliesCount: true,
        lastReplyAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.forumPost.count({ where }),
  ]);

  return { posts, total };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/forum/posts
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
    const params = parseListPostsQuery(req.query);

    // If category slug provided, resolve to ID
    let categoryIdFromSlug: string | undefined;
    if (params.categorySlug && !params.categoryId) {
      const category = await getCategoryBySlug(params.categorySlug);
      if (!category) {
        sendError(res, ErrorCodes.NOT_FOUND, "Category not found", 404);
        return;
      }
      categoryIdFromSlug = category.id;
    }

    // Try cache first
    const cacheKey = buildPostsCacheKey(params);
    const cached = await cache.get<ForumPostsResponse>(cacheKey);
    if (cached) {
      sendSuccess(res, cached);
      return;
    }

    // Fetch from database
    const { posts, total } = await listPosts(params, categoryIdFromSlug);

    const response: ForumPostsResponse = {
      posts: posts.map(mapToPostSummary),
      pagination: calculatePagination(params.page, params.limit, total),
    };

    // Cache the response
    await cache.set(cacheKey, response, { ttl: POSTS_CACHE_TTL });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error listing forum posts", {
      userId: user.id,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to list posts. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
