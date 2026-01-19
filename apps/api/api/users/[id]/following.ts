/**
 * GET /api/users/:id/following - Get list of users the specified user is following
 *
 * Returns a paginated list of users that the specified user follows.
 * Includes basic user info and follow status relative to current user.
 *
 * Query Parameters:
 * - page: number (default: 1) - Page number for pagination
 * - limit: number (default: 20, max: 100) - Items per page
 * - search: string (optional) - Search following by username or display name
 *
 * @example
 * ```bash
 * # Get first page of following
 * curl -X GET "/api/users/user123/following" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Search following with pagination
 * curl -X GET "/api/users/user123/following?search=john&page=2&limit=10" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../../src/middleware/auth.js";
import {
  sendSuccess,
  sendError,
  ErrorCodes,
} from "../../../src/utils/response.js";
import { logger } from "../../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../../src/services/db.js";
import {
  parsePaginationParams,
  calculatePagination,
  type PaginationResult,
} from "../../../src/utils/pagination.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Basic user info returned in followers/following lists
 */
export type FollowUserInfo = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followedAt: string;
};

/**
 * Extended user info with follow relationship to current user
 */
export type FollowUserWithRelation = FollowUserInfo & {
  isFollowing: boolean;
  isFollowedBy: boolean;
};

/**
 * Query parameters for followers/following endpoints
 */
export type FollowListQueryParams = {
  page: number;
  limit: number;
  search?: string;
};

/**
 * Paginated response for followers/following lists
 */
export type FollowListResponse = {
  users: FollowUserWithRelation[];
  pagination: PaginationResult;
  targetUserId: string;
  targetUsername: string | null;
};

/**
 * Database follow record with following user info
 */
export type FollowWithFollowingUser = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  following: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    deletedAt: Date | null;
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse query parameters for follow lists
 */
export function parseFollowListParams(query: {
  page?: string | string[];
  limit?: string | string[];
  search?: string | string[];
}): FollowListQueryParams {
  // Build pagination params object, only including defined values
  const paginationInput: {
    page?: string | string[];
    limit?: string | string[];
  } = {};
  if (query.page !== undefined) {
    paginationInput.page = query.page;
  }
  if (query.limit !== undefined) {
    paginationInput.limit = query.limit;
  }

  const paginationParams = parsePaginationParams(paginationInput);

  // Extract search parameter
  let search: string | undefined;
  if (query.search !== undefined) {
    const searchValue = Array.isArray(query.search)
      ? query.search[0]
      : query.search;
    if (searchValue && searchValue.trim().length > 0) {
      search = searchValue.trim().toLowerCase();
    }
  }

  // Build result object, only including search if defined
  const result: FollowListQueryParams = {
    page: paginationParams.page,
    limit: paginationParams.limit,
  };

  if (search !== undefined) {
    result.search = search;
  }

  return result;
}

/**
 * Validate user ID format
 */
export function validateUserId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0;
}

/**
 * Check if user exists and get basic info
 */
export async function getUserBasicInfo(
  userId: string
): Promise<{ id: string; username: string | null } | null> {
  const user = await db.user.findUnique({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      id: true,
      username: true,
    },
  });

  return user;
}

/**
 * Build search filter for following user fields
 */
