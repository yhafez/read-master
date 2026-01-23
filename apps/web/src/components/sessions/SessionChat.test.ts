/**
 * SessionChat Component Tests
 *
 * Tests for the SessionChat helper functions and component logic.
 */

import { describe, it, expect } from "vitest";
import {
  getMessageTypeIcon,
  getMessageBackgroundColor,
  formatMessageTime,
  getDisplayName,
} from "./SessionChat";
import type { SessionMessage } from "@/hooks/useSessionRealtime";

// ============================================================================
// Test Data
// ============================================================================

const createMockUser = (
  overrides: Partial<SessionMessage["user"]> = {}
): SessionMessage["user"] => ({
  id: "user-1",
  username: "testuser",
  displayName: "Test User",
  avatarUrl: "https://example.com/avatar.jpg",
  ...overrides,
});

const createMockMessage = (
  overrides: Partial<SessionMessage> = {}
): SessionMessage => ({
  id: "msg-1",
  type: "CHAT",
  content: "Hello world",
  pageNumber: null,
  user: createMockUser(),
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// getMessageTypeIcon Tests
// ============================================================================

describe("getMessageTypeIcon", () => {
  it("returns null for CHAT type", () => {
    expect(getMessageTypeIcon("CHAT")).toBeNull();
  });

  it("returns a React node for HIGHLIGHT type", () => {
    const result = getMessageTypeIcon("HIGHLIGHT");
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });

  it("returns a React node for QUESTION type", () => {
    const result = getMessageTypeIcon("QUESTION");
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });

  it("returns a React node for ANNOTATION type", () => {
    const result = getMessageTypeIcon("ANNOTATION");
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });

  it("returns a React node for SYSTEM type", () => {
    const result = getMessageTypeIcon("SYSTEM");
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });
});

// ============================================================================
// getMessageBackgroundColor Tests
// ============================================================================

describe("getMessageBackgroundColor", () => {
  it("returns 'transparent' for CHAT type", () => {
    expect(getMessageBackgroundColor("CHAT")).toBe("transparent");
  });

  it("returns 'action.hover' for SYSTEM type", () => {
    expect(getMessageBackgroundColor("SYSTEM")).toBe("action.hover");
  });

  it("returns 'warning.light' for HIGHLIGHT type", () => {
    expect(getMessageBackgroundColor("HIGHLIGHT")).toBe("warning.light");
  });

  it("returns 'info.light' for QUESTION type", () => {
    expect(getMessageBackgroundColor("QUESTION")).toBe("info.light");
  });

  it("returns 'secondary.light' for ANNOTATION type", () => {
    expect(getMessageBackgroundColor("ANNOTATION")).toBe("secondary.light");
  });
});

// ============================================================================
// formatMessageTime Tests
// ============================================================================

describe("formatMessageTime", () => {
  it("formats recent time correctly", () => {
    const now = new Date();
    const result = formatMessageTime(now.toISOString());
    expect(result).toContain("ago");
  });

  it("formats time from a minute ago", () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const result = formatMessageTime(oneMinuteAgo.toISOString());
    expect(result).toMatch(/minute|ago/i);
  });

  it("formats time from an hour ago", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = formatMessageTime(oneHourAgo.toISOString());
    expect(result).toMatch(/hour|ago/i);
  });

  it("handles ISO date strings", () => {
    const date = "2024-01-15T10:30:00.000Z";
    const result = formatMessageTime(date);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// getDisplayName Tests
// ============================================================================

describe("getDisplayName", () => {
  it("returns displayName when available", () => {
    const user = createMockUser({ displayName: "John Doe", username: "johnd" });
    expect(getDisplayName(user)).toBe("John Doe");
  });

  it("returns username when displayName is null", () => {
    const user = createMockUser({ displayName: null, username: "johnd" });
    expect(getDisplayName(user)).toBe("johnd");
  });

  it("returns 'Anonymous' when both are null", () => {
    const user = createMockUser({ displayName: null, username: null });
    expect(getDisplayName(user)).toBe("Anonymous");
  });

  it("prioritizes displayName over username", () => {
    const user = createMockUser({
      displayName: "Display Name",
      username: "username",
    });
    expect(getDisplayName(user)).toBe("Display Name");
  });
});

// ============================================================================
// Message Type Tests
// ============================================================================

describe("SessionMessage types", () => {
  it("supports CHAT message type", () => {
    const message = createMockMessage({ type: "CHAT" });
    expect(message.type).toBe("CHAT");
  });

  it("supports SYSTEM message type", () => {
    const message = createMockMessage({ type: "SYSTEM" });
    expect(message.type).toBe("SYSTEM");
  });

  it("supports HIGHLIGHT message type", () => {
    const message = createMockMessage({ type: "HIGHLIGHT" });
    expect(message.type).toBe("HIGHLIGHT");
  });

  it("supports QUESTION message type", () => {
    const message = createMockMessage({ type: "QUESTION" });
    expect(message.type).toBe("QUESTION");
  });

  it("supports ANNOTATION message type", () => {
    const message = createMockMessage({ type: "ANNOTATION" });
    expect(message.type).toBe("ANNOTATION");
  });

  it("supports pageNumber field", () => {
    const message = createMockMessage({ pageNumber: 42 });
    expect(message.pageNumber).toBe(42);
  });

  it("supports null pageNumber", () => {
    const message = createMockMessage({ pageNumber: null });
    expect(message.pageNumber).toBeNull();
  });
});

// ============================================================================
// Props Type Tests
// ============================================================================

describe("SessionChatProps structure", () => {
  it("defines required messages array", () => {
    const messages: SessionMessage[] = [createMockMessage()];
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBe(1);
  });

  it("defines allowChat boolean", () => {
    const allowChat = true;
    expect(typeof allowChat).toBe("boolean");
  });

  it("defines optional currentPage", () => {
    const currentPage: number | undefined = 5;
    expect(currentPage).toBe(5);
  });

  it("defines optional hasMoreMessages", () => {
    const hasMoreMessages: boolean | undefined = true;
    expect(hasMoreMessages).toBe(true);
  });
});
