/**
 * Tests for useSessionRealtime Hook
 */

import { describe, it, expect } from "vitest";
import {
  mergeMessages,
  getLatestMessageTime,
  isUserParticipant,
  isUserHost,
  getUserSyncStatus,
  sessionRealtimeKeys,
  DEFAULT_POLL_INTERVAL,
  MIN_POLL_INTERVAL,
  MAX_MESSAGES_IN_MEMORY,
  MESSAGES_STALE_TIME,
  SYNC_STALE_TIME,
  type SessionMessage,
  type SessionParticipant,
  type SessionUser,
  type MessagesResponse,
  type SyncStateResponse,
  type SendMessageInput,
  type UpdatePageInput,
  type UseSessionRealtimeOptions,
} from "./useSessionRealtime";

describe("useSessionRealtime", () => {
  // ============================================================================
  // Constants
  // ============================================================================

  describe("Constants", () => {
    it("should have correct default poll interval", () => {
      expect(DEFAULT_POLL_INTERVAL).toBe(2000);
    });

    it("should have correct minimum poll interval", () => {
      expect(MIN_POLL_INTERVAL).toBe(500);
    });

    it("should have reasonable max messages limit", () => {
      expect(MAX_MESSAGES_IN_MEMORY).toBe(200);
    });

    it("should have short stale times for real-time", () => {
      expect(MESSAGES_STALE_TIME).toBe(1000);
      expect(SYNC_STALE_TIME).toBe(500);
    });
  });

  // ============================================================================
  // Query Keys
  // ============================================================================

  describe("sessionRealtimeKeys", () => {
    it("should generate messages query key", () => {
      const key = sessionRealtimeKeys.messages("session123");
      expect(key).toEqual(["session-realtime", "messages", "session123"]);
    });

    it("should generate sync query key", () => {
      const key = sessionRealtimeKeys.sync("session456");
      expect(key).toEqual(["session-realtime", "sync", "session456"]);
    });

    it("should generate unique keys for different sessions", () => {
      const key1 = sessionRealtimeKeys.messages("session1");
      const key2 = sessionRealtimeKeys.messages("session2");
      expect(key1).not.toEqual(key2);
    });
  });

  // ============================================================================
  // mergeMessages
  // ============================================================================

  describe("mergeMessages", () => {
    const createMessage = (id: string, createdAt: string): SessionMessage => ({
      id,
      type: "CHAT",
      content: `Message ${id}`,
      pageNumber: null,
      user: {
        id: "user1",
        username: "test",
        displayName: "Test",
        avatarUrl: null,
      },
      createdAt,
    });

    it("should merge new messages with existing", () => {
      const existing = [
        createMessage("msg1", "2024-01-15T10:00:00.000Z"),
        createMessage("msg2", "2024-01-15T10:01:00.000Z"),
      ];
      const incoming = [createMessage("msg3", "2024-01-15T10:02:00.000Z")];

      const result = mergeMessages(existing, incoming);

      expect(result).toHaveLength(3);
      expect(result.map((m) => m.id)).toContain("msg1");
      expect(result.map((m) => m.id)).toContain("msg2");
      expect(result.map((m) => m.id)).toContain("msg3");
    });

    it("should deduplicate messages by ID", () => {
      const existing = [
        createMessage("msg1", "2024-01-15T10:00:00.000Z"),
        createMessage("msg2", "2024-01-15T10:01:00.000Z"),
      ];
      const incoming = [
        createMessage("msg2", "2024-01-15T10:01:00.000Z"), // duplicate
        createMessage("msg3", "2024-01-15T10:02:00.000Z"),
      ];

      const result = mergeMessages(existing, incoming);

      expect(result).toHaveLength(3);
      const ids = result.map((m) => m.id);
      expect(ids.filter((id) => id === "msg2")).toHaveLength(1);
    });

    it("should sort messages by createdAt descending (newest first)", () => {
      const existing = [createMessage("msg2", "2024-01-15T10:01:00.000Z")];
      const incoming = [
        createMessage("msg1", "2024-01-15T10:00:00.000Z"),
        createMessage("msg3", "2024-01-15T10:02:00.000Z"),
      ];

      const result = mergeMessages(existing, incoming);

      expect(result[0]?.id).toBe("msg3"); // newest
      expect(result[1]?.id).toBe("msg2");
      expect(result[2]?.id).toBe("msg1"); // oldest
    });

    it("should limit to MAX_MESSAGES_IN_MEMORY", () => {
      const existing: SessionMessage[] = [];
      const incoming: SessionMessage[] = [];

      // Create more messages than limit
      for (let i = 0; i < MAX_MESSAGES_IN_MEMORY + 50; i++) {
        const msg = createMessage(
          `msg${i}`,
          `2024-01-15T10:${i.toString().padStart(2, "0")}:00.000Z`
        );
        if (i < 100) {
          existing.push(msg);
        } else {
          incoming.push(msg);
        }
      }

      const result = mergeMessages(existing, incoming);

      expect(result.length).toBeLessThanOrEqual(MAX_MESSAGES_IN_MEMORY);
    });

    it("should handle empty existing array", () => {
      const incoming = [createMessage("msg1", "2024-01-15T10:00:00.000Z")];

      const result = mergeMessages([], incoming);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("msg1");
    });

    it("should handle empty incoming array", () => {
      const existing = [createMessage("msg1", "2024-01-15T10:00:00.000Z")];

      const result = mergeMessages(existing, []);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("msg1");
    });
  });

  // ============================================================================
  // getLatestMessageTime
  // ============================================================================

  describe("getLatestMessageTime", () => {
    const createMessage = (id: string, createdAt: string): SessionMessage => ({
      id,
      type: "CHAT",
      content: "Test",
      pageNumber: null,
      user: {
        id: "user1",
        username: null,
        displayName: null,
        avatarUrl: null,
      },
      createdAt,
    });

    it("should return latest message time (first element)", () => {
      const messages = [
        createMessage("msg2", "2024-01-15T10:01:00.000Z"), // newest first
        createMessage("msg1", "2024-01-15T10:00:00.000Z"),
      ];

      const result = getLatestMessageTime(messages);

      expect(result).toBe("2024-01-15T10:01:00.000Z");
    });

    it("should return undefined for empty array", () => {
      const result = getLatestMessageTime([]);
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // isUserParticipant
  // ============================================================================

  describe("isUserParticipant", () => {
    const createParticipant = (
      userId: string,
      isHost: boolean = false
    ): SessionParticipant => ({
      id: `part-${userId}`,
      userId,
      username: userId,
      displayName: userId,
      avatarUrl: null,
      isHost,
      isModerator: false,
      isSynced: true,
      currentPage: 1,
      lastActiveAt: new Date().toISOString(),
    });

    it("should return true when user is participant", () => {
      const participants = [
        createParticipant("user1"),
        createParticipant("user2"),
      ];

      expect(isUserParticipant(participants, "user1")).toBe(true);
      expect(isUserParticipant(participants, "user2")).toBe(true);
    });

    it("should return false when user is not participant", () => {
      const participants = [
        createParticipant("user1"),
        createParticipant("user2"),
      ];

      expect(isUserParticipant(participants, "user3")).toBe(false);
    });

    it("should return false for empty participants array", () => {
      expect(isUserParticipant([], "user1")).toBe(false);
    });
  });

  // ============================================================================
  // isUserHost
  // ============================================================================

  describe("isUserHost", () => {
    const createParticipant = (
      userId: string,
      isHost: boolean
    ): SessionParticipant => ({
      id: `part-${userId}`,
      userId,
      username: userId,
      displayName: userId,
      avatarUrl: null,
      isHost,
      isModerator: false,
      isSynced: true,
      currentPage: 1,
      lastActiveAt: new Date().toISOString(),
    });

    it("should return true when user is host", () => {
      const participants = [
        createParticipant("user1", true), // host
        createParticipant("user2", false),
      ];

      expect(isUserHost(participants, "user1")).toBe(true);
    });

    it("should return false when user is not host", () => {
      const participants = [
        createParticipant("user1", true), // host
        createParticipant("user2", false),
      ];

      expect(isUserHost(participants, "user2")).toBe(false);
    });

    it("should return false when user is not in session", () => {
      const participants = [createParticipant("user1", true)];

      expect(isUserHost(participants, "user3")).toBe(false);
    });
  });

  // ============================================================================
  // getUserSyncStatus
  // ============================================================================

  describe("getUserSyncStatus", () => {
    const createParticipant = (
      userId: string,
      isSynced: boolean
    ): SessionParticipant => ({
      id: `part-${userId}`,
      userId,
      username: userId,
      displayName: userId,
      avatarUrl: null,
      isHost: false,
      isModerator: false,
      isSynced,
      currentPage: 1,
      lastActiveAt: new Date().toISOString(),
    });

    it("should return sync status when user is participant", () => {
      const participants = [
        createParticipant("user1", true),
        createParticipant("user2", false),
      ];

      expect(getUserSyncStatus(participants, "user1")).toBe(true);
      expect(getUserSyncStatus(participants, "user2")).toBe(false);
    });

    it("should return false when user is not participant", () => {
      const participants = [createParticipant("user1", true)];

      expect(getUserSyncStatus(participants, "user3")).toBe(false);
    });
  });

  // ============================================================================
  // Type Structure Tests
  // ============================================================================

  describe("Type Structures", () => {
    it("should have correct SessionUser structure", () => {
      const user: SessionUser = {
        id: "user1",
        username: "test",
        displayName: "Test User",
        avatarUrl: "http://example.com/avatar.jpg",
      };

      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("username");
      expect(user).toHaveProperty("displayName");
      expect(user).toHaveProperty("avatarUrl");
    });

    it("should have correct SessionMessage structure", () => {
      const message: SessionMessage = {
        id: "msg1",
        type: "CHAT",
        content: "Hello",
        pageNumber: 42,
        user: {
          id: "user1",
          username: null,
          displayName: null,
          avatarUrl: null,
        },
        createdAt: "2024-01-15T10:00:00.000Z",
      };

      expect(message).toHaveProperty("id");
      expect(message).toHaveProperty("type");
      expect(message).toHaveProperty("content");
      expect(message).toHaveProperty("pageNumber");
      expect(message).toHaveProperty("user");
      expect(message).toHaveProperty("createdAt");
    });

    it("should have correct SessionParticipant structure", () => {
      const participant: SessionParticipant = {
        id: "part1",
        userId: "user1",
        username: "test",
        displayName: "Test",
        avatarUrl: null,
        isHost: true,
        isModerator: false,
        isSynced: true,
        currentPage: 42,
        lastActiveAt: "2024-01-15T10:00:00.000Z",
      };

      expect(participant).toHaveProperty("id");
      expect(participant).toHaveProperty("userId");
      expect(participant).toHaveProperty("isHost");
      expect(participant).toHaveProperty("isModerator");
      expect(participant).toHaveProperty("isSynced");
      expect(participant).toHaveProperty("currentPage");
      expect(participant).toHaveProperty("lastActiveAt");
    });

    it("should have correct MessagesResponse structure", () => {
      const response: MessagesResponse = {
        messages: [],
        hasMore: false,
        cursor: null,
      };

      expect(response).toHaveProperty("messages");
      expect(response).toHaveProperty("hasMore");
      expect(response).toHaveProperty("cursor");
    });

    it("should have correct SyncStateResponse structure", () => {
      const response: SyncStateResponse = {
        sessionId: "session1",
        status: "ACTIVE",
        currentPage: 42,
        currentSpeed: 150,
        syncEnabled: true,
        totalPageTurns: 100,
        lastPageUpdate: "2024-01-15T10:00:00.000Z",
        participants: [],
        participantCount: 5,
      };

      expect(response).toHaveProperty("sessionId");
      expect(response).toHaveProperty("status");
      expect(response).toHaveProperty("currentPage");
      expect(response).toHaveProperty("syncEnabled");
      expect(response).toHaveProperty("participants");
      expect(response).toHaveProperty("participantCount");
    });

    it("should have correct SendMessageInput structure", () => {
      const input: SendMessageInput = {
        content: "Hello",
        type: "CHAT",
        pageNumber: 42,
      };

      expect(input).toHaveProperty("content");
      expect(input.type).toBe("CHAT");
      expect(input.pageNumber).toBe(42);
    });

    it("should have correct UpdatePageInput structure", () => {
      const input: UpdatePageInput = {
        currentPage: 42,
        eventType: "TURN",
      };

      expect(input).toHaveProperty("currentPage");
      expect(input.eventType).toBe("TURN");
    });

    it("should have correct UseSessionRealtimeOptions structure", () => {
      const options: UseSessionRealtimeOptions = {
        pollInterval: 3000,
        enabled: true,
        autoSync: false,
      };

      expect(options.pollInterval).toBe(3000);
      expect(options.enabled).toBe(true);
      expect(options.autoSync).toBe(false);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle message types", () => {
      const types: SessionMessage["type"][] = [
        "CHAT",
        "SYSTEM",
        "HIGHLIGHT",
        "QUESTION",
        "ANNOTATION",
      ];

      for (const type of types) {
        const message: SessionMessage = {
          id: "msg1",
          type,
          content: "Test",
          pageNumber: null,
          user: {
            id: "user1",
            username: null,
            displayName: null,
            avatarUrl: null,
          },
          createdAt: new Date().toISOString(),
        };

        expect(message.type).toBe(type);
      }
    });

    it("should handle event types in UpdatePageInput", () => {
      const eventTypes = ["TURN", "JUMP", "SYNC"] as const;

      for (const eventType of eventTypes) {
        const input: UpdatePageInput = {
          currentPage: 1,
          eventType,
        };

        expect(input.eventType).toBe(eventType);
      }
    });

    it("should handle null values in SessionMessage", () => {
      const message: SessionMessage = {
        id: "msg1",
        type: "CHAT",
        content: "Test",
        pageNumber: null,
        user: {
          id: "user1",
          username: null,
          displayName: null,
          avatarUrl: null,
        },
        createdAt: new Date().toISOString(),
      };

      expect(message.pageNumber).toBeNull();
      expect(message.user.username).toBeNull();
    });

    it("should handle optional fields in SendMessageInput", () => {
      const minimalInput: SendMessageInput = {
        content: "Hello",
      };

      expect(minimalInput.content).toBe("Hello");
      expect(minimalInput.type).toBeUndefined();
      expect(minimalInput.pageNumber).toBeUndefined();
    });
  });
});
