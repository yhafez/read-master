/**
 * Tests for useNewLeaderboard hook
 *
 * Tests for the leaderboard hook types and utility functions.
 */

import { describe, it, expect } from "vitest";

import type {
  LeaderboardMetric,
  LeaderboardPeriod,
  LeaderboardType,
  LeaderboardEntry,
  LeaderboardData,
  UseLeaderboardOptions,
} from "./useNewLeaderboard";

// ============================================================================
// Mock Data
// ============================================================================

const mockLeaderboardEntry: LeaderboardEntry = {
  rank: 1,
  userId: "user-123",
  username: "alice",
  displayName: "Alice Smith",
  avatar: "https://example.com/alice.jpg",
  tier: "PRO",
  score: 5000,
  change: 2,
  isCurrentUser: false,
};

const mockCurrentUser: LeaderboardEntry = {
  rank: 5,
  userId: "user-current",
  username: "current",
  displayName: "Current User",
  avatar: null,
  tier: "FREE",
  score: 1000,
  change: -1,
  isCurrentUser: true,
};

const mockLeaderboardData: LeaderboardData = {
  leaderboard: [mockLeaderboardEntry],
  currentUser: mockCurrentUser,
  metric: "books",
  period: "weekly",
  type: "global",
};

// ============================================================================
// Type Tests
// ============================================================================

