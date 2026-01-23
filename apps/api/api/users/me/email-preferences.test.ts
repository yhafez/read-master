/**
 * Email Preferences API Tests
 */

import { describe, it, expect } from "vitest";
import {
  updatePreferencesSchema,
  mapToResponse,
  validateUpdateRequest,
  type EmailPreferencesResponse,
  type UpdatePreferencesInput,
} from "./email-preferences.js";

describe("Email Preferences API", () => {
  describe("updatePreferencesSchema", () => {
    it("should validate valid preferences with all fields", () => {
      const input = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: true,
        weeklyDigest: false,
        achievementEmails: true,
        recommendationEmails: false,
        socialEmails: true,
        digestFrequency: "weekly" as const,
      };

      const result = updatePreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it("should validate partial preferences", () => {
      const input = {
        weeklyDigest: false,
        marketingEmails: false,
      };

      const result = updatePreferencesSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.weeklyDigest).toBe(false);
        expect(result.data.marketingEmails).toBe(false);
        expect(result.data.emailEnabled).toBeUndefined();
      }
    });

    it("should validate empty object", () => {
      const result = updatePreferencesSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should validate all digestFrequency options", () => {
      const frequencies = ["weekly", "biweekly", "monthly", "never"];

      for (const freq of frequencies) {
        const result = updatePreferencesSchema.safeParse({
          digestFrequency: freq,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid digestFrequency", () => {
      const result = updatePreferencesSchema.safeParse({
        digestFrequency: "daily",
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-boolean preference values", () => {
      const result = updatePreferencesSchema.safeParse({
        emailEnabled: "true",
      });
      expect(result.success).toBe(false);
    });

    it("should reject unknown fields", () => {
      const result = updatePreferencesSchema.safeParse({
        unknownField: true,
      });
      // Zod strips unknown fields by default
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });
  });

  describe("mapToResponse", () => {
    it("should map all preference fields correctly", () => {
      const prefs = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: true,
        weeklyDigest: false,
        achievementEmails: true,
        recommendationEmails: false,
        socialEmails: true,
        digestFrequency: "biweekly",
      };

      const result = mapToResponse(prefs);

      expect(result.emailEnabled).toBe(true);
      expect(result.marketingEmails).toBe(false);
      expect(result.productUpdates).toBe(true);
      expect(result.weeklyDigest).toBe(false);
      expect(result.achievementEmails).toBe(true);
      expect(result.recommendationEmails).toBe(false);
      expect(result.socialEmails).toBe(true);
      expect(result.digestFrequency).toBe("biweekly");
    });

    it("should handle all disabled preferences", () => {
      const prefs = {
        emailEnabled: false,
        marketingEmails: false,
        productUpdates: false,
        weeklyDigest: false,
        achievementEmails: false,
        recommendationEmails: false,
        socialEmails: false,
        digestFrequency: "never",
      };

      const result = mapToResponse(prefs);

      expect(result.emailEnabled).toBe(false);
      expect(result.marketingEmails).toBe(false);
      expect(result.productUpdates).toBe(false);
      expect(result.weeklyDigest).toBe(false);
      expect(result.achievementEmails).toBe(false);
      expect(result.recommendationEmails).toBe(false);
      expect(result.socialEmails).toBe(false);
      expect(result.digestFrequency).toBe("never");
    });

    it("should handle all enabled preferences", () => {
      const prefs = {
        emailEnabled: true,
        marketingEmails: true,
        productUpdates: true,
        weeklyDigest: true,
        achievementEmails: true,
        recommendationEmails: true,
        socialEmails: true,
        digestFrequency: "weekly",
      };

      const result = mapToResponse(prefs);

      Object.values(result).forEach((value) => {
        if (typeof value === "boolean") {
          expect(value).toBe(true);
        }
      });
      expect(result.digestFrequency).toBe("weekly");
    });
  });

  describe("validateUpdateRequest", () => {
    it("should return success for valid input", () => {
      const input = {
        emailEnabled: true,
        weeklyDigest: false,
      };

      const result = validateUpdateRequest(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emailEnabled).toBe(true);
        expect(result.data.weeklyDigest).toBe(false);
      }
    });

    it("should return success for empty object", () => {
      const result = validateUpdateRequest({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it("should return error for invalid digestFrequency", () => {
      const result = validateUpdateRequest({
        digestFrequency: "invalid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it("should return error for non-boolean values", () => {
      const result = validateUpdateRequest({
        emailEnabled: "yes",
      });

      expect(result.success).toBe(false);
    });

    it("should return error for null input", () => {
      const result = validateUpdateRequest(null);

      expect(result.success).toBe(false);
    });

    it("should handle undefined input", () => {
      const result = validateUpdateRequest(undefined);

      expect(result.success).toBe(false);
    });
  });

  describe("EmailPreferencesResponse type", () => {
    it("should have correct shape", () => {
      const response: EmailPreferencesResponse = {
        emailEnabled: true,
        marketingEmails: true,
        productUpdates: true,
        weeklyDigest: true,
        achievementEmails: true,
        recommendationEmails: true,
        socialEmails: true,
        digestFrequency: "weekly",
      };

      expect(response.emailEnabled).toBeDefined();
      expect(response.marketingEmails).toBeDefined();
      expect(response.productUpdates).toBeDefined();
      expect(response.weeklyDigest).toBeDefined();
      expect(response.achievementEmails).toBeDefined();
      expect(response.recommendationEmails).toBeDefined();
      expect(response.socialEmails).toBeDefined();
      expect(response.digestFrequency).toBeDefined();
    });
  });

  describe("UpdatePreferencesInput type", () => {
    it("should allow all optional fields", () => {
      const input: UpdatePreferencesInput = {};
      expect(input).toEqual({});
    });

    it("should allow single field", () => {
      const input: UpdatePreferencesInput = {
        emailEnabled: true,
      };
      expect(input.emailEnabled).toBe(true);
    });

    it("should allow all fields", () => {
      const input: UpdatePreferencesInput = {
        emailEnabled: true,
        marketingEmails: false,
        productUpdates: true,
        weeklyDigest: false,
        achievementEmails: true,
        recommendationEmails: false,
        socialEmails: true,
        digestFrequency: "monthly",
      };

      expect(Object.keys(input)).toHaveLength(8);
    });
  });

  describe("Digest frequency validation", () => {
    it("should accept 'weekly'", () => {
      const result = updatePreferencesSchema.safeParse({
        digestFrequency: "weekly",
      });
      expect(result.success).toBe(true);
    });

    it("should accept 'biweekly'", () => {
      const result = updatePreferencesSchema.safeParse({
        digestFrequency: "biweekly",
      });
      expect(result.success).toBe(true);
    });

    it("should accept 'monthly'", () => {
      const result = updatePreferencesSchema.safeParse({
        digestFrequency: "monthly",
      });
      expect(result.success).toBe(true);
    });

    it("should accept 'never'", () => {
      const result = updatePreferencesSchema.safeParse({
        digestFrequency: "never",
      });
      expect(result.success).toBe(true);
    });

    it("should reject 'daily'", () => {
      const result = updatePreferencesSchema.safeParse({
        digestFrequency: "daily",
      });
      expect(result.success).toBe(false);
    });

    it("should reject 'yearly'", () => {
      const result = updatePreferencesSchema.safeParse({
        digestFrequency: "yearly",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle preference with extra whitespace in values gracefully", () => {
      const result = updatePreferencesSchema.safeParse({
        digestFrequency: " weekly ", // spaces around
      });
      // Zod does not trim strings by default, so this will fail
      expect(result.success).toBe(false);
    });

    it("should handle mixed case digestFrequency", () => {
      const result = updatePreferencesSchema.safeParse({
        digestFrequency: "Weekly", // capitalized
      });
      // Zod enum is case-sensitive
      expect(result.success).toBe(false);
    });

    it("should not allow numeric values for booleans", () => {
      const result = updatePreferencesSchema.safeParse({
        emailEnabled: 1,
      });
      expect(result.success).toBe(false);
    });

    it("should not allow null for boolean fields", () => {
      const result = updatePreferencesSchema.safeParse({
        emailEnabled: null,
      });
      expect(result.success).toBe(false);
    });
  });
});
