/**
 * Tests for useLeaderboard hook
 */

import { describe, it, expect } from "vitest";

import type {
  LeaderboardParams,
  FullLeaderboardResponse,
  LeaderboardEntry,
} from "./useLeaderboard";

// ============================================================================
// Mock Data
// ============================================================================

const mockLeaderboardEntry: LeaderboardEntry = {
  rank: 1,
  user: {
    id: "user1",
    username: "alice",
    displayName: "Alice Smith",
    avatarUrl: "https://example.com/alice.jpg",
  },
  value: 5000,
  isCurrentUser: false,
};

const mockLeaderboardResponse: FullLeaderboardResponse = {
  entries: [mockLeaderboardEntry],
  currentUserRank: 2,
  timeframe: "weekly",
  metric: "xp",
  pagination: {
    page: 1,
    limit: 50,
    total: 100,
    totalPages: 2,
    hasNextPage: true,
    hasPreviousPage: false,
  },
};

// ============================================================================
// Tests
// ============================================================================

describe("useLeaderboard types", () => {
  describe("LeaderboardParams", () => {
    it("should accept empty params", () => {
      const params: LeaderboardParams = {};
      expect(params).toBeDefined();
    });

    it("should accept timeframe param", () => {
      const params: LeaderboardParams = { timeframe: "weekly" };
      expect(params.timeframe).toBe("weekly");
    });

    it("should accept all timeframe values", () => {
      const weekly: LeaderboardParams = { timeframe: "weekly" };
      const monthly: LeaderboardParams = { timeframe: "monthly" };
      const allTime: LeaderboardParams = { timeframe: "all_time" };

      expect(weekly.timeframe).toBe("weekly");
      expect(monthly.timeframe).toBe("monthly");
      expect(allTime.timeframe).toBe("all_time");
    });

    it("should accept metric param", () => {
      const params: LeaderboardParams = { metric: "xp" };
      expect(params.metric).toBe("xp");
    });

    it("should accept all metric values", () => {
      const xp: LeaderboardParams = { metric: "xp" };
      const books: LeaderboardParams = { metric: "books" };
      const streak: LeaderboardParams = { metric: "streak" };
      const readingTime: LeaderboardParams = { metric: "reading_time" };

      expect(xp.metric).toBe("xp");
      expect(books.metric).toBe("books");
      expect(streak.metric).toBe("streak");
      expect(readingTime.metric).toBe("reading_time");
    });

    it("should accept friendsOnly param", () => {
      const globalParams: LeaderboardParams = { friendsOnly: false };
      const friendsParams: LeaderboardParams = { friendsOnly: true };

      expect(globalParams.friendsOnly).toBe(false);
      expect(friendsParams.friendsOnly).toBe(true);
    });

    it("should accept pagination params", () => {
      const params: LeaderboardParams = { page: 2, limit: 25 };
      expect(params.page).toBe(2);
      expect(params.limit).toBe(25);
    });

    it("should accept all params together", () => {
      const params: LeaderboardParams = {
        timeframe: "monthly",
        metric: "books",
        friendsOnly: true,
        page: 3,
        limit: 100,
      };

      expect(params.timeframe).toBe("monthly");
      expect(params.metric).toBe("books");
      expect(params.friendsOnly).toBe(true);
      expect(params.page).toBe(3);
      expect(params.limit).toBe(100);
    });
  });

  describe("LeaderboardEntry", () => {
    it("should have correct structure", () => {
      const entry: LeaderboardEntry = mockLeaderboardEntry;

      expect(entry.rank).toBe(1);
      expect(entry.user.id).toBe("user1");
      expect(entry.user.username).toBe("alice");
      expect(entry.user.displayName).toBe("Alice Smith");
      expect(entry.user.avatarUrl).toBe("https://example.com/alice.jpg");
      expect(entry.value).toBe(5000);
      expect(entry.isCurrentUser).toBe(false);
    });

    it("should allow null displayName", () => {
      const entry: LeaderboardEntry = {
        ...mockLeaderboardEntry,
        user: {
          ...mockLeaderboardEntry.user,
          displayName: null,
        },
      };

      expect(entry.user.displayName).toBeNull();
    });

    it("should allow null avatarUrl", () => {
      const entry: LeaderboardEntry = {
        ...mockLeaderboardEntry,
        user: {
          ...mockLeaderboardEntry.user,
          avatarUrl: null,
        },
      };

      expect(entry.user.avatarUrl).toBeNull();
    });

    it("should allow isCurrentUser to be true", () => {
      const entry: LeaderboardEntry = {
        ...mockLeaderboardEntry,
        isCurrentUser: true,
      };

      expect(entry.isCurrentUser).toBe(true);
    });
  });

  describe("FullLeaderboardResponse", () => {
    it("should have correct structure", () => {
      const response: FullLeaderboardResponse = mockLeaderboardResponse;

      expect(response.entries).toHaveLength(1);
      expect(response.currentUserRank).toBe(2);
      expect(response.timeframe).toBe("weekly");
      expect(response.metric).toBe("xp");
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.limit).toBe(50);
      expect(response.pagination.total).toBe(100);
      expect(response.pagination.totalPages).toBe(2);
      expect(response.pagination.hasNextPage).toBe(true);
      expect(response.pagination.hasPreviousPage).toBe(false);
    });

    it("should allow null currentUserRank", () => {
      const response: FullLeaderboardResponse = {
        ...mockLeaderboardResponse,
        currentUserRank: null,
      };

      expect(response.currentUserRank).toBeNull();
    });

    it("should allow empty entries array", () => {
      const response: FullLeaderboardResponse = {
        ...mockLeaderboardResponse,
        entries: [],
        pagination: {
          ...mockLeaderboardResponse.pagination,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
        },
      };

      expect(response.entries).toHaveLength(0);
      expect(response.pagination.total).toBe(0);
    });

    it("should support all timeframe values", () => {
      const weekly: FullLeaderboardResponse = {
        ...mockLeaderboardResponse,
        timeframe: "weekly",
      };
      const monthly: FullLeaderboardResponse = {
        ...mockLeaderboardResponse,
        timeframe: "monthly",
      };
      const allTime: FullLeaderboardResponse = {
        ...mockLeaderboardResponse,
        timeframe: "all_time",
      };

      expect(weekly.timeframe).toBe("weekly");
      expect(monthly.timeframe).toBe("monthly");
      expect(allTime.timeframe).toBe("all_time");
    });

    it("should support all metric values", () => {
      const xp: FullLeaderboardResponse = {
        ...mockLeaderboardResponse,
        metric: "xp",
      };
      const books: FullLeaderboardResponse = {
        ...mockLeaderboardResponse,
        metric: "books",
      };
      const streak: FullLeaderboardResponse = {
        ...mockLeaderboardResponse,
        metric: "streak",
      };
      const readingTime: FullLeaderboardResponse = {
        ...mockLeaderboardResponse,
        metric: "reading_time",
      };

      expect(xp.metric).toBe("xp");
      expect(books.metric).toBe("books");
      expect(streak.metric).toBe("streak");
      expect(readingTime.metric).toBe("reading_time");
    });
  });

  describe("API URL construction", () => {
    it("should construct URL with no params", () => {
      const searchParams = new URLSearchParams();

      const url = `/api/leaderboard?${searchParams.toString()}`;
      expect(url).toBe("/api/leaderboard?");
    });

    it("should construct URL with timeframe", () => {
      const params: LeaderboardParams = { timeframe: "weekly" };
      const searchParams = new URLSearchParams();
      if (params.timeframe) searchParams.set("timeframe", params.timeframe);

      const url = `/api/leaderboard?${searchParams.toString()}`;
      expect(url).toBe("/api/leaderboard?timeframe=weekly");
    });

    it("should construct URL with metric", () => {
      const params: LeaderboardParams = { metric: "books" };
      const searchParams = new URLSearchParams();
      if (params.metric) searchParams.set("metric", params.metric);

      const url = `/api/leaderboard?${searchParams.toString()}`;
      expect(url).toBe("/api/leaderboard?metric=books");
    });

    it("should construct URL with friendsOnly", () => {
      const params: LeaderboardParams = { friendsOnly: true };
      const searchParams = new URLSearchParams();
      if (params.friendsOnly !== undefined)
        searchParams.set("friendsOnly", String(params.friendsOnly));

      const url = `/api/leaderboard?${searchParams.toString()}`;
      expect(url).toBe("/api/leaderboard?friendsOnly=true");
    });

    it("should construct URL with pagination", () => {
      const params: LeaderboardParams = { page: 2, limit: 25 };
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));

      const url = `/api/leaderboard?${searchParams.toString()}`;
      expect(url).toBe("/api/leaderboard?page=2&limit=25");
    });

    it("should construct URL with all params", () => {
      const params: LeaderboardParams = {
        timeframe: "monthly",
        metric: "streak",
        friendsOnly: true,
        page: 3,
        limit: 100,
      };
      const searchParams = new URLSearchParams();
      if (params.timeframe) searchParams.set("timeframe", params.timeframe);
      if (params.metric) searchParams.set("metric", params.metric);
      if (params.friendsOnly !== undefined)
        searchParams.set("friendsOnly", String(params.friendsOnly));
      if (params.page) searchParams.set("page", String(params.page));
      if (params.limit) searchParams.set("limit", String(params.limit));

      const url = `/api/leaderboard?${searchParams.toString()}`;
      expect(url).toBe(
        "/api/leaderboard?timeframe=monthly&metric=streak&friendsOnly=true&page=3&limit=100"
      );
    });
  });
});
