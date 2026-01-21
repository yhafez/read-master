/**
 * React Query hooks for user-related operations
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface FollowUserParams {
  userId: string;
  action: "follow" | "unfollow";
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Follow or unfollow a user
 */
export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FollowUserParams): Promise<void> => {
      const { userId, action } = params;

      logger.info(`${action} user`, { userId });

      await apiRequest(`/api/users/${userId}/follow`, {
        method: action === "follow" ? "POST" : "DELETE",
      });

      logger.info(`${action} successful`, { userId });
    },
    onSuccess: (_data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["users", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["users", "search"],
      });
      queryClient.invalidateQueries({
        queryKey: ["users", "followers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["users", "following"],
      });
      queryClient.invalidateQueries({
        queryKey: ["feed"],
      });
    },
    onError: (error: Error, variables) => {
      logger.error(`Failed to ${variables.action} user`, {
        userId: variables.userId,
        error: error.message,
      });
    },
  });
}
