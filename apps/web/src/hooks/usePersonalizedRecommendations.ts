import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import type { PersonalizedRecommendationsOutput } from "@read-master/ai";

/**
 * User preferences for recommendations
 */
export type UserPreferences = {
  favoriteGenres?: string[];
  favoriteAuthors?: string[];
  topics?: string[];
  avoidTopics?: string[];
};

/**
 * Reading goals for recommendations
 */
export type ReadingGoals = {
  skillDevelopment?: string[];
  topicsToExplore?: string[];
  challengeLevel?: "maintain" | "increase" | "decrease";
};

/**
 * Personalized recommendations request payload
 */
export type PersonalizedRecommendationsRequest = {
  preferences?: UserPreferences;
  goals?: ReadingGoals;
  recommendationCount?: number;
};

/**
 * Personalized recommendations response
 */
export type PersonalizedRecommendationsResponse =
  PersonalizedRecommendationsOutput & {
    success: true;
    timestamp: string;
  };

/**
 * Hook to get personalized book recommendations
 *
 * Uses AI to analyze reading history and preferences to suggest
 * books tailored to the user's interests, goals, and reading level.
 * Each recommendation includes detailed reasoning and confidence scores.
 *
 * @example
 * ```tsx
 * const { mutate: getRecommendations, isPending, data } = usePersonalizedRecommendations();
 *
 * const handleGetRecommendations = () => {
 *   getRecommendations({
 *     preferences: {
 *       favoriteGenres: ["Science Fiction", "Philosophy"],
 *       topics: ["AI", "Ethics", "Future"],
 *     },
 *     goals: {
 *       skillDevelopment: ["Critical thinking", "Writing"],
 *       challengeLevel: "increase",
 *     },
 *     recommendationCount: 5,
 *   });
 * };
 * ```
 */
export function usePersonalizedRecommendations() {
  return useMutation<
    PersonalizedRecommendationsResponse,
    Error,
    PersonalizedRecommendationsRequest
  >({
    mutationFn: async (payload: PersonalizedRecommendationsRequest) => {
      const response = await axios.post<PersonalizedRecommendationsResponse>(
        "/api/ai/recommendations",
        payload
      );
      return response.data;
    },
  });
}