export function buildSearchFilter(
  search: string | undefined
):
  | {
      OR: Array<
        | { following: { username: { contains: string; mode: "insensitive" } } }
        | {
            following: {
              displayName: { contains: string; mode: "insensitive" };
            };
          }
      >;
    }
  | undefined {
  if (!search || search.length === 0) {
    return undefined;
  }

  return {
    OR: [
      {
        following: {
          username: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      },
      {
        following: {
          displayName: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      },
    ],
  };
}

/**
 * Get users that the current user is following (for relationship status)
 */
export async function getCurrentUserFollowing(
  currentUserId: string,
  userIds: string[]
): Promise<Set<string>> {
  if (userIds.length === 0) {
    return new Set();
  }

  const follows = await db.follow.findMany({
    where: {
      followerId: currentUserId,
      followingId: {
        in: userIds,
      },
    },
    select: {
      followingId: true,
    },
  });

  return new Set(follows.map((f) => f.followingId));
}

/**
 * Get users that are following the current user (for relationship status)
 */
export async function getCurrentUserFollowers(
  currentUserId: string,
  userIds: string[]
): Promise<Set<string>> {
  if (userIds.length === 0) {
    return new Set();
  }

  const follows = await db.follow.findMany({
    where: {
      followerId: {
        in: userIds,
      },
      followingId: currentUserId,
    },
    select: {
      followerId: true,
    },
  });

  return new Set(follows.map((f) => f.followerId));
}

/**
 * Map a follow record to user info with relationship status
 */
export function mapFollowToUserInfo(
  follow: FollowWithFollowingUser,
  currentUserFollowing: Set<string>,
  currentUserFollowers: Set<string>
): FollowUserWithRelation {
  return {
    id: follow.following.id,
    username: follow.following.username,
    displayName: follow.following.displayName,
    avatarUrl: follow.following.avatarUrl,
    bio: follow.following.bio,
    followedAt: follow.createdAt.toISOString(),
    isFollowing: currentUserFollowing.has(follow.following.id),
    isFollowedBy: currentUserFollowers.has(follow.following.id),
  };
}

/**
 * Sanitize search input
 */
export function sanitizeSearch(search: string | undefined): string | undefined {
  if (!search) {
    return undefined;
  }

  // Trim and limit length
  const sanitized = search.trim().slice(0, 100);

  // Return undefined if empty after sanitization
  return sanitized.length > 0 ? sanitized : undefined;
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/users/:id/following
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
      "Method not allowed. Use GET to list following.",
      405
    );
    return;
  }

  const { userId: clerkUserId } = req.auth;
  const targetUserId = req.query.id;

  // Validate target user ID
  if (!validateUserId(targetUserId)) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "User ID is required", 400);
    return;
  }

  try {
    // Get current user
    const currentUser = await getUserByClerkId(clerkUserId);
    if (!currentUser) {
      sendError(res, ErrorCodes.NOT_FOUND, "Current user not found", 404);
      return;
    }

    // Check if target user exists
    const targetUser = await getUserBasicInfo(targetUserId);
    if (!targetUser) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Parse query parameters
    const params = parseFollowListParams(
      req.query as {
        page?: string | string[];
        limit?: string | string[];
        search?: string | string[];
      }
    );

    // Sanitize search
    const search = sanitizeSearch(params.search);

    // Build search filter
    const searchFilter = buildSearchFilter(search);

    // Build where clause
    const whereClause = {
      followerId: targetUserId,
      following: {
        deletedAt: null,
      },
      ...searchFilter,
    };

    // Get total count
    const total = await db.follow.count({
      where: whereClause,
    });

    // Calculate pagination
    const pagination = calculatePagination(params.page, params.limit, total);

    // Get following with pagination
    const following = await db.follow.findMany({
      where: whereClause,
      select: {
        id: true,
        followerId: true,
        followingId: true,
        createdAt: true,
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            deletedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: pagination.skip,
      take: pagination.take,
    });

    // Get following user IDs for relationship lookup
    const followingUserIds = following.map((f) => f.following.id);

    // Get current user's relationships with these users
    const [currentUserFollowing, currentUserFollowers] = await Promise.all([
      getCurrentUserFollowing(currentUser.id, followingUserIds),
      getCurrentUserFollowers(currentUser.id, followingUserIds),
    ]);

    // Map to response format
    const users = following.map((follow) =>
      mapFollowToUserInfo(
        follow as FollowWithFollowingUser,
        currentUserFollowing,
        currentUserFollowers
      )
    );

    const response: FollowListResponse = {
      users,
      pagination,
      targetUserId: targetUser.id,
      targetUsername: targetUser.username,
    };

    logger.info("Fetched following list", {
      targetUserId,
      currentUserId: currentUser.id,
      page: params.page,
      limit: params.limit,
      search: search ?? "none",
      total,
      returned: users.length,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logger.error("Error fetching following list", {
      userId: clerkUserId,
      targetUserId,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch following. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
