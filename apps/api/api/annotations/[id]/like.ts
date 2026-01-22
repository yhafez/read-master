/**
 * POST /api/annotations/:id/like
 * DELETE /api/annotations/:id/like
 *
 * Like or unlike an annotation
 */

import type { VercelResponse } from "@vercel/node";
import { prisma } from "@read-master/database";
import {
  withAuth,
  type AuthenticatedRequest,
} from "../../../src/middleware/auth.js";
import { logger } from "../../../src/utils/logger.js";

// ============================================================================
// Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const annotationId = req.query.id as string;
  const userId = req.auth.userId;

  if (!annotationId) {
    res.status(400).json({ error: "Annotation ID is required" });
    return;
  }

  try {
    // Check if annotation exists and is public
    const annotation = await prisma.annotation.findFirst({
      where: {
        id: annotationId,
        deletedAt: null,
        isPublic: true, // Can only like public annotations
      },
    });

    if (!annotation) {
      res.status(404).json({
        error: "Annotation not found or not public",
      });
      return;
    }

    if (req.method === "POST") {
      // Like the annotation
      try {
        const like = await prisma.annotationLike.create({
          data: {
            userId,
            annotationId,
          },
        });

        logger.info("Annotation liked", {
          userId,
          annotationId,
          likeId: like.id,
        });

        res.status(201).json({ liked: true, likeId: like.id });
      } catch (error) {
        // Check if already liked (unique constraint violation)
        if (
          error instanceof Error &&
          error.message.includes("Unique constraint")
        ) {
          res.status(200).json({ liked: true, message: "Already liked" });
          return;
        }
        throw error;
      }
    } else if (req.method === "DELETE") {
      // Unlike the annotation
      const deleted = await prisma.annotationLike.deleteMany({
        where: {
          userId,
          annotationId,
        },
      });

      logger.info("Annotation unliked", {
        userId,
        annotationId,
        deletedCount: deleted.count,
      });

      res.status(200).json({ liked: false, deletedCount: deleted.count });
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    logger.error("Failed to like/unlike annotation", {
      userId,
      annotationId,
      method: req.method,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      error: "Failed to update like status",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}

export default withAuth(handler);
