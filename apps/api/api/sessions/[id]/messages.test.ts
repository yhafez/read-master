/**
 * Tests for Session Messages API
 */

import { describe, it, expect } from "vitest";
import {
  validateSessionId,
  parseLimit,
  parseCursor,
  parseSince,
  formatDate,
  buildMessagesCacheKey,
  mapToUserInfo,
  mapToMessageSummary,
  sendMessageSchema,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_MESSAGE_LENGTH,
  MessageTypes,
  type MessageUserInfo,
  type MessageSummary,
} from "./messages.js";

describe("Session Messages API", () => {
  // ============================================================================
  // Constants
  // ============================================================================

  describe("Constants", () => {
    it("should have correct default limit", () => {
      expect(DEFAULT_LIMIT).toBe(50);
    });

    it("should have correct max limit", () => {
      expect(MAX_LIMIT).toBe(100);
    });

    it("should have correct max message length", () => {
      expect(MAX_MESSAGE_LENGTH).toBe(2000);
    });

    it("should define all message types", () => {
      expect(MessageTypes.CHAT).toBe("CHAT");
      expect(MessageTypes.SYSTEM).toBe("SYSTEM");
      expect(MessageTypes.HIGHLIGHT).toBe("HIGHLIGHT");
      expect(MessageTypes.QUESTION).toBe("QUESTION");
      expect(MessageTypes.ANNOTATION).toBe("ANNOTATION");
    });
  });

  // ============================================================================
  // validateSessionId
  // ============================================================================

  describe("validateSessionId", () => {
    it("should return trimmed string for valid ID", () => {
      expect(validateSessionId("abc123")).toBe("abc123");
      expect(validateSessionId("  xyz789  ")).toBe("xyz789");
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
    });
  });

  // ============================================================================
  // parseLimit
  // ============================================================================

  describe("parseLimit", () => {
    it("should return parsed number for valid string", () => {
      expect(parseLimit("25")).toBe(25);
      expect(parseLimit("1")).toBe(1);
      expect(parseLimit("100")).toBe(100);
    });

    it("should return default for invalid strings", () => {
      expect(parseLimit("abc")).toBe(DEFAULT_LIMIT);
      expect(parseLimit("")).toBe(DEFAULT_LIMIT);
      expect(parseLimit("-5")).toBe(DEFAULT_LIMIT);
    });

    it("should return default for out of range values", () => {
      expect(parseLimit("0")).toBe(DEFAULT_LIMIT);
      expect(parseLimit("101")).toBe(DEFAULT_LIMIT);
      expect(parseLimit("999")).toBe(DEFAULT_LIMIT);
    });

    it("should return default for non-string values", () => {
      expect(parseLimit(null)).toBe(DEFAULT_LIMIT);
      expect(parseLimit(undefined)).toBe(DEFAULT_LIMIT);
      expect(parseLimit({})).toBe(DEFAULT_LIMIT);
    });
  });

  // ============================================================================
  // parseCursor
  // ============================================================================

  describe("parseCursor", () => {
    it("should return trimmed string for valid cursor", () => {
      expect(parseCursor("msg123")).toBe("msg123");
      expect(parseCursor("  cursor456  ")).toBe("cursor456");
    });

    it("should return undefined for empty string", () => {
      expect(parseCursor("")).toBeUndefined();
      expect(parseCursor("   ")).toBeUndefined();
    });

    it("should return undefined for non-string values", () => {
      expect(parseCursor(null)).toBeUndefined();
      expect(parseCursor(undefined)).toBeUndefined();
      expect(parseCursor(123)).toBeUndefined();
    });
  });

  // ============================================================================
  // parseSince
  // ============================================================================

  describe("parseSince", () => {
    it("should return Date for valid ISO string", () => {
      const dateStr = "2024-01-15T10:30:00.000Z";
      const result = parseSince(dateStr);
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe(dateStr);
    });

    it("should return undefined for invalid date string", () => {
      expect(parseSince("not-a-date")).toBeUndefined();
      expect(parseSince("")).toBeUndefined();
    });

    it("should return undefined for non-string values", () => {
      expect(parseSince(null)).toBeUndefined();
      expect(parseSince(undefined)).toBeUndefined();
      expect(parseSince(123)).toBeUndefined();
    });
  });

  // ============================================================================
  // formatDate
  // ============================================================================

  describe("formatDate", () => {
    it("should format date as ISO string", () => {
      const date = new Date("2024-01-15T10:30:00.000Z");
      expect(formatDate(date)).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should handle different dates", () => {
      const date = new Date("2025-12-31T23:59:59.999Z");
      expect(formatDate(date)).toBe("2025-12-31T23:59:59.999Z");
    });
  });

  // ============================================================================
  // buildMessagesCacheKey
  // ============================================================================

  describe("buildMessagesCacheKey", () => {
    it("should build basic cache key", () => {
      const key = buildMessagesCacheKey("session123");
      expect(key).toContain("session123");
      expect(key).toContain("messages");
    });

    it("should include cursor when provided", () => {
      const key = buildMessagesCacheKey("session123", "cursor456");
      expect(key).toContain("session123");
      expect(key).toContain("ccursor456");
    });

    it("should not include cursor when undefined", () => {
      const key = buildMessagesCacheKey("session123", undefined);
      expect(key).not.toContain(":c");
    });
  });

  // ============================================================================
  // mapToUserInfo
  // ============================================================================

  describe("mapToUserInfo", () => {
    it("should map user with all fields", () => {
      const user = {
        id: "user123",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: "https://example.com/avatar.jpg",
      };

      const result: MessageUserInfo = mapToUserInfo(user);

      expect(result.id).toBe("user123");
      expect(result.username).toBe("testuser");
      expect(result.displayName).toBe("Test User");
      expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
    });

    it("should map user with null fields", () => {
      const user = {
        id: "user123",
        username: null,
        displayName: null,
        avatarUrl: null,
      };

      const result = mapToUserInfo(user);

      expect(result.id).toBe("user123");
      expect(result.username).toBeNull();
      expect(result.displayName).toBeNull();
      expect(result.avatarUrl).toBeNull();
    });
  });

  // ============================================================================
  // mapToMessageSummary
  // ============================================================================

  describe("mapToMessageSummary", () => {
    it("should map message with all fields", () => {
      const message = {
        id: "msg123",
        type: "CHAT",
        content: "Hello world!",
        pageNumber: 42,
        createdAt: new Date("2024-01-15T10:30:00.000Z"),
        user: {
          id: "user123",
          username: "testuser",
          displayName: "Test User",
          avatarUrl: "https://example.com/avatar.jpg",
        },
      };

      const result: MessageSummary = mapToMessageSummary(message);

      expect(result.id).toBe("msg123");
      expect(result.type).toBe("CHAT");
      expect(result.content).toBe("Hello world!");
      expect(result.pageNumber).toBe(42);
      expect(result.createdAt).toBe("2024-01-15T10:30:00.000Z");
      expect(result.user.id).toBe("user123");
    });

    it("should map message with null page number", () => {
      const message = {
        id: "msg123",
        type: "CHAT",
        content: "General chat",
        pageNumber: null,
        createdAt: new Date("2024-01-15T10:30:00.000Z"),
        user: {
          id: "user123",
          username: null,
          displayName: null,
          avatarUrl: null,
        },
      };

      const result = mapToMessageSummary(message);

      expect(result.pageNumber).toBeNull();
    });

    it("should map different message types", () => {
      const types = ["CHAT", "HIGHLIGHT", "QUESTION", "ANNOTATION"];

      for (const type of types) {
        const message = {
          id: "msg123",
          type,
          content: "Test",
          pageNumber: null,
          createdAt: new Date(),
          user: {
            id: "user123",
            username: null,
            displayName: null,
            avatarUrl: null,
          },
        };

        const result = mapToMessageSummary(message);
        expect(result.type).toBe(type);
      }
    });
  });

  // ============================================================================
  // sendMessageSchema
  // ============================================================================

  describe("sendMessageSchema", () => {
    it("should validate valid message", () => {
      const result = sendMessageSchema.safeParse({
        content: "Hello world!",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("Hello world!");
        expect(result.data.type).toBe("CHAT"); // default
      }
    });

    it("should validate message with all fields", () => {
      const result = sendMessageSchema.safeParse({
        content: "This is a highlight",
        type: "HIGHLIGHT",
        pageNumber: 42,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("HIGHLIGHT");
        expect(result.data.pageNumber).toBe(42);
      }
    });

    it("should reject empty content", () => {
      const result = sendMessageSchema.safeParse({
        content: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject whitespace-only content", () => {
      const result = sendMessageSchema.safeParse({
        content: "   ",
      });

      expect(result.success).toBe(false);
    });

    it("should trim content", () => {
      const result = sendMessageSchema.safeParse({
        content: "  Hello  ",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("Hello");
      }
    });

    it("should reject content over max length", () => {
      const result = sendMessageSchema.safeParse({
        content: "a".repeat(MAX_MESSAGE_LENGTH + 1),
      });

      expect(result.success).toBe(false);
    });

    it("should accept content at max length", () => {
      const result = sendMessageSchema.safeParse({
        content: "a".repeat(MAX_MESSAGE_LENGTH),
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid message type", () => {
      const result = sendMessageSchema.safeParse({
        content: "Hello",
        type: "INVALID",
      });

      expect(result.success).toBe(false);
    });

    it("should accept all valid message types", () => {
      const validTypes = ["CHAT", "HIGHLIGHT", "QUESTION", "ANNOTATION"];

      for (const type of validTypes) {
        const result = sendMessageSchema.safeParse({
          content: "Test",
          type,
        });

        expect(result.success).toBe(true);
      }
    });

    it("should reject negative page number", () => {
      const result = sendMessageSchema.safeParse({
        content: "Hello",
        pageNumber: -1,
      });

      expect(result.success).toBe(false);
    });

    it("should accept zero page number", () => {
      const result = sendMessageSchema.safeParse({
        content: "Hello",
        pageNumber: 0,
      });

      expect(result.success).toBe(true);
    });

    it("should accept null page number", () => {
      const result = sendMessageSchema.safeParse({
        content: "Hello",
        pageNumber: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageNumber).toBeNull();
      }
    });
  });

  // ============================================================================
  // Type Structure Tests
  // ============================================================================

  describe("Type Structures", () => {
    it("should have correct MessageUserInfo structure", () => {
      const userInfo: MessageUserInfo = {
        id: "user123",
        username: "test",
        displayName: "Test",
        avatarUrl: "http://example.com/avatar.jpg",
      };

      expect(userInfo).toHaveProperty("id");
      expect(userInfo).toHaveProperty("username");
      expect(userInfo).toHaveProperty("displayName");
      expect(userInfo).toHaveProperty("avatarUrl");
    });

    it("should have correct MessageSummary structure", () => {
      const message: MessageSummary = {
        id: "msg123",
        type: "CHAT",
        content: "Hello",
        pageNumber: 1,
        user: {
          id: "user123",
          username: null,
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2024-01-15T10:30:00.000Z",
      };

      expect(message).toHaveProperty("id");
      expect(message).toHaveProperty("type");
      expect(message).toHaveProperty("content");
      expect(message).toHaveProperty("pageNumber");
      expect(message).toHaveProperty("user");
      expect(message).toHaveProperty("createdAt");
    });
  });
});
