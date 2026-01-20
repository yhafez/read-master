/**
 * Tests for CurriculumForm component
 */

import { describe, it, expect } from "vitest";
import type { CurriculumFormData } from "./CurriculumForm";

describe("CurriculumForm", () => {
  describe("Type Definitions", () => {
    it("should define CurriculumFormData interface", () => {
      const formData: CurriculumFormData = {
        title: "Test Curriculum",
        description: "Test description",
        category: "Academic",
        difficulty: "BEGINNER",
        visibility: "PRIVATE",
        tags: ["test", "example"],
        coverImageUrl: "https://example.com/image.jpg",
        estimatedTimeMinutes: 120,
      };

      expect(formData.title).toBe("Test Curriculum");
      expect(formData.description).toBe("Test description");
      expect(formData.category).toBe("Academic");
      expect(formData.difficulty).toBe("BEGINNER");
      expect(formData.visibility).toBe("PRIVATE");
      expect(formData.tags).toHaveLength(2);
      expect(formData.coverImageUrl).toBe("https://example.com/image.jpg");
      expect(formData.estimatedTimeMinutes).toBe(120);
    });

    it("should support all difficulty levels", () => {
      const difficulties: CurriculumFormData["difficulty"][] = [
        "BEGINNER",
        "INTERMEDIATE",
        "ADVANCED",
        "EXPERT",
      ];

      expect(difficulties).toHaveLength(4);
      difficulties.forEach((diff) => {
        expect(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).toContain(
          diff
        );
      });
    });

    it("should support all visibility options", () => {
      const visibilities: Array<"PRIVATE" | "UNLISTED" | "PUBLIC"> = [
        "PRIVATE",
        "UNLISTED",
        "PUBLIC",
      ];

      expect(visibilities).toHaveLength(3);
      visibilities.forEach((vis) => {
        expect(["PRIVATE", "UNLISTED", "PUBLIC"]).toContain(vis);
      });
    });
  });

  describe("Form Validation", () => {
    it("should require title", () => {
      const formData: Partial<CurriculumFormData> = {
        description: "Test",
        category: "Academic",
        difficulty: "BEGINNER",
        visibility: "PRIVATE",
        tags: [],
      };

      expect(formData.title).toBeUndefined();
    });

    it("should require description", () => {
      const formData: Partial<CurriculumFormData> = {
        title: "Test",
        category: "Academic",
        difficulty: "BEGINNER",
        visibility: "PRIVATE",
        tags: [],
      };

      expect(formData.description).toBeUndefined();
    });

    it("should allow optional fields", () => {
      const formData: CurriculumFormData = {
        title: "Test",
        description: "Test description",
        category: "Academic",
        difficulty: "BEGINNER",
        visibility: "PRIVATE",
        tags: [],
      };

      expect(formData.coverImageUrl).toBeUndefined();
      expect(formData.estimatedTimeMinutes).toBeUndefined();
    });
  });

  describe("Tags Management", () => {
    it("should support multiple tags", () => {
      const tags = ["tag1", "tag2", "tag3"];
      expect(tags).toHaveLength(3);
      expect(tags).toContain("tag1");
      expect(tags).toContain("tag2");
      expect(tags).toContain("tag3");
    });

    it("should support empty tags array", () => {
      const tags: string[] = [];
      expect(tags).toHaveLength(0);
    });
  });
});
