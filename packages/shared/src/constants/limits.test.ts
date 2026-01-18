import { describe, it, expect } from "vitest";
import {
  MAX_UPLOAD_SIZE_BYTES,
  FREE_TIER_LIMITS,
  PRO_TIER_LIMITS,
  SCHOLAR_TIER_LIMITS,
  TIER_LIMITS,
  SUBSCRIPTION_PRICING,
  AI_CREDITS_PRICING,
  getTierLimits,
  canPerformAction,
  isWithinLimit,
  getRemainingQuota,
  isTierHigherOrEqual,
  getMinimumTierForAction,
  limitUtils,
  type TierLimits,
  type TierAction,
} from "./limits";

describe("Tier Limits Constants", () => {
  describe("MAX_UPLOAD_SIZE_BYTES", () => {
    it("should be 50MB", () => {
      expect(MAX_UPLOAD_SIZE_BYTES).toBe(50 * 1024 * 1024);
    });

    it("should equal 52428800 bytes", () => {
      expect(MAX_UPLOAD_SIZE_BYTES).toBe(52428800);
    });
  });

  describe("FREE_TIER_LIMITS", () => {
    it("should have 3 max books", () => {
      expect(FREE_TIER_LIMITS.maxBooks).toBe(3);
    });

    it("should have 5 AI interactions per day", () => {
      expect(FREE_TIER_LIMITS.maxAiInteractionsPerDay).toBe(5);
    });

    it("should have 50 max active flashcards", () => {
      expect(FREE_TIER_LIMITS.maxActiveFlashcards).toBe(50);
    });

    it("should have 0 TTS downloads (not available)", () => {
      expect(FREE_TIER_LIMITS.maxTtsDownloadsPerMonth).toBe(0);
    });

    it("should use web_speech TTS provider", () => {
      expect(FREE_TIER_LIMITS.ttsProvider).toBe("web_speech");
    });

    it("should show ads", () => {
      expect(FREE_TIER_LIMITS.showAds).toBe(true);
    });

    it("should not allow creating reading groups", () => {
      expect(FREE_TIER_LIMITS.canCreateReadingGroups).toBe(false);
    });

    it("should not allow creating curriculums", () => {
      expect(FREE_TIER_LIMITS.canCreateCurriculums).toBe(false);
    });

    it("should not have API access", () => {
      expect(FREE_TIER_LIMITS.hasApiAccess).toBe(false);
    });

    it("should have basic AI guide depth", () => {
      expect(FREE_TIER_LIMITS.aiGuideDepth).toBe("basic");
    });
  });

  describe("PRO_TIER_LIMITS", () => {
    it("should have unlimited books", () => {
      expect(PRO_TIER_LIMITS.maxBooks).toBe(Infinity);
    });

    it("should have 100 AI interactions per day", () => {
      expect(PRO_TIER_LIMITS.maxAiInteractionsPerDay).toBe(100);
    });

    it("should have unlimited flashcards", () => {
      expect(PRO_TIER_LIMITS.maxActiveFlashcards).toBe(Infinity);
    });

    it("should have 5 TTS downloads per month", () => {
      expect(PRO_TIER_LIMITS.maxTtsDownloadsPerMonth).toBe(5);
    });

    it("should use openai TTS provider", () => {
      expect(PRO_TIER_LIMITS.ttsProvider).toBe("openai");
    });

    it("should not show ads", () => {
      expect(PRO_TIER_LIMITS.showAds).toBe(false);
    });

    it("should allow creating reading groups", () => {
      expect(PRO_TIER_LIMITS.canCreateReadingGroups).toBe(true);
    });

    it("should allow creating curriculums", () => {
      expect(PRO_TIER_LIMITS.canCreateCurriculums).toBe(true);
    });

    it("should have priority support", () => {
      expect(PRO_TIER_LIMITS.hasPrioritySupport).toBe(true);
    });

    it("should have full AI guide depth", () => {
      expect(PRO_TIER_LIMITS.aiGuideDepth).toBe("full");
    });

    it("should have full analytics", () => {
      expect(PRO_TIER_LIMITS.hasFullAnalytics).toBe(true);
    });
  });

  describe("SCHOLAR_TIER_LIMITS", () => {
    it("should have unlimited books", () => {
      expect(SCHOLAR_TIER_LIMITS.maxBooks).toBe(Infinity);
    });

    it("should have unlimited AI interactions", () => {
      expect(SCHOLAR_TIER_LIMITS.maxAiInteractionsPerDay).toBe(Infinity);
    });

    it("should have unlimited flashcards", () => {
      expect(SCHOLAR_TIER_LIMITS.maxActiveFlashcards).toBe(Infinity);
    });

    it("should have unlimited TTS downloads", () => {
      expect(SCHOLAR_TIER_LIMITS.maxTtsDownloadsPerMonth).toBe(Infinity);
    });

    it("should use elevenlabs TTS provider", () => {
      expect(SCHOLAR_TIER_LIMITS.ttsProvider).toBe("elevenlabs");
    });

    it("should have API access", () => {
      expect(SCHOLAR_TIER_LIMITS.hasApiAccess).toBe(true);
    });

    it("should have early access", () => {
      expect(SCHOLAR_TIER_LIMITS.hasEarlyAccess).toBe(true);
    });

    it("should have academic citations", () => {
      expect(SCHOLAR_TIER_LIMITS.hasAcademicCitations).toBe(true);
    });

    it("should have bulk import", () => {
      expect(SCHOLAR_TIER_LIMITS.hasBulkImport).toBe(true);
    });
  });

  describe("TIER_LIMITS", () => {
    it("should have all three tiers", () => {
      expect(Object.keys(TIER_LIMITS)).toEqual(["FREE", "PRO", "SCHOLAR"]);
    });

    it("should map FREE to FREE_TIER_LIMITS", () => {
      expect(TIER_LIMITS.FREE).toBe(FREE_TIER_LIMITS);
    });

    it("should map PRO to PRO_TIER_LIMITS", () => {
      expect(TIER_LIMITS.PRO).toBe(PRO_TIER_LIMITS);
    });

    it("should map SCHOLAR to SCHOLAR_TIER_LIMITS", () => {
      expect(TIER_LIMITS.SCHOLAR).toBe(SCHOLAR_TIER_LIMITS);
    });
  });

  describe("SUBSCRIPTION_PRICING", () => {
    it("should have PRO monthly price of $9.99", () => {
      expect(SUBSCRIPTION_PRICING.PRO.monthly).toBe(9.99);
    });

    it("should have PRO yearly price of $79.99", () => {
      expect(SUBSCRIPTION_PRICING.PRO.yearly).toBe(79.99);
    });

    it("should have PRO yearly savings of 33%", () => {
      expect(SUBSCRIPTION_PRICING.PRO.yearlySavingsPercent).toBe(33);
    });

    it("should have SCHOLAR monthly price of $19.99", () => {
      expect(SUBSCRIPTION_PRICING.SCHOLAR.monthly).toBe(19.99);
    });

    it("should have SCHOLAR yearly price of $149.99", () => {
      expect(SUBSCRIPTION_PRICING.SCHOLAR.yearly).toBe(149.99);
    });

    it("should have SCHOLAR yearly savings of 37%", () => {
      expect(SUBSCRIPTION_PRICING.SCHOLAR.yearlySavingsPercent).toBe(37);
    });
  });

  describe("AI_CREDITS_PRICING", () => {
    it("should cost $5 per package", () => {
      expect(AI_CREDITS_PRICING.priceUsd).toBe(5);
    });

    it("should include 100 credits per package", () => {
      expect(AI_CREDITS_PRICING.creditsPerPackage).toBe(100);
    });
  });
});

