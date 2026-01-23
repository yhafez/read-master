/**
 * React Query hooks for book and user recommendations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

// AI Recommendations Types
export interface AIBookRecommendation {
  id: string;
  bookId: string | null;
  bookTitle: string;
  bookAuthor: string | null;
  bookCoverUrl: string | null;
  reason: string;
  score: number;
  source: "SOCIAL" | "AI" | "TRENDING" | "FOLLOWING";
  sourceUser: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
  dismissed: boolean;
  addedToLibrary: boolean;
}

export interface AIBookRecommendationsResponse {
  recommendations: AIBookRecommendation[];
  total: number;
  hasMore: boolean;
}

export interface SimilarUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  similarityScore: number;
  commonBooks: number;
  commonGenres: string[];
  sharedInterests: string[];
}

export interface SimilarUsersResponse {
  users: SimilarUser[];
  total: number;
}

export type RecommendationSource =
  | "all"
  | "social"
  | "ai"
  | "trending"
  | "following";

// ============================================================================
// Query Keys
// ============================================================================

export const recommendationKeys = {
  all: ["recommendations"] as const,
  books: (source: RecommendationSource, limit: number) =>
    [...recommendationKeys.all, "books", source, limit] as const,
  users: (limit: number) =>
    [...recommendationKeys.all, "users", limit] as const,
  legacy: (limit: number) => ["books", "recommendations", limit] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Get book recommendations from followed users (legacy endpoint)
 */
export function useBookRecommendations(options?: {
  limit?: number;
  enabled?: boolean;
}) {
  const limit = options?.limit || 10;

  return useQuery({
    queryKey: recommendationKeys.legacy(limit),
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

/**
 * Get AI-powered book recommendations
 */
export function useAIBookRecommendations(options?: {
  source?: RecommendationSource;
  limit?: number;
  includeRead?: boolean;
  enabled?: boolean;
}) {
  const source = options?.source || "all";
  const limit = options?.limit || 10;

  return useQuery({
    queryKey: recommendationKeys.books(source, limit),
    queryFn: async (): Promise<AIBookRecommendationsResponse> => {
      logger.info("Fetching AI book recommendations", { source, limit });

      const queryParams = new URLSearchParams();
      queryParams.set("source", source);
      queryParams.set("limit", limit.toString());
      if (options?.includeRead) {
        queryParams.set("includeRead", "true");
      }

      const response = await apiRequest<AIBookRecommendationsResponse>(
        `/api/recommendations/books?${queryParams.toString()}`,
        { method: "GET" }
      );

      logger.info("AI book recommendations fetched", {
        count: response.recommendations.length,
        source,
      });

      return response;
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get similar users based on reading habits
 */
export function useSimilarUsers(options?: {
  limit?: number;
  enabled?: boolean;
}) {
  const limit = options?.limit || 10;

  return useQuery({
    queryKey: recommendationKeys.users(limit),
    queryFn: async (): Promise<SimilarUsersResponse> => {
      logger.info("Fetching similar users", { limit });

      const queryParams = new URLSearchParams();
      queryParams.set("limit", limit.toString());

      const response = await apiRequest<SimilarUsersResponse>(
        `/api/recommendations/users?${queryParams.toString()}`,
        { method: "GET" }
      );

      logger.info("Similar users fetched", {
        count: response.users.length,
      });

      return response;
    },
    enabled: options?.enabled !== false,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Dismiss a book recommendation
 */
export function useDismissRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      recommendationId: string
    ): Promise<{ success: boolean }> => {
      logger.info("Dismissing recommendation", { recommendationId });

      const response = await apiRequest<{ success: boolean }>(
        `/api/recommendations/${recommendationId}/dismiss`,
        { method: "POST" }
      );

      return response;
    },
    onSuccess: () => {
      // Invalidate all recommendation queries
      queryClient.invalidateQueries({ queryKey: recommendationKeys.all });
    },
    onError: (error) => {
      logger.error("Failed to dismiss recommendation", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
