/**
 * Tests for /api/forum/posts/[id] endpoint
 */

import { describe, it, expect } from "vitest";
import {
  MAX_REPLY_DEPTH,
  DEFAULT_REPLIES_LIMIT,
  formatDate,
  formatDateRequired,
  parsePostId,
  mapToUserInfo,
  mapToCategoryInfo,
  mapToBookInfo,
  mapToReplyInfo,
  mapToPostDetailResponse,
  type PostUserInfo,
  type PostCategoryInfo,
  type PostBookInfo,
  type ForumReplyInfo,
  type ForumPostDetailResponse,
  type GetPostResponse,
  type UpdatePostResponse,
  type DeletePostResponse,
} from "./[id].js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct MAX_REPLY_DEPTH", () => {
    expect(MAX_REPLY_DEPTH).toBe(5);
  });

  it("should have correct DEFAULT_REPLIES_LIMIT", () => {
    expect(DEFAULT_REPLIES_LIMIT).toBe(50);
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format a valid date", () => {
    const date = new Date("2026-01-18T12:00:00.000Z");
    expect(formatDate(date)).toBe("2026-01-18T12:00:00.000Z");
  });

  it("should return null for null input", () => {
    expect(formatDate(null)).toBeNull();
  });
});

// ============================================================================
// formatDateRequired Tests
// ============================================================================

describe("formatDateRequired", () => {
  it("should format a valid date", () => {
    const date = new Date("2026-01-18T15:30:00.000Z");
    expect(formatDateRequired(date)).toBe("2026-01-18T15:30:00.000Z");
  });
});

// ============================================================================
// parsePostId Tests
// ============================================================================

describe("parsePostId", () => {
  it("should parse valid post ID (CUID format)", () => {
    expect(parsePostId("clxyz123abc")).toBe("clxyz123abc");
    expect(parsePostId("cm7abc123def456")).toBe("cm7abc123def456");
  });

  it("should return null for invalid post ID", () => {
    expect(parsePostId("")).toBeNull();
    expect(parsePostId(null)).toBeNull();
    expect(parsePostId(undefined)).toBeNull();
    expect(parsePostId(123)).toBeNull();
    expect(parsePostId("invalid-id")).toBeNull();
    expect(parsePostId("ABC123")).toBeNull();
  });

  it("should return null for post ID starting with wrong character", () => {
    expect(parsePostId("axyz123")).toBeNull();
    expect(parsePostId("bxyz123")).toBeNull();
  });
});

// ============================================================================
// mapToUserInfo Tests
// ============================================================================

