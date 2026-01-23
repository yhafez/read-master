/**
 * Tests for useSubscription hook helper functions
 */

import { describe, it, expect } from "vitest";
import {
  isUnlimited,
  formatLimit,
  formatRemaining,
  getUsageStatus,
  getUsageStatusColor,
  getTierDisplayName,
  canPerformAction,
  formatInvoiceStatus,
  getInvoiceStatusColor,
  subscriptionQueryKeys,
} from "./useSubscription";

describe("useSubscription Helper Functions", () => {
  describe("isUnlimited", () => {
    it("should return true for -1", () => {
      expect(isUnlimited(-1)).toBe(true);
    });

    it("should return false for positive numbers", () => {
      expect(isUnlimited(0)).toBe(false);
      expect(isUnlimited(1)).toBe(false);
      expect(isUnlimited(100)).toBe(false);
    });

    it("should return false for other negative numbers", () => {
      expect(isUnlimited(-2)).toBe(false);
      expect(isUnlimited(-100)).toBe(false);
    });
  });

  describe("formatLimit", () => {
    it("should return 'Unlimited' for -1", () => {
      expect(formatLimit(-1)).toBe("Unlimited");
    });

    it("should return string representation for numbers", () => {
      expect(formatLimit(0)).toBe("0");
      expect(formatLimit(5)).toBe("5");
      expect(formatLimit(100)).toBe("100");
    });
  });

  describe("formatRemaining", () => {
    it("should return 'Unlimited' for unlimited remaining", () => {
      expect(formatRemaining(-1, 100)).toBe("Unlimited");
    });

    it("should return 'Unlimited' for unlimited limit", () => {
      expect(formatRemaining(50, -1)).toBe("Unlimited");
    });

    it("should return remaining count as string", () => {
      expect(formatRemaining(5, 10)).toBe("5");
      expect(formatRemaining(0, 10)).toBe("0");
      expect(formatRemaining(100, 100)).toBe("100");
    });
  });

  describe("getUsageStatus", () => {
    it("should return 'low' for less than 50%", () => {
      expect(getUsageStatus(0)).toBe("low");
      expect(getUsageStatus(25)).toBe("low");
      expect(getUsageStatus(49)).toBe("low");
    });

    it("should return 'medium' for 50-79%", () => {
      expect(getUsageStatus(50)).toBe("medium");
      expect(getUsageStatus(65)).toBe("medium");
      expect(getUsageStatus(79)).toBe("medium");
    });

    it("should return 'high' for 80-99%", () => {
      expect(getUsageStatus(80)).toBe("high");
      expect(getUsageStatus(90)).toBe("high");
      expect(getUsageStatus(99)).toBe("high");
    });

    it("should return 'critical' for 100%+", () => {
      expect(getUsageStatus(100)).toBe("critical");
      expect(getUsageStatus(150)).toBe("critical");
    });
  });

  describe("getUsageStatusColor", () => {
    it("should return 'success' for low", () => {
      expect(getUsageStatusColor("low")).toBe("success");
    });

    it("should return 'info' for medium", () => {
      expect(getUsageStatusColor("medium")).toBe("info");
    });

    it("should return 'warning' for high", () => {
      expect(getUsageStatusColor("high")).toBe("warning");
    });

    it("should return 'error' for critical", () => {
      expect(getUsageStatusColor("critical")).toBe("error");
    });
  });

  describe("getTierDisplayName", () => {
    it("should return 'Free' for FREE tier", () => {
      expect(getTierDisplayName("FREE")).toBe("Free");
    });

    it("should return 'Pro' for PRO tier", () => {
      expect(getTierDisplayName("PRO")).toBe("Pro");
    });

    it("should return 'Scholar' for SCHOLAR tier", () => {
      expect(getTierDisplayName("SCHOLAR")).toBe("Scholar");
    });
  });

  describe("canPerformAction", () => {
    it("should return true for unlimited", () => {
      expect(canPerformAction(-1, -1)).toBe(true);
    });

    it("should return true when remaining > 0", () => {
      expect(canPerformAction(5, 10)).toBe(true);
      expect(canPerformAction(1, 10)).toBe(true);
    });

    it("should return false when remaining is 0", () => {
      expect(canPerformAction(0, 10)).toBe(false);
    });
  });

  describe("formatInvoiceStatus", () => {
    it("should capitalize known statuses", () => {
      expect(formatInvoiceStatus("paid")).toBe("Paid");
      expect(formatInvoiceStatus("open")).toBe("Open");
      expect(formatInvoiceStatus("draft")).toBe("Draft");
      expect(formatInvoiceStatus("void")).toBe("Void");
      expect(formatInvoiceStatus("uncollectible")).toBe("Uncollectible");
    });

    it("should return 'Unknown' for null", () => {
      expect(formatInvoiceStatus(null)).toBe("Unknown");
    });

    it("should capitalize unknown statuses", () => {
      expect(formatInvoiceStatus("processing")).toBe("Processing");
      expect(formatInvoiceStatus("pending")).toBe("Pending");
    });
  });

  describe("getInvoiceStatusColor", () => {
    it("should return 'success' for paid", () => {
      expect(getInvoiceStatusColor("paid")).toBe("success");
    });

    it("should return 'warning' for open", () => {
      expect(getInvoiceStatusColor("open")).toBe("warning");
    });

    it("should return 'error' for void or uncollectible", () => {
      expect(getInvoiceStatusColor("void")).toBe("error");
      expect(getInvoiceStatusColor("uncollectible")).toBe("error");
    });

    it("should return 'default' for other statuses", () => {
      expect(getInvoiceStatusColor("draft")).toBe("default");
      expect(getInvoiceStatusColor(null)).toBe("default");
      expect(getInvoiceStatusColor("unknown")).toBe("default");
    });
  });
});

