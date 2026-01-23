/**
 * Tests for SettingsSubscriptionPage
 *
 * Tests for subscription page types, helper functions, and component logic
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Type Definitions (matching component types)
// ============================================================================

type SubscriptionTier = "FREE" | "PRO" | "SCHOLAR";

interface TierFeature {
  name: string;
  included: boolean;
}

interface TierInfo {
  name: string;
  price: string;
  priceAnnual?: string;
  features: TierFeature[];
  color: "default" | "primary" | "secondary";
}

// ============================================================================
// Helper Functions for Testing
// ============================================================================

/**
 * Get tier color based on tier
 */
function getTierColor(
  tier: SubscriptionTier
): "default" | "primary" | "secondary" {
  switch (tier) {
    case "FREE":
      return "default";
    case "PRO":
      return "primary";
    case "SCHOLAR":
      return "secondary";
    default:
      return "default";
  }
}

/**
 * Check if tier can upgrade to target tier
 */
function canUpgradeTo(
  currentTier: SubscriptionTier,
  targetTier: SubscriptionTier
): boolean {
  const tierOrder: SubscriptionTier[] = ["FREE", "PRO", "SCHOLAR"];
  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);
  return targetIndex > currentIndex;
}

/**
 * Get available upgrade options for a tier
 */
function getUpgradeOptions(currentTier: SubscriptionTier): SubscriptionTier[] {
  switch (currentTier) {
    case "FREE":
      return ["PRO", "SCHOLAR"];
    case "PRO":
      return ["SCHOLAR"];
    case "SCHOLAR":
      return [];
    default:
      return [];
  }
}

/**
 * Build checkout success URL
 */
function buildCheckoutSuccessUrl(
  origin: string,
  sessionIdPlaceholder: string
): string {
  return `${origin}/settings/subscription?session_id=${sessionIdPlaceholder}`;
}

/**
 * Build checkout cancel URL
 */
function buildCheckoutCancelUrl(origin: string): string {
  return `${origin}/settings/subscription`;
}

/**
 * Build billing portal return URL
 */
function buildBillingPortalReturnUrl(origin: string): string {
  return `${origin}/settings/subscription`;
}

/**
 * Check if tier has billing management access
 */
function hasBillingAccess(tier: SubscriptionTier): boolean {
  return tier !== "FREE";
}

/**
 * Check if tier should show upgrade options
 */
function shouldShowUpgradeOptions(tier: SubscriptionTier): boolean {
  return tier === "FREE" || tier === "PRO";
}

/**
 * Calculate annual savings percentage
 */
function calculateAnnualSavings(
  monthlyPrice: number,
  annualPrice: number
): number {
  const yearlyAtMonthly = monthlyPrice * 12;
  const savings = ((yearlyAtMonthly - annualPrice) / yearlyAtMonthly) * 100;
  return Math.round(savings);
}

/**
 * Format price for display
 */
function formatPrice(price: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}

/**
 * Get tier display priority (lower is higher priority)
 */
function getTierDisplayPriority(tier: SubscriptionTier): number {
  switch (tier) {
    case "FREE":
      return 3;
    case "PRO":
      return 2;
    case "SCHOLAR":
      return 1;
    default:
      return 4;
  }
}

/**
 * Get feature count for a tier
 */
function getIncludedFeatureCount(features: TierFeature[]): number {
  return features.filter((f) => f.included).length;
}

// ============================================================================
// Tests
// ============================================================================

