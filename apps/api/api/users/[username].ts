/**
 * GET /api/users/:username - Get public user profile
 *
 * Returns public profile information for a user based on their username.
 * Respects privacy settings - only returns data the user has opted to share.
 *
 * Query Parameters:
 * - includeActivity: boolean (default: false) - Include recent reading activity
 * - includeAchievements: boolean (default: true) - Include unlocked achievements
 *
 * Privacy:
 * - Profile must be public (profilePublic: true) to be viewable
 * - Stats only shown if showStats: true
 * - Activity only shown if showActivity: true
 *
 * @example
 * ```bash
 * # Get public profile
 * curl -X GET "/api/users/johndoe" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Get profile with activity
 * curl -X GET "/api/users/johndoe?includeActivity=true" \
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
import { cache, CacheKeyPrefix, CacheTTL } from "../../src/services/redis.js";

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum number of recent activity items to return
 */
export const MAX_ACTIVITY_ITEMS = 10;

/**
 * Maximum number of achievements to return
 */
export const MAX_ACHIEVEMENTS = 50;

/**
 * Cache TTL for profile data (15 minutes)
 */
export const PROFILE_CACHE_TTL = CacheTTL.MEDIUM;

// ============================================================================
// Types
// ============================================================================

/**
 * Query parameters for profile endpoint
 */
export type ProfileQueryParams = {
  includeActivity: boolean;
  includeAchievements: boolean;
};

/**
 * Public user info (always returned for public profiles)
 */
export type PublicUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  tier: string;
};

/**
 * Level information
 */
export type LevelInfo = {
  level: number;
  title: string;
  totalXP: number;
};

/**
 * Public stats (only if showStats: true)
 */
export type PublicStats = {
  levelInfo: LevelInfo;
  booksCompleted: number;
  totalReadingTime: number;
  currentStreak: number;
  longestStreak: number;
  followersCount: number;
  followingCount: number;
};

/**
 * Reading activity item
 */
export type ActivityItem = {
  type: "book_completed" | "achievement_earned" | "streak_milestone";
  title: string;
  description: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

/**
 * Achievement info
 */
export type AchievementInfo = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: string;
  earnedAt: string;
};

/**
 * Social status (relationship to current user)
 */
export type SocialStatus = {
  isFollowing: boolean;
  isFollowedBy: boolean;
  isOwnProfile: boolean;
};

/**
 * Full profile response
 */
export type ProfileResponse = {
  user: PublicUserInfo;
  stats: PublicStats | null; // null if showStats: false
  activity: ActivityItem[] | null; // null if showActivity: false or not requested
  achievements: AchievementInfo[] | null; // null if not requested
  social: SocialStatus;
};

// ============================================================================
// Level Calculation (shared with stats endpoint)
// ============================================================================

/**
 * Level threshold configuration
 */
const LEVEL_THRESHOLDS: readonly {
  readonly level: number;
  readonly xpRequired: number;
  readonly title: string;
}[] = [
  { level: 1, xpRequired: 0, title: "Novice Reader" },
  { level: 2, xpRequired: 100, title: "Apprentice" },
  { level: 3, xpRequired: 300, title: "Page Turner" },
  { level: 4, xpRequired: 600, title: "Bookworm" },
  { level: 5, xpRequired: 1000, title: "Avid Reader" },
  { level: 6, xpRequired: 1500, title: "Literature Lover" },
  { level: 7, xpRequired: 2500, title: "Scholar" },
  { level: 8, xpRequired: 4000, title: "Bibliophile" },
  { level: 9, xpRequired: 6000, title: "Sage" },
  { level: 10, xpRequired: 10000, title: "Master Reader" },
] as const;

const XP_PER_LEVEL_AFTER_10 = 5000;
const MAX_DEFINED_LEVEL = 10;
const GRAND_MASTER_TITLE = "Grand Master";

/**
 * Get the title for a given level
 */
export function getTitleForLevel(level: number): string {
  if (level <= 0) {
    return LEVEL_THRESHOLDS[0]?.title ?? "Novice Reader";
  }

  if (level <= MAX_DEFINED_LEVEL) {
    const threshold = LEVEL_THRESHOLDS.find((t) => t.level === level);
    return threshold?.title ?? GRAND_MASTER_TITLE;
  }

  return GRAND_MASTER_TITLE;
}

/**
 * Calculate level info from XP
 */
