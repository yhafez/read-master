import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryClient";

/**
 * Book type (simplified for example)
 * In production, import from @read-master/shared
 */
export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  status: "not_started" | "reading" | "completed" | "abandoned";
  progress: number;
  wordCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookListFilters {
  status?: Book["status"] | undefined;
  search?: string | undefined;
  sort?: "title" | "author" | "createdAt" | "progress" | undefined;
  order?: "asc" | "desc" | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API client for books endpoints
 * This is a placeholder - replace with actual API implementation
 */
const booksApi = {
  /**
   * Fetch list of books with filters
   */
  async getBooks(filters?: BookListFilters): Promise<PaginatedResponse<Book>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.sort) params.set("sort", filters.sort);
    if (filters?.order) params.set("order", filters.order);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));

    const response = await fetch(`/api/books?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch books");
    }
    return response.json();
  },

  /**
   * Fetch a single book by ID
   */
  async getBook(id: string): Promise<Book> {
    const response = await fetch(`/api/books/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch book");
    }
    return response.json();
  },

  /**
   * Update a book
   */
  async updateBook(
    id: string,
    data: Partial<Pick<Book, "title" | "author" | "status">>
  ): Promise<Book> {
    const response = await fetch(`/api/books/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Failed to update book");
    }
    return response.json();
  },

  /**
   * Delete a book
   */
  async deleteBook(id: string): Promise<void> {
    const response = await fetch(`/api/books/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete book");
    }
  },
};

/**
 * Hook to fetch list of books with optional filters
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useBooks({ status: "reading" });
 * ```
 */
export function useBooks(
  filters?: BookListFilters,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<Book>, Error>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.books.list(filters as Record<string, unknown>),
    queryFn: () => booksApi.getBooks(filters),
    ...options,
  });
}

/**
 * Hook to fetch a single book by ID
 *
 * @example
 * ```tsx
 * const { data: book, isLoading } = useBook("book-123");
 * ```
 */
export function useBook(
  id: string,
  options?: Omit<UseQueryOptions<Book, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.books.detail(id),
    queryFn: () => booksApi.getBook(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to update a book
 *
 * @example
 * ```tsx
 * const updateBook = useUpdateBook();
 *
 * updateBook.mutate({
 *   id: "book-123",
 *   data: { status: "completed" }
 * });
 * ```
 */
export function useUpdateBook(
  options?: Omit<
    UseMutationOptions<
      Book,
      Error,
      { id: string; data: Partial<Pick<Book, "title" | "author" | "status">> }
    >,
    "mutationFn"
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => booksApi.updateBook(id, data),
    onSuccess: (updatedBook) => {
      // Update the single book query
      queryClient.setQueryData(
        queryKeys.books.detail(updatedBook.id),
        updatedBook
      );

      // Invalidate book lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() });
    },
    ...options,
  });
}

/**
 * Hook to delete a book
 *
 * @example
 * ```tsx
 * const deleteBook = useDeleteBook();
 *
 * deleteBook.mutate("book-123", {
 *   onSuccess: () => {
 *     navigate("/library");
 *   }
 * });
 * ```
 */
export function useDeleteBook(
  options?: Omit<UseMutationOptions<void, Error, string>, "mutationFn">
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => booksApi.deleteBook(id),
    onSuccess: (_data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.books.detail(id) });

      // Invalidate book lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() });
    },
    ...options,
  });
}

/**
 * Prefetch a book's data before navigation
 * Useful for hover states or before navigating to reader
 *
 * @example
 * ```tsx
 * const prefetchBook = usePrefetchBook();
 *
 * <BookCard onMouseEnter={() => prefetchBook(book.id)} />
 * ```
 */
export function usePrefetchBook() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.books.detail(id),
      queryFn: () => booksApi.getBook(id),
    });
  };
}
