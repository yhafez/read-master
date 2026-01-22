/**
 * React Query hooks for curriculum management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface CurriculumItem {
  id: string;
  orderIndex: number;
  bookId: string | null;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverImage: string | null;
  } | null;
  externalTitle: string | null;
  externalAuthor: string | null;
  externalUrl: string | null;
  externalIsbn: string | null;
  notes: string | null;
  estimatedTime: number | null;
  isOptional: boolean;
}

export interface Curriculum {
  id: string;
  creatorId: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  title: string;
  description: string;
  category: string;
  difficulty: string;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  tags: string[];
  coverImageUrl: string | null;
  estimatedTimeMinutes: number | null;
  followersCount: number;
  createdAt: string;
  updatedAt: string;
  items: CurriculumItem[];
  isFollowing?: boolean;
}

export interface CurriculumListItem {
  id: string;
  creatorId: string;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  title: string;
  description: string;
  category: string;
  difficulty: string;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  tags: string[];
  coverImageUrl: string | null;
  estimatedTimeMinutes: number | null;
  followersCount: number;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
  isFollowing?: boolean;
}

export interface CreateCurriculumInput {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  visibility: "PUBLIC" | "PRIVATE" | "UNLISTED";
  tags?: string[];
  coverImageUrl?: string;
  estimatedTimeMinutes?: number;
  items?: Array<{
    type: "BOOK" | "EXTERNAL_RESOURCE";
    bookId?: string;
    externalTitle?: string;
    externalAuthor?: string;
    externalUrl?: string;
    notes?: string;
    estimatedTimeMinutes?: number;
  }>;
}

export interface UpdateCurriculumInput {
  title?: string;
  description?: string;
  category?: string;
  difficulty?: string;
  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
  tags?: string[];
  coverImageUrl?: string;
  estimatedTimeMinutes?: number;
}

export interface CurriculumListFilters {
  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
  category?: string;
  difficulty?: string;
  page?: number;
  limit?: number;
}

export interface BrowseCurriculumsFilters {
  search?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchCurriculums(filters: CurriculumListFilters = {}): Promise<{
  data: CurriculumListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  const params = new URLSearchParams();
  if (filters.visibility) params.set("visibility", filters.visibility);
  if (filters.category) params.set("category", filters.category);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());

  const response = await fetch(`/api/curriculums?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch curriculums");
  }
  const result = await response.json();
  return result.data || result;
}

async function fetchCurriculum(id: string): Promise<Curriculum> {
  const response = await fetch(`/api/curriculums/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch curriculum");
  }
  const result = await response.json();
  return result.data;
}

async function browseCurriculums(
  filters: BrowseCurriculumsFilters = {}
): Promise<{
  data: CurriculumListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach((tag) => params.append("tags", tag));
  }
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());

  const response = await fetch(`/api/curriculums/browse?${params}`);
  if (!response.ok) {
    throw new Error("Failed to browse curriculums");
  }
  const result = await response.json();
  return result.data || result;
}

async function createCurriculum(
  input: CreateCurriculumInput
): Promise<Curriculum> {
  const response = await fetch("/api/curriculums", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to create curriculum",
    }));
    throw new Error(error.message || "Failed to create curriculum");
  }

  const result = await response.json();
  return result.data;
}

async function updateCurriculum(
  id: string,
  input: UpdateCurriculumInput
): Promise<Curriculum> {
  const response = await fetch(`/api/curriculums/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to update curriculum",
    }));
    throw new Error(error.message || "Failed to update curriculum");
  }

  const result = await response.json();
  return result.data;
}

async function deleteCurriculum(id: string): Promise<void> {
  const response = await fetch(`/api/curriculums/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete curriculum");
  }
}

async function followCurriculum(id: string): Promise<void> {
  const response = await fetch(`/api/curriculums/${id}/follow`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to follow curriculum");
  }
}

async function unfollowCurriculum(id: string): Promise<void> {
  const response = await fetch(`/api/curriculums/${id}/unfollow`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to unfollow curriculum");
  }
}

async function cloneCurriculum(
  id: string,
  input?: { title?: string; visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED" }
): Promise<Curriculum> {
  const response = await fetch(`/api/curriculums/${id}/clone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input || {}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to clone curriculum",
    }));
    throw new Error(error.message || "Failed to clone curriculum");
  }

  const result = await response.json();
  return result.data || result;
}

// ============================================================================
// React Query Hooks
// ============================================================================

export function useCurriculums(filters: CurriculumListFilters = {}) {
  return useQuery({
    queryKey: ["curriculums", filters],
    queryFn: () => fetchCurriculums(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCurriculum(id: string, enabled = true) {
  return useQuery({
    queryKey: ["curriculum", id],
    queryFn: () => fetchCurriculum(id),
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useBrowseCurriculums(filters: BrowseCurriculumsFilters = {}) {
  return useQuery({
    queryKey: ["curriculums", "browse", filters],
    queryFn: () => browseCurriculums(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCurriculum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculums"] });
    },
  });
}

export function useUpdateCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCurriculumInput }) =>
      updateCurriculum(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["curriculum", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["curriculums"] });
    },
  });
}

export function useDeleteCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCurriculum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculums"] });
    },
  });
}

export function useFollowCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: followCurriculum,
    onSuccess: (_data, curriculumId) => {
      queryClient.invalidateQueries({ queryKey: ["curriculum", curriculumId] });
      queryClient.invalidateQueries({ queryKey: ["curriculums"] });
    },
  });
}

export function useUnfollowCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unfollowCurriculum,
    onSuccess: (_data, curriculumId) => {
      queryClient.invalidateQueries({ queryKey: ["curriculum", curriculumId] });
      queryClient.invalidateQueries({ queryKey: ["curriculums"] });
    },
  });
}

export function useCloneCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input?: {
        title?: string;
        visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
      };
    }) => cloneCurriculum(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculums"] });
    },
  });
}
