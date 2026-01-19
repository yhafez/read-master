/**
 * Tests for ForumCreatePage utility functions and validation
 *
 * Tests cover:
 * - Form validation (validateForumPostForm)
 * - Error checking (hasFormErrors)
 * - Character counting (getCharacterCount)
 * - Markdown formatting (insertMarkdownFormat)
 * - Markdown preview rendering (renderMarkdownPreview)
 */

import { describe, it, expect } from "vitest";
import {
  validateForumPostForm,
  hasFormErrors,
  getCharacterCount,
  insertMarkdownFormat,
  renderMarkdownPreview,
} from "./forumFormUtils";

// Mock translation function
const mockT = (key: string, options?: Record<string, unknown>): string => {
  // Return key with interpolated options for testing
  if (options) {
    let result = key;
    Object.entries(options).forEach(([k, v]) => {
      result = result.replace(`{{${k}}}`, String(v));
    });
    return result;
  }
  return key;
};

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("validateForumPostForm", () => {
  describe("title validation", () => {
    it("returns error when title is empty", () => {
      const errors = validateForumPostForm(
        { title: "", content: "Valid content here", categoryId: "c1" },
        mockT
      );
      expect(errors.title).toBe("forum.form.errors.titleRequired");
    });

    it("returns error when title is only whitespace", () => {
      const errors = validateForumPostForm(
        { title: "   ", content: "Valid content here", categoryId: "c1" },
        mockT
      );
      expect(errors.title).toBe("forum.form.errors.titleRequired");
    });

    it("returns error when title is too short", () => {
      const errors = validateForumPostForm(
        { title: "AB", content: "Valid content here", categoryId: "c1" },
        mockT
      );
      expect(errors.title).toContain("forum.form.errors.titleTooShort");
    });

    it("returns error when title is too long", () => {
      const longTitle = "A".repeat(201);
      const errors = validateForumPostForm(
        { title: longTitle, content: "Valid content here", categoryId: "c1" },
        mockT
      );
      expect(errors.title).toContain("forum.form.errors.titleTooLong");
    });

    it("accepts valid title at minimum length", () => {
      const errors = validateForumPostForm(
        { title: "ABC", content: "Valid content here", categoryId: "c1" },
        mockT
      );
      expect(errors.title).toBeUndefined();
    });

    it("accepts valid title at maximum length", () => {
      const maxTitle = "A".repeat(200);
      const errors = validateForumPostForm(
        { title: maxTitle, content: "Valid content here", categoryId: "c1" },
        mockT
      );
      expect(errors.title).toBeUndefined();
    });

    it("trims whitespace when validating title", () => {
      const errors = validateForumPostForm(
        {
          title: "  Valid Title  ",
          content: "Valid content here",
          categoryId: "c1",
        },
        mockT
      );
      expect(errors.title).toBeUndefined();
    });
  });

  describe("content validation", () => {
    it("returns error when content is empty", () => {
      const errors = validateForumPostForm(
        { title: "Valid Title", content: "", categoryId: "c1" },
        mockT
      );
      expect(errors.content).toBe("forum.form.errors.contentRequired");
    });

    it("returns error when content is only whitespace", () => {
      const errors = validateForumPostForm(
        { title: "Valid Title", content: "    ", categoryId: "c1" },
        mockT
      );
      expect(errors.content).toBe("forum.form.errors.contentRequired");
    });

    it("returns error when content is too short", () => {
      const errors = validateForumPostForm(
        { title: "Valid Title", content: "Too short", categoryId: "c1" },
        mockT
      );
      expect(errors.content).toContain("forum.form.errors.contentTooShort");
    });

    it("returns error when content is too long", () => {
      const longContent = "A".repeat(50001);
      const errors = validateForumPostForm(
        { title: "Valid Title", content: longContent, categoryId: "c1" },
        mockT
      );
      expect(errors.content).toContain("forum.form.errors.contentTooLong");
    });

    it("accepts valid content at minimum length", () => {
      const errors = validateForumPostForm(
        { title: "Valid Title", content: "1234567890", categoryId: "c1" },
        mockT
      );
      expect(errors.content).toBeUndefined();
    });

    it("accepts valid content at maximum length", () => {
      const maxContent = "A".repeat(50000);
      const errors = validateForumPostForm(
        { title: "Valid Title", content: maxContent, categoryId: "c1" },
        mockT
      );
      expect(errors.content).toBeUndefined();
    });
  });

  describe("category validation", () => {
    it("returns error when category is not selected", () => {
      const errors = validateForumPostForm(
        { title: "Valid Title", content: "Valid content here", categoryId: "" },
        mockT
      );
      expect(errors.categoryId).toBe("forum.form.errors.categoryRequired");
    });

    it("accepts valid category ID", () => {
      const errors = validateForumPostForm(
        {
          title: "Valid Title",
          content: "Valid content here",
          categoryId: "c1",
        },
        mockT
      );
      expect(errors.categoryId).toBeUndefined();
    });
  });

  describe("multiple validation errors", () => {
    it("returns all errors when multiple fields are invalid", () => {
      const errors = validateForumPostForm(
        { title: "", content: "", categoryId: "" },
        mockT
      );
      expect(errors.title).toBeDefined();
      expect(errors.content).toBeDefined();
      expect(errors.categoryId).toBeDefined();
    });

    it("returns no errors when all fields are valid", () => {
      const errors = validateForumPostForm(
        {
          title: "Valid Title",
          content: "Valid content here",
          categoryId: "c1",
        },
        mockT
      );
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });
});

// =============================================================================
// ERROR CHECKING TESTS
// =============================================================================

describe("hasFormErrors", () => {
  it("returns true when there are errors", () => {
    expect(hasFormErrors({ title: "Error message" })).toBe(true);
  });

  it("returns true when there are multiple errors", () => {
    expect(
      hasFormErrors({
        title: "Title error",
        content: "Content error",
        categoryId: "Category error",
      })
    ).toBe(true);
  });

  it("returns false when there are no errors", () => {
    expect(hasFormErrors({})).toBe(false);
  });

  it("returns false for empty error object", () => {
    const errors = {};
    expect(hasFormErrors(errors)).toBe(false);
  });
});

// =============================================================================
// CHARACTER COUNT TESTS
// =============================================================================

describe("getCharacterCount", () => {
  it("returns correct count for empty string", () => {
    const result = getCharacterCount("", 100);
    expect(result.count).toBe(0);
    expect(result.isOver).toBe(false);
    expect(result.display).toBe("0/100");
  });

  it("returns correct count for normal text", () => {
    const result = getCharacterCount("Hello", 100);
    expect(result.count).toBe(5);
    expect(result.isOver).toBe(false);
    expect(result.display).toBe("5/100");
  });

  it("returns isOver true when count exceeds max", () => {
    const result = getCharacterCount("Hello World", 5);
    expect(result.count).toBe(11);
    expect(result.isOver).toBe(true);
    expect(result.display).toBe("11/5");
  });

  it("returns isOver false when count equals max", () => {
    const result = getCharacterCount("Hello", 5);
    expect(result.count).toBe(5);
    expect(result.isOver).toBe(false);
  });

  it("formats large numbers with locale separators", () => {
    const result = getCharacterCount("A".repeat(1000), 50000);
    expect(result.display).toContain("1,000");
  });

  it("handles unicode characters correctly", () => {
    const result = getCharacterCount("Hello 世界 🎉", 100);
    expect(result.count).toBe(11); // Each emoji counts as 2 in some environments
    expect(result.isOver).toBe(false);
  });
});

// =============================================================================
// MARKDOWN FORMAT INSERTION TESTS
// =============================================================================

describe("insertMarkdownFormat", () => {
  describe("no selection (cursor position)", () => {
    it("inserts formatting at cursor position", () => {
      const result = insertMarkdownFormat("Hello World", 5, 5, "**");
      expect(result.newText).toBe("Hello**** World");
      expect(result.newCursorPos).toBe(7);
    });

    it("inserts formatting at start of text", () => {
      const result = insertMarkdownFormat("Hello", 0, 0, "**");
      expect(result.newText).toBe("****Hello");
      expect(result.newCursorPos).toBe(2);
    });

    it("inserts formatting at end of text", () => {
      const result = insertMarkdownFormat("Hello", 5, 5, "**");
      expect(result.newText).toBe("Hello****");
      expect(result.newCursorPos).toBe(7);
    });

    it("inserts formatting with different prefix and suffix", () => {
      const result = insertMarkdownFormat("Hello", 5, 5, "[", "](url)");
      expect(result.newText).toBe("Hello[](url)");
      expect(result.newCursorPos).toBe(6);
    });

    it("inserts empty formatting markers on empty string", () => {
      const result = insertMarkdownFormat("", 0, 0, "**");
      expect(result.newText).toBe("****");
      expect(result.newCursorPos).toBe(2);
    });
  });

  describe("with selection", () => {
    it("wraps selected text with formatting", () => {
      const result = insertMarkdownFormat("Hello World", 0, 5, "**");
      expect(result.newText).toBe("**Hello** World");
      // Cursor should be at end of wrapped selection: prefix (2) + selected text (5) = 7
      expect(result.newCursorPos).toBe(7);
    });

    it("wraps middle selection with formatting", () => {
      const result = insertMarkdownFormat("Hello World", 6, 11, "**");
      expect(result.newText).toBe("Hello **World**");
      expect(result.newCursorPos).toBe(13);
    });

    it("wraps entire text with formatting", () => {
      const result = insertMarkdownFormat("Hello", 0, 5, "*");
      expect(result.newText).toBe("*Hello*");
      expect(result.newCursorPos).toBe(6);
    });

    it("wraps selection with different prefix and suffix", () => {
      const result = insertMarkdownFormat(
        "click here for info",
        6,
        10,
        "[",
        "](url)"
      );
      expect(result.newText).toBe("click [here](url) for info");
      expect(result.newCursorPos).toBe(11);
    });

    it("handles inline code formatting", () => {
      const result = insertMarkdownFormat("use the function", 8, 16, "`");
      expect(result.newText).toBe("use the `function`");
      expect(result.newCursorPos).toBe(17);
    });

    it("handles quote formatting", () => {
      const result = insertMarkdownFormat("Some text", 0, 9, "\n> ", "\n");
      expect(result.newText).toBe("\n> Some text\n");
      expect(result.newCursorPos).toBe(12);
    });
  });
});

// =============================================================================
// MARKDOWN PREVIEW RENDERING TESTS
// =============================================================================

describe("renderMarkdownPreview", () => {
  describe("HTML escaping", () => {
    it("escapes HTML tags", () => {
      const result = renderMarkdownPreview("<script>alert('xss')</script>");
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;script&gt;");
    });

    it("escapes ampersands", () => {
      const result = renderMarkdownPreview("Tom & Jerry");
      expect(result).toContain("Tom &amp; Jerry");
    });

    it("escapes greater than and less than", () => {
      const result = renderMarkdownPreview("1 < 2 > 0");
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
    });
  });

  describe("bold formatting", () => {
    it("converts **text** to strong", () => {
      const result = renderMarkdownPreview("This is **bold** text");
      expect(result).toContain("<strong>bold</strong>");
    });

    it("handles multiple bold sections", () => {
      const result = renderMarkdownPreview("**first** and **second**");
      expect(result).toContain("<strong>first</strong>");
      expect(result).toContain("<strong>second</strong>");
    });
  });

  describe("italic formatting", () => {
    it("converts *text* to em", () => {
      const result = renderMarkdownPreview("This is *italic* text");
      expect(result).toContain("<em>italic</em>");
    });

    it("handles bold and italic together", () => {
      const result = renderMarkdownPreview("**bold** and *italic*");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
    });
  });

  describe("code formatting", () => {
    it("converts `code` to inline code", () => {
      const result = renderMarkdownPreview("Use `myFunction()` for debugging");
      expect(result).toContain("<code>myFunction()</code>");
    });

    it("converts code blocks to pre/code", () => {
      const result = renderMarkdownPreview("```\nfunction test() {}\n```");
      expect(result).toContain("<pre><code>");
      expect(result).toContain("function test() {}");
    });
  });

  describe("link formatting", () => {
    it("converts markdown links to anchor tags", () => {
      const result = renderMarkdownPreview(
        "Visit [Google](https://google.com)"
      );
      expect(result).toContain(
        '<a href="https://google.com" target="_blank">Google</a>'
      );
    });

    it("handles multiple links", () => {
      const result = renderMarkdownPreview("[One](url1) and [Two](url2)");
      expect(result).toContain('<a href="url1" target="_blank">One</a>');
      expect(result).toContain('<a href="url2" target="_blank">Two</a>');
    });
  });

  describe("blockquote formatting", () => {
    it("converts > at line start to blockquote", () => {
      const result = renderMarkdownPreview("> This is a quote");
      expect(result).toContain("<blockquote>This is a quote</blockquote>");
    });

    it("escapes > in middle of text", () => {
      const result = renderMarkdownPreview("5 > 3 is true");
      expect(result).toContain("&gt;");
      expect(result).not.toContain("<blockquote>");
    });
  });

  describe("list formatting", () => {
    it("converts - items to list items", () => {
      const result = renderMarkdownPreview("- First item\n- Second item");
      expect(result).toContain("<li>First item</li>");
      expect(result).toContain("<li>Second item</li>");
    });
  });

  describe("paragraph handling", () => {
    it("wraps content in paragraphs", () => {
      const result = renderMarkdownPreview("Simple text");
      expect(result).toContain("<p>");
      expect(result).toContain("</p>");
    });

    it("handles double newlines as paragraph breaks", () => {
      const result = renderMarkdownPreview(
        "First paragraph\n\nSecond paragraph"
      );
      expect(result).toContain("</p><p>");
    });

    it("handles single newlines as line breaks", () => {
      const result = renderMarkdownPreview("Line one\nLine two");
      expect(result).toContain("<br/>");
    });
  });

  describe("empty input", () => {
    it("handles empty string", () => {
      const result = renderMarkdownPreview("");
      // Empty string results in empty wrapped paragraph which gets cleaned up
      expect(result).toBe("");
    });

    it("handles whitespace only", () => {
      const result = renderMarkdownPreview("   ");
      expect(result).toContain("<p>");
    });
  });

  describe("complex markdown", () => {
    it("renders complex markdown correctly", () => {
      const markdown = `# Header

This is **bold** and *italic* text.

- Item 1
- Item 2

Check out [this link](https://example.com) and use \`code\` inline.`;

      const result = renderMarkdownPreview(markdown);
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
      expect(result).toContain("<li>");
      expect(result).toContain("<a href");
      expect(result).toContain("<code>code</code>");
    });
  });
});
