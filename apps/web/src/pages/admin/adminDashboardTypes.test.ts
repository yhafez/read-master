/**
 * Tests for Admin Dashboard Types and Utilities
 */

import { describe, it, expect } from "vitest";

import {
  formatCurrency,
  formatLargeNumber,
  formatPercentage,
  formatStickiness,
  TIER_PRICES,
  AUTO_REFRESH_INTERVAL,
} from "./adminDashboardTypes";
import type {
  OverviewStats,
  MetricType,
  MetricCardConfig,
} from "./adminDashboardTypes";

describe("adminDashboardTypes", () => {
  describe("formatCurrency", () => {
    it("should format cents to dollars with no decimals", () => {
      expect(formatCurrency(100)).toBe("$1");
      expect(formatCurrency(999)).toBe("$10");
      expect(formatCurrency(1000)).toBe("$10");
    });

    it("should format large amounts correctly", () => {
      expect(formatCurrency(10000)).toBe("$100");
      expect(formatCurrency(100000)).toBe("$1,000");
      expect(formatCurrency(1000000)).toBe("$10,000");
    });

    it("should handle zero", () => {
      expect(formatCurrency(0)).toBe("$0");
    });

    it("should round down small amounts", () => {
      expect(formatCurrency(50)).toBe("$1");
    });

    it("should format MRR amounts correctly", () => {
      // $45,237.00
      expect(formatCurrency(4523700)).toBe("$45,237");
    });
  });

  describe("formatLargeNumber", () => {
    it("should format numbers under 1000 with locale string", () => {
      expect(formatLargeNumber(0)).toBe("0");
      expect(formatLargeNumber(100)).toBe("100");
      expect(formatLargeNumber(999)).toBe("999");
    });

    it("should format thousands with K suffix", () => {
      expect(formatLargeNumber(1000)).toBe("1.0K");
      expect(formatLargeNumber(1500)).toBe("1.5K");
      expect(formatLargeNumber(12847)).toBe("12.8K");
      expect(formatLargeNumber(999999)).toBe("1000.0K");
    });

    it("should format millions with M suffix", () => {
      expect(formatLargeNumber(1000000)).toBe("1.0M");
      expect(formatLargeNumber(1500000)).toBe("1.5M");
      expect(formatLargeNumber(12847000)).toBe("12.8M");
    });
  });

  describe("formatPercentage", () => {
    it("should format positive percentages with sign", () => {
      expect(formatPercentage(12.5, true)).toBe("+12.5%");
      expect(formatPercentage(8.3, true)).toBe("+8.3%");
      expect(formatPercentage(100, true)).toBe("+100.0%");
    });

    it("should format negative percentages with sign", () => {
      expect(formatPercentage(-12.5, true)).toBe("-12.5%");
      expect(formatPercentage(-8.3, true)).toBe("-8.3%");
    });

    it("should format zero without sign", () => {
      expect(formatPercentage(0, true)).toBe("0.0%");
      expect(formatPercentage(0, false)).toBe("0.0%");
    });

    it("should format without sign when includeSign is false", () => {
      expect(formatPercentage(12.5, false)).toBe("12.5%");
      expect(formatPercentage(-12.5, false)).toBe("12.5%");
    });

    it("should handle small percentages", () => {
      expect(formatPercentage(0.1, true)).toBe("+0.1%");
      expect(formatPercentage(0.05, true)).toBe("+0.1%");
    });
  });

  describe("formatStickiness", () => {
    it("should format stickiness ratio as percentage", () => {
      expect(formatStickiness(0.141)).toBe("14.1%");
      expect(formatStickiness(0.5)).toBe("50.0%");
      expect(formatStickiness(1)).toBe("100.0%");
    });

    it("should handle zero", () => {
      expect(formatStickiness(0)).toBe("0.0%");
    });

    it("should handle small values", () => {
      expect(formatStickiness(0.01)).toBe("1.0%");
      expect(formatStickiness(0.001)).toBe("0.1%");
    });
  });

  describe("Constants", () => {
    it("should have correct tier prices", () => {
      expect(TIER_PRICES.PRO_CENTS).toBe(999);
      expect(TIER_PRICES.SCHOLAR_CENTS).toBe(1999);
    });

    it("should have correct auto-refresh interval", () => {
      expect(AUTO_REFRESH_INTERVAL).toBe(60000);
    });
  });

  describe("Type definitions", () => {
    it("should allow valid OverviewStats", () => {
      const stats: OverviewStats = {
        users: {
          total: 12847,
          active: 3421,
          newLast30Days: 856,
          growth: {
            percentChange: 12.5,
            netNew: 856,
          },
        },
        revenue: {
          mrrCents: 4523700,
          arrCents: 54284400,
          growthPercent: 8.3,
        },
        engagement: {
          dau: 1234,
          mau: 8765,
          stickiness: 0.141,
        },
        aiCosts: {
          totalCostCents: 234567,
          projectedMonthlyCents: 312500,
        },
      };

      expect(stats.users.total).toBe(12847);
      expect(stats.revenue.mrrCents).toBe(4523700);
      expect(stats.engagement.stickiness).toBe(0.141);
      expect(stats.aiCosts.totalCostCents).toBe(234567);
    });

    it("should allow valid MetricType values", () => {
      const types: MetricType[] = [
        "number",
        "currency",
        "percentage",
        "trend",
        "ratio",
      ];

      expect(types).toHaveLength(5);
      expect(types).toContain("number");
      expect(types).toContain("currency");
      expect(types).toContain("percentage");
      expect(types).toContain("trend");
      expect(types).toContain("ratio");
    });

    it("should allow valid MetricCardConfig", () => {
      const config: MetricCardConfig = {
        id: "total-users",
        label: "Total Users",
        value: 12847,
        type: "number",
        color: "primary",
        subtitle: "Registered",
        trend: {
          value: 12.5,
          isPositive: true,
        },
      };

      expect(config.id).toBe("total-users");
      expect(config.type).toBe("number");
      expect(config.trend?.value).toBe(12.5);
    });

    it("should allow MetricCardConfig without optional fields", () => {
      const config: MetricCardConfig = {
        id: "simple",
        label: "Simple Metric",
        value: 100,
        type: "number",
      };

      expect(config.subtitle).toBeUndefined();
      expect(config.trend).toBeUndefined();
      expect(config.color).toBeUndefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle very large numbers", () => {
      expect(formatLargeNumber(1000000000)).toBe("1000.0M");
      expect(formatCurrency(100000000000)).toBe("$1,000,000,000");
    });

    it("should handle decimal values in formatLargeNumber", () => {
      expect(formatLargeNumber(1234.56)).toBe("1.2K");
      expect(formatLargeNumber(1234567.89)).toBe("1.2M");
    });

    it("should handle negative values", () => {
      expect(formatPercentage(-50, true)).toBe("-50.0%");
      // Note: formatCurrency and formatLargeNumber don't explicitly handle negative values
      // as metrics are expected to be positive
    });
  });
});
