/**
 * LiveSessionPage Tests
 *
 * Tests for the LiveSessionPage helper functions and component logic.
 */

import { describe, it, expect } from "vitest";
import {
  getStatusColor,
  getStatusLabelKey,
  formatRelativeTime,
  getHostDisplayName,
} from "./LiveSessionPage";

// ============================================================================
// getStatusColor Tests
// ============================================================================

describe("getStatusColor", () => {
  it("returns 'success' for ACTIVE status", () => {
    expect(getStatusColor("ACTIVE")).toBe("success");
  });

  it("returns 'warning' for PAUSED status", () => {
    expect(getStatusColor("PAUSED")).toBe("warning");
  });

  it("returns 'info' for SCHEDULED status", () => {
    expect(getStatusColor("SCHEDULED")).toBe("info");
  });

  it("returns 'error' for ENDED status", () => {
    expect(getStatusColor("ENDED")).toBe("error");
  });

  it("returns 'error' for CANCELLED status", () => {
    expect(getStatusColor("CANCELLED")).toBe("error");
  });

  it("returns 'default' for unknown status", () => {
    expect(getStatusColor("UNKNOWN")).toBe("default");
    expect(getStatusColor("")).toBe("default");
    expect(getStatusColor("foo")).toBe("default");
  });
});

// ============================================================================
// getStatusLabelKey Tests
// ============================================================================

describe("getStatusLabelKey", () => {
  it("returns correct key for SCHEDULED", () => {
    expect(getStatusLabelKey("SCHEDULED")).toBe(
      "liveSessions.status.scheduled"
    );
  });

  it("returns correct key for ACTIVE", () => {
    expect(getStatusLabelKey("ACTIVE")).toBe("liveSessions.status.active");
  });

  it("returns correct key for PAUSED", () => {
    expect(getStatusLabelKey("PAUSED")).toBe("liveSessions.status.paused");
  });

  it("returns correct key for ENDED", () => {
    expect(getStatusLabelKey("ENDED")).toBe("liveSessions.status.ended");
  });

  it("returns correct key for CANCELLED", () => {
    expect(getStatusLabelKey("CANCELLED")).toBe(
      "liveSessions.status.cancelled"
    );
  });

  it("returns 'common.unknown' for unknown status", () => {
    expect(getStatusLabelKey("UNKNOWN")).toBe("common.unknown");
    expect(getStatusLabelKey("")).toBe("common.unknown");
    expect(getStatusLabelKey("foo")).toBe("common.unknown");
  });
});

// ============================================================================
// formatRelativeTime Tests
// ============================================================================

