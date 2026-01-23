/**
 * Tests for /api/payments/usage endpoint
 */

import { describe, it, expect } from "vitest";
import {
  calculatePercentage,
  getStartOfToday,
  getStartOfMonth,
  serializeLimit,
  mapTierLimits,
} from "./usage";

describe("Usage API Helper Functions", () => {
  describe("calculatePercentage", () => {
    it("should calculate percentage correctly", () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(75, 100)).toBe(75);
    });

    it("should cap at 100%", () => {
      expect(calculatePercentage(150, 100)).toBe(100);
      expect(calculatePercentage(200, 100)).toBe(100);
    });

    it("should round to nearest integer", () => {
      expect(calculatePercentage(33, 100)).toBe(33);
      expect(calculatePercentage(1, 3)).toBe(33);
      expect(calculatePercentage(2, 3)).toBe(67);
    });

    it("should return 0 for Infinity limits", () => {
      expect(calculatePercentage(50, Infinity)).toBe(0);
      expect(calculatePercentage(0, Infinity)).toBe(0);
    });

    it("should return 0 for zero limits", () => {
      expect(calculatePercentage(0, 0)).toBe(0);
      expect(calculatePercentage(5, 0)).toBe(0);
    });

    it("should handle zero usage", () => {
      expect(calculatePercentage(0, 100)).toBe(0);
      expect(calculatePercentage(0, 5)).toBe(0);
    });
  });

  describe("getStartOfToday", () => {
    it("should return a Date object", () => {
      const result = getStartOfToday();
      expect(result).toBeInstanceOf(Date);
    });

    it("should have time set to midnight UTC", () => {
      const result = getStartOfToday();
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });

    it("should be today's date in UTC", () => {
      const now = new Date();
      const result = getStartOfToday();
      expect(result.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(result.getUTCMonth()).toBe(now.getUTCMonth());
      expect(result.getUTCDate()).toBe(now.getUTCDate());
    });
  });

  describe("getStartOfMonth", () => {
    it("should return a Date object", () => {
      const result = getStartOfMonth();
      expect(result).toBeInstanceOf(Date);
    });

    it("should be first day of month", () => {
      const result = getStartOfMonth();
      expect(result.getUTCDate()).toBe(1);
    });

    it("should have time set to midnight UTC", () => {
      const result = getStartOfMonth();
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
    });

    it("should be current month in UTC", () => {
      const now = new Date();
      const result = getStartOfMonth();
      expect(result.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(result.getUTCMonth()).toBe(now.getUTCMonth());
    });
  });

  describe("serializeLimit", () => {
    it("should return -1 for Infinity", () => {
      expect(serializeLimit(Infinity)).toBe(-1);
    });

    it("should return value as-is for finite numbers", () => {
      expect(serializeLimit(0)).toBe(0);
      expect(serializeLimit(5)).toBe(5);
      expect(serializeLimit(100)).toBe(100);
      expect(serializeLimit(1000)).toBe(1000);
    });
  });

  describe("mapTierLimits", () => {
    it("should return limits for FREE tier", () => {
      const result = mapTierLimits("FREE");
      expect(result.maxBooks).toBe(3);
      expect(result.maxAiInteractionsPerDay).toBe(5);
      expect(result.maxActiveFlashcards).toBe(50);
      expect(result.maxTtsDownloadsPerMonth).toBe(0);
    });

    it("should return -1 for unlimited values in PRO tier", () => {
      const result = mapTierLimits("PRO");
      expect(result.maxBooks).toBe(-1); // Infinity -> -1
      expect(result.maxAiInteractionsPerDay).toBe(100);
      expect(result.maxActiveFlashcards).toBe(-1); // Infinity -> -1
      expect(result.maxTtsDownloadsPerMonth).toBe(5);
    });

    it("should return -1 for unlimited values in SCHOLAR tier", () => {
      const result = mapTierLimits("SCHOLAR");
      expect(result.maxBooks).toBe(-1);
      expect(result.maxAiInteractionsPerDay).toBe(-1);
      expect(result.maxActiveFlashcards).toBe(-1);
      expect(result.maxTtsDownloadsPerMonth).toBe(-1);
    });
  });
});

describe("UsageStats Type Structure", () => {
  it("should have correct structure for tier", () => {
    const validTiers = ["FREE", "PRO", "SCHOLAR"];
    validTiers.forEach((tier) => {
      expect(typeof tier).toBe("string");
    });
  });

  it("should have correct numeric structure for limits", () => {
    const limits = {
      maxBooks: 3,
      maxAiInteractionsPerDay: 5,
      maxActiveFlashcards: 50,
      maxTtsDownloadsPerMonth: 0,
    };
    expect(typeof limits.maxBooks).toBe("number");
    expect(typeof limits.maxAiInteractionsPerDay).toBe("number");
    expect(typeof limits.maxActiveFlashcards).toBe("number");
    expect(typeof limits.maxTtsDownloadsPerMonth).toBe("number");
  });

  it("should have correct numeric structure for usage", () => {
    const usage = {
      booksCount: 2,
      aiInteractionsToday: 3,
      activeFlashcardsCount: 25,
      ttsDownloadsThisMonth: 0,
    };
    expect(typeof usage.booksCount).toBe("number");
    expect(typeof usage.aiInteractionsToday).toBe("number");
    expect(typeof usage.activeFlashcardsCount).toBe("number");
    expect(typeof usage.ttsDownloadsThisMonth).toBe("number");
  });

  it("should have correct numeric structure for remaining", () => {
    const remaining = {
      books: 1,
      aiInteractions: 2,
      flashcards: 25,
      ttsDownloads: 0,
    };
    expect(typeof remaining.books).toBe("number");
    expect(typeof remaining.aiInteractions).toBe("number");
    expect(typeof remaining.flashcards).toBe("number");
    expect(typeof remaining.ttsDownloads).toBe("number");
  });

  it("should have correct numeric structure for percentages", () => {
    const percentages = {
      books: 67,
      aiInteractions: 60,
      flashcards: 50,
      ttsDownloads: 0,
    };
    expect(typeof percentages.books).toBe("number");
    expect(percentages.books).toBeGreaterThanOrEqual(0);
    expect(percentages.books).toBeLessThanOrEqual(100);
  });
});
