/**
 * Template Loader Tests
 */

import { describe, it, expect } from "vitest";
import {
  loadTemplate,
  wrapWithLayout,
  listTemplates,
  EMAIL_TEMPLATES,
} from "./templateLoader.js";

describe("Template Loader", () => {
  describe("wrapWithLayout", () => {
    it("should wrap HTML content with base layout", () => {
      const content = "<h2>Test Content</h2>";
      const result = wrapWithLayout(content, "html");

      expect(result).toContain(content);
      expect(result).toContain("<!DOCTYPE html");
      expect(result).toContain("Read Master");
      expect(result).toContain("{{unsubscribeUrl}}");
    });

    it("should wrap text content with base layout", () => {
      const content = "Test Content";
      const result = wrapWithLayout(content, "txt");

      expect(result).toContain(content);
      expect(result).toContain("READ MASTER");
      expect(result).toContain("{{unsubscribeUrl}}");
    });
  });

  describe("loadTemplate", () => {
    it("should load welcome template", () => {
      const template = loadTemplate("welcome/welcome");

      expect(template).toHaveProperty("html");
      expect(template).toHaveProperty("text");
      expect(template.html).toContain("Welcome to Read Master");
      expect(template.text).toContain("Welcome to Read Master");
    });

    it("should load onboarding day 1 template", () => {
      const template = loadTemplate("onboarding/day1-getting-started");

      expect(template).toHaveProperty("html");
      expect(template).toHaveProperty("text");
      expect(template.html).toContain("Let's Get You Started");
      expect(template.text).toContain("Let's Get You Started");
    });

    it("should load streak template", () => {
      const template = loadTemplate("engagement/streak-7-days");

      expect(template).toHaveProperty("html");
      expect(template).toHaveProperty("text");
      expect(template.html).toContain("7-Day Reading Streak");
      expect(template.text).toContain("7-DAY READING STREAK");
    });

    it("should load book completed template", () => {
      const template = loadTemplate("engagement/book-completed");

      expect(template).toHaveProperty("html");
      expect(template).toHaveProperty("text");
      expect(template.html).toContain("Congratulations");
      expect(template.html).toContain("{{bookTitle}}");
      expect(template.text).toContain("YOU FINISHED");
    });

    it("should load conversion template", () => {
      const template = loadTemplate("conversion/upgrade-library-limit");

      expect(template).toHaveProperty("html");
      expect(template).toHaveProperty("text");
      expect(template.html).toContain("Library Limit");
      expect(template.html).toContain("Upgrade to Pro");
    });

    it("should load weekly digest template", () => {
      const template = loadTemplate("digest/weekly-summary");

      expect(template).toHaveProperty("html");
      expect(template).toHaveProperty("text");
      expect(template.html).toContain("Your Week in Reading");
      expect(template.text).toContain("THIS WEEK'S STATS");
    });

    it("should throw error for non-existent template", () => {
      expect(() => loadTemplate("non-existent/template")).toThrow();
    });
  });

  describe("listTemplates", () => {
    it("should list all available templates", () => {
      const templates = listTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);

      // Check for known templates
      expect(templates).toContain("welcome/welcome");
      expect(templates).toContain("onboarding/day1-getting-started");
      expect(templates).toContain("engagement/streak-7-days");
      expect(templates).toContain("engagement/book-completed");
      expect(templates).toContain("conversion/upgrade-library-limit");
      expect(templates).toContain("digest/weekly-summary");
    });

    it("should not include layouts directory", () => {
      const templates = listTemplates();

      expect(templates).not.toContain("layouts/base");
    });
  });

  describe("EMAIL_TEMPLATES", () => {
    it("should have all template definitions", () => {
      expect(EMAIL_TEMPLATES).toBeInstanceOf(Array);
      expect(EMAIL_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    });

    it("should have valid welcome template definition", () => {
      const welcome = EMAIL_TEMPLATES.find((t) => t.name === "welcome");

      expect(welcome).toBeDefined();
      expect(welcome?.subject).toContain("Welcome");
      expect(welcome?.category).toBe("WELCOME");
      expect(welcome?.templatePath).toBe("welcome/welcome");
    });

    it("should have valid onboarding template definition", () => {
      const onboarding = EMAIL_TEMPLATES.find((t) => t.name === "onboarding_day1");

      expect(onboarding).toBeDefined();
      expect(onboarding?.subject).toContain("Get You Started");
      expect(onboarding?.category).toBe("ONBOARDING");
    });

    it("should have valid streak template definition", () => {
      const streak = EMAIL_TEMPLATES.find((t) => t.name === "streak_7_days");

      expect(streak).toBeDefined();
      expect(streak?.subject).toContain("Streak");
      expect(streak?.category).toBe("ENGAGEMENT");
    });

    it("should have valid book completed template definition", () => {
      const bookCompleted = EMAIL_TEMPLATES.find((t) => t.name === "book_completed");

      expect(bookCompleted).toBeDefined();
      expect(bookCompleted?.subject).toContain("Congratulations");
      expect(bookCompleted?.subject).toContain("{{bookTitle}}");
      expect(bookCompleted?.category).toBe("ENGAGEMENT");
    });

    it("should have valid conversion template definition", () => {
      const conversion = EMAIL_TEMPLATES.find((t) => t.name === "upgrade_library_limit");

      expect(conversion).toBeDefined();
      expect(conversion?.subject).toContain("Library Limit");
      expect(conversion?.category).toBe("CONVERSION");
    });

    it("should have valid digest template definition", () => {
      const digest = EMAIL_TEMPLATES.find((t) => t.name === "weekly_summary");

      expect(digest).toBeDefined();
      expect(digest?.subject).toContain("Week in Reading");
      expect(digest?.category).toBe("DIGEST");
    });

    it("should have all required fields for each template", () => {
      EMAIL_TEMPLATES.forEach((template) => {
        expect(template).toHaveProperty("name");
        expect(template).toHaveProperty("subject");
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("category");
        expect(template).toHaveProperty("templatePath");

        expect(template.name).toBeTruthy();
        expect(template.subject).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(template.templatePath).toBeTruthy();
      });
    });

    it("should have valid categories", () => {
      const validCategories = [
        "TRANSACTIONAL",
        "WELCOME",
        "ONBOARDING",
        "ENGAGEMENT",
        "CONVERSION",
        "DIGEST",
        "ANNOUNCEMENT",
        "SYSTEM",
      ];

      EMAIL_TEMPLATES.forEach((template) => {
        expect(validCategories).toContain(template.category);
      });
    });
  });

  describe("Template Content Quality", () => {
    it("should have proper HTML structure in all templates", () => {
      EMAIL_TEMPLATES.forEach((templateDef) => {
        const template = loadTemplate(templateDef.templatePath);

        // Check HTML version
        expect(template.html).toContain("<!DOCTYPE html");
        expect(template.html).toContain("<html");
        expect(template.html).toContain("</html>");
        expect(template.html).toContain("Read Master");
      });
    });

    it("should have unsubscribe links in all templates", () => {
      EMAIL_TEMPLATES.forEach((templateDef) => {
        const template = loadTemplate(templateDef.templatePath);

        // Check both HTML and text versions
        expect(template.html).toContain("{{unsubscribeUrl}}");
        expect(template.text).toContain("{{unsubscribeUrl}}");
      });
    });

    it("should have consistent variable syntax", () => {
      EMAIL_TEMPLATES.forEach((templateDef) => {
        const template = loadTemplate(templateDef.templatePath);

        // Variables should use {{variableName}} syntax (or Handlebars helpers)
        const htmlVars = template.html.match(/{{[^}]+}}/g) || [];
        const textVars = template.text.match(/{{[^}]+}}/g) || [];

        // Both versions should have variables
        expect(htmlVars.length + textVars.length).toBeGreaterThan(0);

        // Simple variables should use {{variableName}} format
        // Handlebars helpers are allowed ({{#if}}, {{#each}}, etc.)
        const simpleVars = htmlVars.filter((v) => !v.includes("#") && !v.includes("/"));
        simpleVars.forEach((v) => {
          // Should be {{word}} or {{word.word}}
          expect(v).toMatch(/^{{[\w.]+}}$/);
        });
      });
    });

    it("should have mobile-responsive HTML", () => {
      EMAIL_TEMPLATES.forEach((templateDef) => {
        const template = loadTemplate(templateDef.templatePath);

        // Check for viewport meta tag
        expect(template.html).toContain('<meta name="viewport"');

        // Check for responsive media query
        expect(template.html).toContain("@media");
        expect(template.html).toContain("max-width");
      });
    });

    it("should have dark mode support", () => {
      EMAIL_TEMPLATES.forEach((templateDef) => {
        const template = loadTemplate(templateDef.templatePath);

        // Check for dark mode media query
        expect(template.html).toContain("prefers-color-scheme: dark");
      });
    });
  });
});
