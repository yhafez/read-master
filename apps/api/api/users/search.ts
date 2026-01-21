/**
 * GET /api/users/search
 *
 * Search for users by username or display name
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import { prisma } from "@read-master/database";
import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import { logger } from "../../src/utils/logger.js";

// ============================================================================
// Validation Schema
// ============================================================================

const searchUsersQuerySchema = z.object({
  q: z.string().min(2, "Query must be at least 2 characters").max(50),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;

// ============================================================================
// Response Types
// ============================================================================

type UserSearchResult = {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  tier: string;
  profilePublic: boolean;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
};

type SearchUsersResponse = {
  users: UserSearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

// ============================================================================
// Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Parse and validate query parameters
    const validation = searchUsersQuerySchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        error: "Invalid query parameters",
        details: validation.error.flatten(),
      });
      return;
    }

    const query: SearchUsersQuery = validation.data;
    const currentUserId = req.auth.userId;

    logger.info("Searching users", {
      userId: currentUserId,
      query: query.q,
      page: query.page,
      limit: query.limit,
    });

    // Calculate pagination
    const skip = (query.page - 1) * query.limit;

    // Build where clause for search
    const searchConditions = {
      OR: [
        { username: { contains: query.q, mode: "insensitive" as const } },
        { displayName: { contains: query.q, mode: "insensitive" as const } },
      ],
      deletedAt: null, // Exclude soft-deleted users
      NOT: {
        id: currentUserId, // Exclude current user from results
      },
    };

    // Execute search query with followers count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: searchConditions,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          tier: true,
          profilePublic: true,
          _count: {
            select: {
              followers: true,
              following: true,
            },
          },
        },
        orderBy: [
          { profilePublic: "desc" }, // Public profiles first
          { username: "asc" }, // Then alphabetically
        ],
        skip,
        take: query.limit,
      }),
      prisma.user.count({ where: searchConditions }),
    ]);

    // Get following status for all users in one query
    const userIds = users.map((u) => u.id);
    const followingRelations = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: userIds },
      },
      select: {
        followingId: true,
      },
    });

    const followingSet = new Set(followingRelations.map((f) => f.followingId));

    // Format response
    const results: UserSearchResult[] = users.map((user) => ({
      id: user.id,
      username: user.username || "",
      displayName: user.displayName,
      avatar: user.avatarUrl,
      bio: user.bio,
      tier: user.tier,
      profilePublic: user.profilePublic,
      isFollowing: followingSet.has(user.id),
      followersCount: user._count.followers,
      followingCount: user._count.following,
    }));

    const response: SearchUsersResponse = {
      users: results,
      total,
      page: query.page,
      limit: query.limit,
      hasMore: skip + users.length < total,
    };

    logger.info("User search completed", {
      userId: currentUserId,
      resultsCount: results.length,
      total,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error("Failed to search users", {
      userId: req.auth.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      error: "Failed to search users",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}

export default withAuth(handler);
