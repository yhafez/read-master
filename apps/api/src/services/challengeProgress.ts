/**
 * Service for managing challenge progress and automatic updates
 * Tracks various user activities and updates challenge progress accordingly
 */

import { db } from "./db.js";
import { logger } from "../utils/logger.js";
import type { ChallengeGoalType } from "@read-master/database";

// ============================================================================
// Types
// ============================================================================

type ProgressEvent = {
  userId: string;
  type:
    | "BOOK_COMPLETED"
    | "PAGE_READ"
    | "TIME_READ"
    | "WORD_READ"
    | "FLASHCARD_CREATED"
    | "ASSESSMENT_COMPLETED";
  value: number;
  genre?: string; // For genre-specific challenges
};

// ============================================================================
// Progress Update Logic
// ============================================================================

/**
 * Update user's challenge progress based on an activity event
 * Called automatically when users complete books, flashcards, etc.
 */
export async function updateChallengeProgress(
  event: ProgressEvent
): Promise<void> {
  const { userId, type, value, genre } = event;

  try {
    // Map event type to challenge goal type
    const goalTypeMap: Record<ProgressEvent["type"], ChallengeGoalType> = {
      BOOK_COMPLETED: "BOOKS_READ",
      PAGE_READ: "PAGES_READ",
      TIME_READ: "TIME_READING",
      WORD_READ: "WORDS_READ",
      FLASHCARD_CREATED: "FLASHCARDS_CREATED",
      ASSESSMENT_COMPLETED: "ASSESSMENTS_COMPLETED",
    };

    const goalType = goalTypeMap[type];

    // Find all active challenges the user is participating in
    const now = new Date();
    const participations = await db.challengeParticipant.findMany({
      where: {
        userId,
        isCompleted: false,
        challenge: {
          isActive: true,
          goalType,
          // Check if challenge is currently active (within date range or no date constraints)
          OR: [
            { startDate: null, endDate: null }, // Always active
            { startDate: { lte: now }, endDate: { gte: now } }, // Within range
            { startDate: { lte: now }, endDate: null }, // Started, no end
          ],
        },
      },
      include: {
        challenge: true,
      },
    });

    // Filter for genre-specific challenges if applicable
    const relevantParticipations = participations.filter((p) => {
      if (p.challenge.goalType === "BOOKS_IN_GENRE" && genre) {
        // Check if challenge is for this genre (stored in challenge metadata)
        // For now, we'll update all book-in-genre challenges
        return true;
      }
      return true;
    });

    // Update progress for each relevant challenge
    for (const participation of relevantParticipations) {
      const newProgress = participation.progress + value;
      const isCompleted = newProgress >= participation.goalValue;
      const completedAt = isCompleted ? new Date() : null;

      // Update participation in a transaction (to handle XP award atomically)
      await db.$transaction(async (tx) => {
        // Update progress
        await tx.challengeParticipant.update({
          where: { id: participation.id },
          data: {
            progress: newProgress,
            isCompleted,
            completedAt,
          },
        });

        // Award XP if just completed
        if (
          isCompleted &&
          !participation.isCompleted &&
          participation.challenge.xpReward > 0
        ) {
          await tx.userStats.upsert({
            where: { userId },
            create: {
              userId,
              totalXP: participation.challenge.xpReward,
              level: 1,
              currentStreak: 0,
              longestStreak: 0,
              booksCompleted: 0,
              totalReadingTime: 0,
              totalCardsCreated: 0,
              assessmentsCompleted: 0,
            },
            update: {
              totalXP: {
                increment: participation.challenge.xpReward,
              },
            },
          });

          logger.info("Challenge completed, XP awarded", {
            userId,
            challengeId: participation.challengeId,
            xpAwarded: participation.challenge.xpReward,
          });
        }
      });

      logger.info("Challenge progress updated automatically", {
        userId,
        challengeId: participation.challengeId,
        progress: newProgress,
        goalValue: participation.goalValue,
        isCompleted,
      });
    }
  } catch (error) {
    logger.error("Failed to update challenge progress", {
      userId,
      eventType: type,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Update challenge progress when a user completes a book
 */
export async function onBookCompleted(
  userId: string,
  bookId: string
): Promise<void> {
  const book = await db.book.findUnique({
    where: { id: bookId },
    select: { genre: true, wordCount: true },
  });

  if (!book) return;

  // Update books read challenge
  await updateChallengeProgress({
    userId,
    type: "BOOK_COMPLETED",
    value: 1,
    ...(book.genre && { genre: book.genre }),
  });

  // Update words read challenge if word count is available
  if (book.wordCount) {
    await updateChallengeProgress({
      userId,
      type: "WORD_READ",
      value: book.wordCount,
    });
  }
}

/**
 * Update challenge progress when a user reads for a period of time
 */
export async function onReadingTimeTracked(
  userId: string,
  minutes: number
): Promise<void> {
  await updateChallengeProgress({
    userId,
    type: "TIME_READ",
    value: minutes,
  });
}

/**
 * Update challenge progress when a user creates flashcards
 */
export async function onFlashcardCreated(
  userId: string,
  count = 1
): Promise<void> {
  await updateChallengeProgress({
    userId,
    type: "FLASHCARD_CREATED",
    value: count,
  });
}

/**
 * Update challenge progress when a user completes an assessment
 */
export async function onAssessmentCompleted(userId: string): Promise<void> {
  await updateChallengeProgress({
    userId,
    type: "ASSESSMENT_COMPLETED",
    value: 1,
  });
}
