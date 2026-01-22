import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import type { AssessDifficultyOutput } from "@read-master/ai";

/**
 * Reading level type
 */
export type ReadingLevel =
  | "beginner"
  | "elementary"
  | "middle_school"
  | "high_school"
  | "college"
  | "advanced";

/**
 * Assess difficulty request payload
 */
export type AssessDifficultyRequest = {
  bookId: string;
  sampleText: string;
  userReadingLevel?: ReadingLevel;
  readingGoals?: string[];
};

/**
 * Assess difficulty response
 */
export type AssessDifficultyResponse = AssessDifficultyOutput & {
  success: true;
  timestamp: string;
};

/**
 * Hook to assess reading difficulty and match with reader level
 *
 * Uses AI to analyze a sample text and provide detailed difficulty metrics,
 * including vocabulary complexity, sentence structure, required background,
 * and estimated reading times. Also suggests strategies for challenging content.
 *
 * @example
 * ```tsx
 * const { mutate: assessDifficulty, isPending, data } = useAssessDifficulty();
 *
 * const handleAssess = () => {
 *   assessDifficulty({
 *     bookId: "book-123",
 *     sampleText: "First few pages of the book...",
 *     userReadingLevel: "college",
 *     readingGoals: ["Academic research", "Deep understanding"],
 *   });
 * };
 * ```
 */
export function useAssessDifficulty() {
  return useMutation<AssessDifficultyResponse, Error, AssessDifficultyRequest>({
    mutationFn: async (payload: AssessDifficultyRequest) => {
      const response = await axios.post<AssessDifficultyResponse>(
        "/api/ai/assess-difficulty",
        payload
      );
      return response.data;
    },
  });
}