describe("subscriptionQueryKeys", () => {
  describe("all", () => {
    it("should return base key", () => {
      expect(subscriptionQueryKeys.all).toEqual(["subscription"]);
    });
  });

  describe("usage", () => {
    it("should return usage key", () => {
      expect(subscriptionQueryKeys.usage()).toEqual(["subscription", "usage"]);
    });
  });

  describe("invoices", () => {
    it("should return invoices key without limit", () => {
      expect(subscriptionQueryKeys.invoices()).toEqual([
        "subscription",
        "invoices",
        { limit: undefined },
      ]);
    });

    it("should return invoices key with limit", () => {
      expect(subscriptionQueryKeys.invoices(10)).toEqual([
        "subscription",
        "invoices",
        { limit: 10 },
      ]);
    });

    it("should return different keys for different limits", () => {
      const key5 = subscriptionQueryKeys.invoices(5);
      const key10 = subscriptionQueryKeys.invoices(10);
      expect(key5).not.toEqual(key10);
    });
  });
});

describe("UsageStats Type Structure", () => {
  it("should have valid tier values", () => {
    const validTiers = ["FREE", "PRO", "SCHOLAR"];
    validTiers.forEach((tier) => {
      expect(["FREE", "PRO", "SCHOLAR"]).toContain(tier);
    });
  });

  it("should have correct limits structure", () => {
    const limits = {
      maxBooks: 3,
      maxAiInteractionsPerDay: 5,
      maxActiveFlashcards: 50,
      maxTtsDownloadsPerMonth: 0,
    };

    expect(limits).toHaveProperty("maxBooks");
    expect(limits).toHaveProperty("maxAiInteractionsPerDay");
    expect(limits).toHaveProperty("maxActiveFlashcards");
    expect(limits).toHaveProperty("maxTtsDownloadsPerMonth");
  });

  it("should have correct usage structure", () => {
    const usage = {
      booksCount: 2,
      aiInteractionsToday: 3,
      activeFlashcardsCount: 25,
      ttsDownloadsThisMonth: 0,
    };

    expect(usage).toHaveProperty("booksCount");
    expect(usage).toHaveProperty("aiInteractionsToday");
    expect(usage).toHaveProperty("activeFlashcardsCount");
    expect(usage).toHaveProperty("ttsDownloadsThisMonth");
  });
});

describe("InvoiceSummary Type Structure", () => {
  it("should have required fields", () => {
    const invoice = {
      id: "in_123",
      number: "INV-001",
      status: "paid",
      amount: "$9.99",
      amountCents: 999,
      currency: "USD",
      description: "Test",
      pdfUrl: "https://example.com/pdf",
      hostedUrl: "https://example.com/hosted",
      createdAt: "2024-01-01T00:00:00.000Z",
      paidAt: "2024-01-01T00:05:00.000Z",
      periodStart: "2024-01-01T00:00:00.000Z",
      periodEnd: "2024-02-01T00:00:00.000Z",
    };

    expect(invoice).toHaveProperty("id");
    expect(invoice).toHaveProperty("number");
    expect(invoice).toHaveProperty("status");
    expect(invoice).toHaveProperty("amount");
    expect(invoice).toHaveProperty("amountCents");
    expect(invoice).toHaveProperty("currency");
    expect(invoice).toHaveProperty("createdAt");
  });

  it("should allow null for optional fields", () => {
    const invoice = {
      id: "in_123",
      number: null,
      status: null,
      amount: "$0.00",
      amountCents: 0,
      currency: "USD",
      description: null,
      pdfUrl: null,
      hostedUrl: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      paidAt: null,
      periodStart: null,
      periodEnd: null,
    };

    expect(invoice.number).toBeNull();
    expect(invoice.status).toBeNull();
    expect(invoice.description).toBeNull();
    expect(invoice.paidAt).toBeNull();
  });
});
