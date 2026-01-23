/**
 * Tests for Session Sync API
 */

import { describe, it, expect } from "vitest";
import {
  validateSessionId,
  formatDate,
  formatOptionalDate,
  buildSyncCacheKey,
  mapToParticipantSyncInfo,
  updateSyncSchema,
  participantSyncSchema,
  SYNC_CACHE_TTL,
  PageEventTypes,
  type ParticipantSyncInfo,
  type SyncStateResponse,
  type UpdateSyncResponse,
} from "./sync.js";

describe("Session Sync API", () => {
  // ============================================================================
  // Constants
  // ============================================================================

  describe("Constants", () => {
    it("should have short cache TTL for real-time", () => {
      expect(SYNC_CACHE_TTL).toBe(5);
    });

    it("should define all page event types", () => {
      expect(PageEventTypes.TURN).toBe("TURN");
      expect(PageEventTypes.JUMP).toBe("JUMP");
      expect(PageEventTypes.SYNC).toBe("SYNC");
      expect(PageEventTypes.START).toBe("START");
      expect(PageEventTypes.END).toBe("END");
    });
  });

  // ============================================================================
  // validateSessionId
  // ============================================================================

  describe("validateSessionId", () => {
    it("should return trimmed string for valid ID", () => {
      expect(validateSessionId("session123")).toBe("session123");
      expect(validateSessionId("  abc789  ")).toBe("abc789");
    });

    it("should return null for empty string", () => {
      expect(validateSessionId("")).toBeNull();
      expect(validateSessionId("   ")).toBeNull();
    });

    it("should return null for non-string values", () => {
      expect(validateSessionId(null)).toBeNull();
      expect(validateSessionId(undefined)).toBeNull();
      expect(validateSessionId(123)).toBeNull();
      expect(validateSessionId({})).toBeNull();
      expect(validateSessionId([])).toBeNull();
    });
  });

  // ============================================================================
  // formatDate / formatOptionalDate
  // ============================================================================

  describe("formatDate", () => {
    it("should format date as ISO string", () => {
      const date = new Date("2024-01-15T10:30:00.000Z");
      expect(formatDate(date)).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should handle different dates", () => {
      const date = new Date("2025-06-30T23:59:59.999Z");
      expect(formatDate(date)).toBe("2025-06-30T23:59:59.999Z");
    });
  });

  describe("formatOptionalDate", () => {
    it("should format non-null date as ISO string", () => {
      const date = new Date("2024-01-15T10:30:00.000Z");
      expect(formatOptionalDate(date)).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should return null for null date", () => {
      expect(formatOptionalDate(null)).toBeNull();
    });
  });

  // ============================================================================
  // buildSyncCacheKey
  // ============================================================================

  describe("buildSyncCacheKey", () => {
    it("should build cache key with session ID", () => {
      const key = buildSyncCacheKey("session123");
      expect(key).toContain("session123");
      expect(key).toContain("sync");
    });

    it("should produce consistent keys", () => {
      const key1 = buildSyncCacheKey("session123");
      const key2 = buildSyncCacheKey("session123");
      expect(key1).toBe(key2);
    });

    it("should produce different keys for different sessions", () => {
      const key1 = buildSyncCacheKey("session123");
      const key2 = buildSyncCacheKey("session456");
      expect(key1).not.toBe(key2);
    });
  });

  // ============================================================================
  // mapToParticipantSyncInfo
  // ============================================================================

  describe("mapToParticipantSyncInfo", () => {
    it("should map participant with all fields", () => {
      const participant = {
        id: "part123",
        userId: "user123",
        isHost: true,
        isModerator: true,
        isSynced: true,
        currentPage: 42,
        lastActive: new Date("2024-01-15T10:30:00.000Z"),
        user: {
          id: "user123",
          username: "testuser",
          displayName: "Test User",
          avatarUrl: "https://example.com/avatar.jpg",
        },
      };

      const result: ParticipantSyncInfo = mapToParticipantSyncInfo(participant);

      expect(result.id).toBe("part123");
      expect(result.userId).toBe("user123");
      expect(result.username).toBe("testuser");
      expect(result.displayName).toBe("Test User");
      expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
      expect(result.isHost).toBe(true);
      expect(result.isModerator).toBe(true);
      expect(result.isSynced).toBe(true);
      expect(result.currentPage).toBe(42);
      expect(result.lastActiveAt).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should map participant with null lastActive", () => {
      const participant = {
        id: "part123",
        userId: "user123",
        isHost: false,
        isModerator: false,
        isSynced: true,
        currentPage: 1,
        lastActive: null,
        user: {
          id: "user123",
          username: null,
          displayName: null,
          avatarUrl: null,
        },
      };

      const result = mapToParticipantSyncInfo(participant);

      // Should use current date for null lastActiveAt
      expect(result.lastActiveAt).toBeTruthy();
      expect(() => new Date(result.lastActiveAt)).not.toThrow();
    });

    it("should map non-host, non-synced participant", () => {
      const participant = {
        id: "part456",
        userId: "user456",
        isHost: false,
        isModerator: false,
        isSynced: false,
        currentPage: 10,
        lastActive: new Date(),
        user: {
          id: "user456",
          username: "reader",
          displayName: "A Reader",
          avatarUrl: null,
        },
      };

      const result = mapToParticipantSyncInfo(participant);

      expect(result.isHost).toBe(false);
      expect(result.isModerator).toBe(false);
      expect(result.isSynced).toBe(false);
      expect(result.currentPage).toBe(10);
    });
  });

  // ============================================================================
  // updateSyncSchema
  // ============================================================================

  describe("updateSyncSchema", () => {
    it("should validate valid page update", () => {
      const result = updateSyncSchema.safeParse({
        currentPage: 42,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currentPage).toBe(42);
        expect(result.data.eventType).toBe("TURN"); // default
      }
    });

    it("should validate page update with event type", () => {
      const result = updateSyncSchema.safeParse({
        currentPage: 100,
        eventType: "JUMP",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currentPage).toBe(100);
        expect(result.data.eventType).toBe("JUMP");
      }
    });

    it("should accept all valid event types", () => {
      const validTypes = ["TURN", "JUMP", "SYNC"];

      for (const eventType of validTypes) {
        const result = updateSyncSchema.safeParse({
          currentPage: 1,
          eventType,
        });

        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid event types", () => {
      const result = updateSyncSchema.safeParse({
        currentPage: 1,
        eventType: "INVALID",
      });

      expect(result.success).toBe(false);
    });

    it("should reject negative page number", () => {
      const result = updateSyncSchema.safeParse({
        currentPage: -1,
      });

      expect(result.success).toBe(false);
    });

    it("should accept zero page number", () => {
      const result = updateSyncSchema.safeParse({
        currentPage: 0,
      });

      expect(result.success).toBe(true);
    });

    it("should reject non-integer page number", () => {
      const result = updateSyncSchema.safeParse({
        currentPage: 1.5,
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing currentPage", () => {
      const result = updateSyncSchema.safeParse({
        eventType: "TURN",
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // participantSyncSchema
  // ============================================================================

  describe("participantSyncSchema", () => {
    it("should validate with just currentPage", () => {
      const result = participantSyncSchema.safeParse({
        currentPage: 42,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currentPage).toBe(42);
        expect(result.data.isSynced).toBeUndefined();
      }
    });

    it("should validate with isSynced true", () => {
      const result = participantSyncSchema.safeParse({
        currentPage: 10,
        isSynced: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isSynced).toBe(true);
      }
    });

    it("should validate with isSynced false", () => {
      const result = participantSyncSchema.safeParse({
        currentPage: 20,
        isSynced: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isSynced).toBe(false);
      }
    });

    it("should reject negative currentPage", () => {
      const result = participantSyncSchema.safeParse({
        currentPage: -5,
      });

      expect(result.success).toBe(false);
    });

    it("should reject non-integer currentPage", () => {
      const result = participantSyncSchema.safeParse({
        currentPage: 3.14,
      });

      expect(result.success).toBe(false);
    });

    it("should reject non-boolean isSynced", () => {
      const result = participantSyncSchema.safeParse({
        currentPage: 10,
        isSynced: "yes",
      });

      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // Type Structure Tests
  // ============================================================================

  describe("Type Structures", () => {
    it("should have correct ParticipantSyncInfo structure", () => {
      const info: ParticipantSyncInfo = {
        id: "part123",
        userId: "user123",
        username: "test",
        displayName: "Test",
        avatarUrl: "http://example.com/avatar.jpg",
        isHost: true,
        isModerator: false,
        isSynced: true,
        currentPage: 42,
        lastActiveAt: "2024-01-15T10:30:00.000Z",
      };

      expect(info).toHaveProperty("id");
      expect(info).toHaveProperty("userId");
      expect(info).toHaveProperty("username");
      expect(info).toHaveProperty("displayName");
      expect(info).toHaveProperty("avatarUrl");
      expect(info).toHaveProperty("isHost");
      expect(info).toHaveProperty("isModerator");
      expect(info).toHaveProperty("isSynced");
      expect(info).toHaveProperty("currentPage");
      expect(info).toHaveProperty("lastActiveAt");
    });

    it("should have correct SyncStateResponse structure", () => {
      const response: SyncStateResponse = {
        sessionId: "session123",
        status: "ACTIVE",
        currentPage: 42,
        currentSpeed: 150,
        syncEnabled: true,
        totalPageTurns: 100,
        lastPageUpdate: "2024-01-15T10:30:00.000Z",
        participants: [],
        participantCount: 5,
      };

      expect(response).toHaveProperty("sessionId");
      expect(response).toHaveProperty("status");
      expect(response).toHaveProperty("currentPage");
      expect(response).toHaveProperty("currentSpeed");
      expect(response).toHaveProperty("syncEnabled");
      expect(response).toHaveProperty("totalPageTurns");
      expect(response).toHaveProperty("lastPageUpdate");
      expect(response).toHaveProperty("participants");
      expect(response).toHaveProperty("participantCount");
    });

    it("should have correct UpdateSyncResponse structure", () => {
      const response: UpdateSyncResponse = {
        success: true,
        currentPage: 42,
        totalPageTurns: 100,
      };

      expect(response).toHaveProperty("success");
      expect(response).toHaveProperty("currentPage");
      expect(response).toHaveProperty("totalPageTurns");
    });

    it("should allow null currentSpeed in SyncStateResponse", () => {
      const response: SyncStateResponse = {
        sessionId: "session123",
        status: "ACTIVE",
        currentPage: 42,
        currentSpeed: null,
        syncEnabled: true,
        totalPageTurns: 100,
        lastPageUpdate: null,
        participants: [],
        participantCount: 0,
      };

      expect(response.currentSpeed).toBeNull();
      expect(response.lastPageUpdate).toBeNull();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle page 0 (beginning of book)", () => {
      const result = updateSyncSchema.safeParse({
        currentPage: 0,
        eventType: "SYNC",
      });

      expect(result.success).toBe(true);
    });

    it("should handle very high page numbers", () => {
      const result = updateSyncSchema.safeParse({
        currentPage: 99999,
        eventType: "TURN",
      });

      expect(result.success).toBe(true);
    });

    it("should handle participant with default values", () => {
      const participant = {
        id: "part1",
        userId: "user1",
        isHost: false,
        isModerator: false,
        isSynced: true,
        currentPage: 0,
        lastActive: null,
        user: {
          id: "user1",
          username: null,
          displayName: null,
          avatarUrl: null,
        },
      };

      const result = mapToParticipantSyncInfo(participant);

      expect(result.currentPage).toBe(0);
      expect(result.username).toBeNull();
      expect(result.displayName).toBeNull();
    });
  });
});