describe("Tier Limits Functions", () => {
  describe("getTierLimits", () => {
    it("should return FREE_TIER_LIMITS for FREE tier", () => {
      expect(getTierLimits("FREE")).toBe(FREE_TIER_LIMITS);
    });

    it("should return PRO_TIER_LIMITS for PRO tier", () => {
      expect(getTierLimits("PRO")).toBe(PRO_TIER_LIMITS);
    });

    it("should return SCHOLAR_TIER_LIMITS for SCHOLAR tier", () => {
      expect(getTierLimits("SCHOLAR")).toBe(SCHOLAR_TIER_LIMITS);
    });
  });

  describe("canPerformAction", () => {
    it("should return false for createReadingGroup on FREE tier", () => {
      expect(canPerformAction("createReadingGroup", "FREE")).toBe(false);
    });

    it("should return true for createReadingGroup on PRO tier", () => {
      expect(canPerformAction("createReadingGroup", "PRO")).toBe(true);
    });

    it("should return true for createReadingGroup on SCHOLAR tier", () => {
      expect(canPerformAction("createReadingGroup", "SCHOLAR")).toBe(true);
    });

    it("should return false for createCurriculum on FREE tier", () => {
      expect(canPerformAction("createCurriculum", "FREE")).toBe(false);
    });

    it("should return true for createCurriculum on PRO tier", () => {
      expect(canPerformAction("createCurriculum", "PRO")).toBe(true);
    });

    it("should return false for downloadTts on FREE tier", () => {
      expect(canPerformAction("downloadTts", "FREE")).toBe(false);
    });

    it("should return true for downloadTts on PRO tier", () => {
      expect(canPerformAction("downloadTts", "PRO")).toBe(true);
    });

    it("should return false for useApiAccess on FREE and PRO tiers", () => {
      expect(canPerformAction("useApiAccess", "FREE")).toBe(false);
      expect(canPerformAction("useApiAccess", "PRO")).toBe(false);
    });

    it("should return true for useApiAccess on SCHOLAR tier", () => {
      expect(canPerformAction("useApiAccess", "SCHOLAR")).toBe(true);
    });

    it("should return true for usePremiumTts on PRO and SCHOLAR", () => {
      expect(canPerformAction("usePremiumTts", "FREE")).toBe(false);
      expect(canPerformAction("usePremiumTts", "PRO")).toBe(true);
      expect(canPerformAction("usePremiumTts", "SCHOLAR")).toBe(true);
    });

    it("should return true for useUnlimitedAi only on SCHOLAR", () => {
      expect(canPerformAction("useUnlimitedAi", "FREE")).toBe(false);
      expect(canPerformAction("useUnlimitedAi", "PRO")).toBe(false);
      expect(canPerformAction("useUnlimitedAi", "SCHOLAR")).toBe(true);
    });

    it("should return false for useBulkImport on FREE and PRO", () => {
      expect(canPerformAction("useBulkImport", "FREE")).toBe(false);
      expect(canPerformAction("useBulkImport", "PRO")).toBe(false);
    });

    it("should return true for useBulkImport on SCHOLAR", () => {
      expect(canPerformAction("useBulkImport", "SCHOLAR")).toBe(true);
    });
  });

  describe("isWithinLimit", () => {
    it("should return true when current is below limit", () => {
      expect(isWithinLimit(2, "FREE", "maxBooks")).toBe(true);
    });

    it("should return false when current equals limit", () => {
      expect(isWithinLimit(3, "FREE", "maxBooks")).toBe(false);
    });

    it("should return false when current exceeds limit", () => {
      expect(isWithinLimit(5, "FREE", "maxBooks")).toBe(false);
    });

    it("should return true for any value when limit is Infinity", () => {
      expect(isWithinLimit(1000, "PRO", "maxBooks")).toBe(true);
      expect(isWithinLimit(999999, "SCHOLAR", "maxAiInteractionsPerDay")).toBe(
        true
      );
    });

    it("should work for AI interactions", () => {
      expect(isWithinLimit(4, "FREE", "maxAiInteractionsPerDay")).toBe(true);
      expect(isWithinLimit(5, "FREE", "maxAiInteractionsPerDay")).toBe(false);
    });

    it("should work for flashcards", () => {
      expect(isWithinLimit(49, "FREE", "maxActiveFlashcards")).toBe(true);
      expect(isWithinLimit(50, "FREE", "maxActiveFlashcards")).toBe(false);
    });

    it("should work for TTS downloads", () => {
      expect(isWithinLimit(4, "PRO", "maxTtsDownloadsPerMonth")).toBe(true);
      expect(isWithinLimit(5, "PRO", "maxTtsDownloadsPerMonth")).toBe(false);
    });
  });

  describe("getRemainingQuota", () => {
    it("should return remaining quota for limited resources", () => {
      expect(getRemainingQuota(1, "FREE", "maxBooks")).toBe(2);
    });

    it("should return 0 when at limit", () => {
      expect(getRemainingQuota(3, "FREE", "maxBooks")).toBe(0);
    });

    it("should return 0 when over limit", () => {
      expect(getRemainingQuota(10, "FREE", "maxBooks")).toBe(0);
    });

    it("should return Infinity for unlimited resources", () => {
      expect(getRemainingQuota(1000, "PRO", "maxBooks")).toBe(Infinity);
    });

    it("should calculate correctly for AI interactions", () => {
      expect(getRemainingQuota(3, "FREE", "maxAiInteractionsPerDay")).toBe(2);
    });
  });

  describe("isTierHigherOrEqual", () => {
    it("should return true for same tier", () => {
      expect(isTierHigherOrEqual("FREE", "FREE")).toBe(true);
      expect(isTierHigherOrEqual("PRO", "PRO")).toBe(true);
      expect(isTierHigherOrEqual("SCHOLAR", "SCHOLAR")).toBe(true);
    });

    it("should return true for higher tier", () => {
      expect(isTierHigherOrEqual("PRO", "FREE")).toBe(true);
      expect(isTierHigherOrEqual("SCHOLAR", "FREE")).toBe(true);
      expect(isTierHigherOrEqual("SCHOLAR", "PRO")).toBe(true);
    });

    it("should return false for lower tier", () => {
      expect(isTierHigherOrEqual("FREE", "PRO")).toBe(false);
      expect(isTierHigherOrEqual("FREE", "SCHOLAR")).toBe(false);
      expect(isTierHigherOrEqual("PRO", "SCHOLAR")).toBe(false);
    });
  });

  describe("getMinimumTierForAction", () => {
    it("should return PRO for createReadingGroup", () => {
      expect(getMinimumTierForAction("createReadingGroup")).toBe("PRO");
    });

    it("should return PRO for createCurriculum", () => {
      expect(getMinimumTierForAction("createCurriculum")).toBe("PRO");
    });

    it("should return PRO for downloadTts", () => {
      expect(getMinimumTierForAction("downloadTts")).toBe("PRO");
    });

    it("should return SCHOLAR for useApiAccess", () => {
      expect(getMinimumTierForAction("useApiAccess")).toBe("SCHOLAR");
    });

    it("should return SCHOLAR for useBulkImport", () => {
      expect(getMinimumTierForAction("useBulkImport")).toBe("SCHOLAR");
    });

    it("should return SCHOLAR for useUnlimitedAi", () => {
      expect(getMinimumTierForAction("useUnlimitedAi")).toBe("SCHOLAR");
    });

    it("should return PRO for usePremiumTts", () => {
      expect(getMinimumTierForAction("usePremiumTts")).toBe("PRO");
    });
  });
});

