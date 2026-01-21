/**
 * Bulk operations hooks for library management
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface BulkOperationResult {
  bookId: string;
  success: boolean;
  error?: string;
}

export interface BulkOperationResponse {
  results: BulkOperationResult[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

/**
 * Hook to bulk update book status
 */
export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookIds,
      status,
    }: {
      bookIds: string[];
      status: string;
    }): Promise<BulkOperationResponse> => {
      const results: BulkOperationResult[] = [];

      // Process each book update
      for (const bookId of bookIds) {
        try {
          const response = await fetch(`/api/books/${bookId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status }),
          });

          if (!response.ok) {
            throw new Error(`Failed to update book ${bookId}`);
          }

          results.push({ bookId, success: true });
        } catch (error) {
          results.push({
            bookId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      return {
        results,
        totalProcessed: bookIds.length,
        successCount,
        failureCount,
      };
    },
    onSuccess: () => {
      // Invalidate books list to refresh data
      void queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

/**
 * Hook to bulk add tags to books
 */
export function useBulkAddTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookIds,
      tags,
    }: {
      bookIds: string[];
      tags: string[];
    }): Promise<BulkOperationResponse> => {
      const results: BulkOperationResult[] = [];

      // Process each book update
      for (const bookId of bookIds) {
        try {
          // First, fetch the book to get existing tags
          const getResponse = await fetch(`/api/books/${bookId}`);
          if (!getResponse.ok) {
            throw new Error(`Failed to fetch book ${bookId}`);
          }

          const book = (await getResponse.json()) as { tags: string[] };
          const existingTags = book.tags || [];

          // Merge with new tags (avoid duplicates)
          const mergedTags = Array.from(new Set([...existingTags, ...tags]));

          // Update the book with merged tags
          const updateResponse = await fetch(`/api/books/${bookId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ tags: mergedTags }),
          });

          if (!updateResponse.ok) {
            throw new Error(`Failed to update book ${bookId}`);
          }

          results.push({ bookId, success: true });
        } catch (error) {
          results.push({
            bookId,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      return {
        results,
        totalProcessed: bookIds.length,
        successCount,
        failureCount,
      };
    },
    onSuccess: () => {
      // Invalidate books list to refresh data
      void queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}
