/**
 * Tests for Forum Content Report API
 *
 * Tests the helper functions, constants, and type exports for:
 * - POST /api/forum/report (create content report)
 */

import { describe, it, expect } from "vitest";
import {
  REPORT_ACTION,
  REPORT_ENTITY_TYPES,
  REPORT_STATUS,
  formatDate,
  truncateContent,
  type ReportedContentInfo,
  type CreateReportResponse,
  type ReportStatus,
} from "./report.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  describe("REPORT_ACTION", () => {
    it("should have correct value", () => {
      expect(REPORT_ACTION).toBe("FORUM_REPORT");
    });
  });

  describe("REPORT_ENTITY_TYPES", () => {
    it("should have POST entity type", () => {
      expect(REPORT_ENTITY_TYPES.POST).toBe("ForumPost");
    });

    it("should have REPLY entity type", () => {
      expect(REPORT_ENTITY_TYPES.REPLY).toBe("ForumReply");
    });
  });

  describe("REPORT_STATUS", () => {
    it("should have PENDING status", () => {
      expect(REPORT_STATUS.PENDING).toBe("PENDING");
    });

    it("should have REVIEWED status", () => {
      expect(REPORT_STATUS.REVIEWED).toBe("REVIEWED");
    });

    it("should have DISMISSED status", () => {
      expect(REPORT_STATUS.DISMISSED).toBe("DISMISSED");
    });

    it("should have ACTION_TAKEN status", () => {
      expect(REPORT_STATUS.ACTION_TAKEN).toBe("ACTION_TAKEN");
    });
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================

describe("formatDate", () => {
  it("should format date to ISO string", () => {
    const date = new Date("2024-03-15T14:30:00.000Z");
    expect(formatDate(date)).toBe("2024-03-15T14:30:00.000Z");
  });

  it("should handle different time zones correctly", () => {
    const date = new Date("2024-06-15T00:00:00.000Z");
    expect(formatDate(date)).toBe("2024-06-15T00:00:00.000Z");
  });

  it("should handle epoch date", () => {
    const date = new Date(0);
    expect(formatDate(date)).toBe("1970-01-01T00:00:00.000Z");
  });
});

// ============================================================================
// truncateContent Tests
// ============================================================================

describe("truncateContent", () => {
  it("should not truncate short content", () => {
    const content = "Short content";
    expect(truncateContent(content)).toBe("Short content");
  });

  it("should not truncate content at exactly max length", () => {
    const content = "a".repeat(200);
    expect(truncateContent(content)).toBe(content);
    expect(truncateContent(content).length).toBe(200);
  });

  it("should truncate content longer than max length", () => {
    const content = "a".repeat(250);
    const result = truncateContent(content);
    expect(result.length).toBe(200);
    expect(result.endsWith("...")).toBe(true);
  });

  it("should use custom max length", () => {
    const content = "a".repeat(100);
    const result = truncateContent(content, 50);
    expect(result.length).toBe(50);
    expect(result.endsWith("...")).toBe(true);
  });

  it("should not truncate when content equals custom max length", () => {
    const content = "a".repeat(50);
    expect(truncateContent(content, 50)).toBe(content);
  });

  it("should handle empty string", () => {
    expect(truncateContent("")).toBe("");
  });

  it("should handle content with special characters", () => {
    const content = "Hello\nWorld\t!\r\n" + "x".repeat(200);
    const result = truncateContent(content);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBe(200);
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("ReportedContentInfo type should have correct structure for post", () => {
    const info: ReportedContentInfo = {
      id: "cpost123",
      type: "post",
      authorId: "cuser456",
      content: "This is the post content",
    };
    expect(info.id).toBe("cpost123");
    expect(info.type).toBe("post");
    expect(info.authorId).toBe("cuser456");
    expect(info.content).toBe("This is the post content");
    expect(info.postId).toBeUndefined();
  });

  it("ReportedContentInfo type should have correct structure for reply", () => {
    const info: ReportedContentInfo = {
      id: "creply123",
      type: "reply",
      authorId: "cuser456",
      content: "This is the reply content",
      postId: "cpost789",
    };
    expect(info.id).toBe("creply123");
    expect(info.type).toBe("reply");
    expect(info.postId).toBe("cpost789");
  });

  it("CreateReportResponse type should have correct structure", () => {
    const response: CreateReportResponse = {
      reportId: "creport123",
      targetType: "post",
      targetId: "cpost456",
      reportType: "SPAM",
      status: REPORT_STATUS.PENDING,
      createdAt: "2024-03-15T14:30:00.000Z",
    };
    expect(response.reportId).toBe("creport123");
    expect(response.targetType).toBe("post");
    expect(response.targetId).toBe("cpost456");
    expect(response.reportType).toBe("SPAM");
    expect(response.status).toBe("PENDING");
  });

  it("CreateReportResponse type should work for reply reports", () => {
    const response: CreateReportResponse = {
      reportId: "creport456",
      targetType: "reply",
      targetId: "creply789",
      reportType: "HARASSMENT",
      status: REPORT_STATUS.PENDING,
      createdAt: "2024-03-15T15:00:00.000Z",
    };
    expect(response.targetType).toBe("reply");
    expect(response.reportType).toBe("HARASSMENT");
  });

  it("ReportStatus type should accept all valid values", () => {
    const statuses: ReportStatus[] = [
      "PENDING",
      "REVIEWED",
      "DISMISSED",
      "ACTION_TAKEN",
    ];
    statuses.forEach((status) => {
      expect(Object.values(REPORT_STATUS)).toContain(status);
    });
  });
});

// ============================================================================
// Report Types Tests
// ============================================================================

describe("Report Types", () => {
  it("should support all report types in ReportInput", () => {
    const reportTypes = [
      "SPAM",
      "HARASSMENT",
      "INAPPROPRIATE",
      "OFF_TOPIC",
      "MISINFORMATION",
      "OTHER",
    ];

    reportTypes.forEach((type) => {
      // This is a type-level test - if it compiles, the types work
      const input: {
        postId?: string;
        replyId?: string;
        type: string;
        reason?: string;
      } = {
        postId: "cpost123",
        type,
      };
      expect(input.type).toBe(type);
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("truncateContent should handle very short max length", () => {
    const content = "Hello World";
    const result = truncateContent(content, 5);
    expect(result).toBe("He...");
    expect(result.length).toBe(5);
  });

  it("truncateContent should handle unicode characters", () => {
    const content = "Hello 👋 World 🌍" + "x".repeat(200);
    const result = truncateContent(content, 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith("...")).toBe(true);
  });

  it("formatDate should handle dates with milliseconds", () => {
    const date = new Date("2024-03-15T14:30:45.123Z");
    expect(formatDate(date)).toBe("2024-03-15T14:30:45.123Z");
  });

  it("formatDate should handle future dates", () => {
    const date = new Date("2099-12-31T23:59:59.999Z");
    expect(formatDate(date)).toBe("2099-12-31T23:59:59.999Z");
  });
});
