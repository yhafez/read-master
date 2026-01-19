/**
 * Forum Post Detail Page Utilities
 *
 * Utility functions for the forum post detail view, including:
 * - Vote state management
 * - Reply threading and nesting
 * - Time formatting
 * - Post/reply data transformation
 */

// =============================================================================
// TYPES
// =============================================================================

export type VoteType = "up" | "down" | null;

export interface VoteState {
  upvotes: number;
  downvotes: number;
  userVote: VoteType;
  score: number;
}

export interface ForumReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
  updatedAt: string | null;
  upvotes: number;
  downvotes: number;
  userVote: VoteType;
  parentReplyId: string | null;
  isBestAnswer: boolean;
  replies?: ForumReply[];
}

export interface ForumPostDetail {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
  updatedAt: string | null;
  viewCount: number;
  upvotes: number;
  downvotes: number;
  userVote: VoteType;
  replyCount: number;
  isOwnPost: boolean;
  bestAnswerId: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum nesting depth for replies (0 = top-level, 3 = max depth) */
export const MAX_REPLY_DEPTH = 3;

/** Time thresholds for relative time display (in milliseconds) */
export const TIME_THRESHOLDS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

// =============================================================================
// VOTE UTILITIES
// =============================================================================

/**
 * Calculate the vote score (upvotes - downvotes)
 */
export function calculateVoteScore(upvotes: number, downvotes: number): number {
  return upvotes - downvotes;
}

/**
 * Calculate the new vote state after a user vote action
 *
 * @param currentState - Current vote state
 * @param newVote - New vote to apply (up, down, or null to remove)
 * @returns Updated vote state
 */
export function applyVote(
  currentState: VoteState,
  newVote: VoteType
): VoteState {
  const { upvotes, downvotes, userVote } = currentState;

  let newUpvotes = upvotes;
  let newDownvotes = downvotes;

  // Remove previous vote
  if (userVote === "up") {
    newUpvotes--;
  } else if (userVote === "down") {
    newDownvotes--;
  }

  // Apply new vote (unless it's the same as current, which means toggle off)
  const finalVote = userVote === newVote ? null : newVote;

  if (finalVote === "up") {
    newUpvotes++;
  } else if (finalVote === "down") {
    newDownvotes++;
  }

  return {
    upvotes: newUpvotes,
    downvotes: newDownvotes,
    userVote: finalVote,
    score: calculateVoteScore(newUpvotes, newDownvotes),
  };
}

/**
 * Format vote score for display
 * Shows + or - prefix for non-zero scores
 */
export function formatVoteScore(score: number): string {
  if (score === 0) return "0";
  return score > 0 ? `+${score}` : `${score}`;
}

/**
 * Get the color for displaying a vote score
 */
export function getVoteScoreColor(
  score: number
): "success" | "error" | "inherit" {
  if (score > 0) return "success";
  if (score < 0) return "error";
  return "inherit";
}

// =============================================================================
// TIME UTILITIES
// =============================================================================

/**
 * Calculate relative time from a date string
 *
 * @param dateString - ISO date string
 * @param now - Current time (for testing, defaults to Date.now())
 * @returns Object with numeric value and unit for i18n
 */
export function getRelativeTime(
  dateString: string,
  now: number = Date.now()
): { value: number; unit: string; isFuture: boolean } {
  const date = new Date(dateString).getTime();
  const diff = now - date;
  const absDiff = Math.abs(diff);
  const isFuture = diff < 0;

  if (absDiff < TIME_THRESHOLDS.MINUTE) {
    return { value: 0, unit: "seconds", isFuture };
  }

  if (absDiff < TIME_THRESHOLDS.HOUR) {
    const minutes = Math.floor(absDiff / TIME_THRESHOLDS.MINUTE);
    return { value: minutes, unit: "minutes", isFuture };
  }

  if (absDiff < TIME_THRESHOLDS.DAY) {
    const hours = Math.floor(absDiff / TIME_THRESHOLDS.HOUR);
    return { value: hours, unit: "hours", isFuture };
  }

  if (absDiff < TIME_THRESHOLDS.WEEK) {
    const days = Math.floor(absDiff / TIME_THRESHOLDS.DAY);
    return { value: days, unit: "days", isFuture };
  }

  if (absDiff < TIME_THRESHOLDS.MONTH) {
    const weeks = Math.floor(absDiff / TIME_THRESHOLDS.WEEK);
    return { value: weeks, unit: "weeks", isFuture };
  }

  if (absDiff < TIME_THRESHOLDS.YEAR) {
    const months = Math.floor(absDiff / TIME_THRESHOLDS.MONTH);
    return { value: months, unit: "months", isFuture };
  }

  const years = Math.floor(absDiff / TIME_THRESHOLDS.YEAR);
  return { value: years, unit: "years", isFuture };
}

/**
 * Format a relative time object to a display string
 *
 * @param relativeTime - Object from getRelativeTime
 * @param t - Translation function
 * @returns Formatted string like "2 hours ago" or "in 3 days"
 */
export function formatRelativeTime(
  relativeTime: { value: number; unit: string; isFuture: boolean },
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const { value, unit, isFuture } = relativeTime;

  if (value === 0 && unit === "seconds") {
    return t("forum.post.justNow");
  }

  const timeStr = t(`forum.post.time.${unit}`, { count: value });

  if (isFuture) {
    return t("forum.post.inTime", { time: timeStr });
  }

  return t("forum.post.timeAgo", { time: timeStr });
}

// =============================================================================
// REPLY THREADING UTILITIES
// =============================================================================

/**
 * Organize flat replies into a nested tree structure
 *
 * @param replies - Flat array of replies
 * @param maxDepth - Maximum nesting depth
 * @returns Nested reply tree with top-level replies having nested children
 */
export function buildReplyTree(
  replies: ForumReply[],
  maxDepth: number = MAX_REPLY_DEPTH
): ForumReply[] {
  // Create a map for quick lookup
  const replyMap = new Map<string, ForumReply>();
  replies.forEach((reply) => {
    replyMap.set(reply.id, { ...reply, replies: [] });
  });

  const rootReplies: ForumReply[] = [];

  // Build the tree
  replyMap.forEach((reply) => {
    if (reply.parentReplyId === null) {
      // Top-level reply
      rootReplies.push(reply);
    } else {
      // Find parent and add as child
      const parent = replyMap.get(reply.parentReplyId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(reply);
      } else {
        // Parent not found, treat as top-level
        rootReplies.push(reply);
      }
    }
  });

  // Flatten replies beyond max depth
  function flattenBeyondDepth(
    replies: ForumReply[],
    currentDepth: number
  ): ForumReply[] {
    return replies.map((reply) => {
      if (currentDepth >= maxDepth) {
        // Flatten all nested replies into this level
        const flattenedReplies = flattenDeep(reply.replies || []);
        return { ...reply, replies: flattenedReplies };
      }

      return {
        ...reply,
        replies: flattenBeyondDepth(reply.replies || [], currentDepth + 1),
      };
    });
  }

  return flattenBeyondDepth(rootReplies, 0);
}

/**
 * Recursively flatten a nested reply array
 */
function flattenDeep(replies: ForumReply[]): ForumReply[] {
  const result: ForumReply[] = [];

  replies.forEach((reply) => {
    result.push({ ...reply, replies: [] });
    if (reply.replies && reply.replies.length > 0) {
      result.push(...flattenDeep(reply.replies));
    }
  });

  return result;
}

/**
 * Count total replies including nested ones
 */
export function countTotalReplies(replies: ForumReply[]): number {
  let count = 0;

  replies.forEach((reply) => {
    count++;
    if (reply.replies && reply.replies.length > 0) {
      count += countTotalReplies(reply.replies);
    }
  });

  return count;
}

/**
 * Get the depth level of a reply in the tree (0 = top-level)
 */
export function getReplyDepth(
  replyId: string,
  replies: ForumReply[],
  currentDepth: number = 0
): number {
  for (const reply of replies) {
    if (reply.id === replyId) {
      return currentDepth;
    }

    if (reply.replies && reply.replies.length > 0) {
      const found = getReplyDepth(replyId, reply.replies, currentDepth + 1);
      if (found >= 0) {
        return found;
      }
    }
  }

  return -1; // Not found
}

/**
 * Find a reply by ID in a nested tree
 */
export function findReplyById(
  replyId: string,
  replies: ForumReply[]
): ForumReply | null {
  for (const reply of replies) {
    if (reply.id === replyId) {
      return reply;
    }

    if (reply.replies && reply.replies.length > 0) {
      const found = findReplyById(replyId, reply.replies);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Sort replies by a given criteria
 */
export type ReplySortOrder = "newest" | "oldest" | "best" | "controversial";

export function sortReplies(
  replies: ForumReply[],
  order: ReplySortOrder
): ForumReply[] {
  const sorted = [...replies];

  switch (order) {
    case "newest":
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;

    case "oldest":
      sorted.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      break;

    case "best":
      // Sort by score (upvotes - downvotes)
      sorted.sort((a, b) => {
        const scoreA = a.upvotes - a.downvotes;
        const scoreB = b.upvotes - b.downvotes;
        return scoreB - scoreA;
      });
      break;

    case "controversial":
      // Sort by total votes (most engagement)
      sorted.sort((a, b) => {
        const totalA = a.upvotes + a.downvotes;
        const totalB = b.upvotes + b.downvotes;
        return totalB - totalA;
      });
      break;
  }

  // Recursively sort nested replies
  return sorted.map((reply) => ({
    ...reply,
    replies: reply.replies ? sortReplies(reply.replies, order) : [],
  }));
}

// =============================================================================
// POST UTILITIES
// =============================================================================

/**
 * Check if a post can be edited by the current user
 */
export function canEditPost(post: ForumPostDetail, userId: string): boolean {
  return post.authorId === userId;
}

/**
 * Check if a reply can be edited by the current user
 */
export function canEditReply(reply: ForumReply, userId: string): boolean {
  return reply.authorId === userId;
}

/**
 * Check if the current user can mark a reply as best answer
 */
export function canMarkBestAnswer(
  post: ForumPostDetail,
  userId: string
): boolean {
  return post.authorId === userId;
}

/**
 * Parse markdown preview for post/reply content
 * Uses the same renderer as ForumCreatePage
 */
export function renderMarkdownContent(content: string): string {
  // Escape HTML to prevent XSS
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Apply markdown transformations
  let html = escaped
    // Code blocks (must come before inline code)
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Links
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    // Blockquotes
    .replace(/^&gt;\s?(.*)$/gm, "<blockquote>$1</blockquote>")
    // Unordered lists
    .replace(/^-\s+(.*)$/gm, "<li>$1</li>")
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    // Line breaks
    .replace(/\n/g, "<br/>");

  // Wrap consecutive li elements in ul
  html = html.replace(/(<li>.*<\/li>\s*)+/g, "<ul>$&</ul>");

  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, "<br/>");

  return `<p>${html}</p>`;
}

/**
 * Truncate content for preview
 */
export function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + "...";
}
