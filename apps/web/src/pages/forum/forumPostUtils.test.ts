/**
 * Tests for Forum Post Detail Page Utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateVoteScore,
  applyVote,
  formatVoteScore,
  getVoteScoreColor,
  getRelativeTime,
  formatRelativeTime,
  buildReplyTree,
  countTotalReplies,
  getReplyDepth,
  findReplyById,
  sortReplies,
  canEditPost,
  canEditReply,
  canMarkBestAnswer,
  renderMarkdownContent,
  truncateContent,
  MAX_REPLY_DEPTH,
  TIME_THRESHOLDS,
  type VoteState,
  type ForumReply,
  type ForumPostDetail,
} from "./forumPostUtils";

// =============================================================================
// TEST DATA
// =============================================================================

const createMockReply = (overrides: Partial<ForumReply> = {}): ForumReply => ({
  id: "reply-1",
  content: "Test reply content",
  authorId: "user-1",
  authorName: "TestUser",
  authorAvatar: null,
  createdAt: "2024-01-01T12:00:00Z",
  updatedAt: null,
  upvotes: 10,
  downvotes: 2,
  userVote: null,
  parentReplyId: null,
  isBestAnswer: false,
  replies: [],
  ...overrides,
});

const createMockPost = (
  overrides: Partial<ForumPostDetail> = {}
): ForumPostDetail => ({
  id: "post-1",
  title: "Test Post",
  content: "Test content",
  categoryId: "c1",
  categoryName: "General",
  categorySlug: "general",
  authorId: "user-1",
  authorName: "TestUser",
  authorAvatar: null,
  createdAt: "2024-01-01T12:00:00Z",
  updatedAt: null,
  viewCount: 100,
  upvotes: 20,
  downvotes: 5,
  userVote: null,
  replyCount: 10,
  isOwnPost: true,
  bestAnswerId: null,
  ...overrides,
});

// =============================================================================
// VOTE UTILITIES TESTS
// =============================================================================

describe("Vote Utilities", () => {
  describe("calculateVoteScore", () => {
    it("should calculate positive score", () => {
      expect(calculateVoteScore(10, 3)).toBe(7);
    });

    it("should calculate negative score", () => {
      expect(calculateVoteScore(3, 10)).toBe(-7);
    });

    it("should return zero for equal votes", () => {
      expect(calculateVoteScore(5, 5)).toBe(0);
    });

    it("should handle zero votes", () => {
      expect(calculateVoteScore(0, 0)).toBe(0);
    });
  });

  describe("applyVote", () => {
    let initialState: VoteState;

    beforeEach(() => {
      initialState = {
        upvotes: 10,
        downvotes: 2,
        userVote: null,
        score: 8,
      };
    });

    it("should add upvote when no previous vote", () => {
      const result = applyVote(initialState, "up");
      expect(result.upvotes).toBe(11);
      expect(result.downvotes).toBe(2);
      expect(result.userVote).toBe("up");
      expect(result.score).toBe(9);
    });

    it("should add downvote when no previous vote", () => {
      const result = applyVote(initialState, "down");
      expect(result.upvotes).toBe(10);
      expect(result.downvotes).toBe(3);
      expect(result.userVote).toBe("down");
      expect(result.score).toBe(7);
    });

    it("should toggle off upvote when clicking upvote again", () => {
      const stateWithUpvote: VoteState = {
        ...initialState,
        upvotes: 11,
        userVote: "up",
        score: 9,
      };
      const result = applyVote(stateWithUpvote, "up");
      expect(result.upvotes).toBe(10);
      expect(result.userVote).toBe(null);
    });

    it("should toggle off downvote when clicking downvote again", () => {
      const stateWithDownvote: VoteState = {
        ...initialState,
        downvotes: 3,
        userVote: "down",
        score: 7,
      };
      const result = applyVote(stateWithDownvote, "down");
      expect(result.downvotes).toBe(2);
      expect(result.userVote).toBe(null);
    });

    it("should switch from upvote to downvote", () => {
      const stateWithUpvote: VoteState = {
        ...initialState,
        upvotes: 11,
        userVote: "up",
        score: 9,
      };
      const result = applyVote(stateWithUpvote, "down");
      expect(result.upvotes).toBe(10);
      expect(result.downvotes).toBe(3);
      expect(result.userVote).toBe("down");
      expect(result.score).toBe(7);
    });

    it("should switch from downvote to upvote", () => {
      const stateWithDownvote: VoteState = {
        ...initialState,
        downvotes: 3,
        userVote: "down",
        score: 7,
      };
      const result = applyVote(stateWithDownvote, "up");
      expect(result.upvotes).toBe(11);
      expect(result.downvotes).toBe(2);
      expect(result.userVote).toBe("up");
      expect(result.score).toBe(9);
    });

    it("should handle null vote (remove vote)", () => {
      const stateWithUpvote: VoteState = {
        ...initialState,
        upvotes: 11,
        userVote: "up",
        score: 9,
      };
      const result = applyVote(stateWithUpvote, null);
      expect(result.upvotes).toBe(10);
      expect(result.userVote).toBe(null);
    });
  });

  describe("formatVoteScore", () => {
    it("should format positive score with plus sign", () => {
      expect(formatVoteScore(5)).toBe("+5");
    });

    it("should format negative score with minus sign", () => {
      expect(formatVoteScore(-5)).toBe("-5");
    });

    it("should format zero without sign", () => {
      expect(formatVoteScore(0)).toBe("0");
    });

    it("should handle large numbers", () => {
      expect(formatVoteScore(1000)).toBe("+1000");
      expect(formatVoteScore(-1000)).toBe("-1000");
    });
  });

  describe("getVoteScoreColor", () => {
    it("should return success for positive score", () => {
      expect(getVoteScoreColor(5)).toBe("success");
    });

    it("should return error for negative score", () => {
      expect(getVoteScoreColor(-5)).toBe("error");
    });

    it("should return inherit for zero score", () => {
      expect(getVoteScoreColor(0)).toBe("inherit");
    });
  });
});

// =============================================================================
// TIME UTILITIES TESTS
// =============================================================================

describe("Time Utilities", () => {
  describe("getRelativeTime", () => {
    const NOW = new Date("2024-01-15T12:00:00Z").getTime();

    it("should return seconds for very recent time", () => {
      const date = new Date(NOW - 30 * 1000).toISOString();
      const result = getRelativeTime(date, NOW);
      expect(result.value).toBe(0);
      expect(result.unit).toBe("seconds");
      expect(result.isFuture).toBe(false);
    });

    it("should return minutes for time less than an hour ago", () => {
      const date = new Date(NOW - 30 * 60 * 1000).toISOString();
      const result = getRelativeTime(date, NOW);
      expect(result.value).toBe(30);
      expect(result.unit).toBe("minutes");
    });

    it("should return hours for time less than a day ago", () => {
      const date = new Date(NOW - 5 * 60 * 60 * 1000).toISOString();
      const result = getRelativeTime(date, NOW);
      expect(result.value).toBe(5);
      expect(result.unit).toBe("hours");
    });

    it("should return days for time less than a week ago", () => {
      const date = new Date(NOW - 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = getRelativeTime(date, NOW);
      expect(result.value).toBe(3);
      expect(result.unit).toBe("days");
    });

    it("should return weeks for time less than a month ago", () => {
      const date = new Date(NOW - 2 * 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = getRelativeTime(date, NOW);
      expect(result.value).toBe(2);
      expect(result.unit).toBe("weeks");
    });

    it("should return months for time less than a year ago", () => {
      const date = new Date(NOW - 3 * 30 * 24 * 60 * 60 * 1000).toISOString();
      const result = getRelativeTime(date, NOW);
      expect(result.value).toBe(3);
      expect(result.unit).toBe("months");
    });

    it("should return years for time over a year ago", () => {
      const date = new Date(NOW - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
      const result = getRelativeTime(date, NOW);
      expect(result.value).toBe(2);
      expect(result.unit).toBe("years");
    });

    it("should detect future times", () => {
      const date = new Date(NOW + 5 * 60 * 60 * 1000).toISOString();
      const result = getRelativeTime(date, NOW);
      expect(result.isFuture).toBe(true);
      expect(result.value).toBe(5);
      expect(result.unit).toBe("hours");
    });
  });

  describe("formatRelativeTime", () => {
    const mockT = (key: string, opts?: Record<string, unknown>) => {
      if (key === "forum.post.justNow") return "just now";
      if (key === "forum.post.timeAgo") return `${opts?.time} ago`;
      if (key === "forum.post.inTime") return `in ${opts?.time}`;
      if (key.startsWith("forum.post.time.")) {
        const unit = key.split(".").pop();
        return `${opts?.count} ${unit}`;
      }
      return key;
    };

    it("should format just now", () => {
      const result = formatRelativeTime(
        { value: 0, unit: "seconds", isFuture: false },
        mockT
      );
      expect(result).toBe("just now");
    });

    it("should format past time", () => {
      const result = formatRelativeTime(
        { value: 5, unit: "hours", isFuture: false },
        mockT
      );
      expect(result).toBe("5 hours ago");
    });

    it("should format future time", () => {
      const result = formatRelativeTime(
        { value: 3, unit: "days", isFuture: true },
        mockT
      );
      expect(result).toBe("in 3 days");
    });
  });

  describe("TIME_THRESHOLDS", () => {
    it("should have correct minute threshold", () => {
      expect(TIME_THRESHOLDS.MINUTE).toBe(60 * 1000);
    });

    it("should have correct hour threshold", () => {
      expect(TIME_THRESHOLDS.HOUR).toBe(60 * 60 * 1000);
    });

    it("should have correct day threshold", () => {
      expect(TIME_THRESHOLDS.DAY).toBe(24 * 60 * 60 * 1000);
    });

    it("should have correct week threshold", () => {
      expect(TIME_THRESHOLDS.WEEK).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("should have correct month threshold", () => {
      expect(TIME_THRESHOLDS.MONTH).toBe(30 * 24 * 60 * 60 * 1000);
    });

    it("should have correct year threshold", () => {
      expect(TIME_THRESHOLDS.YEAR).toBe(365 * 24 * 60 * 60 * 1000);
    });
  });
});

// =============================================================================
// REPLY THREADING UTILITIES TESTS
// =============================================================================

describe("Reply Threading Utilities", () => {
  describe("buildReplyTree", () => {
    it("should handle empty array", () => {
      const result = buildReplyTree([]);
      expect(result).toEqual([]);
    });

    it("should handle flat replies (no nesting)", () => {
      const replies = [
        createMockReply({ id: "r1", parentReplyId: null }),
        createMockReply({ id: "r2", parentReplyId: null }),
      ];
      const result = buildReplyTree(replies);
      expect(result.length).toBe(2);
      expect(result[0]!.id).toBe("r1");
      expect(result[1]!.id).toBe("r2");
    });

    it("should nest child replies under parent", () => {
      const replies = [
        createMockReply({ id: "r1", parentReplyId: null }),
        createMockReply({ id: "r2", parentReplyId: "r1" }),
        createMockReply({ id: "r3", parentReplyId: "r1" }),
      ];
      const result = buildReplyTree(replies);
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe("r1");
      expect(result[0]!.replies?.length).toBe(2);
      expect(result[0]!.replies![0]!.id).toBe("r2");
      expect(result[0]!.replies![1]!.id).toBe("r3");
    });

    it("should handle deeply nested replies", () => {
      const replies = [
        createMockReply({ id: "r1", parentReplyId: null }),
        createMockReply({ id: "r2", parentReplyId: "r1" }),
        createMockReply({ id: "r3", parentReplyId: "r2" }),
        createMockReply({ id: "r4", parentReplyId: "r3" }),
      ];
      const result = buildReplyTree(replies);
      expect(result[0]!.replies![0]!.replies![0]!.replies![0]!.id).toBe("r4");
    });

    it("should treat orphan replies as top-level", () => {
      const replies = [
        createMockReply({ id: "r1", parentReplyId: "nonexistent" }),
      ];
      const result = buildReplyTree(replies);
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe("r1");
    });
  });

  describe("countTotalReplies", () => {
    it("should return 0 for empty array", () => {
      expect(countTotalReplies([])).toBe(0);
    });

    it("should count flat replies", () => {
      const replies = [
        createMockReply({ id: "r1" }),
        createMockReply({ id: "r2" }),
      ];
      expect(countTotalReplies(replies)).toBe(2);
    });

    it("should count nested replies", () => {
      const replies = [
        createMockReply({
          id: "r1",
          replies: [
            createMockReply({ id: "r2" }),
            createMockReply({
              id: "r3",
              replies: [createMockReply({ id: "r4" })],
            }),
          ],
        }),
      ];
      expect(countTotalReplies(replies)).toBe(4);
    });
  });

  describe("getReplyDepth", () => {
    const nestedReplies = [
      createMockReply({
        id: "r1",
        replies: [
          createMockReply({
            id: "r2",
            replies: [createMockReply({ id: "r3" })],
          }),
        ],
      }),
    ];

    it("should return 0 for top-level reply", () => {
      expect(getReplyDepth("r1", nestedReplies)).toBe(0);
    });

    it("should return 1 for first-level nested reply", () => {
      expect(getReplyDepth("r2", nestedReplies)).toBe(1);
    });

    it("should return 2 for second-level nested reply", () => {
      expect(getReplyDepth("r3", nestedReplies)).toBe(2);
    });

    it("should return -1 for non-existent reply", () => {
      expect(getReplyDepth("nonexistent", nestedReplies)).toBe(-1);
    });
  });

  describe("findReplyById", () => {
    const replies = [
      createMockReply({
        id: "r1",
        content: "First",
        replies: [createMockReply({ id: "r2", content: "Second" })],
      }),
    ];

    it("should find top-level reply", () => {
      const result = findReplyById("r1", replies);
      expect(result?.content).toBe("First");
    });

    it("should find nested reply", () => {
      const result = findReplyById("r2", replies);
      expect(result?.content).toBe("Second");
    });

    it("should return null for non-existent reply", () => {
      expect(findReplyById("nonexistent", replies)).toBe(null);
    });
  });

  describe("sortReplies", () => {
    const createRepliesForSorting = () => [
      createMockReply({
        id: "r1",
        upvotes: 10,
        downvotes: 2,
        createdAt: "2024-01-01T12:00:00Z",
      }),
      createMockReply({
        id: "r2",
        upvotes: 20,
        downvotes: 1,
        createdAt: "2024-01-02T12:00:00Z",
      }),
      createMockReply({
        id: "r3",
        upvotes: 5,
        downvotes: 0,
        createdAt: "2024-01-03T12:00:00Z",
      }),
    ];

    it("should sort by newest first", () => {
      const replies = createRepliesForSorting();
      const result = sortReplies(replies, "newest");
      expect(result[0]!.id).toBe("r3");
      expect(result[1]!.id).toBe("r2");
      expect(result[2]!.id).toBe("r1");
    });

    it("should sort by oldest first", () => {
      const replies = createRepliesForSorting();
      const result = sortReplies(replies, "oldest");
      expect(result[0]!.id).toBe("r1");
      expect(result[1]!.id).toBe("r2");
      expect(result[2]!.id).toBe("r3");
    });

    it("should sort by best (highest score)", () => {
      const replies = createRepliesForSorting();
      const result = sortReplies(replies, "best");
      expect(result[0]!.id).toBe("r2"); // 20-1 = 19
      expect(result[1]!.id).toBe("r1"); // 10-2 = 8
      expect(result[2]!.id).toBe("r3"); // 5-0 = 5
    });

    it("should sort by controversial (most total votes)", () => {
      const replies = [
        createMockReply({ id: "r1", upvotes: 5, downvotes: 5 }), // 10 total
        createMockReply({ id: "r2", upvotes: 20, downvotes: 0 }), // 20 total
        createMockReply({ id: "r3", upvotes: 3, downvotes: 1 }), // 4 total
      ];
      const result = sortReplies(replies, "controversial");
      expect(result[0]!.id).toBe("r2");
      expect(result[1]!.id).toBe("r1");
      expect(result[2]!.id).toBe("r3");
    });

    it("should sort nested replies recursively", () => {
      const replies = [
        createMockReply({
          id: "r1",
          createdAt: "2024-01-01T12:00:00Z",
          replies: [
            createMockReply({ id: "r2", createdAt: "2024-01-02T12:00:00Z" }),
            createMockReply({ id: "r3", createdAt: "2024-01-03T12:00:00Z" }),
          ],
        }),
      ];
      const result = sortReplies(replies, "newest");
      expect(result[0]!.replies![0]!.id).toBe("r3");
      expect(result[0]!.replies![1]!.id).toBe("r2");
    });
  });

  describe("MAX_REPLY_DEPTH", () => {
    it("should be set to 3", () => {
      expect(MAX_REPLY_DEPTH).toBe(3);
    });
  });
});

// =============================================================================
// POST UTILITIES TESTS
// =============================================================================

describe("Post Utilities", () => {
  describe("canEditPost", () => {
    it("should return true when user is the author", () => {
      const post = createMockPost({ authorId: "user-1" });
      expect(canEditPost(post, "user-1")).toBe(true);
    });

    it("should return false when user is not the author", () => {
      const post = createMockPost({ authorId: "user-1" });
      expect(canEditPost(post, "user-2")).toBe(false);
    });
  });

  describe("canEditReply", () => {
    it("should return true when user is the reply author", () => {
      const reply = createMockReply({ authorId: "user-1" });
      expect(canEditReply(reply, "user-1")).toBe(true);
    });

    it("should return false when user is not the reply author", () => {
      const reply = createMockReply({ authorId: "user-1" });
      expect(canEditReply(reply, "user-2")).toBe(false);
    });
  });

  describe("canMarkBestAnswer", () => {
    it("should return true when user is the post author", () => {
      const post = createMockPost({ authorId: "user-1" });
      expect(canMarkBestAnswer(post, "user-1")).toBe(true);
    });

    it("should return false when user is not the post author", () => {
      const post = createMockPost({ authorId: "user-1" });
      expect(canMarkBestAnswer(post, "user-2")).toBe(false);
    });
  });

  describe("renderMarkdownContent", () => {
    it("should escape HTML", () => {
      const result = renderMarkdownContent("<script>alert('xss')</script>");
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
    });

    it("should render bold text", () => {
      const result = renderMarkdownContent("**bold text**");
      expect(result).toContain("<strong>bold text</strong>");
    });

    it("should render italic text", () => {
      const result = renderMarkdownContent("*italic text*");
      expect(result).toContain("<em>italic text</em>");
    });

    it("should render inline code", () => {
      const result = renderMarkdownContent("`code`");
      expect(result).toContain("<code>code</code>");
    });

    it("should render code blocks", () => {
      const result = renderMarkdownContent("```\ncode block\n```");
      expect(result).toContain("<pre><code>");
    });

    it("should render links with security attributes", () => {
      const result = renderMarkdownContent("[link](https://example.com)");
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('href="https://example.com"');
    });

    it("should render blockquotes", () => {
      const result = renderMarkdownContent("> quoted text");
      expect(result).toContain("<blockquote>");
    });

    it("should render unordered lists", () => {
      const result = renderMarkdownContent("- item 1\n- item 2");
      expect(result).toContain("<li>item 1</li>");
      expect(result).toContain("<ul>");
    });

    it("should handle paragraphs", () => {
      const result = renderMarkdownContent("paragraph 1\n\nparagraph 2");
      expect(result).toContain("</p><p>");
    });

    it("should handle line breaks", () => {
      const result = renderMarkdownContent("line 1\nline 2");
      expect(result).toContain("<br/>");
    });
  });

  describe("truncateContent", () => {
    it("should not truncate short content", () => {
      expect(truncateContent("short", 10)).toBe("short");
    });

    it("should truncate long content with ellipsis", () => {
      expect(truncateContent("this is a long text", 10)).toBe("this is a...");
    });

    it("should handle exact length content", () => {
      expect(truncateContent("exact", 5)).toBe("exact");
    });

    it("should trim whitespace before adding ellipsis", () => {
      expect(truncateContent("word word word", 5)).toBe("word...");
    });
  });
});