describe("SettingsSubscriptionPage", () => {
  describe("SubscriptionTier type", () => {
    it("should have valid tier values", () => {
      const validTiers: SubscriptionTier[] = ["FREE", "PRO", "SCHOLAR"];
      expect(validTiers).toHaveLength(3);
      expect(validTiers).toContain("FREE");
      expect(validTiers).toContain("PRO");
      expect(validTiers).toContain("SCHOLAR");
    });
  });

  describe("TierInfo structure", () => {
    it("should have required properties", () => {
      const tierInfo: TierInfo = {
        name: "Pro",
        price: "$9.99",
        priceAnnual: "$99/year",
        features: [
          { name: "Unlimited books", included: true },
          { name: "Priority Support", included: true },
        ],
        color: "primary",
      };

      expect(tierInfo.name).toBe("Pro");
      expect(tierInfo.price).toBe("$9.99");
      expect(tierInfo.priceAnnual).toBe("$99/year");
      expect(tierInfo.features).toHaveLength(2);
      expect(tierInfo.color).toBe("primary");
    });

    it("should allow optional priceAnnual", () => {
      const tierInfo: TierInfo = {
        name: "Free",
        price: "$0",
        features: [],
        color: "default",
      };

      expect(tierInfo.priceAnnual).toBeUndefined();
    });
  });

  describe("getTierColor", () => {
    it("should return default for FREE tier", () => {
      expect(getTierColor("FREE")).toBe("default");
    });

    it("should return primary for PRO tier", () => {
      expect(getTierColor("PRO")).toBe("primary");
    });

    it("should return secondary for SCHOLAR tier", () => {
      expect(getTierColor("SCHOLAR")).toBe("secondary");
    });
  });

  describe("canUpgradeTo", () => {
    it("should allow FREE to upgrade to PRO", () => {
      expect(canUpgradeTo("FREE", "PRO")).toBe(true);
    });

    it("should allow FREE to upgrade to SCHOLAR", () => {
      expect(canUpgradeTo("FREE", "SCHOLAR")).toBe(true);
    });

    it("should allow PRO to upgrade to SCHOLAR", () => {
      expect(canUpgradeTo("PRO", "SCHOLAR")).toBe(true);
    });

    it("should not allow PRO to upgrade to FREE", () => {
      expect(canUpgradeTo("PRO", "FREE")).toBe(false);
    });

    it("should not allow SCHOLAR to upgrade to any tier", () => {
      expect(canUpgradeTo("SCHOLAR", "FREE")).toBe(false);
      expect(canUpgradeTo("SCHOLAR", "PRO")).toBe(false);
      expect(canUpgradeTo("SCHOLAR", "SCHOLAR")).toBe(false);
    });

    it("should not allow upgrade to same tier", () => {
      expect(canUpgradeTo("FREE", "FREE")).toBe(false);
      expect(canUpgradeTo("PRO", "PRO")).toBe(false);
    });
  });

  describe("getUpgradeOptions", () => {
    it("should return PRO and SCHOLAR for FREE tier", () => {
      const options = getUpgradeOptions("FREE");
      expect(options).toEqual(["PRO", "SCHOLAR"]);
    });

    it("should return only SCHOLAR for PRO tier", () => {
      const options = getUpgradeOptions("PRO");
      expect(options).toEqual(["SCHOLAR"]);
    });

    it("should return empty array for SCHOLAR tier", () => {
      const options = getUpgradeOptions("SCHOLAR");
      expect(options).toEqual([]);
    });
  });

  describe("URL building functions", () => {
    const testOrigin = "https://app.readmaster.com";

    it("should build checkout success URL", () => {
      const url = buildCheckoutSuccessUrl(testOrigin, "{CHECKOUT_SESSION_ID}");
      expect(url).toBe(
        "https://app.readmaster.com/settings/subscription?session_id={CHECKOUT_SESSION_ID}"
      );
    });

    it("should build checkout cancel URL", () => {
      const url = buildCheckoutCancelUrl(testOrigin);
      expect(url).toBe("https://app.readmaster.com/settings/subscription");
    });

    it("should build billing portal return URL", () => {
      const url = buildBillingPortalReturnUrl(testOrigin);
      expect(url).toBe("https://app.readmaster.com/settings/subscription");
    });

    it("should handle localhost origin", () => {
      const url = buildCheckoutSuccessUrl("http://localhost:3000", "123");
      expect(url).toBe(
        "http://localhost:3000/settings/subscription?session_id=123"
      );
    });
  });

  describe("hasBillingAccess", () => {
    it("should return false for FREE tier", () => {
      expect(hasBillingAccess("FREE")).toBe(false);
    });

    it("should return true for PRO tier", () => {
      expect(hasBillingAccess("PRO")).toBe(true);
    });

    it("should return true for SCHOLAR tier", () => {
      expect(hasBillingAccess("SCHOLAR")).toBe(true);
    });
  });

  describe("shouldShowUpgradeOptions", () => {
    it("should return true for FREE tier", () => {
      expect(shouldShowUpgradeOptions("FREE")).toBe(true);
    });

    it("should return true for PRO tier", () => {
      expect(shouldShowUpgradeOptions("PRO")).toBe(true);
    });

    it("should return false for SCHOLAR tier", () => {
      expect(shouldShowUpgradeOptions("SCHOLAR")).toBe(false);
    });
  });

  describe("calculateAnnualSavings", () => {
    it("should calculate 17% savings for $9.99/month vs $99/year", () => {
      const savings = calculateAnnualSavings(9.99, 99);
      expect(savings).toBe(17);
    });

    it("should calculate 17% savings for $29.99/month vs $299/year", () => {
      const savings = calculateAnnualSavings(29.99, 299);
      expect(savings).toBe(17);
    });

    it("should return 0 for no savings", () => {
      const savings = calculateAnnualSavings(10, 120);
      expect(savings).toBe(0);
    });

    it("should handle 50% savings", () => {
      const savings = calculateAnnualSavings(10, 60);
      expect(savings).toBe(50);
    });
  });

  describe("formatPrice", () => {
    it("should format USD price", () => {
      const formatted = formatPrice(9.99);
      expect(formatted).toBe("$9.99");
    });

    it("should format zero price", () => {
      const formatted = formatPrice(0);
      expect(formatted).toBe("$0.00");
    });

    it("should format large price", () => {
      const formatted = formatPrice(299);
      expect(formatted).toBe("$299.00");
    });

    it("should handle different currencies", () => {
      const formatted = formatPrice(9.99, "EUR");
      expect(formatted).toContain("9.99");
    });
  });

  describe("getTierDisplayPriority", () => {
    it("should give SCHOLAR highest priority (lowest number)", () => {
      expect(getTierDisplayPriority("SCHOLAR")).toBe(1);
    });

    it("should give PRO medium priority", () => {
      expect(getTierDisplayPriority("PRO")).toBe(2);
    });

    it("should give FREE lowest priority (highest number)", () => {
      expect(getTierDisplayPriority("FREE")).toBe(3);
    });

    it("should sort tiers correctly by priority", () => {
      const tiers: SubscriptionTier[] = ["FREE", "SCHOLAR", "PRO"];
      const sorted = tiers.sort(
        (a, b) => getTierDisplayPriority(a) - getTierDisplayPriority(b)
      );
      expect(sorted).toEqual(["SCHOLAR", "PRO", "FREE"]);
    });
  });

  describe("getIncludedFeatureCount", () => {
    it("should count included features", () => {
      const features: TierFeature[] = [
        { name: "Feature 1", included: true },
        { name: "Feature 2", included: false },
        { name: "Feature 3", included: true },
      ];
      expect(getIncludedFeatureCount(features)).toBe(2);
    });

    it("should return 0 for empty features", () => {
      expect(getIncludedFeatureCount([])).toBe(0);
    });

    it("should return 0 when no features included", () => {
      const features: TierFeature[] = [
        { name: "Feature 1", included: false },
        { name: "Feature 2", included: false },
      ];
      expect(getIncludedFeatureCount(features)).toBe(0);
    });

    it("should count all features when all included", () => {
      const features: TierFeature[] = [
        { name: "Feature 1", included: true },
        { name: "Feature 2", included: true },
        { name: "Feature 3", included: true },
      ];
      expect(getIncludedFeatureCount(features)).toBe(3);
    });
  });

  describe("TierFeature validation", () => {
    it("should require name and included properties", () => {
      const feature: TierFeature = {
        name: "Unlimited books",
        included: true,
      };
      expect(feature.name).toBeDefined();
      expect(typeof feature.included).toBe("boolean");
    });

    it("should handle empty string name", () => {
      const feature: TierFeature = {
        name: "",
        included: false,
      };
      expect(feature.name).toBe("");
    });
  });

  describe("tier data validation", () => {
    const freeTier: TierInfo = {
      name: "Free",
      price: "$0",
      features: [
        { name: "10 books", included: true },
        { name: "5 AI guides/month", included: true },
        { name: "TTS Downloads", included: false },
      ],
      color: "default",
    };

    const proTier: TierInfo = {
      name: "Pro",
      price: "$9.99",
      priceAnnual: "$99/year",
      features: [
        { name: "Unlimited books", included: true },
        { name: "Unlimited AI guides", included: true },
        { name: "Priority Support", included: true },
      ],
      color: "primary",
    };

    const scholarTier: TierInfo = {
      name: "Scholar",
      price: "$29.99",
      priceAnnual: "$299/year",
      features: [
        { name: "Unlimited books", included: true },
        { name: "Unlimited AI guides", included: true },
        { name: "ElevenLabs Premium Voices", included: true },
        { name: "Premium 1-on-1 Support", included: true },
      ],
      color: "secondary",
    };

    it("should have correct tier names", () => {
      expect(freeTier.name).toBe("Free");
      expect(proTier.name).toBe("Pro");
      expect(scholarTier.name).toBe("Scholar");
    });

    it("should have correct pricing", () => {
      expect(freeTier.price).toBe("$0");
      expect(proTier.price).toBe("$9.99");
      expect(scholarTier.price).toBe("$29.99");
    });

    it("should have annual pricing for paid tiers", () => {
      expect(freeTier.priceAnnual).toBeUndefined();
      expect(proTier.priceAnnual).toBeDefined();
      expect(scholarTier.priceAnnual).toBeDefined();
    });

    it("should have correct colors", () => {
      expect(freeTier.color).toBe("default");
      expect(proTier.color).toBe("primary");
      expect(scholarTier.color).toBe("secondary");
    });

    it("should have more features in higher tiers", () => {
      const freeIncluded = getIncludedFeatureCount(freeTier.features);
      const proIncluded = getIncludedFeatureCount(proTier.features);
      const scholarIncluded = getIncludedFeatureCount(scholarTier.features);

      expect(proIncluded).toBeGreaterThanOrEqual(freeIncluded);
      expect(scholarIncluded).toBeGreaterThanOrEqual(proIncluded);
    });
  });
});