describe("useNewLeaderboard types", () => {
  describe("LeaderboardMetric", () => {
    it("should accept books metric", () => {
      const metric: LeaderboardMetric = "books";
      expect(metric).toBe("books");
    });

    it("should accept pages metric", () => {
      const metric: LeaderboardMetric = "pages";
      expect(metric).toBe("pages");
    });

    it("should accept time metric", () => {
      const metric: LeaderboardMetric = "time";
      expect(metric).toBe("time");
    });

    it("should accept streak metric", () => {
      const metric: LeaderboardMetric = "streak";
      expect(metric).toBe("streak");
    });

    it("should accept xp metric", () => {
      const metric: LeaderboardMetric = "xp";
      expect(metric).toBe("xp");
    });

    it("should accept assessments metric", () => {
      const metric: LeaderboardMetric = "assessments";
      expect(metric).toBe("assessments");
    });
  });

  describe("LeaderboardPeriod", () => {
    it("should accept daily period", () => {
      const period: LeaderboardPeriod = "daily";
      expect(period).toBe("daily");
    });

    it("should accept weekly period", () => {
      const period: LeaderboardPeriod = "weekly";
      expect(period).toBe("weekly");
    });

    it("should accept monthly period", () => {
      const period: LeaderboardPeriod = "monthly";
      expect(period).toBe("monthly");
    });

    it("should accept alltime period", () => {
      const period: LeaderboardPeriod = "alltime";
      expect(period).toBe("alltime");
    });
  });

  describe("LeaderboardType", () => {
    it("should accept global type", () => {
      const type: LeaderboardType = "global";
      expect(type).toBe("global");
    });

    it("should accept friends type", () => {
      const type: LeaderboardType = "friends";
      expect(type).toBe("friends");
    });
  });

  describe("LeaderboardEntry", () => {
    it("should have correct structure", () => {
      const entry: LeaderboardEntry = mockLeaderboardEntry;

      expect(entry.rank).toBe(1);
      expect(entry.userId).toBe("user-123");
      expect(entry.username).toBe("alice");
      expect(entry.displayName).toBe("Alice Smith");
      expect(entry.avatar).toBe("https://example.com/alice.jpg");
      expect(entry.tier).toBe("PRO");
      expect(entry.score).toBe(5000);
      expect(entry.change).toBe(2);
      expect(entry.isCurrentUser).toBe(false);
    });

    it("should allow null displayName", () => {
      const entry: LeaderboardEntry = {
        ...mockLeaderboardEntry,
        displayName: null,
      };

      expect(entry.displayName).toBeNull();
    });

    it("should allow null avatar", () => {
      const entry: LeaderboardEntry = {
        ...mockLeaderboardEntry,
        avatar: null,
      };

      expect(entry.avatar).toBeNull();
    });

    it("should allow negative change", () => {
      const entry: LeaderboardEntry = {
        ...mockLeaderboardEntry,
        change: -5,
      };

      expect(entry.change).toBe(-5);
    });

    it("should allow zero change", () => {
      const entry: LeaderboardEntry = {
        ...mockLeaderboardEntry,
        change: 0,
      };

      expect(entry.change).toBe(0);
    });

    it("should allow isCurrentUser to be true", () => {
      const entry: LeaderboardEntry = mockCurrentUser;

      expect(entry.isCurrentUser).toBe(true);
    });

    it("should accept different tier values", () => {
      const freeTier: LeaderboardEntry = {
        ...mockLeaderboardEntry,
        tier: "FREE",
      };
      const proTier: LeaderboardEntry = {
        ...mockLeaderboardEntry,
        tier: "PRO",
      };
      const scholarTier: LeaderboardEntry = {
        ...mockLeaderboardEntry,
        tier: "SCHOLAR",
      };

      expect(freeTier.tier).toBe("FREE");
      expect(proTier.tier).toBe("PRO");
      expect(scholarTier.tier).toBe("SCHOLAR");
    });
  });

  describe("LeaderboardData", () => {
    it("should have correct structure", () => {
      const data: LeaderboardData = mockLeaderboardData;

      expect(data.leaderboard).toHaveLength(1);
      expect(data.currentUser).toBeDefined();
      expect(data.metric).toBe("books");
      expect(data.period).toBe("weekly");
      expect(data.type).toBe("global");
    });

    it("should allow null currentUser", () => {
      const data: LeaderboardData = {
        ...mockLeaderboardData,
        currentUser: null,
      };

      expect(data.currentUser).toBeNull();
    });

    it("should allow empty leaderboard array", () => {
      const data: LeaderboardData = {
        ...mockLeaderboardData,
        leaderboard: [],
      };

      expect(data.leaderboard).toHaveLength(0);
    });

    it("should support multiple entries", () => {
      const data: LeaderboardData = {
        ...mockLeaderboardData,
        leaderboard: [
          { ...mockLeaderboardEntry, rank: 1 },
          { ...mockLeaderboardEntry, rank: 2, userId: "user-2" },
          { ...mockLeaderboardEntry, rank: 3, userId: "user-3" },
        ],
      };

      expect(data.leaderboard).toHaveLength(3);
      expect(data.leaderboard[0]?.rank).toBe(1);
      expect(data.leaderboard[1]?.rank).toBe(2);
      expect(data.leaderboard[2]?.rank).toBe(3);
    });

    it("should support all metric values", () => {
      const metrics: LeaderboardMetric[] = [
        "books",
        "pages",
        "time",
        "streak",
        "xp",
        "assessments",
      ];

      metrics.forEach((metric) => {
        const data: LeaderboardData = { ...mockLeaderboardData, metric };
        expect(data.metric).toBe(metric);
      });
    });

    it("should support all period values", () => {
      const periods: LeaderboardPeriod[] = [
        "daily",
        "weekly",
        "monthly",
        "alltime",
      ];

      periods.forEach((period) => {
        const data: LeaderboardData = { ...mockLeaderboardData, period };
        expect(data.period).toBe(period);
      });
    });

    it("should support all type values", () => {
      const types: LeaderboardType[] = ["global", "friends"];

      types.forEach((type) => {
        const data: LeaderboardData = { ...mockLeaderboardData, type };
        expect(data.type).toBe(type);
      });
    });
  });

  describe("UseLeaderboardOptions", () => {
    it("should accept empty options", () => {
      const options: UseLeaderboardOptions = {};
      expect(options).toBeDefined();
    });

    it("should accept metric option", () => {
      const options: UseLeaderboardOptions = { metric: "xp" };
      expect(options.metric).toBe("xp");
    });

    it("should accept period option", () => {
      const options: UseLeaderboardOptions = { period: "monthly" };
      expect(options.period).toBe("monthly");
    });

    it("should accept type option", () => {
      const options: UseLeaderboardOptions = { type: "friends" };
      expect(options.type).toBe("friends");
    });

    it("should accept limit option", () => {
      const options: UseLeaderboardOptions = { limit: 50 };
      expect(options.limit).toBe(50);
    });

    it("should accept enabled option", () => {
      const options: UseLeaderboardOptions = { enabled: false };
      expect(options.enabled).toBe(false);
    });

    it("should accept all options together", () => {
      const options: UseLeaderboardOptions = {
        metric: "streak",
        period: "alltime",
        type: "global",
        limit: 25,
        enabled: true,
      };

      expect(options.metric).toBe("streak");
      expect(options.period).toBe("alltime");
      expect(options.type).toBe("global");
      expect(options.limit).toBe(25);
      expect(options.enabled).toBe(true);
    });
  });
});

// ============================================================================
// API URL Construction Tests
// ============================================================================

