/**
 * useGroupBooks Hook
 *
 * React Query hook for managing group books (scheduled reading list)
 * Provides functions to:
 * - List books in a group's reading list
 * - Add books to the reading list
 * - Update book schedules
 * - Remove books from the list
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

/**
 * Group book status values
 */
export type GroupBookStatus = "UPCOMING" | "CURRENT" | "COMPLETED" | "SKIPPED";

/**
 * Book info within a group book
 */
export interface GroupBookInfo {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  wordCount: number | null;
}

/**
 * A book in the group's reading list
 */
export interface GroupBook {
  id: string;
  groupId: string;
  book: GroupBookInfo;
  status: GroupBookStatus;
  startDate: string | null;
  endDate: string | null;
  targetPage: number | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated response for group books
 */
export interface GroupBooksResponse {
  data: GroupBook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Filters for listing group books
 */
export interface GroupBooksFilters {
  status?: GroupBookStatus;
  page?: number;
  limit?: number;
}

/**
 * Input for adding a book to a group
 */
export interface AddGroupBookInput {
  bookId: string;
  startDate?: string | null;
  endDate?: string | null;
  targetPage?: number | null;
  status?: GroupBookStatus;
}

/**
 * Input for updating a group book
 */
export interface UpdateGroupBookInput {
  startDate?: string | null;
  endDate?: string | null;
  targetPage?: number | null;
  status?: GroupBookStatus;
  orderIndex?: number;
}

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query key factory for group books
 */
export const groupBooksQueryKeys = {
  all: ["groupBooks"] as const,
  list: (groupId: string, filters?: GroupBooksFilters) =>
    [...groupBooksQueryKeys.all, "list", groupId, filters] as const,
  detail: (groupId: string, bookId: string) =>
    [...groupBooksQueryKeys.all, "detail", groupId, bookId] as const,
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch books in a group's reading list
 */
async function fetchGroupBooks(
  groupId: string,
  filters?: GroupBooksFilters
): Promise<GroupBooksResponse> {
  const params = new URLSearchParams();

  if (filters?.status) params.set("status", filters.status);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));

  const queryString = params.toString();
  const url = `/api/groups/${groupId}/books${queryString ? `?${queryString}` : ""}`;

  return apiRequest<GroupBooksResponse>(url);
}

/**
 * Add a book to a group's reading list
 */
async function addGroupBook(
  groupId: string,
  input: AddGroupBookInput
): Promise<GroupBook> {
  return apiRequest<GroupBook>(`/api/groups/${groupId}/books`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Update a book in a group's reading list
 */
async function updateGroupBook(
  groupId: string,
  bookId: string,
  input: UpdateGroupBookInput
): Promise<GroupBook> {
  return apiRequest<GroupBook>(`/api/groups/${groupId}/books/${bookId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/**
 * Remove a book from a group's reading list
 */
async function removeGroupBook(groupId: string, bookId: string): Promise<void> {
  return apiRequest<void>(`/api/groups/${groupId}/books/${bookId}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch group books
 *
 * @param groupId - The group ID
 * @param filters - Optional filters for the list
 * @param options - Additional React Query options
 * @returns Query result with group books
 */
export function useGroupBooks(
  groupId: string,
  filters?: GroupBooksFilters,
  options?: Omit<
    UseQueryOptions<GroupBooksResponse, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: groupBooksQueryKeys.list(groupId, filters),
    queryFn: () => fetchGroupBooks(groupId, filters),
    enabled: !!groupId && options?.enabled !== false,
    staleTime: 1000 * 60 * 2, // 2 minutes
    ...options,
  });
}

/**
 * Hook to add a book to a group
 *
 * @returns Mutation for adding a book
 */
export function useAddGroupBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      input,
    }: {
      groupId: string;
      input: AddGroupBookInput;
    }) => addGroupBook(groupId, input),
    onSuccess: (_data, variables) => {
      // Invalidate the group books list
      queryClient.invalidateQueries({
        queryKey: groupBooksQueryKeys.list(variables.groupId),
      });
      // Also invalidate the group detail (for current book count)
      queryClient.invalidateQueries({
        queryKey: ["readingGroup", variables.groupId],
      });
    },
  });
}

/**
 * Hook to update a group book
 *
 * @returns Mutation for updating a book
 */
export function useUpdateGroupBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      bookId,
      input,
    }: {
      groupId: string;
      bookId: string;
      input: UpdateGroupBookInput;
    }) => updateGroupBook(groupId, bookId, input),
    onSuccess: (_data, variables) => {
      // Invalidate the group books list
      queryClient.invalidateQueries({
        queryKey: groupBooksQueryKeys.list(variables.groupId),
      });
      // Invalidate specific book detail
      queryClient.invalidateQueries({
        queryKey: groupBooksQueryKeys.detail(
          variables.groupId,
          variables.bookId
        ),
      });
      // Also invalidate the group detail
      queryClient.invalidateQueries({
        queryKey: ["readingGroup", variables.groupId],
      });
    },
  });
}

/**
 * Hook to remove a book from a group
 *
 * @returns Mutation for removing a book
 */
export function useRemoveGroupBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, bookId }: { groupId: string; bookId: string }) =>
      removeGroupBook(groupId, bookId),
    onSuccess: (_data, variables) => {
      // Invalidate the group books list
      queryClient.invalidateQueries({
        queryKey: groupBooksQueryKeys.list(variables.groupId),
      });
      // Also invalidate the group detail
      queryClient.invalidateQueries({
        queryKey: ["readingGroup", variables.groupId],
      });
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status color for chips
 */
export function getGroupBookStatusColor(
  status: GroupBookStatus
): "default" | "primary" | "success" | "warning" {
  switch (status) {
    case "CURRENT":
      return "primary";
    case "COMPLETED":
      return "success";
    case "UPCOMING":
      return "default";
    case "SKIPPED":
      return "warning";
    default:
      return "default";
  }
}

/**
 * Get status label for display
 */
export function getGroupBookStatusLabel(status: GroupBookStatus): string {
  switch (status) {
    case "CURRENT":
      return "Currently Reading";
    case "COMPLETED":
      return "Completed";
    case "UPCOMING":
      return "Upcoming";
    case "SKIPPED":
      return "Skipped";
    default:
      return status;
  }
}

/**
 * Sort group books by status priority and order index
 */
export function sortGroupBooks(books: GroupBook[]): GroupBook[] {
  const statusPriority: Record<GroupBookStatus, number> = {
    CURRENT: 0,
    UPCOMING: 1,
    COMPLETED: 2,
    SKIPPED: 3,
  };

  return [...books].sort((a, b) => {
    const statusDiff = statusPriority[a.status] - statusPriority[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.orderIndex - b.orderIndex;
  });
}

export default {
  useGroupBooks,
  useAddGroupBook,
  useUpdateGroupBook,
  useRemoveGroupBook,
};
