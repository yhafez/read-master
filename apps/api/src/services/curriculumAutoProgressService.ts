/**
 * Curriculum Auto-Progress Service
 *
 * Automatically updates curriculum progress when users complete books.
 */

import { prisma } from "@read-master/database";
import { logger } from "../utils/logger.js";

/**
 * Check if a completed book is part of any curriculum and update progress
 */
export async function updateCurriculumProgressForBook(
  userId: string,
  bookId: string
): Promise<void> {
  try {
    // Find all curriculum items that reference this book
    const curriculumItems = await prisma.curriculumItem.findMany({
      where: {
        bookId,
      },
      select: {
        id: true,
        orderIndex: true,
        curriculumId: true,
      },
    });

    if (curriculumItems.length === 0) {
      logger.debug("No curriculum items found for book", { userId, bookId });
      return;
    }

    // Get unique curriculum IDs
    const curriculumIds = [
      ...new Set(curriculumItems.map((item) => item.curriculumId)),
    ];

    // Find user's follows for these curriculums
    const follows = await prisma.curriculumFollow.findMany({
      where: {
        userId,
        curriculumId: { in: curriculumIds },
      },
      include: {
        curriculum: {
          select: {
            id: true,
            title: true,
            deletedAt: true,
          },
        },
      },
    });

    if (follows.length === 0) {
      logger.debug("User not following any curriculums with this book", {
        userId,
        bookId,
      });
      return;
    }

    // Update curriculum progress for each relevant curriculum
    for (const follow of follows) {
      // Skip deleted curriculums
      if (follow.curriculum.deletedAt !== null) {
        continue;
      }

      // Find the item in this curriculum
      const item = curriculumItems.find(
        (i) => i.curriculumId === follow.curriculum.id
      );
      if (!item) {
        continue;
      }

      // Check if this item is at or before current progress (avoid skipping ahead)
      if (item.orderIndex > follow.currentItemIndex) {
        logger.debug("Item is ahead of current progress, skipping", {
          userId,
          curriculumId: follow.curriculumId,
          itemIndex: item.orderIndex,
          currentIndex: follow.currentItemIndex,
        });
        continue;
      }

      // Get total items count for this curriculum
      const totalItems = await prisma.curriculumItem.count({
        where: { curriculumId: follow.curriculumId },
      });

      // Update progress: move to next item and increment completed count
      const nextItemIndex = Math.min(
        follow.currentItemIndex + 1,
        totalItems - 1
      );
      const newCompletedItems = follow.completedItems + 1;

      await prisma.curriculumFollow.update({
        where: {
          id: follow.id,
        },
        data: {
          completedItems: newCompletedItems,
          currentItemIndex: nextItemIndex,
          lastProgressAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.info("Auto-progressed curriculum", {
        userId,
        bookId,
        curriculumId: follow.curriculumId,
        curriculumTitle: follow.curriculum.title,
        newProgress: {
          completedItems: newCompletedItems,
          currentItemIndex: nextItemIndex,
        },
      });
    }
  } catch (error) {
    logger.error("Failed to update curriculum auto-progress", {
      userId,
      bookId,
      error,
    });
    // Don't throw - this is a non-critical background operation
  }
}

/**
 * Bulk update curriculum progress for multiple books
 * Useful for batch operations or migrations
 */
export async function bulkUpdateCurriculumProgress(
  userId: string,
  bookIds: string[]
): Promise<void> {
  for (const bookId of bookIds) {
    await updateCurriculumProgressForBook(userId, bookId);
  }
}
