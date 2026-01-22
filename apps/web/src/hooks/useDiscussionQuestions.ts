import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import type { DiscussionQuestionsOutput } from "@read-master/ai";

/**
 * Section schema for focusing on specific sections
 */
export type Section = {
  chapter?: string;
  startPage?: number;
  endPage?: number;
  title?: string;
};

/**
 * Reading progress schema
 */
export type Progress = {
  percentage?: number;
  currentChapter?: string;
};

/**
 * Discussion questions request payload
 */
export type DiscussionQuestionsRequest = {
  bookId: string;
  section?: Section;
  progress?: Progress;
  questionType?:
    | "comprehension"
    | "analysis"
    | "application"
    | "creative"
    | "mixed";
  questionCount?: number;
};

/**
 * Discussion questions response
 */
export type DiscussionQuestionsResponse = DiscussionQuestionsOutput & {
  success: true;
  timestamp: string;
};

/**
 * Hook to generate discussion questions for a book
 *
 * Uses AI to create thoughtful discussion questions for individual
 * reflection or group discussions. Questions are categorized by type
 * (comprehension, analysis, etc.) and include difficulty ratings.
 *
 * @example
 * ```tsx
 * const { mutate: generateQuestions, isPending, data } = useDiscussionQuestions();
 *
 * const handleGenerateQuestions = () => {
 *   generateQuestions({
 *     bookId: "book-123",
 *     questionType: "analysis",
 *     questionCount: 5,
 *     section: { chapter: "Chapter 3" },
 *   });
 * };
 * ```
 */
export function useDiscussionQuestions() {
  return useMutation<
    DiscussionQuestionsResponse,
    Error,
    DiscussionQuestionsRequest
  >({
    mutationFn: async (payload: DiscussionQuestionsRequest) => {
      const response = await axios.post<DiscussionQuestionsResponse>(
        "/api/ai/discussion-questions",
        payload
      );
      return response.data;
    },
  });
}
