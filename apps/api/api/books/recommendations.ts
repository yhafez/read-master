/**
 * GET /api/books/recommendations
 *
 * Get book recommendations from followed users
 * Returns books that friends are reading/completed with high ratings
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

const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

type RecommendationsQuery = z.infer<typeof recommendationsQuerySchema>;

// ============================================================================
// Response Types
// ============================================================================

type BookRecommendation = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  description: string | null;
  genre: string | null;
  wordCount: number | null;
  estimatedReadTime: number | null;
  recommendedBy: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  }[];
  readingCount: number; // Number of followed users reading this
  completedCount: number; // Number of followed users who completed this
};

export type RecommendationsResponse = {
  recommendations: BookRecommendation[];
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
    const validation = recommendationsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        error: "Invalid query parameters",
        details: validation.error.flatten(),
      });
      return;
    }

    const query: RecommendationsQuery = validation.data;
    const currentUserId = req.auth.userId;

    logger.info("Fetching book recommendations from friends", {
      userId: currentUserId,
      limit: query.limit,
    });

    // Get list of users the current user follows
    const following = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
      },
      select: {
        followingId: true,
      },
    });

    const followedUserIds = following.map((f) => f.followingId);

    if (followedUserIds.length === 0) {
      // No followed users, return empty recommendations
      res.status(200).json({ recommendations: [] });
      return;
    }

    // Get books that followed users are reading or have completed
    // Exclude books the current user already has in their library
    const userBookIds = await prisma.book.findMany({
      where: {
        userId: currentUserId,
        deletedAt: null,
      },
      select: {
        sourceId: true,
        title: true,
      },
    });

    const userBookTitles = new Set(
      userBookIds
        .filter((b) => b.sourceId || b.title)
        .map((b) => b.sourceId || b.title)
    );

    // Query books from followed users
    const friendBooks = await prisma.book.findMany({
      where: {
        userId: { in: followedUserIds },
        deletedAt: null,
        status: { in: ["READING", "COMPLETED"] },
        isPublic: true, // Only public books
      },
      select: {
        id: true,
        title: true,
        author: true,
        coverImage: true,
        description: true,
        genre: true,
        wordCount: true,
        estimatedReadTime: true,
        sourceId: true,
        status: true,
        userId: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      take: 100, // Get a pool of books to filter
    });

    // Group books by title/sourceId and count readers
    const bookMap = new Map<
      string,
      {
        book: (typeof friendBooks)[0];
        readers: (typeof friendBooks)[0]["user"][];
        readingCount: number;
        completedCount: number;
      }
    >();

    for (const book of friendBooks) {
      const key = book.sourceId || book.title;

      // Skip if user already has this book
      if (userBookTitles.has(key)) {
        continue;
      }

      if (!bookMap.has(key)) {
        bookMap.set(key, {
          book,
          readers: [],
          readingCount: 0,
          completedCount: 0,
        });
      }

      const entry = bookMap.get(key);
      if (!entry) continue;

      entry.readers.push(book.user);

      if (book.status === "READING") {
        entry.readingCount++;
      } else if (book.status === "COMPLETED") {
        entry.completedCount++;
      }
    }

    // Convert to array and sort by popularity (completed first, then reading)
    const recommendations: BookRecommendation[] = Array.from(bookMap.values())
      .sort((a, b) => {
        // Sort by: completed count (desc), then reading count (desc)
        const scoreA = a.completedCount * 2 + a.readingCount;
        const scoreB = b.completedCount * 2 + b.readingCount;
        return scoreB - scoreA;
      })
      .slice(0, query.limit)
      .map((entry) => ({
        id: entry.book.id,
        title: entry.book.title,
        author: entry.book.author,
        coverImage: entry.book.coverImage,
        description: entry.book.description,
        genre: entry.book.genre,
        wordCount: entry.book.wordCount,
        estimatedReadTime: entry.book.estimatedReadTime,
        recommendedBy: entry.readers.map((reader) => ({
          id: reader.id,
          username: reader.username || "",
          displayName: reader.displayName,
          avatar: reader.avatarUrl,
        })),
        readingCount: entry.readingCount,
        completedCount: entry.completedCount,
      }));

    logger.info("Book recommendations fetched", {
      userId: currentUserId,
      count: recommendations.length,
    });

    res.status(200).json({ recommendations });
  } catch (error) {
    logger.error("Failed to fetch book recommendations", {
      userId: req.auth.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      error: "Failed to fetch recommendations",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}

export default withAuth(handler);
