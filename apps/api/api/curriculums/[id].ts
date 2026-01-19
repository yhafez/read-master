/**
 * Curriculum API - Get, Update, Delete
 *
 * GET /api/curriculums/:id - Get curriculum details
 *   - Returns full curriculum info including items and follow status
 *   - Requires ownership or visibility access
 *
 * PUT /api/curriculums/:id - Update curriculum
 *   - Only owner can update
 *   - Applies profanity filter to title and description
 *
 * DELETE /api/curriculums/:id - Delete curriculum (soft delete)
 *   - Only owner can delete
 *   - Soft deletes the curriculum
 *
 * @example
 * ```bash
 * # Get curriculum
 * curl -X GET "/api/curriculums/abc123" \
 *   -H "Authorization: Bearer <token>"
 *
 * # Update curriculum
 * curl -X PUT "/api/curriculums/abc123" \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"title":"Updated Title","description":"New description"}'
 *
 * # Delete curriculum
 * curl -X DELETE "/api/curriculums/abc123" \
 *   -H "Authorization: Bearer <token>"
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
import type { Visibility } from "@read-master/database";
import {
  containsProfanity,
  validateFieldsNoProfanity,
} from "@read-master/shared";

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
 * Maximum tags allowed
 */
export const MAX_TAGS = 10;

/**
 * Maximum tag length
 */
export const MAX_TAG_LENGTH = 50;

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
 * User info in curriculum responses
 */
export type CurriculumUserInfo = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Book info in curriculum item
 */
export type CurriculumBookInfo = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
};

/**
 * Curriculum item info with optional book details
 */
