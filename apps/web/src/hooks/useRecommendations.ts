/**
 * React Query hooks for book recommendations
 */

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface BookRecommender {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export interface BookRecommendation {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  description: string | null;
  genre: string | null;
  wordCount: number | null;
  estimatedReadTime: number | null;
  recommendedBy: BookRecommender[];
  readingCount: number;
  completedCount: number;
}

export interface RecommendationsResponse {
  recommendations: BookRecommendation[];
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get book recommendations from followed users
 */
export function useBookRecommendations(options?: {
  limit?: number;
  enabled?: boolean;
}) {
  const limit = options?.limit || 10;

  return useQuery({
    queryKey: ["books", "recommendations", limit] as const,
    queryFn: async (): Promise<RecommendationsResponse> => {
      logger.info("Fetching book recommendations");

      const queryParams = new URLSearchParams();
      queryParams.set("limit", limit.toString());

      const response = await apiRequest<RecommendationsResponse>(
        `/api/books/recommendations?${queryParams.toString()}`,
        { method: "GET" }
      );

      logger.info("Book recommendations fetched", {
        count: response.recommendations.length,
      });

      return response;
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
