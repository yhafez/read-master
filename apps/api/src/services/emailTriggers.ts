/**
 * Email Trigger Service
 *
 * Handles automated email sending based on user actions and time-based triggers.
 */

import { db } from "./db.js";
import { sendTemplateEmail, type SendEmailResult } from "./emailService.js";
import { logger } from "../utils/logger.js";

const APP_URL = process.env.VITE_APP_URL || "https://readmaster.ai";

/**
 * Send welcome email immediately after user signup
 */
export async function sendWelcomeEmail(userId: string): Promise<SendEmailResult> {
  try {
    // Get user info
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.error("User not found for welcome email", { userId });
      return {
        success: false,
        error: "User not found",
      };
    }

    // Send welcome email
    const result = await sendTemplateEmail(
      userId,
      "welcome",
      user.email,
      {
        firstName: user.firstName || user.displayName || "there",
        appUrl: APP_URL,
        year: new Date().getFullYear(),
      },
      {
        toName: user.displayName || undefined,
        tags: ["onboarding", "welcome"],
        metadata: {
          trigger: "user_signup",
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (result.success) {
      logger.info("Welcome email sent", { userId, emailId: result.emailId });
    } else {
      logger.error("Failed to send welcome email", {
        userId,
        error: result.error,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error sending welcome email", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Onboarding sequence configuration
 */
interface OnboardingStep {
  day: number;
  templateName: string;
  subject: string;
  description: string;
}

export const ONBOARDING_SEQUENCE: OnboardingStep[] = [
  {
    day: 1,
    templateName: "onboarding_day1",
    subject: "Let's Get You Started with Read Master! 📖",
    description: "Getting started guide - add your first book",
  },
  // Future onboarding emails can be added here:
  // {
  //   day: 2,
  //   templateName: "onboarding_day2_ai_features",
  //   subject: "Unlock the Power of AI in Read Master 🤖",
  //   description: "AI features overview",
  // },
  // {
  //   day: 3,
  //   templateName: "onboarding_day3_progress",
  //   subject: "Track Your Reading Progress 📊",
  //   description: "Progress tracking features",
  // },
  // {
  //   day: 7,
  //   templateName: "onboarding_week1_recap",
  //   subject: "Your First Week in Read Master! 🎉",
  //   description: "Week 1 recap with user stats",
  // },
];

/**
 * Send onboarding email for a specific day
 */
export async function sendOnboardingEmail(
  userId: string,
  day: number
): Promise<SendEmailResult> {
  try {
    // Find the onboarding step for this day
    const step = ONBOARDING_SEQUENCE.find((s) => s.day === day);

    if (!step) {
      logger.warn("No onboarding step configured for day", { day });
      return {
        success: false,
        error: `No onboarding step for day ${day}`,
      };
    }

    // Get user info
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.error("User not found for onboarding email", { userId, day });
      return {
        success: false,
        error: "User not found",
      };
    }

    // Send onboarding email
    const result = await sendTemplateEmail(
      userId,
      step.templateName,
      user.email,
      {
        firstName: user.firstName || user.displayName || "there",
        appUrl: APP_URL,
        year: new Date().getFullYear(),
      },
      {
        toName: user.displayName || undefined,
        tags: ["onboarding", `day${day}`],
        metadata: {
          trigger: "onboarding_sequence",
          day,
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (result.success) {
      logger.info("Onboarding email sent", {
        userId,
        day,
        emailId: result.emailId,
      });
    } else {
      logger.error("Failed to send onboarding email", {
        userId,
        day,
        error: result.error,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error sending onboarding email", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      day,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process onboarding sequence for users
 * This should be called by a cron job daily
 */
export async function processOnboardingSequence(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    logger.info("Starting onboarding sequence processing");

    // For each day in the onboarding sequence
    for (const step of ONBOARDING_SEQUENCE) {
      // Find users who created their account exactly `step.day` days ago
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - step.day);

      // Start of day
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      // End of day
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Find users who signed up on this day
      const users = await db.user.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          displayName: true,
        },
      });

      logger.info(`Found ${users.length} users for day ${step.day} onboarding`, {
        day: step.day,
        count: users.length,
      });

      // Send onboarding email to each user
      for (const user of users) {
        processed++;

        // Check if user has already received this email
        const existingEmail = await db.email.findFirst({
          where: {
            userId: user.id,
            templateId: {
              // Get template by name
              in: await db.emailTemplate
                .findMany({
                  where: { name: step.templateName },
                  select: { id: true },
                })
                .then((templates) => templates.map((t) => t.id)),
            },
            deletedAt: null,
          },
        });

        if (existingEmail) {
          logger.info("User already received this onboarding email", {
            userId: user.id,
            day: step.day,
          });
          continue;
        }

        // Send the email
        const result = await sendOnboardingEmail(user.id, step.day);

        if (result.success) {
          sent++;
        } else {
          failed++;
        }

        // Rate limiting: wait 100ms between emails
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    logger.info("Onboarding sequence processing complete", {
      processed,
      sent,
      failed,
    });
  } catch (error) {
    logger.error("Error processing onboarding sequence", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { processed, sent, failed };
}

/**
 * Send streak celebration email
 */
export async function sendStreakEmail(
  userId: string,
  streakDays: number
): Promise<SendEmailResult> {
  try {
    // Get user info and stats
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        stats: true,
      },
    });

    if (!user) {
      logger.error("User not found for streak email", { userId });
      return {
        success: false,
        error: "User not found",
      };
    }

    // Only send for specific milestones
    const milestones = [7, 14, 30, 60, 100, 365];
    if (!milestones.includes(streakDays)) {
      return {
        success: false,
        error: "Not a streak milestone",
      };
    }

    // Calculate average reading time
    const averageMinutes = user.stats
      ? Math.round(user.stats.totalReadingTime / 60 / streakDays)
      : 0;

    // Count books
    const booksInProgress = await db.book.count({
      where: {
        userId,
        status: "IN_PROGRESS",
        deletedAt: null,
      },
    });

    const booksCompleted = user.stats?.booksCompleted || 0;
    const totalReadingTime = user.stats
      ? `${Math.floor(user.stats.totalReadingTime / 3600)}h ${Math.floor((user.stats.totalReadingTime % 3600) / 60)}m`
      : "0h 0m";

    // Send streak email
    const result = await sendTemplateEmail(
      userId,
      "streak_7_days", // We can reuse this template for different milestones
      user.email,
      {
        firstName: user.firstName || user.displayName || "there",
        appUrl: APP_URL,
        year: new Date().getFullYear(),
        averageMinutes: String(averageMinutes),
        booksInProgress: String(booksInProgress),
        booksCompleted: String(booksCompleted),
        totalReadingTime,
        userLevel: String(user.stats?.level || 1),
      },
      {
        toName: user.displayName || undefined,
        tags: ["engagement", "streak", `streak_${streakDays}`],
        metadata: {
          trigger: "streak_milestone",
          streakDays,
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (result.success) {
      logger.info("Streak email sent", {
        userId,
        streakDays,
        emailId: result.emailId,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error sending streak email", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      streakDays,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send book completion email
 */
export async function sendBookCompletionEmail(
  userId: string,
  bookId: string
): Promise<SendEmailResult> {
  try {
    // Get user and book info
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    const book = await db.book.findUnique({
      where: { id: bookId },
    });

    if (!user || !book) {
      logger.error("User or book not found for completion email", {
        userId,
        bookId,
      });
      return {
        success: false,
        error: "User or book not found",
      };
    }

    // Get reading progress
    const progress = await db.readingProgress.findFirst({
      where: {
        userId,
        bookId,
      },
      orderBy: {
        lastReadAt: "desc",
      },
    });

    // Count annotations
    const annotationCount = await db.annotation.count({
      where: {
        userId,
        bookId,
        deletedAt: null,
      },
    });

    // Calculate reading stats
    const readingTime = progress?.totalReadingTime
      ? `${Math.floor(progress.totalReadingTime / 3600)}h ${Math.floor((progress.totalReadingTime % 3600) / 60)}m`
      : "Unknown";

    const pagesRead = book.pageCount || "Unknown";
    const wordsRead = book.wordCount ? book.wordCount.toLocaleString() : "Unknown";
    const averageWpm = progress?.averageWpm || "Unknown";

    // Send completion email
    const result = await sendTemplateEmail(
      userId,
      "book_completed",
      user.email,
      {
        firstName: user.firstName || user.displayName || "there",
        bookTitle: book.title,
        bookAuthor: book.author || "Unknown Author",
        bookId,
        appUrl: APP_URL,
        year: new Date().getFullYear(),
        readingTime,
        pagesRead: String(pagesRead),
        wordsRead: String(wordsRead),
        averageWpm: String(averageWpm),
        annotationCount: String(annotationCount),
      },
      {
        toName: user.displayName || undefined,
        tags: ["engagement", "book_completed"],
        metadata: {
          trigger: "book_completed",
          bookId,
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (result.success) {
      logger.info("Book completion email sent", {
        userId,
        bookId,
        emailId: result.emailId,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error sending book completion email", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      bookId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send library limit reached email (conversion)
 */
export async function sendLibraryLimitEmail(userId: string): Promise<SendEmailResult> {
  try {
    // Get user info
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      logger.error("User not found for library limit email", { userId });
      return {
        success: false,
        error: "User not found",
      };
    }

    // Only send to free users
    if (user.tier !== "FREE") {
      return {
        success: false,
        error: "User is not on free tier",
      };
    }

    // Count books
    const bookCount = await db.book.count({
      where: {
        userId,
        deletedAt: null,
      },
    });

    // Send library limit email
    const result = await sendTemplateEmail(
      userId,
      "upgrade_library_limit",
      user.email,
      {
        firstName: user.firstName || user.displayName || "there",
        bookCount: String(bookCount),
        appUrl: APP_URL,
        year: new Date().getFullYear(),
      },
      {
        toName: user.displayName || undefined,
        tags: ["conversion", "library_limit"],
        metadata: {
          trigger: "library_limit_reached",
          bookCount,
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (result.success) {
      logger.info("Library limit email sent", {
        userId,
        emailId: result.emailId,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error sending library limit email", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