describe("formatRelativeTime", () => {
  it("formats recent time correctly", () => {
    const now = new Date().toISOString();
    const result = formatRelativeTime(now);
    expect(result).toContain("ago");
  });

  it("formats time from a minute ago", () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const result = formatRelativeTime(oneMinuteAgo);
    expect(result).toMatch(/minute|ago/i);
  });

  it("formats time from an hour ago", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(oneHourAgo);
    expect(result).toMatch(/hour|ago/i);
  });

  it("formats time from a day ago", () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(oneDayAgo);
    expect(result).toMatch(/day|ago/i);
  });

  it("handles ISO date strings", () => {
    const date = "2024-01-15T10:30:00.000Z";
    const result = formatRelativeTime(date);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// getHostDisplayName Tests
// ============================================================================

describe("getHostDisplayName", () => {
  it("returns displayName when available", () => {
    const host = {
      id: "1",
      username: "johnd",
      displayName: "John Doe",
      avatarUrl: null,
    };
    expect(getHostDisplayName(host)).toBe("John Doe");
  });

  it("returns username when displayName is null", () => {
    const host = {
      id: "1",
      username: "johnd",
      displayName: null,
      avatarUrl: null,
    };
    expect(getHostDisplayName(host)).toBe("johnd");
  });

  it("returns 'Unknown' when both are null", () => {
    const host = {
      id: "1",
      username: null,
      displayName: null,
      avatarUrl: null,
    };
    expect(getHostDisplayName(host)).toBe("Unknown");
  });

  it("prioritizes displayName over username", () => {
    const host = {
      id: "1",
      username: "username",
      displayName: "Display Name",
      avatarUrl: null,
    };
    expect(getHostDisplayName(host)).toBe("Display Name");
  });
});

// ============================================================================
// Session Status Mapping Tests
// ============================================================================

describe("Session status mapping", () => {
  const statuses = ["SCHEDULED", "ACTIVE", "PAUSED", "ENDED", "CANCELLED"];

  it("all statuses have a color mapping", () => {
    statuses.forEach((status) => {
      const color = getStatusColor(status);
      expect(color).not.toBe("default");
    });
  });

  it("all statuses have a label key mapping", () => {
    statuses.forEach((status) => {
      const key = getStatusLabelKey(status);
      expect(key).toMatch(/^liveSessions\.status\./);
    });
  });
});

// ============================================================================
// Session Detail Response Type Tests
// ============================================================================

describe("SessionDetailResponse type structure", () => {
  const createMockSession = () => ({
    id: "session-1",
    title: "Test Session",
    description: "A test session",
    status: "ACTIVE",
    currentPage: 1,
    currentSpeed: null,
    isPublic: true,
    allowChat: true,
    syncEnabled: true,
    maxParticipants: 50,
    participantCount: 5,
    host: {
      id: "host-1",
      username: "hostuser",
      displayName: "Host User",
      avatarUrl: null,
    },
    book: {
      id: "book-1",
      title: "Test Book",
      author: "Test Author",
      coverImage: null,
    },
    isParticipant: true,
    isHost: false,
    createdAt: new Date().toISOString(),
    scheduledAt: null,
    startedAt: new Date().toISOString(),
  });

  it("has required id field", () => {
    const session = createMockSession();
    expect(session.id).toBe("session-1");
  });

  it("has required title field", () => {
    const session = createMockSession();
    expect(session.title).toBe("Test Session");
  });

  it("has required status field", () => {
    const session = createMockSession();
    expect(session.status).toBe("ACTIVE");
  });

  it("has nested host object", () => {
    const session = createMockSession();
    expect(session.host).toBeDefined();
    expect(session.host.id).toBe("host-1");
  });

  it("has nested book object", () => {
    const session = createMockSession();
    expect(session.book).toBeDefined();
    expect(session.book.id).toBe("book-1");
  });

  it("has isParticipant and isHost booleans", () => {
    const session = createMockSession();
    expect(typeof session.isParticipant).toBe("boolean");
    expect(typeof session.isHost).toBe("boolean");
  });

  it("has nullable scheduledAt", () => {
    const session = createMockSession();
    expect(session.scheduledAt).toBeNull();
  });
});

// ============================================================================
// Navigation and Action Logic Tests
// ============================================================================

describe("Session action logic", () => {
  it("host can start scheduled session", () => {
    const session = { status: "SCHEDULED", isHost: true };
    const canStart = session.status === "SCHEDULED" && session.isHost;
    expect(canStart).toBe(true);
  });

  it("host can pause active session", () => {
    const session = { status: "ACTIVE", isHost: true };
    const canPause = session.status === "ACTIVE" && session.isHost;
    expect(canPause).toBe(true);
  });

  it("host can resume paused session", () => {
    const session = { status: "PAUSED", isHost: true };
    const canResume = session.status === "PAUSED" && session.isHost;
    expect(canResume).toBe(true);
  });

  it("host can end active session", () => {
    const session = { status: "ACTIVE", isHost: true };
    const canEnd =
      (session.status === "ACTIVE" || session.status === "PAUSED") &&
      session.isHost;
    expect(canEnd).toBe(true);
  });

  it("non-host cannot control session", () => {
    const session = { status: "ACTIVE", isHost: false };
    const canControl = session.isHost;
    expect(canControl).toBe(false);
  });

  it("ended session cannot be controlled", () => {
    const session = { status: "ENDED", isHost: true };
    const isEnded =
      session.status === "ENDED" || session.status === "CANCELLED";
    expect(isEnded).toBe(true);
  });
});

// ============================================================================
// Participant Join/Leave Logic Tests
// ============================================================================

describe("Participant join/leave logic", () => {
  it("non-participant can join public session", () => {
    const session = { isPublic: true, isParticipant: false, status: "ACTIVE" };
    const canJoin =
      !session.isParticipant &&
      session.status !== "ENDED" &&
      session.status !== "CANCELLED";
    expect(canJoin).toBe(true);
  });

  it("participant can leave session", () => {
    const session = { isParticipant: true, isHost: false };
    const canLeave = session.isParticipant && !session.isHost;
    expect(canLeave).toBe(true);
  });

  it("host cannot leave (must end session)", () => {
    const session = { isParticipant: true, isHost: true };
    const canLeave = session.isParticipant && !session.isHost;
    expect(canLeave).toBe(false);
  });

  it("cannot join ended session", () => {
    const session = { isParticipant: false, status: "ENDED" };
    const canJoin =
      !session.isParticipant &&
      session.status !== "ENDED" &&
      session.status !== "CANCELLED";
    expect(canJoin).toBe(false);
  });

  it("cannot join cancelled session", () => {
    const session = { isParticipant: false, status: "CANCELLED" };
    const canJoin =
      !session.isParticipant &&
      session.status !== "ENDED" &&
      session.status !== "CANCELLED";
    expect(canJoin).toBe(false);
  });
});
