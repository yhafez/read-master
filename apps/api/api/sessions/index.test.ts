/**
 * Tests for Sessions API
 *
 * Tests cover:
 * - Schema validation
 * - Helper functions
 * - Type validation
 * - Query parameter parsing
 */

import { describe, it, expect } from "vitest";
import {
  createSessionSchema,
  parsePage,
  parseLimit,
  parseStatus,
  parseBoolean,
  parseId,
  parseListSessionsQuery,
  buildSessionsCacheKey,
  mapToSessionHostInfo,
  mapToSessionBookInfo,
  mapToSessionSummary,
  calculatePagination,
  generateInviteCode,
  formatDate,
  formatDateRequired,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_PARTICIPANTS,
  SessionStatusOptions,
  type SessionListQueryParams,
} from "./index.js";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("createSessionSchema", () => {
  it("should accept valid session input", () => {
    const input = {
      title: "Chapter 1 Reading Session",
      bookId: "clbook123abc",
      isPublic: true,
      maxParticipants: 30,
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should require title", () => {
    const input = {
      bookId: "clbook123abc",
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should require bookId", () => {
    const input = {
      title: "My Session",
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject empty title", () => {
    const input = {
      title: "",
      bookId: "clbook123abc",
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject title exceeding max length", () => {
    const input = {
      title: "a".repeat(MAX_TITLE_LENGTH + 1),
      bookId: "clbook123abc",
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject description exceeding max length", () => {
    const input = {
      title: "My Session",
      bookId: "clbook123abc",
      description: "a".repeat(MAX_DESCRIPTION_LENGTH + 1),
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject invalid bookId format", () => {
    const input = {
      title: "My Session",
      bookId: "invalid-id",
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject maxParticipants less than 2", () => {
    const input = {
      title: "My Session",
      bookId: "clbook123abc",
      maxParticipants: 1,
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject maxParticipants exceeding limit", () => {
    const input = {
      title: "My Session",
      bookId: "clbook123abc",
      maxParticipants: MAX_PARTICIPANTS + 1,
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept valid scheduled time in future", () => {
    const future = new Date();
    future.setHours(future.getHours() + 1);

    const input = {
      title: "My Session",
      bookId: "clbook123abc",
      scheduledAt: future.toISOString(),
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should reject scheduled time in past", () => {
    const past = new Date();
    past.setHours(past.getHours() - 1);

    const input = {
      title: "My Session",
      bookId: "clbook123abc",
      scheduledAt: past.toISOString(),
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should accept null scheduledAt", () => {
    const input = {
      title: "My Session",
      bookId: "clbook123abc",
      scheduledAt: null,
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should default isPublic to true", () => {
    const input = {
      title: "My Session",
      bookId: "clbook123abc",
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublic).toBe(true);
    }
  });

  it("should default allowChat to true", () => {
    const input = {
      title: "My Session",
      bookId: "clbook123abc",
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowChat).toBe(true);
    }
  });

  it("should default syncEnabled to true", () => {
    const input = {
      title: "My Session",
      bookId: "clbook123abc",
    };

    const result = createSessionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.syncEnabled).toBe(true);
    }
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("parsePage", () => {
  it("should parse valid page number string", () => {
    expect(parsePage("5")).toBe(5);
  });

  it("should parse valid page number", () => {
    expect(parsePage(10)).toBe(10);
  });

  it("should return default for invalid string", () => {
    expect(parsePage("abc")).toBe(DEFAULT_PAGE);
  });

  it("should return default for zero", () => {
    expect(parsePage("0")).toBe(DEFAULT_PAGE);
  });

  it("should return default for negative", () => {
    expect(parsePage("-1")).toBe(DEFAULT_PAGE);
  });

  it("should return default for undefined", () => {
    expect(parsePage(undefined)).toBe(DEFAULT_PAGE);
  });
});

describe("parseLimit", () => {
  it("should parse valid limit string", () => {
    expect(parseLimit("25")).toBe(25);
  });

  it("should parse valid limit number", () => {
    expect(parseLimit(30)).toBe(30);
  });

  it("should return default for exceeding max", () => {
    expect(parseLimit(String(MAX_LIMIT + 10))).toBe(DEFAULT_LIMIT);
  });

  it("should return default for below min", () => {
    expect(parseLimit("0")).toBe(DEFAULT_LIMIT);
  });

  it("should return default for invalid", () => {
    expect(parseLimit("abc")).toBe(DEFAULT_LIMIT);
  });
});

describe("parseStatus", () => {
  it("should parse ACTIVE status", () => {
    expect(parseStatus("ACTIVE")).toBe("ACTIVE");
  });

  it("should parse lowercase status", () => {
    expect(parseStatus("active")).toBe("ACTIVE");
  });

  it("should parse SCHEDULED status", () => {
    expect(parseStatus("scheduled")).toBe("SCHEDULED");
  });

  it("should parse PAUSED status", () => {
    expect(parseStatus("PAUSED")).toBe("PAUSED");
  });

  it("should parse ENDED status", () => {
    expect(parseStatus("ended")).toBe("ENDED");
  });

  it("should parse CANCELLED status", () => {
    expect(parseStatus("CANCELLED")).toBe("CANCELLED");
  });

  it("should return undefined for invalid status", () => {
    expect(parseStatus("INVALID")).toBeUndefined();
  });

  it("should return undefined for undefined", () => {
    expect(parseStatus(undefined)).toBeUndefined();
  });
});

describe("parseBoolean", () => {
  it('should parse "true" string', () => {
    expect(parseBoolean("true")).toBe(true);
  });

  it('should parse "false" string', () => {
    expect(parseBoolean("false")).toBe(false);
  });

  it("should parse true boolean", () => {
    expect(parseBoolean(true)).toBe(true);
  });

  it("should parse false boolean", () => {
    expect(parseBoolean(false)).toBe(false);
  });

  it("should return undefined for invalid", () => {
    expect(parseBoolean("yes")).toBeUndefined();
  });
});

describe("parseId", () => {
  it("should parse valid cuid", () => {
    expect(parseId("clbook123abc")).toBe("clbook123abc");
  });

  it("should return undefined for invalid id", () => {
    expect(parseId("invalid-id")).toBeUndefined();
  });

  it("should return undefined for undefined", () => {
    expect(parseId(undefined)).toBeUndefined();
  });

  it("should trim whitespace", () => {
    expect(parseId("  clbook123abc  ")).toBe("clbook123abc");
  });
});

describe("parseListSessionsQuery", () => {
  it("should parse all query parameters", () => {
    const query = {
      page: "2",
      limit: "30",
      status: "ACTIVE",
      bookId: "clbook123abc",
      hostId: "cluser123abc",
      includeEnded: "true",
    };

    const result = parseListSessionsQuery(query);

    expect(result.page).toBe(2);
    expect(result.limit).toBe(30);
    expect(result.status).toBe("ACTIVE");
    expect(result.bookId).toBe("clbook123abc");
    expect(result.hostId).toBe("cluser123abc");
    expect(result.includeEnded).toBe(true);
  });

  it("should use defaults for missing parameters", () => {
    const result = parseListSessionsQuery({});

    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.limit).toBe(DEFAULT_LIMIT);
    expect(result.status).toBeUndefined();
    expect(result.bookId).toBeUndefined();
    expect(result.includeEnded).toBe(false);
  });
});

describe("buildSessionsCacheKey", () => {
  it("should build basic cache key", () => {
    const params: SessionListQueryParams = {
      page: 1,
      limit: 20,
    };

    const key = buildSessionsCacheKey(params);
    expect(key).toContain("sessions");
    expect(key).toContain("p1");
    expect(key).toContain("l20");
  });

  it("should include status in cache key", () => {
    const params: SessionListQueryParams = {
      page: 1,
      limit: 20,
      status: "ACTIVE",
    };

    const key = buildSessionsCacheKey(params);
    expect(key).toContain("sACTIVE");
  });

  it("should include userId in cache key", () => {
    const params: SessionListQueryParams = {
      page: 1,
      limit: 20,
    };

    const key = buildSessionsCacheKey(params, "user123");
    expect(key).toContain("uuser123");
  });
});

describe("mapToSessionHostInfo", () => {
  it("should map host data correctly", () => {
    const host = {
      id: "user123",
      username: "testuser",
      displayName: "Test User",
      avatarUrl: "https://example.com/avatar.jpg",
    };

    const result = mapToSessionHostInfo(host);

    expect(result.id).toBe("user123");
    expect(result.username).toBe("testuser");
    expect(result.displayName).toBe("Test User");
    expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("should handle null values", () => {
    const host = {
      id: "user123",
      username: null,
      displayName: null,
      avatarUrl: null,
    };

    const result = mapToSessionHostInfo(host);

    expect(result.id).toBe("user123");
    expect(result.username).toBeNull();
    expect(result.displayName).toBeNull();
    expect(result.avatarUrl).toBeNull();
  });
});

describe("mapToSessionBookInfo", () => {
  it("should map book data correctly", () => {
    const book = {
      id: "book123",
      title: "Test Book",
      author: "Test Author",
      coverImage: "https://example.com/cover.jpg",
    };

    const result = mapToSessionBookInfo(book);

    expect(result.id).toBe("book123");
    expect(result.title).toBe("Test Book");
    expect(result.author).toBe("Test Author");
    expect(result.coverImage).toBe("https://example.com/cover.jpg");
  });

  it("should handle null values", () => {
    const book = {
      id: "book123",
      title: "Test Book",
      author: null,
      coverImage: null,
    };

    const result = mapToSessionBookInfo(book);

    expect(result.author).toBeNull();
    expect(result.coverImage).toBeNull();
  });
});

describe("mapToSessionSummary", () => {
  it("should map session data correctly", () => {
    const session = {
      id: "session123",
      title: "Test Session",
      description: "A test session",
      status: "ACTIVE",
      currentPage: 10,
      isPublic: true,
      allowChat: true,
      syncEnabled: true,
      maxParticipants: 50,
      participantCount: 5,
      scheduledAt: new Date("2026-02-01T10:00:00Z"),
      startedAt: new Date("2026-02-01T10:00:00Z"),
      host: {
        id: "user123",
        username: "host",
        displayName: "Host User",
        avatarUrl: null,
      },
      book: {
        id: "book123",
        title: "Test Book",
        author: "Author",
        coverImage: null,
      },
      createdAt: new Date("2026-01-01T10:00:00Z"),
    };

    const result = mapToSessionSummary(session);

    expect(result.id).toBe("session123");
    expect(result.title).toBe("Test Session");
    expect(result.status).toBe("ACTIVE");
    expect(result.participantCount).toBe(5);
    expect(result.host.id).toBe("user123");
    expect(result.book.id).toBe("book123");
  });

  it("should handle null scheduled and started dates", () => {
    const session = {
      id: "session123",
      title: "Test Session",
      description: null,
      status: "SCHEDULED",
      currentPage: 0,
      isPublic: true,
      allowChat: true,
      syncEnabled: true,
      maxParticipants: 50,
      participantCount: 1,
      scheduledAt: null,
      startedAt: null,
      host: {
        id: "user123",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      book: {
        id: "book123",
        title: "Test Book",
        author: null,
        coverImage: null,
      },
      createdAt: new Date("2026-01-01T10:00:00Z"),
    };

    const result = mapToSessionSummary(session);

    expect(result.scheduledAt).toBeNull();
    expect(result.startedAt).toBeNull();
    expect(result.description).toBeNull();
  });
});

describe("calculatePagination", () => {
  it("should calculate pagination correctly", () => {
    const result = calculatePagination(1, 20, 100);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(100);
    expect(result.totalPages).toBe(5);
    expect(result.hasMore).toBe(true);
  });

  it("should set hasMore to false on last page", () => {
    const result = calculatePagination(5, 20, 100);

    expect(result.hasMore).toBe(false);
  });

  it("should handle empty results", () => {
    const result = calculatePagination(1, 20, 0);

    expect(result.totalPages).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it("should handle single page", () => {
    const result = calculatePagination(1, 20, 10);

    expect(result.totalPages).toBe(1);
    expect(result.hasMore).toBe(false);
  });
});

describe("generateInviteCode", () => {
  it("should generate a 10-character code", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(10);
  });

  it("should generate unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    expect(codes.size).toBe(100);
  });
});

describe("formatDate", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2026-01-15T10:30:00Z");
    const result = formatDate(date);
    expect(result).toBe("2026-01-15T10:30:00.000Z");
  });

  it("should return null for null date", () => {
    expect(formatDate(null)).toBeNull();
  });
});

describe("formatDateRequired", () => {
  it("should format date as ISO string", () => {
    const date = new Date("2026-01-15T10:30:00Z");
    const result = formatDateRequired(date);
    expect(result).toBe("2026-01-15T10:30:00.000Z");
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("Constants", () => {
  it("should have correct default values", () => {
    expect(DEFAULT_PAGE).toBe(1);
    expect(DEFAULT_LIMIT).toBe(20);
    expect(MAX_LIMIT).toBe(50);
    expect(MIN_LIMIT).toBe(1);
  });

  it("should have correct field limits", () => {
    expect(MAX_TITLE_LENGTH).toBe(200);
    expect(MAX_DESCRIPTION_LENGTH).toBe(2000);
    expect(MAX_PARTICIPANTS).toBe(100);
  });

  it("should have all session status options", () => {
    expect(SessionStatusOptions.SCHEDULED).toBe("SCHEDULED");
    expect(SessionStatusOptions.ACTIVE).toBe("ACTIVE");
    expect(SessionStatusOptions.PAUSED).toBe("PAUSED");
    expect(SessionStatusOptions.ENDED).toBe("ENDED");
    expect(SessionStatusOptions.CANCELLED).toBe("CANCELLED");
  });
});
