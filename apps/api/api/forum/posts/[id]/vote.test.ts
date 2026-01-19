/**
 * Tests for Forum Post Vote API
 *
 * Tests cover:
 * - Helper functions (parsePostId, mapToVoteResponse)
 * - Vote body schema validation
 * - Type exports
 */

import { describe, it, expect } from "vitest";
import {
  parsePostId,
  mapToVoteResponse,
  voteBodySchema,
  type VoteResponse,
  type CreateVoteResponse,
  type RemoveVoteResponse,
  type VoteBody,
} from "./vote.js";

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("parsePostId", () => {
  it("should return valid post ID for correct CUID format", () => {
    const result = parsePostId("cm123abc");
    expect(result).toBe("cm123abc");
  });

  it("should return valid post ID starting with c", () => {
    const result = parsePostId("cxyz789");
    expect(result).toBe("cxyz789");
  });

  it("should return null for invalid format", () => {
    expect(parsePostId("invalid")).toBeNull();
    expect(parsePostId("123abc")).toBeNull();
    expect(parsePostId("ABC123")).toBeNull();
    expect(parsePostId("")).toBeNull();
  });

  it("should return null for non-string values", () => {
    expect(parsePostId(123)).toBeNull();
    expect(parsePostId(null)).toBeNull();
    expect(parsePostId(undefined)).toBeNull();
    expect(parsePostId({})).toBeNull();
  });
});

describe("mapToVoteResponse", () => {
  it("should map upvote response correctly", () => {
    const post = {
      upvotes: 10,
      downvotes: 2,
      voteScore: 8,
    };

    const result = mapToVoteResponse("cpost123", 1, post);

    expect(result).toEqual({
      postId: "cpost123",
      value: 1,
      upvotes: 10,
      downvotes: 2,
      voteScore: 8,
    });
  });

  it("should map downvote response correctly", () => {
    const post = {
      upvotes: 5,
      downvotes: 10,
      voteScore: -5,
    };

    const result = mapToVoteResponse("cpost456", -1, post);

    expect(result).toEqual({
      postId: "cpost456",
      value: -1,
      upvotes: 5,
      downvotes: 10,
      voteScore: -5,
    });
  });

  it("should handle zero votes", () => {
    const post = {
      upvotes: 0,
      downvotes: 0,
      voteScore: 0,
    };

    const result = mapToVoteResponse("cpost789", 1, post);

    expect(result.upvotes).toBe(0);
    expect(result.downvotes).toBe(0);
    expect(result.voteScore).toBe(0);
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("voteBodySchema", () => {
  it("should validate upvote (value: 1)", () => {
    const result = voteBodySchema.safeParse({ value: 1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(1);
    }
  });

  it("should validate downvote (value: -1)", () => {
    const result = voteBodySchema.safeParse({ value: -1 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(-1);
    }
  });

  it("should reject value of 0", () => {
    const result = voteBodySchema.safeParse({ value: 0 });

    expect(result.success).toBe(false);
  });

  it("should reject value of 2", () => {
    const result = voteBodySchema.safeParse({ value: 2 });

    expect(result.success).toBe(false);
  });

  it("should reject value of -2", () => {
    const result = voteBodySchema.safeParse({ value: -2 });

    expect(result.success).toBe(false);
  });

  it("should reject missing value", () => {
    const result = voteBodySchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("should reject string value", () => {
    const result = voteBodySchema.safeParse({ value: "1" });

    expect(result.success).toBe(false);
  });

  it("should reject non-integer value", () => {
    const result = voteBodySchema.safeParse({ value: 1.5 });

    expect(result.success).toBe(false);
  });

  it("should reject null value", () => {
    const result = voteBodySchema.safeParse({ value: null });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("should export VoteResponse type", () => {
    const response: VoteResponse = {
      postId: "cpost123",
      value: 1,
      upvotes: 10,
      downvotes: 2,
      voteScore: 8,
    };
    expect(response.postId).toBe("cpost123");
    expect(response.value).toBe(1);
  });

  it("should export CreateVoteResponse type", () => {
    const response: CreateVoteResponse = {
      vote: {
        postId: "cpost123",
        value: 1,
        upvotes: 10,
        downvotes: 2,
        voteScore: 8,
      },
    };
    expect(response.vote.postId).toBe("cpost123");
  });

  it("should export RemoveVoteResponse type", () => {
    const response: RemoveVoteResponse = {
      success: true,
      message: "Vote removed successfully",
      postId: "cpost123",
      upvotes: 9,
      downvotes: 2,
      voteScore: 7,
    };
    expect(response.success).toBe(true);
    expect(response.message).toBe("Vote removed successfully");
  });

  it("should export VoteBody type", () => {
    const body: VoteBody = {
      value: 1,
    };
    expect(body.value).toBe(1);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle large vote counts", () => {
    const post = {
      upvotes: 1000000,
      downvotes: 500000,
      voteScore: 500000,
    };

    const result = mapToVoteResponse("cpost123", 1, post);

    expect(result.upvotes).toBe(1000000);
    expect(result.downvotes).toBe(500000);
    expect(result.voteScore).toBe(500000);
  });

  it("should handle negative vote score", () => {
    const post = {
      upvotes: 100,
      downvotes: 200,
      voteScore: -100,
    };

    const result = mapToVoteResponse("cpost123", -1, post);

    expect(result.voteScore).toBe(-100);
  });

  it("should validate exact boundary values", () => {
    // Only 1 and -1 should be valid
    const validUpvote = voteBodySchema.safeParse({ value: 1 });
    const validDownvote = voteBodySchema.safeParse({ value: -1 });

    expect(validUpvote.success).toBe(true);
    expect(validDownvote.success).toBe(true);

    // Anything else should fail
    const invalidZero = voteBodySchema.safeParse({ value: 0 });
    const invalidTwo = voteBodySchema.safeParse({ value: 2 });
    const invalidNegTwo = voteBodySchema.safeParse({ value: -2 });

    expect(invalidZero.success).toBe(false);
    expect(invalidTwo.success).toBe(false);
    expect(invalidNegTwo.success).toBe(false);
  });
});
