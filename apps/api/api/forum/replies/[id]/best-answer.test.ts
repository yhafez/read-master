/**
 * Tests for Forum Reply Best Answer API
 *
 * Tests the helper functions and type exports for:
 * - POST /api/forum/replies/:id/best-answer (mark best answer)
 * - DELETE /api/forum/replies/:id/best-answer (unmark best answer)
 */

import { describe, it, expect } from "vitest";
import {
  parseReplyId,
  formatDateOptional,
  type ReplyInfo,
  type PostInfo,
  type MarkBestAnswerResponse,
  type UnmarkBestAnswerResponse,
} from "./best-answer.js";

// ============================================================================
// parseReplyId Tests
// ============================================================================

describe("parseReplyId", () => {
  it("should return valid CUID reply ID", () => {
    expect(parseReplyId("cabc123def456")).toBe("cabc123def456");
  });

  it("should return valid short CUID", () => {
    expect(parseReplyId("c123")).toBe("c123");
  });

  it("should return null for invalid format (uppercase)", () => {
    expect(parseReplyId("CABC123")).toBeNull();
  });

  it("should return null for invalid format (missing c prefix)", () => {
    expect(parseReplyId("abc123")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseReplyId("")).toBeNull();
  });

  it("should return null for non-string input", () => {
    expect(parseReplyId(123)).toBeNull();
    expect(parseReplyId(null)).toBeNull();
    expect(parseReplyId(undefined)).toBeNull();
    expect(parseReplyId({})).toBeNull();
  });
});

// ============================================================================
// formatDateOptional Tests
// ============================================================================

describe("formatDateOptional", () => {
  it("should format date to ISO string", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    expect(formatDateOptional(date)).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should return null for null input", () => {
    expect(formatDateOptional(null)).toBeNull();
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("ReplyInfo type should have correct structure", () => {
    const replyInfo: ReplyInfo = {
      id: "creply123",
      isBestAnswer: true,
      postId: "cpost456",
    };
    expect(replyInfo.id).toBe("creply123");
    expect(replyInfo.isBestAnswer).toBe(true);
    expect(replyInfo.postId).toBe("cpost456");
  });

  it("PostInfo type should have correct structure", () => {
    const postInfo: PostInfo = {
      id: "cpost123",
      isAnswered: true,
    };
    expect(postInfo.id).toBe("cpost123");
    expect(postInfo.isAnswered).toBe(true);
  });

  it("MarkBestAnswerResponse type should have correct structure", () => {
    const response: MarkBestAnswerResponse = {
      reply: {
        id: "creply123",
        isBestAnswer: true,
        postId: "cpost456",
      },
      post: {
        id: "cpost456",
        isAnswered: true,
      },
      previousBestAnswerId: "cprevreply789",
    };
    expect(response.reply.id).toBe("creply123");
    expect(response.post.isAnswered).toBe(true);
    expect(response.previousBestAnswerId).toBe("cprevreply789");
  });

  it("MarkBestAnswerResponse should allow null previousBestAnswerId", () => {
    const response: MarkBestAnswerResponse = {
      reply: {
        id: "creply123",
        isBestAnswer: true,
        postId: "cpost456",
      },
      post: {
        id: "cpost456",
        isAnswered: true,
      },
      previousBestAnswerId: null,
    };
    expect(response.previousBestAnswerId).toBeNull();
  });

  it("UnmarkBestAnswerResponse type should have correct structure", () => {
    const response: UnmarkBestAnswerResponse = {
      success: true,
      message: "Best answer unmarked successfully",
      reply: {
        id: "creply123",
        isBestAnswer: false,
        postId: "cpost456",
      },
      post: {
        id: "cpost456",
        isAnswered: false,
      },
    };
    expect(response.success).toBe(true);
    expect(response.message).toBe("Best answer unmarked successfully");
    expect(response.reply.isBestAnswer).toBe(false);
    expect(response.post.isAnswered).toBe(false);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("parseReplyId should handle special characters", () => {
    expect(parseReplyId("c123-456")).toBeNull();
    expect(parseReplyId("c123_456")).toBeNull();
    expect(parseReplyId("c123.456")).toBeNull();
  });

  it("parseReplyId should handle whitespace", () => {
    expect(parseReplyId(" c123")).toBeNull();
    expect(parseReplyId("c123 ")).toBeNull();
    expect(parseReplyId(" c123 ")).toBeNull();
  });

  it("formatDateOptional should handle dates at boundaries", () => {
    const epochDate = new Date(0);
    expect(formatDateOptional(epochDate)).toBe("1970-01-01T00:00:00.000Z");

    const futureDate = new Date("2099-12-31T23:59:59.999Z");
    expect(formatDateOptional(futureDate)).toBe("2099-12-31T23:59:59.999Z");
  });
});
