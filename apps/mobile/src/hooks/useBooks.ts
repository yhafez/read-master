/**
 * Read Master Mobile - useBooks Hook
 *
 * React Query hook for fetching and managing books.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type Book, type ReadingProgress } from "../services/api";

// ============================================================================
// Types
// ============================================================================

export interface UseBooksOptions {
  search?: string;
  status?: "all" | "reading" | "completed" | "want_to_read";
  page?: number;
  limit?: number;
  enabled?: boolean;
}

// ============================================================================
// Query Keys
// ============================================================================

export const bookKeys = {
  all: ["books"] as const,
  lists: () => [...bookKeys.all, "list"] as const,
  list: (filters: UseBooksOptions) => [...bookKeys.lists(), filters] as const,
  details: () => [...bookKeys.all, "detail"] as const,
  detail: (id: string) => [...bookKeys.details(), id] as const,
  toc: (id: string) => [...bookKeys.all, "toc", id] as const,
  bookmarks: (id: string) => [...bookKeys.all, "bookmarks", id] as const,
  annotations: (id: string) => [...bookKeys.all, "annotations", id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch list of books with optional filtering
 */
export function useBooks(options: UseBooksOptions = {}) {
  const { search, status, page, limit, enabled = true } = options;

  return useQuery({
    queryKey: bookKeys.list({ search, status, page, limit }),
    queryFn: async () => {
      const response = await apiClient.getBooks({
        search,
        status,
        page,
        limit,
      });
      return response.items;
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch a single book by ID
 */
export function useBook(id: string, enabled = true) {
  return useQuery({
    queryKey: bookKeys.detail(id),
    queryFn: () => apiClient.getBook(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch table of contents for a book
 */
export function useTableOfContents(bookId: string, enabled = true) {
  return useQuery({
    queryKey: bookKeys.toc(bookId),
    queryFn: () => apiClient.getTableOfContents(bookId),
    enabled: enabled && !!bookId,
    staleTime: 1000 * 60 * 60, // 1 hour (TOC doesn't change)
  });
}

/**
 * Fetch bookmarks for a book
 */
export function useBookmarks(bookId: string, enabled = true) {
  return useQuery({
    queryKey: bookKeys.bookmarks(bookId),
    queryFn: () => apiClient.getBookmarks(bookId),
    enabled: enabled && !!bookId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Fetch annotations for a book
 */
export function useAnnotations(bookId: string, enabled = true) {
  return useQuery({
    queryKey: bookKeys.annotations(bookId),
    queryFn: () => apiClient.getAnnotations(bookId),
    enabled: enabled && !!bookId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Update reading progress
 */
export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      progress,
    }: {
      bookId: string;
      progress: ReadingProgress;
    }) => apiClient.updateBookProgress(bookId, progress),
    onSuccess: (_, { bookId }) => {
      // Invalidate and refetch book details
      queryClient.invalidateQueries({ queryKey: bookKeys.detail(bookId) });
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
  });
}

/**
 * Update book status
 */
export function useUpdateBookStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      status,
    }: {
      bookId: string;
      status: Book["status"];
    }) => apiClient.updateBookStatus(bookId, status),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: bookKeys.detail(bookId) });
      queryClient.invalidateQueries({ queryKey: bookKeys.lists() });
    },
  });
}

/**
 * Create a bookmark
 */
export function useCreateBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      data,
    }: {
      bookId: string;
      data: { position: number; cfi?: string; title?: string };
    }) => apiClient.createBookmark(bookId, data),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: bookKeys.bookmarks(bookId) });
    },
  });
}

/**
 * Delete a bookmark
 */
export function useDeleteBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      bookmarkId,
    }: {
      bookId: string;
      bookmarkId: string;
    }) => apiClient.deleteBookmark(bookId, bookmarkId),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: bookKeys.bookmarks(bookId) });
    },
  });
}

/**
 * Create an annotation
 */
export function useCreateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      data,
    }: {
      bookId: string;
      data: {
        position: number;
        cfi?: string;
        text: string;
        note?: string;
        color?: string;
      };
    }) => apiClient.createAnnotation(bookId, data),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: bookKeys.annotations(bookId) });
    },
  });
}

/**
 * Update an annotation
 */
export function useUpdateAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      annotationId,
      data,
    }: {
      bookId: string;
      annotationId: string;
      data: { note?: string; color?: string };
    }) => apiClient.updateAnnotation(bookId, annotationId, data),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: bookKeys.annotations(bookId) });
    },
  });
}

/**
 * Delete an annotation
 */
export function useDeleteAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookId,
      annotationId,
    }: {
      bookId: string;
      annotationId: string;
    }) => apiClient.deleteAnnotation(bookId, annotationId),
    onSuccess: (_, { bookId }) => {
      queryClient.invalidateQueries({ queryKey: bookKeys.annotations(bookId) });
    },
  });
}

/**
 * Search within a book
 */
export function useBookSearch(bookId: string, query: string, enabled = true) {
  return useQuery({
    queryKey: [...bookKeys.detail(bookId), "search", query],
    queryFn: () => apiClient.searchBook(bookId, query),
    enabled: enabled && !!bookId && query.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