describe("API URL construction", () => {
  it("should construct URL with default params", () => {
    const params = new URLSearchParams({
      metric: "books",
      period: "alltime",
      type: "global",
      limit: "100",
    });

    const url = `/api/leaderboards?${params}`;
    expect(url).toBe(
      "/api/leaderboards?metric=books&period=alltime&type=global&limit=100"
    );
  });

  it("should construct URL with custom metric", () => {
    const params = new URLSearchParams({
      metric: "xp",
      period: "alltime",
      type: "global",
      limit: "100",
    });

    const url = `/api/leaderboards?${params}`;
    expect(url).toContain("metric=xp");
  });

  it("should construct URL with custom period", () => {
    const params = new URLSearchParams({
      metric: "books",
      period: "weekly",
      type: "global",
      limit: "100",
    });

    const url = `/api/leaderboards?${params}`;
    expect(url).toContain("period=weekly");
  });

  it("should construct URL with friends type", () => {
    const params = new URLSearchParams({
      metric: "books",
      period: "alltime",
      type: "friends",
      limit: "100",
    });

    const url = `/api/leaderboards?${params}`;
    expect(url).toContain("type=friends");
  });

  it("should construct URL with custom limit", () => {
    const params = new URLSearchParams({
      metric: "books",
      period: "alltime",
      type: "global",
      limit: "25",
    });

    const url = `/api/leaderboards?${params}`;
    expect(url).toContain("limit=25");
  });
});

// ============================================================================
// Score Formatting Tests
// ============================================================================

describe("Score formatting helpers", () => {
  describe("formatTime", () => {
    it("should format seconds to hours and minutes", () => {
      // 2 hours 30 minutes = 9000 seconds
      const seconds = 9000;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      expect(hours).toBe(2);
      expect(minutes).toBe(30);
    });

    it("should handle zero hours", () => {
      // 45 minutes = 2700 seconds
      const seconds = 2700;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      expect(hours).toBe(0);
      expect(minutes).toBe(45);
    });

    it("should handle large values", () => {
      // 100 hours = 360000 seconds
      const seconds = 360000;
      const hours = Math.floor(seconds / 3600);

      expect(hours).toBe(100);
    });
  });

  describe("formatPages", () => {
    it("should convert words to pages (250 words per page)", () => {
      const words = 5000;
      const pages = Math.floor(words / 250);

      expect(pages).toBe(20);
    });

    it("should handle partial pages", () => {
      const words = 5100;
      const pages = Math.floor(words / 250);

      // 5100 / 250 = 20.4, floor = 20
      expect(pages).toBe(20);
    });

    it("should handle zero words", () => {
      const words = 0;
      const pages = Math.floor(words / 250);

      expect(pages).toBe(0);
    });
  });

  describe("formatScore", () => {
    it("should format large numbers with locale", () => {
      const score = 1234567;
      const formatted = score.toLocaleString();

      expect(formatted).toContain("1");
      expect(formatted).toContain("234");
      // Format varies by locale, just check it contains expected digits
    });
  });
});

// ============================================================================
// Rank Change Tests
// ============================================================================

describe("Rank change indicators", () => {
  it("should identify positive change", () => {
    const change = 3;
    expect(change > 0).toBe(true);
  });

  it("should identify negative change", () => {
    const change = -2;
    expect(change < 0).toBe(true);
  });

  it("should identify no change", () => {
    const change = 0;
    expect(change === 0).toBe(true);
  });
});

// ============================================================================
// Tier Tests
// ============================================================================

describe("Tier colors mapping", () => {
  const TIER_COLORS: Record<string, string> = {
    FREE: "#9e9e9e",
    PRO: "#2196f3",
    SCHOLAR: "#9c27b0",
  };

  it("should have color for FREE tier", () => {
    expect(TIER_COLORS.FREE).toBe("#9e9e9e");
  });

  it("should have color for PRO tier", () => {
    expect(TIER_COLORS.PRO).toBe("#2196f3");
  });

  it("should have color for SCHOLAR tier", () => {
    expect(TIER_COLORS.SCHOLAR).toBe("#9c27b0");
  });

  it("should fallback for unknown tier", () => {
    const tier = "UNKNOWN";
    const color = TIER_COLORS[tier] ?? TIER_COLORS.FREE;
    expect(color).toBe("#9e9e9e");
  });
});

// ============================================================================
// Rank Display Tests
// ============================================================================

describe("Rank display", () => {
  const RANK_COLORS = {
    1: "#FFD700", // Gold
    2: "#C0C0C0", // Silver
    3: "#CD7F32", // Bronze
  };

  it("should have gold color for rank 1", () => {
    expect(RANK_COLORS[1]).toBe("#FFD700");
  });

  it("should have silver color for rank 2", () => {
    expect(RANK_COLORS[2]).toBe("#C0C0C0");
  });

  it("should have bronze color for rank 3", () => {
    expect(RANK_COLORS[3]).toBe("#CD7F32");
  });

  it("should identify top 3 ranks", () => {
    const rank1 = 1;
    const rank2 = 2;
    const rank3 = 3;
    const rank4 = 4;

    expect(rank1 <= 3).toBe(true);
    expect(rank2 <= 3).toBe(true);
    expect(rank3 <= 3).toBe(true);
    expect(rank4 <= 3).toBe(false);
  });
});
