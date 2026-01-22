/**
 * POST /api/curriculums/:id/clone
 *
 * Clones a curriculum template for the authenticated user.
 * This creates a personal copy of an official template that the user can customize.
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";
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

const CloneCurriculumSchema = z.object({
  title: z.string().min(1).max(200).optional(), // Override title
  visibility: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]).optional(), // Override visibility
});

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return sendError(
      res,
      ErrorCodes.METHOD_NOT_ALLOWED,
      "Method not allowed",
      405
    );
  }

  const user = await getUserByClerkId(req.auth.userId);
  if (!user) {
    return sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
  }

  const curriculumId = req.query.id as string;

  // Parse request body
  const parseResult = CloneCurriculumSchema.safeParse(req.body);
  if (!parseResult.success) {
    return sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Invalid request body",
      400
    );
  }

  const { title: customTitle, visibility = "PRIVATE" } = parseResult.data;

  // Fetch the original curriculum with items
  const originalCurriculum = await db.curriculum.findUnique({
    where: { id: curriculumId, deletedAt: null },
    include: {
      items: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!originalCurriculum) {
    return sendError(res, ErrorCodes.NOT_FOUND, "Curriculum not found", 404);
  }

  // Check if it's a public or official curriculum (can clone)
  if (
    !originalCurriculum.isOfficial &&
    originalCurriculum.visibility === "PRIVATE" &&
    originalCurriculum.userId !== user.id
  ) {
    return sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "Cannot clone private curriculums from other users",
      403
    );
  }

  // Check user tier for creating curriculums (Pro or Scholar only)
  if (!["PRO", "SCHOLAR"].includes(user.tier)) {
    return sendError(
      res,
      ErrorCodes.FORBIDDEN,
      "Curriculum creation requires Pro or Scholar subscription",
      403
    );
  }

  // Create cloned curriculum
  const clonedCurriculum = await db.curriculum.create({
    data: {
      title: customTitle || `${originalCurriculum.title} (Copy)`,
      description: originalCurriculum.description,
      category: originalCurriculum.category,
      difficulty: originalCurriculum.difficulty,
      coverImage: originalCurriculum.coverImage,
      visibility,
      isOfficial: false, // Cloned curriculums are never official
      userId: user.id,
      items: {
        create: originalCurriculum.items.map((item) => ({
          orderIndex: item.orderIndex,
          bookId: item.bookId,
          externalTitle: item.externalTitle,
          externalAuthor: item.externalAuthor,
          externalIsbn: item.externalIsbn,
          externalUrl: item.externalUrl,
          notes: item.notes,
          estimatedTime: item.estimatedTime,
          isOptional: item.isOptional,
        })),
      },
    },
    include: {
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
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          followers: true,
        },
      },
    },
  });

  logger.info("Curriculum cloned", {
    userId: user.id,
    originalCurriculumId: curriculumId,
    clonedCurriculumId: clonedCurriculum.id,
  });

  return sendSuccess(res, {
    ...clonedCurriculum,
    followersCount: clonedCurriculum._count.followers,
  });
}

export default withAuth(handler);