export function calculateLevelInfo(totalXP: number): LevelInfo {
  if (totalXP < 0) {
    totalXP = 0;
  }

  let currentLevel = 1;

  // Find current level from predefined thresholds
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold && totalXP >= threshold.xpRequired) {
      currentLevel = threshold.level;
      break;
    }
  }

  // Check if beyond level 10
  if (currentLevel === MAX_DEFINED_LEVEL) {
    const level10XP = LEVEL_THRESHOLDS[9]?.xpRequired ?? 10000;
    const xpBeyond10 = totalXP - level10XP;

    if (xpBeyond10 > 0) {
      const additionalLevels = Math.floor(xpBeyond10 / XP_PER_LEVEL_AFTER_10);
      currentLevel = MAX_DEFINED_LEVEL + additionalLevels;
    }
  }

  return {
    level: currentLevel,
    title: getTitleForLevel(currentLevel),
    totalXP,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse query parameters
 */
export function parseQueryParams(
  query: Record<string, string | string[] | undefined>
): ProfileQueryParams {
  const includeActivity = query.includeActivity === "true";
  const includeAchievements = query.includeAchievements !== "false"; // default true

  return { includeActivity, includeAchievements };
}

/**
 * Build cache key for profile
 */
export function buildProfileCacheKey(
  username: string,
  params: ProfileQueryParams
): string {
  const parts = [
    CacheKeyPrefix.USER,
    "profile",
    username.toLowerCase(),
    params.includeActivity ? "activity" : "no-activity",
    params.includeAchievements ? "achievements" : "no-achievements",
  ];
  return parts.join(":");
}

/**
 * Format date as ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Map user tier enum to display string
 */
export function mapTierToString(tier: string): string {
  switch (tier) {
    case "FREE":
      return "Free";
    case "PRO":
      return "Pro";
    case "SCHOLAR":
      return "Scholar";
    default:
      return tier;
  }
}

/**
 * Map user data to public user info
 */
export function mapToPublicUserInfo(user: {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  tier: string;
}): PublicUserInfo {
  return {
    id: user.id,
    username: user.username ?? "anonymous",
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    createdAt: formatDate(user.createdAt),
    tier: mapTierToString(user.tier),
  };
}

/**
 * Map stats to public stats
 */
export function mapToPublicStats(stats: {
  totalXP: number;
  level: number;
  booksCompleted: number;
  totalReadingTime: number;
  currentStreak: number;
  longestStreak: number;
  followersCount: number;
  followingCount: number;
}): PublicStats {
  return {
    levelInfo: calculateLevelInfo(stats.totalXP),
    booksCompleted: stats.booksCompleted,
    totalReadingTime: stats.totalReadingTime,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    followersCount: stats.followersCount,
    followingCount: stats.followingCount,
  };
}

/**
 * Map achievement to achievement info
 */
export function mapToAchievementInfo(achievement: {
  achievementId: string;
  earnedAt: Date;
  achievement: {
    name: string;
    description: string;
    badgeIcon: string | null;
    tier: string;
  };
}): AchievementInfo {
  return {
    id: achievement.achievementId,
    name: achievement.achievement.name,
    description: achievement.achievement.description,
    icon: achievement.achievement.badgeIcon,
    rarity: achievement.achievement.tier.toLowerCase(),
    earnedAt: formatDate(achievement.earnedAt),
  };
}

/**
 * Create activity item for completed book
 */
export function createBookCompletedActivity(book: {
  title: string;
  completedAt: Date;
}): ActivityItem {
  return {
    type: "book_completed",
    title: `Completed "${book.title}"`,
    description: null,
    timestamp: formatDate(book.completedAt),
  };
}

/**
 * Create activity item for earned achievement
 */
export function createAchievementActivity(achievement: {
  name: string;
  earnedAt: Date;
}): ActivityItem {
  return {
    type: "achievement_earned",
    title: `Earned "${achievement.name}"`,
    description: null,
    timestamp: formatDate(achievement.earnedAt),
  };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get user by username
 */
async function getUserByUsername(username: string) {
  return db.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive", // Case-insensitive username lookup
      },
      deletedAt: null,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      tier: true,
      profilePublic: true,
      showStats: true,
      showActivity: true,
    },
  });
}

/**
 * Get user stats
 */
async function getUserStats(userId: string) {
  return db.userStats.findUnique({
    where: { userId },
    select: {
      totalXP: true,
      level: true,
      booksCompleted: true,
      totalReadingTime: true,
      currentStreak: true,
      longestStreak: true,
      followersCount: true,
      followingCount: true,
    },
  });
}

/**
 * Get user achievements
 */
async function getUserAchievements(userId: string, limit: number) {
  return db.userAchievement.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
    take: limit,
    select: {
      achievementId: true,
      earnedAt: true,
      achievement: {
        select: {
          name: true,
          description: true,
          badgeIcon: true,
          tier: true,
        },
      },
    },
  });
}

/**
 * Get completed books for activity feed
 */
async function getCompletedBooks(userId: string, limit: number) {
  return db.readingProgress.findMany({
    where: {
      userId,
      completedAt: { not: null },
    },
    orderBy: { completedAt: "desc" },
    take: limit,
    select: {
      completedAt: true,
      book: {
        select: {
          title: true,
        },
      },
    },
  });
}

/**
 * Check follow relationship between users
 */
