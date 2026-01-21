/**
 * React Query hooks for user search
 */

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  tier: string;
  profilePublic: boolean;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

export interface SearchUsersParams {
  q: string;
  limit?: number;
  page?: number;
}

export interface SearchUsersResponse {
  users: UserSearchResult[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Search for users by username or display name
 */
export function useUserSearch(
  params: SearchUsersParams,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: ["users", "search", params] as const,
    queryFn: async (): Promise<SearchUsersResponse> => {
      logger.info("Searching users", { query: params.q });

      const queryParams = new URLSearchParams();
      queryParams.set("q", params.q);
      if (params.limit) {
        queryParams.set("limit", params.limit.toString());
      }
      if (params.page) {
        queryParams.set("page", params.page.toString());
      }

      const response = await apiRequest<SearchUsersResponse>(
        `/api/users/search?${queryParams.toString()}`,
        { method: "GET" }
      );

      logger.info("User search completed", {
        query: params.q,
        resultsCount: response.users.length,
        total: response.total,
      });

      return response;
    },
    enabled: options?.enabled !== false && params.q.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });
}