export type CurriculumItemDetailInfo = {
  id: string;
  orderIndex: number;
  bookId: string | null;
  book: CurriculumBookInfo | null;
  externalTitle: string | null;
  externalAuthor: string | null;
  externalUrl: string | null;
  externalIsbn: string | null;
  notes: string | null;
  estimatedTime: number | null;
  isOptional: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Full curriculum detail response
 */
export type CurriculumDetailResponse = {
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
  isOwner: boolean;
  isFollowing: boolean;
  items: CurriculumItemDetailInfo[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Update curriculum input
 */
export type UpdateCurriculumInput = {
  title?: string;
  description?: string;
  coverImage?: string | null;
  category?: string | null;
  tags?: string[];
  difficulty?: string | null;
  visibility?: Visibility;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for updating a curriculum
 */
export const updateCurriculumSchema = z.object({
  title: z
    .string()
    .min(1, "Title cannot be empty")
    .max(
      MAX_TITLE_LENGTH,
      `Title must be at most ${MAX_TITLE_LENGTH} characters`
    )
    .refine(
      (val) => !containsProfanity(val),
      "Title contains inappropriate language"
    )
    .optional(),
  description: z
    .string()
    .min(1, "Description cannot be empty")
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`
    )
    .refine(
      (val) => !containsProfanity(val),
      "Description contains inappropriate language"
    )
    .optional(),
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
    .optional(),
  difficulty: z.enum(DIFFICULTY_OPTIONS).optional().nullable(),
  visibility: z.enum(VISIBILITY_OPTIONS).optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate curriculum ID format
 */
export function validateCurriculumId(id: unknown): string | null {
  if (typeof id !== "string" || id.trim().length === 0) {
    return null;
  }
  return id.trim();
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
 * Map book data to CurriculumBookInfo
 */
export function mapToCurriculumBookInfo(
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null
): CurriculumBookInfo | null {
  if (!book) return null;
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    coverImage: book.coverImage,
  };
}

/**
 * Map curriculum item to CurriculumItemDetailInfo
 */
export function mapToCurriculumItemDetailInfo(item: {
  id: string;
  orderIndex: number;
  bookId: string | null;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null;
  externalTitle: string | null;
  externalAuthor: string | null;
  externalUrl: string | null;
  externalIsbn: string | null;
  notes: string | null;
  estimatedTime: number | null;
  isOptional: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CurriculumItemDetailInfo {
  return {
    id: item.id,
    orderIndex: item.orderIndex,
    bookId: item.bookId,
    book: mapToCurriculumBookInfo(item.book),
    externalTitle: item.externalTitle,
    externalAuthor: item.externalAuthor,
    externalUrl: item.externalUrl,
    externalIsbn: item.externalIsbn,
    notes: item.notes,
    estimatedTime: item.estimatedTime,
    isOptional: item.isOptional,
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
  };
}

/**
 * Check if user can access the curriculum
 */
export function canAccessCurriculum(
  curriculum: {
    visibility: Visibility;
    userId: string;
    followers?: Array<{ userId: string }>;
  },
  userId: string
): boolean {
  // Public and unlisted are accessible to everyone
  if (
    curriculum.visibility === "PUBLIC" ||
    curriculum.visibility === "UNLISTED"
  ) {
    return true;
  }

  // Owner can always access
  if (curriculum.userId === userId) return true;

  // Private curriculums require the user to be following
  if (curriculum.followers?.some((f) => f.userId === userId)) return true;

  return false;
}

/**
 * Check if user is the owner of the curriculum
 */
export function isOwner(curriculumUserId: string, userId: string): boolean {
  return curriculumUserId === userId;
}

/**
 * Build cache key for individual curriculum
 */
export function buildCurriculumCacheKey(curriculumId: string): string {
  return `${CacheKeyPrefix.USER}:curriculum:${curriculumId}`;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get curriculum with full details
 */
async function getCurriculumById(curriculumId: string, userId: string) {
  return db.curriculum.findFirst({
    where: {
      id: curriculumId,
      deletedAt: null,
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
      items: {
        orderBy: { orderIndex: "asc" },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverImage: true,
            },
          },
        },
      },
      followers: {
        where: { userId },
        select: {
          userId: true,
        },
      },
    },
  });
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle GET, PUT, DELETE /api/curriculums/:id
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

  // Validate curriculum ID
  const curriculumId = validateCurriculumId(req.query.id);
  if (!curriculumId) {
    sendError(res, ErrorCodes.VALIDATION_ERROR, "Invalid curriculum ID", 400);
    return;
  }

  if (req.method === "GET") {
    await handleGetCurriculum(res, user, curriculumId);
  } else if (req.method === "PUT") {
    await handleUpdateCurriculum(req, res, user, curriculumId);
  } else if (req.method === "DELETE") {
    await handleDeleteCurriculum(res, user, curriculumId);
  } else {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use GET, PUT, or DELETE.",
      405
    );
  }
}

/**
 * Handle GET /api/curriculums/:id
 */
async function handleGetCurriculum(
  res: VercelResponse,
  user: { id: string },
  curriculumId: string
): Promise<void> {
  try {
    // Get curriculum
    const curriculum = await getCurriculumById(curriculumId, user.id);

    if (!curriculum) {
      sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
      return;
    }

    // Check access
    if (!canAccessCurriculum(curriculum, user.id)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "You do not have access to this curriculum",
        403
      );
      return;
    }

    // Build response
    const response: CurriculumDetailResponse = {
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
      isOwner: isOwner(curriculum.userId, user.id),
      isFollowing:
        curriculum.followers?.some((f) => f.userId === user.id) ?? false,
      items: curriculum.items.map(mapToCurriculumItemDetailInfo),
      createdAt: formatDate(curriculum.createdAt),
      updatedAt: formatDate(curriculum.updatedAt),
    };

    logger.info("Curriculum fetched", {
      userId: user.id,
      curriculumId: curriculum.id,
      isOwner: response.isOwner,
      isFollowing: response.isFollowing,
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error fetching curriculum", {
      userId: user.id,
      curriculumId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to fetch curriculum. Please try again.",
      500
    );
  }
}

/**
 * Handle PUT /api/curriculums/:id
 */
async function handleUpdateCurriculum(
  req: AuthenticatedRequest,
  res: VercelResponse,
  user: { id: string },
  curriculumId: string
): Promise<void> {
  try {
    // Get curriculum to check ownership
    const existingCurriculum = await getCurriculumById(curriculumId, user.id);

    if (!existingCurriculum) {
      sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
      return;
    }

    // Check owner permission
    if (!isOwner(existingCurriculum.userId, user.id)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the owner can update the curriculum",
        403
      );
      return;
    }

    // Validate input
    const validationResult = updateCurriculumSchema.safeParse(req.body);
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

    // Additional profanity check
    const fieldsToCheck = [];
    if (input.title) {
      fieldsToCheck.push({ value: input.title, name: "Title" });
    }
    if (input.description) {
      fieldsToCheck.push({ value: input.description, name: "Description" });
    }
    if (input.category) {
      fieldsToCheck.push({ value: input.category, name: "Category" });
    }

    if (fieldsToCheck.length > 0) {
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
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.coverImage !== undefined) {
      updateData.coverImage = input.coverImage;
    }
    if (input.category !== undefined) {
      updateData.category = input.category;
    }
    if (input.tags !== undefined) {
      updateData.tags = input.tags;
    }
    if (input.difficulty !== undefined) {
      updateData.difficulty = input.difficulty;
    }
    if (input.visibility !== undefined) {
      updateData.visibility = input.visibility;
    }

    // Update curriculum
    const updatedCurriculum = await db.curriculum.update({
      where: { id: curriculumId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        items: {
          orderBy: { orderIndex: "asc" },
          include: {
            book: {
              select: {
                id: true,
                title: true,
                author: true,
                coverImage: true,
              },
            },
          },
        },
        followers: {
          where: { userId: user.id },
          select: {
            userId: true,
          },
        },
      },
    });

    // Invalidate caches
    await Promise.all([
      cache.del(buildCurriculumCacheKey(curriculumId)),
      cache.invalidatePattern(`${CacheKeyPrefix.USER}:*:curriculums:*`),
    ]);

    // Build response
    const response: CurriculumDetailResponse = {
      id: updatedCurriculum.id,
      title: updatedCurriculum.title,
      description: updatedCurriculum.description,
      coverImage: updatedCurriculum.coverImage,
      category: updatedCurriculum.category,
      tags: updatedCurriculum.tags,
      difficulty: updatedCurriculum.difficulty,
      visibility: updatedCurriculum.visibility,
      totalItems: updatedCurriculum.totalItems,
      followersCount: updatedCurriculum.followersCount,
      creator: mapToCurriculumUserInfo(updatedCurriculum.user),
      isOwner: true,
      isFollowing:
        updatedCurriculum.followers?.some((f) => f.userId === user.id) ?? false,
      items: updatedCurriculum.items.map(mapToCurriculumItemDetailInfo),
      createdAt: formatDate(updatedCurriculum.createdAt),
      updatedAt: formatDate(updatedCurriculum.updatedAt),
    };

    logger.info("Curriculum updated", {
      userId: user.id,
      curriculumId: updatedCurriculum.id,
      updatedFields: Object.keys(updateData),
    });

    sendSuccess(res, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error updating curriculum", {
      userId: user.id,
      curriculumId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to update curriculum. Please try again.",
      500
    );
  }
}

/**
 * Handle DELETE /api/curriculums/:id
 */
async function handleDeleteCurriculum(
  res: VercelResponse,
  user: { id: string },
  curriculumId: string
): Promise<void> {
  try {
    // Get curriculum to check ownership
    const existingCurriculum = await getCurriculumById(curriculumId, user.id);

    if (!existingCurriculum) {
      sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
      return;
    }

    // Check owner permission
    if (!isOwner(existingCurriculum.userId, user.id)) {
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        "Only the owner can delete the curriculum",
        403
      );
      return;
    }

    // Soft delete the curriculum
    await db.curriculum.update({
      where: { id: curriculumId },
      data: { deletedAt: new Date() },
    });

    // Invalidate caches
    await Promise.all([
      cache.del(buildCurriculumCacheKey(curriculumId)),
      cache.invalidatePattern(`${CacheKeyPrefix.USER}:*:curriculums:*`),
    ]);

    logger.info("Curriculum deleted", {
      userId: user.id,
      curriculumId,
      title: existingCurriculum.title,
    });

    sendSuccess(res, { message: "Curriculum deleted successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error deleting curriculum", {
      userId: user.id,
      curriculumId,
      error: message,
    });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to delete curriculum. Please try again.",
      500
    );
  }
}

export default withAuth(handler);