async function checkFollowRelationship(
  currentUserId: string,
  targetUserId: string
): Promise<{ isFollowing: boolean; isFollowedBy: boolean }> {
  const [following, followedBy] = await Promise.all([
    db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId,
        },
      },
    }),
    db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: targetUserId,
          followingId: currentUserId,
        },
      },
    }),
  ]);

  return {
    isFollowing: following !== null,
    isFollowedBy: followedBy !== null,
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET /api/users/:username
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

  // Get username from URL path
  const username = req.query.username as string;
  if (!username) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Username is required", 400);
    return;
  }

  try {
    // Get current user
    const currentUser = await getUserByClerkId(clerkUserId);
    if (!currentUser) {
      sendError(res, ErrorCodes.NOT_FOUND, "Current user not found", 404);
      return;
    }

    // Parse query parameters
    const params = parseQueryParams(
      req.query as Record<string, string | string[] | undefined>
    );

    // Check cache first
    const cacheKey = buildProfileCacheKey(username, params);
    const cached = await cache.get<ProfileResponse>(cacheKey);

    // If cached and not own profile, update social status and return
    if (cached) {
      // Always recalculate social status for fresh data
      const isOwnProfile = cached.user.id === currentUser.id;

      let social: SocialStatus;
      if (isOwnProfile) {
        social = {
          isFollowing: false,
          isFollowedBy: false,
          isOwnProfile: true,
        };
      } else {
        const relationship = await checkFollowRelationship(
          currentUser.id,
          cached.user.id
        );
        social = { ...relationship, isOwnProfile: false };
      }

      const response: ProfileResponse = { ...cached, social };

      logger.info("Profile cache hit", {
        currentUserId: currentUser.id,
        targetUsername: username,
      });

      sendSuccess(res, response);
      return;
    }

    // Get target user by username
    const targetUser = await getUserByUsername(username);

    if (!targetUser) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Check if this is the user's own profile
    const isOwnProfile = targetUser.id === currentUser.id;

    // Check if profile is public (unless viewing own profile)
    if (!isOwnProfile && !targetUser.profilePublic) {
      sendError(res, ErrorCodes.FORBIDDEN, "This profile is private", 403);
      return;
    }

    // Build public user info
    const publicUserInfo = mapToPublicUserInfo(targetUser);

    // Get stats if allowed
    let publicStats: PublicStats | null = null;
    if (targetUser.showStats || isOwnProfile) {
      const stats = await getUserStats(targetUser.id);
      if (stats) {
        publicStats = mapToPublicStats(stats);
      }
    }

    // Get activity if allowed and requested
    let activity: ActivityItem[] | null = null;
    if ((targetUser.showActivity || isOwnProfile) && params.includeActivity) {
      const [completedBooks, achievements] = await Promise.all([
        getCompletedBooks(targetUser.id, MAX_ACTIVITY_ITEMS),
        getUserAchievements(targetUser.id, MAX_ACTIVITY_ITEMS),
      ]);

      // Combine and sort by timestamp
      const activityItems: ActivityItem[] = [];

      for (const book of completedBooks) {
        if (book.completedAt) {
          activityItems.push(
            createBookCompletedActivity({
              title: book.book.title,
              completedAt: book.completedAt,
            })
          );
        }
      }

      for (const achievement of achievements) {
        activityItems.push(
          createAchievementActivity({
            name: achievement.achievement.name,
            earnedAt: achievement.earnedAt,
          })
        );
      }

      // Sort by timestamp descending
      activityItems.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      activity = activityItems.slice(0, MAX_ACTIVITY_ITEMS);
    }

    // Get achievements if requested
    let achievementsList: AchievementInfo[] | null = null;
    if (params.includeAchievements) {
      const achievements = await getUserAchievements(
        targetUser.id,
        MAX_ACHIEVEMENTS
      );
      achievementsList = achievements.map(mapToAchievementInfo);
    }

    // Get social status
    let social: SocialStatus;
    if (isOwnProfile) {
      social = { isFollowing: false, isFollowedBy: false, isOwnProfile: true };
    } else {
      const relationship = await checkFollowRelationship(
        currentUser.id,
        targetUser.id
      );
      social = { ...relationship, isOwnProfile: false };
    }

    // Build response
    const response: ProfileResponse = {
      user: publicUserInfo,
      stats: publicStats,
      activity,
      achievements: achievementsList,
      social,
    };

    // Cache the response (excluding social status which is user-specific)
    await cache.set(cacheKey, response, { ttl: PROFILE_CACHE_TTL });

    logger.info("Profile fetched", {
      currentUserId: currentUser.id,
      targetUserId: targetUser.id,
      targetUsername: username,
      isOwnProfile,
      includeActivity: params.includeActivity,
      includeAchievements: params.includeAchievements,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching user profile", {
      userId: clerkUserId,
      username,
      error: message,
    });

    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch user profile. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
