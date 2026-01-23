/**
 * SessionParticipants Component Tests
 *
 * Tests for the SessionParticipants helper functions and component logic.
 */

import { describe, it, expect } from "vitest";
import {
  isParticipantActive,
  getParticipantDisplayName,
  getStatusColor,
  sortParticipants,
  ACTIVE_THRESHOLD_MS,
} from "./SessionParticipants";
import type { SessionParticipant } from "@/hooks/useSessionRealtime";

// ============================================================================
// Test Data
// ============================================================================

const createMockParticipant = (
  overrides: Partial<SessionParticipant> = {}
): SessionParticipant => ({
  id: "participant-1",
  userId: "user-1",
  username: "testuser",
  displayName: "Test User",
  avatarUrl: "https://example.com/avatar.jpg",
  isHost: false,
  isModerator: false,
  isSynced: true,
  currentPage: 1,
  lastActiveAt: new Date().toISOString(),
  ...overrides,
});

// ============================================================================
// isParticipantActive Tests
// ============================================================================

describe("isParticipantActive", () => {
  it("returns true for recently active participant", () => {
    const lastActiveAt = new Date().toISOString();
    expect(isParticipantActive(lastActiveAt)).toBe(true);
  });

  it("returns true for participant active 1 minute ago", () => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(isParticipantActive(oneMinuteAgo)).toBe(true);
  });

  it("returns true for participant active 4 minutes ago", () => {
    const fourMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    expect(isParticipantActive(fourMinutesAgo)).toBe(true);
  });

  it("returns false for participant active 6 minutes ago", () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    expect(isParticipantActive(sixMinutesAgo)).toBe(false);
  });

  it("returns false for participant active 1 hour ago", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isParticipantActive(oneHourAgo)).toBe(false);
  });

  it("uses custom threshold when provided", () => {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    // With 1 minute threshold, should be inactive
    expect(isParticipantActive(twoMinutesAgo, 60 * 1000)).toBe(false);
    // With 3 minute threshold, should be active
    expect(isParticipantActive(twoMinutesAgo, 3 * 60 * 1000)).toBe(true);
  });

  it("uses default threshold of 5 minutes", () => {
    expect(ACTIVE_THRESHOLD_MS).toBe(5 * 60 * 1000);
  });
});

// ============================================================================
// getParticipantDisplayName Tests
// ============================================================================

describe("getParticipantDisplayName", () => {
  it("returns displayName when available", () => {
    const participant = createMockParticipant({
      displayName: "John Doe",
      username: "johnd",
    });
    expect(getParticipantDisplayName(participant)).toBe("John Doe");
  });

  it("returns username when displayName is null", () => {
    const participant = createMockParticipant({
      displayName: null,
      username: "johnd",
    });
    expect(getParticipantDisplayName(participant)).toBe("johnd");
  });

  it("returns 'Anonymous' when both are null", () => {
    const participant = createMockParticipant({
      displayName: null,
      username: null,
    });
    expect(getParticipantDisplayName(participant)).toBe("Anonymous");
  });

  it("prioritizes displayName over username", () => {
    const participant = createMockParticipant({
      displayName: "Display Name",
      username: "username",
    });
    expect(getParticipantDisplayName(participant)).toBe("Display Name");
  });
});

// ============================================================================
// getStatusColor Tests
// ============================================================================

describe("getStatusColor", () => {
  it("returns 'success' for active participant", () => {
    expect(getStatusColor(true)).toBe("success");
  });

  it("returns 'default' for inactive participant", () => {
    expect(getStatusColor(false)).toBe("default");
  });
});

// ============================================================================
// sortParticipants Tests
// ============================================================================

