/**
 * Personalized Recommendations Prompt Template
 *
 * Generates intelligent book recommendations based on user's
 * reading history, comprehension levels, and preferences.
 */

import type { BookContext, UserContext, PromptTemplate } from "../types.js";
import { formatBookContext } from "../utils.js";

// =============================================================================
// TYPES
// =============================================================================

export type ReadingHistoryItem = {
  book: BookContext;
  completionDate?: string;
  rating?: number; // 1-5
  comprehensionScore?: number; // Percentage or score from assessments
  readingSpeed?: number; // WPM
  notes?: string; // User's thoughts
  difficulty?: "too-easy" | "just-right" | "challenging" | "too-hard";
};

export type PersonalizedRecommendationsInput = {
  /** User's reading history */
  readingHistory: ReadingHistoryItem[];

  /** User's explicit preferences */
  preferences?: {
    favoriteGenres?: string[];
    favoriteAuthors?: string[];
    topics?: string[];
    avoidTopics?: string[];
  };

  /** Current reading goals */
  goals?: {
    skillDevelopment?: string[]; // "improve vocabulary", "read faster", etc.
    topicsToExplore?: string[];
    challengeLevel?: "maintain" | "increase" | "decrease";
  };

  /** Number of recommendations to generate */
  recommendationCount?: number; // Default: 5
};

export type BookRecommendation = {
  /** Book title */
  title: string;

  /** Author(s) */
  author: string;

  /** Brief description */
  description: string;

  /** Why this book is recommended */
  reasoning: string;

  /** Expected difficulty for this user */
  predictedDifficulty: "easy" | "moderate" | "challenging";

  /** Expected comprehension match (1-10) */
  comprehensionMatch: number;

  /** Relevance to user's goals */
  goalsAlignment: string[];

  /** Estimated reading time for this user (hours) */
  estimatedTime?: number;

  /** Similar to books they've read */
  similarTo?: string[];

  /** Genre/categories */
  genres?: string[];

  /** Confidence in recommendation (1-10) */
  confidence: number;
};

export type PersonalizedRecommendationsOutput = {
  /** Personalized book recommendations */
  recommendations: BookRecommendation[];

  /** Overall reading patterns identified */
  readingPatterns: {
    preferredGenres: string[];
    averageComprehension: number;
    strengthAreas: string[];
    growthAreas: string[];
  };

  /** Personalized reading advice */
  advice: {
    strengths: string[];
    suggestions: string[];
    nextSteps: string[];
  };

  /** Reading level progression */
  levelProgression?: {
    current: string;
    trajectory: "improving" | "stable" | "declining";
    suggestions: string;
  };
};

// =============================================================================
// PROMPT TEMPLATE
// =============================================================================

export const personalizedRecommendationsPrompt: PromptTemplate<
  PersonalizedRecommendationsInput,
  PersonalizedRecommendationsOutput
