import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import type { SummarizeNotesOutput } from "@read-master/ai";

/**
 * Annotation for notes summarization
 */
export type AnnotationForSummary = {
  text: string;
  note?: string;
  color?: string;
  chapter?: string;
  page?: number;
  type: "note" | "highlight";
  createdAt: string;
};

/**
 * Summarize notes request payload
 */
export type SummarizeNotesRequest = {
  bookId: string;
  annotations: AnnotationForSummary[];
  style?: "brief" | "structured" | "outline" | "synthesis";
  groupBy?: "chronological" | "theme" | "chapter" | "type";
  includeQuotes?: boolean;
};

/**
 * Summarize notes response
 */
export type SummarizeNotesResponse = SummarizeNotesOutput & {
  success: true;
  timestamp: string;
};

/**
 * Hook to summarize user notes and annotations
 *
 * Uses AI to generate intelligent summaries of reading notes,
 * organizing them by theme or chronology. Includes key themes,
 * main takeaways, and suggested review topics.
 *
 * @example
 * ```tsx
 * const { mutate: summarize, isPending, data } = useSummarizeNotes();
 *
 * const handleSummarize = () => {
 *   summarize({
 *     bookId: "book-123",
 *     annotations: userAnnotations,
 *     style: "structured",
 *     groupBy: "theme",
 *     includeQuotes: true,
 *   });
 * };
 * ```
 */
export function useSummarizeNotes() {
  return useMutation<SummarizeNotesResponse, Error, SummarizeNotesRequest>({
    mutationFn: async (payload: SummarizeNotesRequest) => {
      const response = await axios.post<SummarizeNotesResponse>(
        "/api/ai/summarize-notes",
        payload
      );
      return response.data;
    },
  });
}
