import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import type { ConversationMessage, StudyBuddyOutput } from "@read-master/ai";

/**
 * Reading position
 */
export type ReadingPosition = {
  chapter?: string;
  page?: number;
  percentage?: number;
};

/**
 * Recent annotation
 */
export type RecentAnnotation = {
  text: string;
  note?: string;
  type: "note" | "highlight";
};

/**
 * Study buddy request payload
 */
export type StudyBuddyRequest = {
  bookId: string;
  userMessage: string;
  currentPosition?: ReadingPosition;
  currentText?: string;
  conversationHistory?: ConversationMessage[];
  recentAnnotations?: RecentAnnotation[];
};

/**
 * Study buddy response
 */
export type StudyBuddyResponse = StudyBuddyOutput & {
  success: true;
  timestamp: string;
};

/**
 * Hook to interact with AI Study Buddy
 *
 * Provides contextual chat assistance while reading.
 * The AI Study Buddy can answer questions about the content,
 * explain concepts, and provide personalized learning support.
 *
 * @example
 * ```tsx
 * const { mutate: sendMessage, isPending, data } = useStudyBuddy();
 *
 * const handleSendMessage = () => {
 *   sendMessage({
 *     bookId: "book-123",
 *     userMessage: "What does this passage mean?",
 *     currentText: "Selected text from the book...",
 *     currentPosition: { percentage: 45 },
 *     conversationHistory: previousMessages,
 *   });
 * };
 * ```
 */
export function useStudyBuddy() {
  return useMutation<StudyBuddyResponse, Error, StudyBuddyRequest>({
    mutationFn: async (payload: StudyBuddyRequest) => {
      const response = await axios.post<StudyBuddyResponse>(
        "/api/ai/study-buddy",
        payload
      );
      return response.data;
    },
  });
}