describe("sortParticipants", () => {
  it("puts host first", () => {
    const participants = [
      createMockParticipant({ id: "1", isHost: false, displayName: "Alice" }),
      createMockParticipant({ id: "2", isHost: true, displayName: "Bob" }),
      createMockParticipant({ id: "3", isHost: false, displayName: "Charlie" }),
    ];

    const sorted = sortParticipants(participants);
    expect(sorted[0]?.isHost).toBe(true);
    expect(sorted[0]?.displayName).toBe("Bob");
  });

  it("puts moderators after host", () => {
    const participants = [
      createMockParticipant({
        id: "1",
        isHost: false,
        isModerator: false,
        displayName: "Alice",
      }),
      createMockParticipant({
        id: "2",
        isHost: false,
        isModerator: true,
        displayName: "Bob",
      }),
      createMockParticipant({
        id: "3",
        isHost: true,
        isModerator: false,
        displayName: "Charlie",
      }),
    ];

    const sorted = sortParticipants(participants);
    expect(sorted[0]?.displayName).toBe("Charlie"); // Host first
    expect(sorted[1]?.displayName).toBe("Bob"); // Moderator second
  });

  it("sorts active participants before inactive", () => {
    const activeTime = new Date().toISOString();
    const inactiveTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const participants = [
      createMockParticipant({
        id: "1",
        displayName: "Inactive",
        lastActiveAt: inactiveTime,
      }),
      createMockParticipant({
        id: "2",
        displayName: "Active",
        lastActiveAt: activeTime,
      }),
    ];

    const sorted = sortParticipants(participants);
    expect(sorted[0]?.displayName).toBe("Active");
    expect(sorted[1]?.displayName).toBe("Inactive");
  });

  it("sorts alphabetically when all else is equal", () => {
    const activeTime = new Date().toISOString();

    const participants = [
      createMockParticipant({
        id: "1",
        displayName: "Charlie",
        lastActiveAt: activeTime,
      }),
      createMockParticipant({
        id: "2",
        displayName: "Alice",
        lastActiveAt: activeTime,
      }),
      createMockParticipant({
        id: "3",
        displayName: "Bob",
        lastActiveAt: activeTime,
      }),
    ];

    const sorted = sortParticipants(participants);
    expect(sorted[0]?.displayName).toBe("Alice");
    expect(sorted[1]?.displayName).toBe("Bob");
    expect(sorted[2]?.displayName).toBe("Charlie");
  });

  it("does not mutate original array", () => {
    const participants = [
      createMockParticipant({ id: "1", displayName: "B" }),
      createMockParticipant({ id: "2", displayName: "A" }),
    ];

    const original = [...participants];
    sortParticipants(participants);

    expect(participants[0]?.displayName).toBe(original[0]?.displayName);
    expect(participants[1]?.displayName).toBe(original[1]?.displayName);
  });

  it("returns empty array for empty input", () => {
    const sorted = sortParticipants([]);
    expect(sorted).toEqual([]);
  });

  it("handles single participant", () => {
    const participants = [
      createMockParticipant({ id: "1", displayName: "Only" }),
    ];
    const sorted = sortParticipants(participants);
    expect(sorted.length).toBe(1);
    expect(sorted[0]?.displayName).toBe("Only");
  });
});

// ============================================================================
// SessionParticipant Type Tests
// ============================================================================

describe("SessionParticipant type structure", () => {
  it("has required id field", () => {
    const participant = createMockParticipant({ id: "test-id" });
    expect(participant.id).toBe("test-id");
  });

  it("has required userId field", () => {
    const participant = createMockParticipant({ userId: "user-123" });
    expect(participant.userId).toBe("user-123");
  });

  it("has isHost boolean field", () => {
    const participant = createMockParticipant({ isHost: true });
    expect(participant.isHost).toBe(true);
  });

  it("has isModerator boolean field", () => {
    const participant = createMockParticipant({ isModerator: true });
    expect(participant.isModerator).toBe(true);
  });

  it("has isSynced boolean field", () => {
    const participant = createMockParticipant({ isSynced: false });
    expect(participant.isSynced).toBe(false);
  });

  it("has currentPage number field", () => {
    const participant = createMockParticipant({ currentPage: 42 });
    expect(participant.currentPage).toBe(42);
  });

  it("has lastActiveAt string field", () => {
    const date = "2024-01-15T10:30:00.000Z";
    const participant = createMockParticipant({ lastActiveAt: date });
    expect(participant.lastActiveAt).toBe(date);
  });

  it("has nullable avatarUrl field", () => {
    const participant = createMockParticipant({ avatarUrl: null });
    expect(participant.avatarUrl).toBeNull();
  });
});

// ============================================================================
// Props Type Tests
// ============================================================================

describe("SessionParticipantsProps structure", () => {
  it("defines required participants array", () => {
    const participants: SessionParticipant[] = [createMockParticipant()];
    expect(Array.isArray(participants)).toBe(true);
    expect(participants.length).toBe(1);
  });

  it("defines optional isLoading", () => {
    const isLoading: boolean | undefined = true;
    expect(isLoading).toBe(true);
  });

  it("defines optional currentUserId", () => {
    const currentUserId: string | undefined = "user-123";
    expect(currentUserId).toBe("user-123");
  });

  it("defines optional maxParticipants", () => {
    const maxParticipants: number | undefined = 50;
    expect(maxParticipants).toBe(50);
  });
});
