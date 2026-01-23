/**
 * Read Master Mobile - useFlashcards Hook
 *
 * React Query hook for fetching and managing flashcards.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type FlashcardReview } from "../services/api";

// ============================================================================
// Query Keys
// ============================================================================

export const flashcardKeys = {
  all: ["flashcards"] as const,
  due: () => [...flashcardKeys.all, "due"] as const,
  stats: () => [...flashcardKeys.all, "stats"] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch due flashcards for review
 */
export function useDueFlashcards(enabled = true) {
  return useQuery({
    queryKey: flashcardKeys.due(),
    queryFn: () => apiClient.getDueFlashcards(),
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Fetch flashcard statistics
 */
export function useFlashcardStats(enabled = true) {
  return useQuery({
    queryKey: flashcardKeys.stats(),
    queryFn: () => apiClient.getFlashcardStats(),
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Review a flashcard
 */
export function useReviewFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (review: FlashcardReview) => apiClient.reviewFlashcard(review),
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: flashcardKeys.due() });
      queryClient.invalidateQueries({ queryKey: flashcardKeys.stats() });
    },
  });
}

/**
 * Get the next flashcard for review from the queue
 */
export function useNextFlashcard() {
  const { data: cards, isLoading, error, refetch } = useDueFlashcards();

  const currentCard = cards && cards.length > 0 ? cards[0] : null;
  const remainingCount = cards ? cards.length : 0;

  return {
    currentCard,
    remainingCount,
    isLoading,
    error,
    refetch,
  };
}
