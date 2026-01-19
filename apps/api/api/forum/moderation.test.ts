/**
 * Tests for Forum Moderation API
 *
 * Tests the helper functions, constants, schemas, and type exports for:
 * - GET /api/forum/moderation (list moderation queue)
 * - PUT /api/forum/moderation (update report status)
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MODERATOR_ROLES,
  parsePage,
  parseLimit,
  parseStatus,
  parseTargetType,
  parseReportId,
  formatDate,
  formatDateOptional,
  isModerator,
  getRoleFromPreferences,
  reportStatusSchema,
  listModerationQuerySchema,
  updateReportBodySchema,
  type ModerationReportItem,
  type ListModerationResponse,
  type UpdateReportResponse,
  type ListModerationQuery,
  type UpdateReportBody,
} from "./moderation.js";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  describe("DEFAULT_LIMIT", () => {
    it("should be 20", () => {
      expect(DEFAULT_LIMIT).toBe(20);
    });
  });

  describe("MAX_LIMIT", () => {
    it("should be 100", () => {
      expect(MAX_LIMIT).toBe(100);
    });
  });

  describe("MODERATOR_ROLES", () => {
    it("should include MODERATOR", () => {
      expect(MODERATOR_ROLES).toContain("MODERATOR");
    });

    it("should include ADMIN", () => {
      expect(MODERATOR_ROLES).toContain("ADMIN");
    });

    it("should have exactly 2 roles", () => {
      expect(MODERATOR_ROLES.length).toBe(2);
    });
  });
});

// ============================================================================
// parsePage Tests
// ============================================================================

describe("parsePage", () => {
  it("should return number for valid string", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("10")).toBe(10);
    expect(parsePage("100")).toBe(100);
  });

  it("should return number for valid number input", () => {
    expect(parsePage(1)).toBe(1);
    expect(parsePage(10)).toBe(10);
  });

  it("should return 1 for invalid input", () => {
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-1")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage(null)).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });

  it("should return 1 for non-integer", () => {
    expect(parsePage("1.5")).toBe(1);
    expect(parsePage(1.5)).toBe(1);
  });
});

// ============================================================================
// parseLimit Tests
// ============================================================================

describe("parseLimit", () => {
  it("should return number for valid string", () => {
    expect(parseLimit("10")).toBe(10);
    expect(parseLimit("50")).toBe(50);
  });

  it("should cap at MAX_LIMIT", () => {
    expect(parseLimit("150")).toBe(MAX_LIMIT);
    expect(parseLimit("1000")).toBe(MAX_LIMIT);
    expect(parseLimit(200)).toBe(MAX_LIMIT);
  });

  it("should return DEFAULT_LIMIT for invalid input", () => {
    expect(parseLimit("0")).toBe(DEFAULT_LIMIT);
    expect(parseLimit("-1")).toBe(DEFAULT_LIMIT);
    expect(parseLimit("abc")).toBe(DEFAULT_LIMIT);
    expect(parseLimit(null)).toBe(DEFAULT_LIMIT);
    expect(parseLimit(undefined)).toBe(DEFAULT_LIMIT);
  });

  it("should return DEFAULT_LIMIT for non-integer", () => {
    expect(parseLimit("10.5")).toBe(DEFAULT_LIMIT);
  });
});

// ============================================================================
// parseStatus Tests
// ============================================================================

describe("parseStatus", () => {
  it("should return valid status", () => {
    expect(parseStatus("PENDING")).toBe("PENDING");
    expect(parseStatus("REVIEWED")).toBe("REVIEWED");
    expect(parseStatus("DISMISSED")).toBe("DISMISSED");
    expect(parseStatus("ACTION_TAKEN")).toBe("ACTION_TAKEN");
  });

  it("should return undefined for invalid status", () => {
    expect(parseStatus("INVALID")).toBeUndefined();
    expect(parseStatus("pending")).toBeUndefined();
    expect(parseStatus("")).toBeUndefined();
    expect(parseStatus(null)).toBeUndefined();
    expect(parseStatus(123)).toBeUndefined();
  });
});

// ============================================================================
// parseTargetType Tests
// ============================================================================

describe("parseTargetType", () => {
  it("should return valid target types", () => {
    expect(parseTargetType("post")).toBe("post");
    expect(parseTargetType("reply")).toBe("reply");
  });

  it("should return undefined for invalid types", () => {
    expect(parseTargetType("POST")).toBeUndefined();
    expect(parseTargetType("comment")).toBeUndefined();
    expect(parseTargetType("")).toBeUndefined();
    expect(parseTargetType(null)).toBeUndefined();
    expect(parseTargetType(123)).toBeUndefined();
  });
});

// ============================================================================
// parseReportId Tests
// ============================================================================

describe("parseReportId", () => {
  it("should return valid CUID report ID", () => {
    expect(parseReportId("cabc123def456")).toBe("cabc123def456");
    expect(parseReportId("c123")).toBe("c123");
  });

  it("should return null for invalid format", () => {
    expect(parseReportId("CABC123")).toBeNull();
    expect(parseReportId("abc123")).toBeNull();
    expect(parseReportId("")).toBeNull();
    expect(parseReportId(123)).toBeNull();
    expect(parseReportId(null)).toBeNull();
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
});

// ============================================================================
// formatDateOptional Tests
// ============================================================================

describe("formatDateOptional", () => {
  it("should format date to ISO string", () => {
    const date = new Date("2024-03-15T14:30:00.000Z");
    expect(formatDateOptional(date)).toBe("2024-03-15T14:30:00.000Z");
  });

  it("should return null for null input", () => {
    expect(formatDateOptional(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(formatDateOptional(undefined)).toBeNull();
  });
});

// ============================================================================
// isModerator Tests
// ============================================================================

describe("isModerator", () => {
  it("should return true for MODERATOR role", () => {
    expect(isModerator({ role: "MODERATOR" })).toBe(true);
  });

  it("should return true for ADMIN role", () => {
    expect(isModerator({ role: "ADMIN" })).toBe(true);
  });

  it("should return false for USER role", () => {
    expect(isModerator({ role: "USER" })).toBe(false);
  });

  it("should return false for null role", () => {
    expect(isModerator({ role: null })).toBe(false);
  });

  it("should return false for undefined role", () => {
    expect(isModerator({})).toBe(false);
  });

  it("should return false for unknown role", () => {
    expect(isModerator({ role: "UNKNOWN" })).toBe(false);
  });
});

// ============================================================================
// getRoleFromPreferences Tests
// ============================================================================

describe("getRoleFromPreferences", () => {
  it("should return role when present in preferences", () => {
    expect(getRoleFromPreferences({ role: "MODERATOR" })).toBe("MODERATOR");
    expect(getRoleFromPreferences({ role: "ADMIN" })).toBe("ADMIN");
    expect(getRoleFromPreferences({ role: "USER" })).toBe("USER");
  });

  it("should return null when preferences is null", () => {
    expect(getRoleFromPreferences(null)).toBeNull();
  });

  it("should return null when preferences is undefined", () => {
    expect(getRoleFromPreferences(undefined)).toBeNull();
  });

  it("should return null when role is not in preferences", () => {
    expect(getRoleFromPreferences({})).toBeNull();
    expect(getRoleFromPreferences({ otherKey: "value" })).toBeNull();
  });

  it("should return null when role is not a string", () => {
    expect(getRoleFromPreferences({ role: 123 })).toBeNull();
    expect(getRoleFromPreferences({ role: null })).toBeNull();
    expect(getRoleFromPreferences({ role: undefined })).toBeNull();
    expect(getRoleFromPreferences({ role: {} })).toBeNull();
  });

  it("should return null for non-object preferences", () => {
    expect(getRoleFromPreferences("string")).toBeNull();
    expect(getRoleFromPreferences(123)).toBeNull();
    expect(getRoleFromPreferences([])).toBeNull();
  });
});

// ============================================================================
// Schema Tests
// ============================================================================

describe("Schemas", () => {
  describe("reportStatusSchema", () => {
    it("should accept valid statuses", () => {
      expect(reportStatusSchema.safeParse("PENDING").success).toBe(true);
      expect(reportStatusSchema.safeParse("REVIEWED").success).toBe(true);
      expect(reportStatusSchema.safeParse("DISMISSED").success).toBe(true);
      expect(reportStatusSchema.safeParse("ACTION_TAKEN").success).toBe(true);
    });

    it("should reject invalid statuses", () => {
      expect(reportStatusSchema.safeParse("INVALID").success).toBe(false);
      expect(reportStatusSchema.safeParse("pending").success).toBe(false);
    });
  });

  describe("listModerationQuerySchema", () => {
    it("should accept valid query with defaults", () => {
      const result = listModerationQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(DEFAULT_LIMIT);
      }
    });

    it("should accept custom page and limit", () => {
      const result = listModerationQuerySchema.safeParse({
        page: "2",
        limit: "50",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it("should accept status filter", () => {
      const result = listModerationQuerySchema.safeParse({
        status: "PENDING",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("PENDING");
      }
    });

    it("should accept targetType filter", () => {
      const result = listModerationQuerySchema.safeParse({
        targetType: "post",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.targetType).toBe("post");
      }
    });

    it("should cap limit at MAX_LIMIT", () => {
      const result = listModerationQuerySchema.safeParse({
        limit: "200",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateReportBodySchema", () => {
    it("should accept valid status update", () => {
      const result = updateReportBodySchema.safeParse({
        status: "REVIEWED",
      });
      expect(result.success).toBe(true);
    });

    it("should accept status with moderator note", () => {
      const result = updateReportBodySchema.safeParse({
        status: "ACTION_TAKEN",
        moderatorNote: "User has been warned",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.moderatorNote).toBe("User has been warned");
      }
    });

    it("should reject without status", () => {
      const result = updateReportBodySchema.safeParse({
        moderatorNote: "Note only",
      });
      expect(result.success).toBe(false);
    });

    it("should reject note over 1000 characters", () => {
      const result = updateReportBodySchema.safeParse({
        status: "REVIEWED",
        moderatorNote: "a".repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it("should trim moderator note", () => {
      const result = updateReportBodySchema.safeParse({
        status: "REVIEWED",
        moderatorNote: "  Trimmed note  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.moderatorNote).toBe("Trimmed note");
      }
    });
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("Type Exports", () => {
  it("ModerationReportItem type should have correct structure", () => {
    const item: ModerationReportItem = {
      id: "creport123",
      reporterId: "cuser1",
      reporterUsername: "reporter",
      targetType: "post",
      targetId: "cpost123",
      contentAuthorId: "cuser2",
      contentAuthorUsername: "author",
      contentPreview: "Preview of content...",
      reportType: "SPAM",
      reason: "Contains advertising",
      status: "PENDING",
      moderatorNote: null,
      reviewedById: null,
      reviewedByUsername: null,
      createdAt: "2024-03-15T14:30:00.000Z",
      reviewedAt: null,
    };
    expect(item.id).toBe("creport123");
    expect(item.targetType).toBe("post");
    expect(item.status).toBe("PENDING");
  });

  it("ModerationReportItem type should work with reviewed report", () => {
    const item: ModerationReportItem = {
      id: "creport456",
      reporterId: "cuser1",
      reporterUsername: "reporter",
      targetType: "reply",
      targetId: "creply456",
      contentAuthorId: "cuser2",
      contentAuthorUsername: "author",
      contentPreview: "Offensive content...",
      reportType: "HARASSMENT",
      reason: null,
      status: "ACTION_TAKEN",
      moderatorNote: "User banned for 7 days",
      reviewedById: "cmod1",
      reviewedByUsername: "moderator1",
      createdAt: "2024-03-15T14:30:00.000Z",
      reviewedAt: "2024-03-15T15:00:00.000Z",
    };
    expect(item.status).toBe("ACTION_TAKEN");
    expect(item.reviewedByUsername).toBe("moderator1");
  });

  it("ListModerationResponse type should have correct structure", () => {
    const response: ListModerationResponse = {
      reports: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
    expect(response.reports).toEqual([]);
    expect(response.pagination.page).toBe(1);
  });

  it("UpdateReportResponse type should have correct structure", () => {
    const response: UpdateReportResponse = {
      report: {
        id: "creport123",
        reporterId: "cuser1",
        reporterUsername: "reporter",
        targetType: "post",
        targetId: "cpost123",
        contentAuthorId: "cuser2",
        contentAuthorUsername: "author",
        contentPreview: "Preview...",
        reportType: "SPAM",
        reason: null,
        status: "REVIEWED",
        moderatorNote: "Reviewed, no action needed",
        reviewedById: "cmod1",
        reviewedByUsername: "mod1",
        createdAt: "2024-03-15T14:30:00.000Z",
        reviewedAt: "2024-03-15T15:00:00.000Z",
      },
    };
    expect(response.report.status).toBe("REVIEWED");
  });

  it("ListModerationQuery type should match schema output", () => {
    const query: ListModerationQuery = {
      page: 1,
      limit: 20,
      status: "PENDING",
      targetType: "post",
    };
    expect(query.page).toBe(1);
    expect(query.status).toBe("PENDING");
  });

  it("UpdateReportBody type should match schema output", () => {
    const body: UpdateReportBody = {
      status: "DISMISSED",
      moderatorNote: "False report",
    };
    expect(body.status).toBe("DISMISSED");
    expect(body.moderatorNote).toBe("False report");
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("parsePage should handle very large numbers", () => {
    expect(parsePage("999999")).toBe(999999);
    expect(parsePage(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("parseLimit should handle edge values", () => {
    expect(parseLimit("1")).toBe(1);
    expect(parseLimit("100")).toBe(100);
    expect(parseLimit("101")).toBe(100);
  });

  it("isModerator should handle case sensitivity", () => {
    expect(isModerator({ role: "moderator" })).toBe(false);
    expect(isModerator({ role: "admin" })).toBe(false);
    expect(isModerator({ role: "Moderator" })).toBe(false);
  });

  it("parseReportId should handle various invalid formats", () => {
    expect(parseReportId("c-123")).toBeNull();
    expect(parseReportId("c_123")).toBeNull();
    expect(parseReportId("c.123")).toBeNull();
    expect(parseReportId(" c123")).toBeNull();
    expect(parseReportId("c123 ")).toBeNull();
  });
});
