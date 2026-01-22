/**
 * React Query hooks for forum operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  postCount: number;
  replyCount: number;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  category: ForumCategory;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isPinned: boolean;
  isLocked: boolean;
  voteCount: number;
  replyCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  userVote?: "UP" | "DOWN" | null;
}

export interface ForumReply {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isBestAnswer: boolean;
  voteCount: number;
  createdAt: string;
  updatedAt: string;
  userVote?: "UP" | "DOWN" | null;
  replies?: ForumReply[];
}

export interface CreatePostInput {
  title: string;
  content: string;
  categoryId: string;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
}

export interface CreateReplyInput {
  postId: string;
  parentId?: string;
  content: string;
}

export interface ReportInput {
  postId?: string;
  replyId?: string;
  type: "SPAM" | "HARASSMENT" | "INAPPROPRIATE" | "OFF_TOPIC" | "OTHER";
  reason?: string;
}

export interface ForumListFilters {
  categoryId?: string;
  sort?: "recent" | "popular" | "unanswered" | "trending";
  page?: number;
  limit?: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchCategories(): Promise<ForumCategory[]> {
  const response = await fetch("/api/forum/categories");
  if (!response.ok) {
    throw new Error("Failed to fetch forum categories");
  }
  const result = await response.json();
  return result.data || result;
}

async function fetchPosts(filters: ForumListFilters = {}): Promise<{
  posts: ForumPost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  const params = new URLSearchParams();
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());

  const response = await fetch(`/api/forum/posts?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch forum posts");
  }
  const result = await response.json();
  return result.data || result;
}

async function fetchPost(id: string): Promise<ForumPost> {
  const response = await fetch(`/api/forum/posts/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch forum post");
  }
  const result = await response.json();
  return result.data || result;
}

async function fetchReplies(postId: string): Promise<ForumReply[]> {
  const response = await fetch(`/api/forum/posts/${postId}/replies`);
  if (!response.ok) {
    throw new Error("Failed to fetch forum replies");
  }
  const result = await response.json();
  return result.data || result;
}

async function createPost(input: CreatePostInput): Promise<ForumPost> {
  const response = await fetch("/api/forum/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to create post",
    }));
    throw new Error(error.message || "Failed to create post");
  }

  const result = await response.json();
  return result.data || result;
}

async function updatePost(
  id: string,
  input: UpdatePostInput
): Promise<ForumPost> {
  const response = await fetch(`/api/forum/posts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to update post",
    }));
    throw new Error(error.message || "Failed to update post");
  }

  const result = await response.json();
  return result.data || result;
}

async function deletePost(id: string): Promise<void> {
  const response = await fetch(`/api/forum/posts/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete post");
  }
}

async function createReply(input: CreateReplyInput): Promise<ForumReply> {
  const response = await fetch(`/api/forum/posts/${input.postId}/replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parentId: input.parentId,
      content: input.content,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to create reply",
    }));
    throw new Error(error.message || "Failed to create reply");
  }

  const result = await response.json();
  return result.data || result;
}

async function votePost(
  postId: string,
  voteType: "UP" | "DOWN"
): Promise<void> {
  const response = await fetch(`/api/forum/posts/${postId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ voteType }),
  });

  if (!response.ok) {
    throw new Error("Failed to vote on post");
  }
}

async function voteReply(
  replyId: string,
  voteType: "UP" | "DOWN"
): Promise<void> {
  const response = await fetch(`/api/forum/replies/${replyId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ voteType }),
  });

  if (!response.ok) {
    throw new Error("Failed to vote on reply");
  }
}

async function markBestAnswer(replyId: string): Promise<void> {
  const response = await fetch(`/api/forum/replies/${replyId}/best-answer`, {
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error("Failed to mark best answer");
  }
}

async function reportContent(input: ReportInput): Promise<void> {
  const response = await fetch("/api/forum/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: "Failed to report content",
    }));
    throw new Error(error.message || error.error || "Failed to report content");
  }
}

// ============================================================================
// React Query Hooks
// ============================================================================

export function useForumCategories() {
  return useQuery({
    queryKey: ["forum", "categories"],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useForumPosts(filters: ForumListFilters = {}) {
  return useQuery({
    queryKey: ["forum", "posts", filters],
    queryFn: () => fetchPosts(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useForumPost(id: string, enabled = true) {
  return useQuery({
    queryKey: ["forum", "post", id],
    queryFn: () => fetchPost(id),
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useForumReplies(postId: string, enabled = true) {
  return useQuery({
    queryKey: ["forum", "replies", postId],
    queryFn: () => fetchReplies(postId),
    enabled: enabled && !!postId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum", "posts"] });
      queryClient.invalidateQueries({ queryKey: ["forum", "categories"] });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePostInput }) =>
      updatePost(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["forum", "post", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["forum", "posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum", "posts"] });
      queryClient.invalidateQueries({ queryKey: ["forum", "categories"] });
    },
  });
}

export function useCreateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReply,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["forum", "replies", variables.postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["forum", "post", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["forum", "posts"] });
    },
  });
}

export function useVotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      voteType,
    }: {
      postId: string;
      voteType: "UP" | "DOWN";
    }) => votePost(postId, voteType),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["forum", "post", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["forum", "posts"] });
    },
  });
}

export function useVoteReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      replyId: string;
      voteType: "UP" | "DOWN";
      postId: string;
    }) => voteReply(variables.replyId, variables.voteType),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["forum", "replies", variables.postId],
      });
    },
  });
}

export function useMarkBestAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { replyId: string; postId: string }) =>
      markBestAnswer(variables.replyId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["forum", "replies", variables.postId],
      });
      queryClient.invalidateQueries({
        queryKey: ["forum", "post", variables.postId],
      });
    },
  });
}

export function useReportContent() {
  return useMutation({
    mutationFn: reportContent,
  });
}