describe("limitUtils", () => {
  it("should export all utility functions", () => {
    expect(limitUtils.getTierLimits).toBe(getTierLimits);
    expect(limitUtils.canPerformAction).toBe(canPerformAction);
    expect(limitUtils.isWithinLimit).toBe(isWithinLimit);
    expect(limitUtils.getRemainingQuota).toBe(getRemainingQuota);
    expect(limitUtils.isTierHigherOrEqual).toBe(isTierHigherOrEqual);
    expect(limitUtils.getMinimumTierForAction).toBe(getMinimumTierForAction);
  });
});

describe("Type exports", () => {
  it("should have TierLimits type with correct structure", () => {
    const limits: TierLimits = {
      maxBooks: 3,
      maxAiInteractionsPerDay: 5,
      maxActiveFlashcards: 50,
      maxTtsDownloadsPerMonth: 0,
      ttsProvider: "web_speech",
      showAds: true,
      canCreateReadingGroups: false,
      canCreateCurriculums: false,
      hasApiAccess: false,
      hasPrioritySupport: false,
      hasEarlyAccess: false,
      hasFullAnalytics: false,
      hasAcademicCitations: false,
      hasBulkImport: false,
      aiGuideDepth: "basic",
      maxUploadSize: 52428800,
    };
    expect(limits).toBeDefined();
  });

  it("should have TierAction type covering all actions", () => {
    const actions: TierAction[] = [
      "createReadingGroup",
      "createCurriculum",
      "downloadTts",
      "useApiAccess",
      "useBulkImport",
      "useAcademicCitations",
      "useFullAnalytics",
      "usePremiumTts",
      "useUnlimitedAi",
    ];
    expect(actions.length).toBe(9);
  });
});
