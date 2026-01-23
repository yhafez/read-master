/**
 * AI Recommendations Service
 *
 * Generates personalized book recommendations using AI based on
 * user's reading history, preferences, and similar users.
 */

import { generateText } from "ai";
import { db } from "./db.js";
import { logger } from "../utils/logger.js";
import { getModel, extractUsage, calculateCost } from "./ai.js";

// ============================================================================
// Types
// ============================================================================

interface BookRecommendation {
  id: string;
  bookId: string | null;
  bookTitle: string;
  bookAuthor: string | null;
  bookCoverUrl: string | null;
  reason: string;
  score: number;
  source: string;
  sourceUser: null;
  dismissed: boolean;
  addedToLibrary: boolean;
}

interface UserReadingProfile {
  genres: string[];
  favoriteAuthors: string[];
  recentBooks: Array<{
    title: string;
    author: string | null;
    genre: string | null;
  }>;
  completedCount: number;
  averageRating?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build user's reading profile for AI analysis
 */
async function buildUserProfile(userId: string): Promise<UserReadingProfile> {
  const books = await db.book.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      title: true,
      author: true,
      genre: true,
      status: true,
      tags: true,
    },
  });

  // Extract genres with frequency
  const genreCounts = new Map<string, number>();
  books.forEach((book) => {
    if (book.genre) {
      genreCounts.set(book.genre, (genreCounts.get(book.genre) || 0) + 1);
    }
  });

  // Sort genres by frequency
  const genres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre);

  // Extract favorite authors (most read)
  const authorCounts = new Map<string, number>();
  books.forEach((book) => {
    if (book.author) {
      authorCounts.set(book.author, (authorCounts.get(book.author) || 0) + 1);
    }
  });

  const favoriteAuthors = [...authorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([author]) => author);

  // Recent books
  const recentBooks = books
    .filter((b) => b.status === "COMPLETED" || b.status === "READING")
    .slice(0, 10)
    .map((b) => ({
      title: b.title,
      author: b.author,
      genre: b.genre,
    }));

  const completedCount = books.filter((b) => b.status === "COMPLETED").length;

  return {
    genres,
    favoriteAuthors,
    recentBooks,
    completedCount,
  };
}

/**
 * Generate AI book recommendations
 */
export async function generateBookRecommendations(
  userId: string,
  count: number = 5
): Promise<BookRecommendation[]> {
  try {
    // Get user's reading profile
    const profile = await buildUserProfile(userId);

    if (profile.recentBooks.length === 0) {
      logger.info("No reading history for AI recommendations", { userId });
      return [];
    }

    // Build prompt
    const prompt = buildRecommendationPrompt(profile, count);

    // Generate recommendations using Claude
    const model = getModel();
    const { text, usage: rawUsage } = await generateText({
      model,
      prompt,
      maxOutputTokens: 2000,
    });

    // Extract and calculate usage
    const usage = extractUsage(rawUsage);
    const cost = calculateCost(usage);

    // Log AI usage
    await db.aIUsageLog.create({
      data: {
        userId,
        operation: "book_recommendations",
        model: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        cost: cost.totalCost,
        durationMs: 0,
        success: true,
      },
    });

    // Parse recommendations from AI response
    const recommendations = parseRecommendations(text, userId);

    // Store recommendations in database
    for (const rec of recommendations) {
      await db.bookRecommendation.create({
        data: {
          userId,
          bookTitle: rec.bookTitle,
          bookAuthor: rec.bookAuthor,
          reason: rec.reason,
          score: rec.score,
          source: "AI",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    }

    logger.info("AI recommendations generated", {
      userId,
      count: recommendations.length,
    });

    return recommendations;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to generate AI recommendations", {
      userId,
      error: message,
    });

    // Log failed AI usage
    await db.aIUsageLog.create({
      data: {
        userId,
        operation: "book_recommendations",
        model: "claude-3-5-sonnet-20241022",
        provider: "anthropic",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: 0,
        durationMs: 0,
        success: false,
        errorMessage: message,
      },
    });

    return [];
  }
}

/**
 * Build the AI prompt for book recommendations
 */
function buildRecommendationPrompt(
  profile: UserReadingProfile,
  count: number
): string {
  const genreList =
    profile.genres.length > 0 ? profile.genres.join(", ") : "various genres";

  const authorList =
    profile.favoriteAuthors.length > 0
      ? profile.favoriteAuthors.join(", ")
      : "various authors";

  const recentBooksList = profile.recentBooks
    .map(
      (b) =>
        `- "${b.title}" by ${b.author || "Unknown"}${b.genre ? ` (${b.genre})` : ""}`
    )
    .join("\n");

  return `You are a literary expert and book recommendation system. Based on the reader's profile below, recommend ${count} books they would enjoy.

## Reader Profile

**Favorite Genres:** ${genreList}
**Favorite Authors:** ${authorList}
**Books Completed:** ${profile.completedCount}

**Recently Read Books:**
${recentBooksList}

## Task

Recommend ${count} books that this reader would likely enjoy. For each recommendation:
1. Choose books that match their genre preferences and reading patterns
2. Include a mix of popular and lesser-known titles
3. Consider authors similar to their favorites
4. Avoid recommending books they've already read

## Response Format

Respond with a JSON array of recommendations. Each recommendation should have:
- title: The book title
- author: The author's name
- reason: A personalized 1-2 sentence explanation of why they would enjoy this book
- confidence: A number from 0.5 to 1.0 indicating how confident you are in this recommendation

Example format:
[
  {
    "title": "Example Book",
    "author": "Author Name",
    "reason": "Based on your love of mystery novels and authors like Agatha Christie, you'll enjoy this classic whodunit.",
    "confidence": 0.85
  }
]

Only respond with the JSON array, no other text.`;
}

/**
 * Parse AI response into recommendations
 */
function parseRecommendations(
  text: string,
  userId: string
): BookRecommendation[] {
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      logger.warn("No JSON found in AI response", { userId });
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      title: string;
      author: string;
      reason: string;
      confidence: number;
    }>;

    return parsed.map((rec, index) => ({
      id: `ai-${userId}-${Date.now()}-${index}`,
      bookId: null,
      bookTitle: rec.title,
      bookAuthor: rec.author,
      bookCoverUrl: null,
      reason: rec.reason,
      score: Math.max(0.5, Math.min(1.0, rec.confidence)),
      source: "AI",
      sourceUser: null,
      dismissed: false,
      addedToLibrary: false,
    }));
  } catch (error) {
    logger.error("Failed to parse AI recommendations", {
      userId,
      error: error instanceof Error ? error.message : "Unknown",
    });
    return [];
  }
}