describe("mapToUserInfo", () => {
  it("should map user with all fields", () => {
    const user = {
      id: "user-123",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };

    const result = mapToUserInfo(user);

    expect(result.id).toBe("user-123");
    expect(result.username).toBe("testuser");
    expect(result.displayName).toBe("Test User");
    expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("should map user with null fields", () => {
    const user = {
      id: "user-456",
      username: null,
      displayName: null,
      avatarUrl: null,
    };

    const result = mapToUserInfo(user);

    expect(result.id).toBe("user-456");
    expect(result.username).toBeNull();
    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });
});

// ============================================================================
// mapToCategoryInfo Tests
// ============================================================================

describe("mapToCategoryInfo", () => {
  it("should map category with all fields", () => {
    const category = {
      id: "cat-123",
      slug: "general",
      name: "General Discussion",
      color: "#3B82F6",
    };

    const result = mapToCategoryInfo(category);

    expect(result.id).toBe("cat-123");
    expect(result.slug).toBe("general");
    expect(result.name).toBe("General Discussion");
    expect(result.color).toBe("#3B82F6");
  });

  it("should map category with null color", () => {
    const category = {
      id: "cat-456",
      slug: "help",
      name: "Help",
      color: null,
    };

    const result = mapToCategoryInfo(category);

    expect(result.color).toBeNull();
  });
});

// ============================================================================
// mapToBookInfo Tests
// ============================================================================

describe("mapToBookInfo", () => {
  it("should map book with all fields", () => {
    const book = {
      id: "book-123",
      title: "Great Expectations",
      author: "Charles Dickens",
      coverImage: "https://example.com/cover.jpg",
    };

    const result = mapToBookInfo(book);

    expect(result).not.toBeNull();
    expect(result?.id).toBe("book-123");
    expect(result?.title).toBe("Great Expectations");
    expect(result?.author).toBe("Charles Dickens");
    expect(result?.coverImage).toBe("https://example.com/cover.jpg");
  });

  it("should return null for null book", () => {
    const result = mapToBookInfo(null);
    expect(result).toBeNull();
  });

  it("should map book with null author and coverImage", () => {
    const book = {
      id: "book-456",
      title: "Unknown Book",
      author: null,
      coverImage: null,
    };

    const result = mapToBookInfo(book);

    expect(result?.author).toBeNull();
    expect(result?.coverImage).toBeNull();
  });
});

// ============================================================================
// mapToReplyInfo Tests
// ============================================================================

describe("mapToReplyInfo", () => {
  it("should map reply with all fields", () => {
    const now = new Date("2026-01-18T12:00:00.000Z");
    const reply = {
      id: "reply-123",
      content: "This is a reply.",
      userId: "user-1",
      user: {
        id: "user-1",
        username: "replier",
        displayName: "Reply User",
        avatarUrl: "https://example.com/avatar.jpg",
      },
      parentReplyId: null,
      upvotes: 5,
      downvotes: 1,
      voteScore: 4,
      isBestAnswer: false,
      createdAt: now,
      updatedAt: now,
    };
    const userVotesMap = new Map<string, number>([["reply-123", 1]]);

    const result = mapToReplyInfo(reply, userVotesMap);

    expect(result.id).toBe("reply-123");
    expect(result.content).toBe("This is a reply.");
    expect(result.userId).toBe("user-1");
    expect(result.user.username).toBe("replier");
    expect(result.parentReplyId).toBeNull();
    expect(result.upvotes).toBe(5);
    expect(result.downvotes).toBe(1);
    expect(result.voteScore).toBe(4);
    expect(result.isBestAnswer).toBe(false);
    expect(result.currentUserVote).toBe(1);
    expect(result.createdAt).toBe("2026-01-18T12:00:00.000Z");
  });

  it("should map nested reply", () => {
    const now = new Date("2026-01-18T14:00:00.000Z");
    const reply = {
      id: "reply-456",
      content: "Nested reply.",
      userId: "user-2",
      user: {
        id: "user-2",
        username: "nesteduser",
        displayName: null,
        avatarUrl: null,
      },
      parentReplyId: "reply-123",
      upvotes: 2,
      downvotes: 0,
      voteScore: 2,
      isBestAnswer: false,
      createdAt: now,
      updatedAt: now,
    };
    const userVotesMap = new Map<string, number>();

    const result = mapToReplyInfo(reply, userVotesMap);

    expect(result.parentReplyId).toBe("reply-123");
    expect(result.currentUserVote).toBe(0);
  });

  it("should map best answer reply", () => {
    const now = new Date("2026-01-18T16:00:00.000Z");
    const reply = {
      id: "reply-789",
      content: "This is the accepted answer.",
      userId: "user-3",
      user: {
        id: "user-3",
        username: "expert",
        displayName: "Expert User",
        avatarUrl: null,
      },
      parentReplyId: null,
      upvotes: 20,
      downvotes: 0,
      voteScore: 20,
      isBestAnswer: true,
      createdAt: now,
      updatedAt: now,
    };
    const userVotesMap = new Map<string, number>([["reply-789", -1]]);

    const result = mapToReplyInfo(reply, userVotesMap);

    expect(result.isBestAnswer).toBe(true);
    expect(result.voteScore).toBe(20);
    expect(result.currentUserVote).toBe(-1);
  });
});

// ============================================================================
// mapToPostDetailResponse Tests
// ============================================================================

describe("mapToPostDetailResponse", () => {
  it("should map full post with replies", () => {
    const now = new Date("2026-01-18T12:00:00.000Z");
    const replyDate = new Date("2026-01-18T14:00:00.000Z");

    const post = {
      id: "post-123",
      title: "Test Post",
      content: "Full post content here.",
      categoryId: "cat-1",
      category: {
        id: "cat-1",
        slug: "general",
        name: "General",
        color: "#3B82F6",
      },
      userId: "user-1",
      user: {
        id: "user-1",
        username: "poster",
        displayName: "Post Creator",
        avatarUrl: "https://example.com/avatar.jpg",
      },
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isFeatured: false,
      isAnswered: false,
      upvotes: 10,
      downvotes: 2,
      voteScore: 8,
      viewCount: 100,
      repliesCount: 2,
      replies: [
        {
          id: "reply-1",
          content: "First reply.",
          userId: "user-2",
          user: {
            id: "user-2",
            username: "replier1",
            displayName: null,
            avatarUrl: null,
          },
          parentReplyId: null,
          upvotes: 3,
          downvotes: 0,
          voteScore: 3,
          isBestAnswer: false,
          createdAt: replyDate,
          updatedAt: replyDate,
        },
        {
          id: "reply-2",
          content: "Second reply.",
          userId: "user-3",
          user: {
            id: "user-3",
            username: "replier2",
            displayName: "Replier Two",
            avatarUrl: null,
          },
          parentReplyId: null,
          upvotes: 5,
          downvotes: 1,
          voteScore: 4,
          isBestAnswer: false,
          createdAt: replyDate,
          updatedAt: replyDate,
        },
      ],
      lastReplyAt: replyDate,
      createdAt: now,
      updatedAt: replyDate,
    };
    const userVotes = {
      postVote: 1,
      replyVotes: new Map<string, number>([["reply-1", -1]]),
    };

    const result = mapToPostDetailResponse(post, userVotes);

    expect(result.id).toBe("post-123");
    expect(result.title).toBe("Test Post");
    expect(result.content).toBe("Full post content here.");
    expect(result.category.slug).toBe("general");
    expect(result.user.username).toBe("poster");
    expect(result.currentUserVote).toBe(1);
    expect(result.replies).toHaveLength(2);
    expect(result.replies[0]?.id).toBe("reply-1");
    expect(result.replies[0]?.currentUserVote).toBe(-1);
    expect(result.replies[1]?.id).toBe("reply-2");
    expect(result.replies[1]?.currentUserVote).toBe(0);
    expect(result.lastReplyAt).toBe("2026-01-18T14:00:00.000Z");
  });

  it("should map post with book reference", () => {
    const now = new Date("2026-01-18T12:00:00.000Z");

    const post = {
      id: "post-456",
      title: "Book Discussion",
      content: "Discussing this book.",
      categoryId: "cat-2",
      category: {
        id: "cat-2",
        slug: "books",
        name: "Book Discussions",
        color: "#22C55E",
      },
      userId: "user-1",
      user: {
        id: "user-1",
        username: "reader",
        displayName: "Reader",
        avatarUrl: null,
      },
      bookId: "book-123",
      book: {
        id: "book-123",
        title: "Test Book",
        author: "Test Author",
        coverImage: "https://example.com/cover.jpg",
      },
      isPinned: true,
      isLocked: false,
      isFeatured: true,
      isAnswered: true,
      upvotes: 25,
      downvotes: 0,
      voteScore: 25,
      viewCount: 500,
      repliesCount: 0,
      replies: [],
      lastReplyAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const userVotes = {
      postVote: 0,
      replyVotes: new Map<string, number>(),
    };

    const result = mapToPostDetailResponse(post, userVotes);

    expect(result.bookId).toBe("book-123");
    expect(result.book).not.toBeNull();
    expect(result.book?.title).toBe("Test Book");
    expect(result.isPinned).toBe(true);
    expect(result.isFeatured).toBe(true);
    expect(result.isAnswered).toBe(true);
    expect(result.currentUserVote).toBe(0);
    expect(result.lastReplyAt).toBeNull();
    expect(result.replies).toHaveLength(0);
  });

  it("should map locked post", () => {
    const now = new Date("2026-01-18T12:00:00.000Z");

    const post = {
      id: "post-789",
      title: "Locked Post",
      content: "This post has been locked.",
      categoryId: "cat-1",
      category: {
        id: "cat-1",
        slug: "general",
        name: "General",
        color: null,
      },
      userId: "user-1",
      user: {
        id: "user-1",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: true,
      isFeatured: false,
      isAnswered: false,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      viewCount: 10,
      repliesCount: 0,
      replies: [],
      lastReplyAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const userVotes = {
      postVote: -1,
      replyVotes: new Map<string, number>(),
    };

    const result = mapToPostDetailResponse(post, userVotes);

    expect(result.isLocked).toBe(true);
    expect(result.currentUserVote).toBe(-1);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export PostUserInfo type", () => {
    const userInfo: PostUserInfo = {
      id: "user-1",
      username: "test",
      displayName: "Test",
      avatarUrl: null,
    };
    expect(userInfo.id).toBe("user-1");
  });

  it("should export PostCategoryInfo type", () => {
    const categoryInfo: PostCategoryInfo = {
      id: "cat-1",
      slug: "test",
      name: "Test",
      color: "#000000",
    };
    expect(categoryInfo.id).toBe("cat-1");
  });

  it("should export PostBookInfo type", () => {
    const bookInfo: PostBookInfo = {
      id: "book-1",
      title: "Test Book",
      author: "Author",
      coverImage: null,
    };
    expect(bookInfo.id).toBe("book-1");
  });

  it("should export ForumReplyInfo type", () => {
    const replyInfo: ForumReplyInfo = {
      id: "reply-1",
      content: "Test reply",
      userId: "user-1",
      user: {
        id: "user-1",
        username: "test",
        displayName: null,
        avatarUrl: null,
      },
      parentReplyId: null,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      isBestAnswer: false,
      currentUserVote: 0,
      createdAt: "2026-01-18T12:00:00.000Z",
      updatedAt: "2026-01-18T12:00:00.000Z",
    };
    expect(replyInfo.id).toBe("reply-1");
  });

  it("should export ForumPostDetailResponse type", () => {
    const response: ForumPostDetailResponse = {
      id: "post-1",
      title: "Test",
      content: "Content",
      categoryId: "cat-1",
      category: { id: "cat-1", slug: "test", name: "Test", color: null },
      userId: "user-1",
      user: {
        id: "user-1",
        username: "test",
        displayName: null,
        avatarUrl: null,
      },
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isFeatured: false,
      isAnswered: false,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      currentUserVote: 0,
      viewCount: 0,
      repliesCount: 0,
      replies: [],
      lastReplyAt: null,
      createdAt: "2026-01-18T12:00:00.000Z",
      updatedAt: "2026-01-18T12:00:00.000Z",
    };
    expect(response.id).toBe("post-1");
  });

  it("should export GetPostResponse type", () => {
    const response: GetPostResponse = {
      post: {
        id: "post-1",
        title: "Test",
        content: "Content",
        categoryId: "cat-1",
        category: { id: "cat-1", slug: "test", name: "Test", color: null },
        userId: "user-1",
        user: {
          id: "user-1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        bookId: null,
        book: null,
        isPinned: false,
        isLocked: false,
        isFeatured: false,
        isAnswered: false,
        upvotes: 0,
        downvotes: 0,
        voteScore: 0,
        currentUserVote: 0,
        viewCount: 0,
        repliesCount: 0,
        replies: [],
        lastReplyAt: null,
        createdAt: "2026-01-18T12:00:00.000Z",
        updatedAt: "2026-01-18T12:00:00.000Z",
      },
    };
    expect(response.post).toBeDefined();
  });

  it("should export UpdatePostResponse type", () => {
    const response: UpdatePostResponse = {
      post: {
        id: "post-1",
        title: "Updated Title",
        content: "Updated Content",
        categoryId: "cat-1",
        category: { id: "cat-1", slug: "test", name: "Test", color: null },
        userId: "user-1",
        user: {
          id: "user-1",
          username: "test",
          displayName: null,
          avatarUrl: null,
        },
        bookId: null,
        book: null,
        isPinned: false,
        isLocked: false,
        isFeatured: false,
        isAnswered: false,
        upvotes: 0,
        downvotes: 0,
        voteScore: 0,
        currentUserVote: 0,
        viewCount: 0,
        repliesCount: 0,
        replies: [],
        lastReplyAt: null,
        createdAt: "2026-01-18T12:00:00.000Z",
        updatedAt: "2026-01-18T12:00:00.000Z",
      },
    };
    expect(response.post.title).toBe("Updated Title");
  });

  it("should export DeletePostResponse type", () => {
    const response: DeletePostResponse = {
      success: true,
      message: "Post deleted successfully",
    };
    expect(response.success).toBe(true);
    expect(response.message).toBe("Post deleted successfully");
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  it("should handle post with no replies", () => {
    const now = new Date("2026-01-18T12:00:00.000Z");

    const post = {
      id: "post-empty",
      title: "No Replies Post",
      content: "A post with no replies yet.",
      categoryId: "cat-1",
      category: { id: "cat-1", slug: "general", name: "General", color: null },
      userId: "user-1",
      user: {
        id: "user-1",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isFeatured: false,
      isAnswered: false,
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
      viewCount: 1,
      repliesCount: 0,
      replies: [],
      lastReplyAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const userVotes = {
      postVote: 0,
      replyVotes: new Map<string, number>(),
    };

    const result = mapToPostDetailResponse(post, userVotes);

    expect(result.replies).toHaveLength(0);
    expect(result.repliesCount).toBe(0);
    expect(result.lastReplyAt).toBeNull();
  });

  it("should handle post with all boolean flags true", () => {
    const now = new Date("2026-01-18T12:00:00.000Z");

    const post = {
      id: "post-allflags",
      title: "All Flags Post",
      content: "A post with all boolean flags true.",
      categoryId: "cat-1",
      category: { id: "cat-1", slug: "general", name: "General", color: null },
      userId: "user-1",
      user: {
        id: "user-1",
        username: "admin",
        displayName: null,
        avatarUrl: null,
      },
      bookId: null,
      book: null,
      isPinned: true,
      isLocked: true,
      isFeatured: true,
      isAnswered: true,
      upvotes: 100,
      downvotes: 5,
      voteScore: 95,
      viewCount: 1000,
      repliesCount: 50,
      replies: [],
      lastReplyAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const userVotes = {
      postVote: 1,
      replyVotes: new Map<string, number>(),
    };

    const result = mapToPostDetailResponse(post, userVotes);

    expect(result.isPinned).toBe(true);
    expect(result.isLocked).toBe(true);
    expect(result.isFeatured).toBe(true);
    expect(result.isAnswered).toBe(true);
    expect(result.currentUserVote).toBe(1);
  });

  it("should handle post with negative vote score", () => {
    const now = new Date("2026-01-18T12:00:00.000Z");

    const post = {
      id: "post-negative",
      title: "Unpopular Post",
      content: "A post that was downvoted.",
      categoryId: "cat-1",
      category: { id: "cat-1", slug: "general", name: "General", color: null },
      userId: "user-1",
      user: {
        id: "user-1",
        username: "unpopular",
        displayName: null,
        avatarUrl: null,
      },
      bookId: null,
      book: null,
      isPinned: false,
      isLocked: false,
      isFeatured: false,
      isAnswered: false,
      upvotes: 2,
      downvotes: 10,
      voteScore: -8,
      viewCount: 50,
      repliesCount: 0,
      replies: [],
      lastReplyAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const userVotes = {
      postVote: -1,
      replyVotes: new Map<string, number>(),
    };

    const result = mapToPostDetailResponse(post, userVotes);

    expect(result.upvotes).toBe(2);
    expect(result.downvotes).toBe(10);
    expect(result.voteScore).toBe(-8);
    expect(result.currentUserVote).toBe(-1);
  });
});
