/**
 * Read Master Mobile - API Service
 *
 * HTTP client for communicating with the Read Master backend.
 */

import { useAuth } from "@clerk/clerk-expo";
import Constants from "expo-constants";

// ============================================================================
// Types
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  status: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  fileUrl: string;
  fileType: "EPUB" | "PDF";
  progress: number;
  currentPage: number | null;
  totalPages: number | null;
  status: "WANT_TO_READ" | "READING" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  title: string;
  href: string;
  level: number;
  startPosition: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  position: number;
  cfi?: string;
  title: string | null;
  createdAt: string;
}

export interface Annotation {
  id: string;
  bookId: string;
  position: number;
  cfi?: string;
  text: string;
  note: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  bookId: string | null;
  bookTitle: string | null;
  dueDate: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  createdAt: string;
}

export interface FlashcardReview {
  cardId: string;
  rating: "again" | "hard" | "good" | "easy";
}

export interface ReadingProgress {
  position: number;
  cfi?: string;
  progress: number;
  currentPage?: number;
}

// ============================================================================
// API Client
// ============================================================================

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl || "http://localhost:3001/api";

class ApiClient {
  private getToken: (() => Promise<string | null>) | null = null;

  setTokenGetter(getter: () => Promise<string | null>) {
    this.getToken = getter;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken ? await this.getToken() : null;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.message || "An error occurred",
        code: errorData.code,
        status: response.status,
      };
      throw error;
    }

    return response.json();
  }

  // Books
  async getBooks(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Book>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status && params.status !== "all")
      searchParams.set("status", params.status.toUpperCase());
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    return this.request<PaginatedResponse<Book>>(
      `/books${query ? `?${query}` : ""}`
    );
  }

  async getBook(id: string): Promise<Book> {
    return this.request<Book>(`/books/${id}`);
  }

  async updateBookProgress(
    id: string,
    progress: ReadingProgress
  ): Promise<void> {
    await this.request(`/books/${id}/progress`, {
      method: "PATCH",
      body: JSON.stringify(progress),
    });
  }

  async updateBookStatus(id: string, status: Book["status"]): Promise<void> {
    await this.request(`/books/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  // Table of Contents
  async getTableOfContents(bookId: string): Promise<Chapter[]> {
    return this.request<Chapter[]>(`/books/${bookId}/toc`);
  }

  // Bookmarks
  async getBookmarks(bookId: string): Promise<Bookmark[]> {
    return this.request<Bookmark[]>(`/books/${bookId}/bookmarks`);
  }

  async createBookmark(
    bookId: string,
    data: { position: number; cfi?: string; title?: string }
  ): Promise<Bookmark> {
    return this.request<Bookmark>(`/books/${bookId}/bookmarks`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteBookmark(bookId: string, bookmarkId: string): Promise<void> {
    await this.request(`/books/${bookId}/bookmarks/${bookmarkId}`, {
      method: "DELETE",
    });
  }

  // Annotations
  async getAnnotations(bookId: string): Promise<Annotation[]> {
    return this.request<Annotation[]>(`/books/${bookId}/annotations`);
  }

  async createAnnotation(
    bookId: string,
    data: {
      position: number;
      cfi?: string;
      text: string;
      note?: string;
      color?: string;
    }
  ): Promise<Annotation> {
    return this.request<Annotation>(`/books/${bookId}/annotations`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAnnotation(
    bookId: string,
    annotationId: string,
    data: { note?: string; color?: string }
  ): Promise<Annotation> {
    return this.request<Annotation>(
      `/books/${bookId}/annotations/${annotationId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
  }

  async deleteAnnotation(bookId: string, annotationId: string): Promise<void> {
    await this.request(`/books/${bookId}/annotations/${annotationId}`, {
      method: "DELETE",
    });
  }

  // Search
  async searchBook(
    bookId: string,
    query: string
  ): Promise<{
    results: Array<{ text: string; position: number; cfi?: string }>;
  }> {
    return this.request<{
      results: Array<{ text: string; position: number; cfi?: string }>;
    }>(`/books/${bookId}/search?q=${encodeURIComponent(query)}`);
  }

  // Flashcards
  async getDueFlashcards(): Promise<Flashcard[]> {
    return this.request<Flashcard[]>("/flashcards/due");
  }

  async reviewFlashcard(review: FlashcardReview): Promise<Flashcard> {
    return this.request<Flashcard>(`/flashcards/${review.cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ rating: review.rating }),
    });
  }

  async getFlashcardStats(): Promise<{
    total: number;
    due: number;
    learning: number;
    mature: number;
  }> {
    return this.request("/flashcards/stats");
  }

  // Social
  async getLeaderboard(
    period: "daily" | "weekly" | "monthly" | "allTime"
  ): Promise<
    Array<{
      rank: number;
      userId: string;
      username: string;
      avatarUrl: string | null;
      score: number;
    }>
  > {
    return this.request(`/social/leaderboard?period=${period}`);
  }

  async getFeed(): Promise<
    Array<{
      id: string;
      type: "book_completed" | "streak" | "achievement" | "review";
      userId: string;
      username: string;
      avatarUrl: string | null;
      content: Record<string, unknown>;
      createdAt: string;
    }>
  > {
    return this.request("/social/feed");
  }

  // User
  async getCurrentUser(): Promise<{
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    tier: "FREE" | "PRO" | "SCHOLAR";
  }> {
    return this.request("/user/me");
  }

  async updateUserSettings(settings: Record<string, unknown>): Promise<void> {
    await this.request("/user/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    });
  }
}

export const apiClient = new ApiClient();

// ============================================================================
// Hook for API Auth Setup
// ============================================================================

export function useApiAuth() {
  const { getToken } = useAuth();

  // Set up the token getter for the API client
  apiClient.setTokenGetter(getToken);

  return apiClient;
}