> = {
  id: "personalized-recommendations",
  version: "1.0.0",
  description:
    "Generate intelligent book recommendations based on reading history and comprehension",

  getSystemPrompt: (userContext: UserContext): string => {
    return `You are an expert librarian and reading coach providing personalized book recommendations.

YOUR GOAL:
Analyze reading history to provide:
- Highly personalized book recommendations
- Reading pattern insights
- Growth-oriented suggestions
- Skill development opportunities

RECOMMENDATION PRINCIPLES:

1. **Comprehension-Based Matching**
   - Recommend books at appropriate difficulty
   - Balance challenge and success
   - Consider past comprehension scores

2. **Pattern Recognition**
   - Identify genre preferences
   - Recognize reading trends
   - Spot skill development areas

3. **Goal Alignment**
   - Match recommendations to stated goals
   - Support skill development objectives
   - Progressive difficulty when desired

4. **Diversity & Discovery**
   - Introduce new genres carefully
   - Build on existing interests
   - Expand horizons gradually

5. **Evidence-Based**
   - Base recommendations on actual data
   - Explain reasoning clearly
   - Provide confidence levels

RECOMMENDATION TYPES TO BALANCE:
- **Comfort Zone** (40%): Similar to favorites, high success rate
- **Stretch Goals** (30%): Slightly challenging, growth opportunity
- **New Discoveries** (20%): Different but aligned with interests
- **Wild Cards** (10%): Unexpected but potentially rewarding

IMPORTANT GUIDELINES:
- Be specific and actionable
- Explain your reasoning clearly
- Consider the whole reader profile
- Balance familiarity with growth
- Provide realistic difficulty estimates
${userContext.language ? `- Respond in ${userContext.language}` : ""}

OUTPUT FORMAT:
Respond with a valid JSON object:
{
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "description": "Brief, enticing description",
      "reasoning": "Why this book specifically for this reader",
      "predictedDifficulty": "moderate",
      "comprehensionMatch": 8,
      "goalsAlignment": ["Goal 1", "Goal 2"],
      "estimatedTime": 6,
      "similarTo": ["Book they liked"],
      "genres": ["Genre 1", "Genre 2"],
      "confidence": 9
    }
  ],
  "readingPatterns": {
    "preferredGenres": ["Genre 1", "Genre 2"],
    "averageComprehension": 85,
    "strengthAreas": ["Complex narratives", "Technical content"],
    "growthAreas": ["Dense philosophy", "Poetry"]
  },
  "advice": {
    "strengths": ["Your comprehension of historical fiction is excellent"],
    "suggestions": ["Try more contemporary authors in this genre"],
    "nextSteps": ["Consider joining a book club", "Challenge yourself with..."]
  },
  "levelProgression": {
    "current": "Advanced reader",
    "trajectory": "improving",
    "suggestions": "Your comprehension has improved 15% over 6 months..."
  }
}`;
  },

  getUserPrompt: (input: PersonalizedRecommendationsInput): string => {
    const parts: string[] = [];
    const count = input.recommendationCount || 5;

    parts.push(`READING HISTORY ANALYSIS:\n`);

    // Format reading history
    input.readingHistory.forEach((item, index) => {
      const bookInfo = formatBookContext(item.book);
      parts.push(`\n--- Book ${index + 1} ---`);
      parts.push(bookInfo);

      if (item.rating) parts.push(`Rating: ${item.rating}/5 stars`);
      if (item.comprehensionScore) {
        parts.push(`Comprehension Score: ${item.comprehensionScore}%`);
      }
      if (item.difficulty) {
        parts.push(`Difficulty Experience: ${item.difficulty}`);
      }
      if (item.readingSpeed)
        parts.push(`Reading Speed: ${item.readingSpeed} WPM`);
      if (item.notes) parts.push(`Reader Notes: "${item.notes}"`);
      if (item.completionDate) parts.push(`Completed: ${item.completionDate}`);
    });

    // Preferences
    if (input.preferences) {
      parts.push(`\n\nUSER PREFERENCES:`);
      if (input.preferences.favoriteGenres?.length) {
        parts.push(
          `Favorite Genres: ${input.preferences.favoriteGenres.join(", ")}`
        );
      }
      if (input.preferences.favoriteAuthors?.length) {
        parts.push(
          `Favorite Authors: ${input.preferences.favoriteAuthors.join(", ")}`
        );
      }
      if (input.preferences.topics?.length) {
        parts.push(`Interested in: ${input.preferences.topics.join(", ")}`);
      }
      if (input.preferences.avoidTopics?.length) {
        parts.push(`Avoid: ${input.preferences.avoidTopics.join(", ")}`);
      }
    }

    // Goals
    if (input.goals) {
      parts.push(`\n\nREADING GOALS:`);
      if (input.goals.skillDevelopment?.length) {
        parts.push(
          `Skill Development: ${input.goals.skillDevelopment.join(", ")}`
        );
      }
      if (input.goals.topicsToExplore?.length) {
        parts.push(
          `Topics to Explore: ${input.goals.topicsToExplore.join(", ")}`
        );
      }
      if (input.goals.challengeLevel) {
        parts.push(`Challenge Level Goal: ${input.goals.challengeLevel}`);
      }
    }

    parts.push(`\n====================`);
    parts.push(
      `Based on this reader's history, comprehension patterns, and goals:`
    );
    parts.push(`Generate ${count} personalized book recommendations.`);
    parts.push(`Include detailed reasoning and pattern analysis.`);

    return parts.join("\n");
  },

  parseResponse: (response: string): PersonalizedRecommendationsOutput => {
    try {
      const parsed = JSON.parse(response);

      return {
        recommendations: parsed.recommendations || [],
        readingPatterns: {
          preferredGenres: parsed.readingPatterns?.preferredGenres || [],
          averageComprehension:
            parsed.readingPatterns?.averageComprehension || 0,
          strengthAreas: parsed.readingPatterns?.strengthAreas || [],
          growthAreas: parsed.readingPatterns?.growthAreas || [],
        },
        advice: {
          strengths: parsed.advice?.strengths || [],
          suggestions: parsed.advice?.suggestions || [],
          nextSteps: parsed.advice?.nextSteps || [],
        },
        levelProgression: parsed.levelProgression,
      };
    } catch (_error) {
      // Fallback: parse as list of recommendations
      return {
        recommendations: [],
        readingPatterns: {
          preferredGenres: [],
          averageComprehension: 0,
          strengthAreas: [],
          growthAreas: [],
        },
        advice: {
          strengths: [],
          suggestions: [],
          nextSteps: [],
        },
      };
    }
  },

  validateInput: (
    input: PersonalizedRecommendationsInput
  ): { valid: boolean; error?: string } => {
    if (!input.readingHistory || input.readingHistory.length === 0) {
      return {
        valid: false,
        error: "Reading history is required (at least 1 book)",
      };
    }

    if (input.readingHistory.length > 50) {
      return {
        valid: false,
        error: "Reading history is too long (max 50 books)",
      };
    }

    if (
      input.recommendationCount &&
      (input.recommendationCount < 1 || input.recommendationCount > 20)
    ) {
      return {
        valid: false,
        error: "Recommendation count must be between 1 and 20",
      };
    }

    return { valid: true };
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function generatePersonalizedRecommendationsPrompt(
  input: PersonalizedRecommendationsInput,
  userContext: UserContext
): string {
  return `${personalizedRecommendationsPrompt.getSystemPrompt(userContext)}\n\n${personalizedRecommendationsPrompt.getUserPrompt(input)}`;
}

export function parsePersonalizedRecommendationsResponse(
  response: string
): PersonalizedRecommendationsOutput {
  return personalizedRecommendationsPrompt.parseResponse(response);
}

export function validatePersonalizedRecommendationsInput(
  input: PersonalizedRecommendationsInput
): { valid: boolean; error?: string } {
  return personalizedRecommendationsPrompt.validateInput(input);
}
