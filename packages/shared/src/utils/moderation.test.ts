import { describe, expect, it } from "vitest";

import {
  cleanProfanity,
  containsProfanity,
  getProfaneWords,
  validateFieldsNoProfanity,
  validateNoProfanity,
} from "./moderation";

describe("moderation utilities", () => {
  describe("containsProfanity", () => {
    it("should return false for clean text", () => {
      expect(containsProfanity("Hello world")).toBe(false);
      expect(containsProfanity("This is a nice book about programming")).toBe(
        false
      );
      expect(containsProfanity("Good morning everyone!")).toBe(false);
    });

    it("should return true for text with profanity", () => {
      expect(containsProfanity("What the fuck")).toBe(true);
      expect(containsProfanity("This is shit")).toBe(true);
      expect(containsProfanity("You asshole")).toBe(true);
    });

    it("should detect profanity regardless of case", () => {
      expect(containsProfanity("FUCK")).toBe(true);
      expect(containsProfanity("Fuck")).toBe(true);
      expect(containsProfanity("FuCk")).toBe(true);
    });

    it("should detect compound profanity", () => {
      expect(containsProfanity("That's bullshit")).toBe(true);
      expect(containsProfanity("motherfucker")).toBe(true);
      expect(containsProfanity("What a shithead")).toBe(true);
    });

    it("should detect profanity with repeated characters", () => {
      expect(containsProfanity("fuuuuck")).toBe(true);
      expect(containsProfanity("shiiiit")).toBe(true);
    });

    it("should return false for empty or invalid input", () => {
      expect(containsProfanity("")).toBe(false);
      expect(containsProfanity(null as unknown as string)).toBe(false);
      expect(containsProfanity(undefined as unknown as string)).toBe(false);
    });

    it("should not flag legitimate words containing partial matches", () => {
      expect(containsProfanity("class")).toBe(false);
      expect(containsProfanity("assistant")).toBe(false);
      expect(containsProfanity("passion")).toBe(false);
      expect(containsProfanity("scunthorpe")).toBe(false);
      expect(containsProfanity("Hello world")).toBe(false);
      expect(containsProfanity("cocktail")).toBe(false);
    });

    it("should detect slurs", () => {
      expect(containsProfanity("That's retarded")).toBe(true);
      expect(containsProfanity("He's a faggot")).toBe(true);
    });
  });

  describe("getProfaneWords", () => {
    it("should return empty array for clean text", () => {
      expect(getProfaneWords("Hello world")).toEqual([]);
      expect(getProfaneWords("Nice book")).toEqual([]);
    });

    it("should return array of found profane words", () => {
      expect(getProfaneWords("What the fuck")).toContain("fuck");
      expect(getProfaneWords("Shit and fuck")).toContain("shit");
      expect(getProfaneWords("Shit and fuck")).toContain("fuck");
    });

    it("should not return duplicates", () => {
      const result = getProfaneWords("fuck fuck fucking fuck");
      // Each unique word should appear only once
      expect(result.length).toBeGreaterThan(0);
      const uniqueWords = new Set(result);
      expect(uniqueWords.size).toBe(result.length);
    });

    it("should return empty array for empty or invalid input", () => {
      expect(getProfaneWords("")).toEqual([]);
      expect(getProfaneWords(null as unknown as string)).toEqual([]);
    });

    it("should detect compound profanity", () => {
      expect(getProfaneWords("What bullshit")).toContain("bullshit");
    });
  });

  describe("validateNoProfanity", () => {
    it("should return valid result for clean text", () => {
      const result = validateNoProfanity("Hello world", "Title");
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should return invalid result with error for profane text", () => {
      const result = validateNoProfanity("What the fuck", "Title");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Title contains inappropriate language");
    });

    it("should use default field name when not provided", () => {
      const result = validateNoProfanity("Some shit");
      expect(result.errors).toContain(
        "Content contains inappropriate language"
      );
    });
  });

  describe("validateFieldsNoProfanity", () => {
    it("should validate multiple clean fields", () => {
      const result = validateFieldsNoProfanity([
        { value: "Hello", name: "Title" },
        { value: "World", name: "Description" },
      ]);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should return all errors for multiple profane fields", () => {
      const result = validateFieldsNoProfanity([
        { value: "Fuck this", name: "Title" },
        { value: "Shit content", name: "Description" },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain("Title contains inappropriate language");
      expect(result.errors).toContain(
        "Description contains inappropriate language"
      );
    });

    it("should handle mix of clean and profane fields", () => {
      const result = validateFieldsNoProfanity([
        { value: "Clean title", name: "Title" },
        { value: "Shit content", name: "Description" },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors).toContain(
        "Description contains inappropriate language"
      );
    });

    it("should skip empty values", () => {
      const result = validateFieldsNoProfanity([
        { value: "", name: "Title" },
        { value: "Clean", name: "Description" },
      ]);
      expect(result.valid).toBe(true);
    });
  });

  describe("cleanProfanity", () => {
    it("should replace profanity with asterisks", () => {
      expect(cleanProfanity("What the fuck")).toBe("What the ****");
      expect(cleanProfanity("This is shit")).toBe("This is ****");
    });

    it("should handle multiple profane words", () => {
      const cleaned = cleanProfanity("Fuck this shit");
      expect(cleaned).toContain("****");
      expect(cleaned.toLowerCase()).not.toContain("fuck");
      expect(cleaned.toLowerCase()).not.toContain("shit");
    });

    it("should preserve case-insensitive replacement", () => {
      const cleaned = cleanProfanity("FUCK this");
      expect(cleaned.toLowerCase()).not.toContain("fuck");
    });

    it("should return unchanged text if no profanity", () => {
      expect(cleanProfanity("Hello world")).toBe("Hello world");
    });

    it("should handle empty or invalid input", () => {
      expect(cleanProfanity("")).toBe("");
      expect(cleanProfanity(null as unknown as string)).toBe(null);
    });

    it("should clean compound profanity", () => {
      const cleaned = cleanProfanity("That's bullshit");
      expect(cleaned.toLowerCase()).not.toContain("bullshit");
    });
  });
});
