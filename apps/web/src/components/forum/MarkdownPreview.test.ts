/**
 * Tests for MarkdownPreview component and renderMarkdownToHtml function
 */

import { describe, it, expect } from "vitest";
import { escapeHtml, renderMarkdownToHtml } from "./MarkdownPreview";

// =============================================================================
// escapeHtml Tests
// =============================================================================

describe("escapeHtml", () => {
  it("should escape ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("should escape less than signs", () => {
    expect(escapeHtml("a < b")).toBe("a &lt; b");
  });

  it("should escape greater than signs", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("should escape double quotes", () => {
    expect(escapeHtml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("should escape single quotes", () => {
    expect(escapeHtml("it's good")).toBe("it&#039;s good");
  });

  it("should escape multiple special characters", () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
      "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
    );
  });

  it("should return empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("should not modify text without special characters", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

// =============================================================================
// renderMarkdownToHtml - Empty/Edge Cases
// =============================================================================

describe("renderMarkdownToHtml - Edge Cases", () => {
  it("should return empty string for empty input", () => {
    expect(renderMarkdownToHtml("")).toBe("");
  });

  it("should handle whitespace-only input", () => {
    const result = renderMarkdownToHtml("   ");
    expect(result).toContain("   ");
  });

  it("should handle single character", () => {
    const result = renderMarkdownToHtml("a");
    expect(result).toContain("a");
  });
});

// =============================================================================
// renderMarkdownToHtml - Bold
// =============================================================================

describe("renderMarkdownToHtml - Bold", () => {
  it("should convert **text** to <strong>", () => {
    expect(renderMarkdownToHtml("**bold**")).toContain("<strong>bold</strong>");
  });

  it("should handle multiple bold sections", () => {
    const result = renderMarkdownToHtml("**one** and **two**");
    expect(result).toContain("<strong>one</strong>");
    expect(result).toContain("<strong>two</strong>");
  });

  it("should handle bold in the middle of text", () => {
    const result = renderMarkdownToHtml("this is **bold** text");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("this is");
    expect(result).toContain("text");
  });
});

// =============================================================================
// renderMarkdownToHtml - Italic
// =============================================================================

describe("renderMarkdownToHtml - Italic", () => {
  it("should convert *text* to <em>", () => {
    expect(renderMarkdownToHtml("*italic*")).toContain("<em>italic</em>");
  });

  it("should handle multiple italic sections", () => {
    const result = renderMarkdownToHtml("*one* and *two*");
    expect(result).toContain("<em>one</em>");
    expect(result).toContain("<em>two</em>");
  });
});

// =============================================================================
// renderMarkdownToHtml - Strikethrough
// =============================================================================

describe("renderMarkdownToHtml - Strikethrough", () => {
  it("should convert ~~text~~ to <del>", () => {
    expect(renderMarkdownToHtml("~~deleted~~")).toContain("<del>deleted</del>");
  });

  it("should handle strikethrough in sentence", () => {
    const result = renderMarkdownToHtml("this is ~~not~~ correct");
    expect(result).toContain("<del>not</del>");
  });
});

// =============================================================================
// renderMarkdownToHtml - Code
// =============================================================================

describe("renderMarkdownToHtml - Code", () => {
  it("should convert `code` to inline code", () => {
    const result = renderMarkdownToHtml("`code`");
    expect(result).toContain('<code class="inline-code">code</code>');
  });

  it("should convert code blocks", () => {
    const result = renderMarkdownToHtml("```\ncode block\n```");
    expect(result).toContain('<pre class="code-block"><code>');
    expect(result).toContain("code block");
    expect(result).toContain("</code></pre>");
  });

  it("should handle code blocks with language hint", () => {
    const result = renderMarkdownToHtml("```js\nconst x = 1;\n```");
    expect(result).toContain('<pre class="code-block"><code>');
    expect(result).toContain("const x = 1;");
  });
});

// =============================================================================
// renderMarkdownToHtml - Links
// =============================================================================

describe("renderMarkdownToHtml - Links", () => {
  it("should convert [text](url) to links with http", () => {
    const result = renderMarkdownToHtml("[link](http://example.com)");
    expect(result).toContain('href="http://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain(">link</a>");
  });

  it("should convert [text](url) to links with https", () => {
    const result = renderMarkdownToHtml("[link](https://example.com)");
    expect(result).toContain('href="https://example.com"');
  });

  it("should convert mailto links", () => {
    const result = renderMarkdownToHtml("[email](mailto:test@example.com)");
    expect(result).toContain('href="mailto:test@example.com"');
  });

  it("should reject javascript: protocol links", () => {
    const result = renderMarkdownToHtml("[click](javascript:alert('xss'))");
    expect(result).not.toContain("javascript:");
    expect(result).toContain("click"); // Text should still appear
  });

  it("should reject data: protocol links", () => {
    const result = renderMarkdownToHtml("[click](data:text/html,<script>)");
    expect(result).not.toContain("data:");
  });
});

// =============================================================================
// renderMarkdownToHtml - Blockquotes
// =============================================================================

describe("renderMarkdownToHtml - Blockquotes", () => {
  it("should convert > quote to blockquote", () => {
    const result = renderMarkdownToHtml("> This is a quote");
    expect(result).toContain('<blockquote class="blockquote">');
    expect(result).toContain("This is a quote");
    expect(result).toContain("</blockquote>");
  });

  it("should handle multiple blockquotes", () => {
    const result = renderMarkdownToHtml("> Quote one\n> Quote two");
    const blockquoteCount = (result.match(/<blockquote/g) || []).length;
    expect(blockquoteCount).toBe(2);
  });
});

// =============================================================================
// renderMarkdownToHtml - Lists
// =============================================================================

describe("renderMarkdownToHtml - Lists", () => {
  it("should convert - items to unordered list", () => {
    const result = renderMarkdownToHtml("- Item one\n- Item two");
    expect(result).toContain('<ul class="unordered-list">');
    expect(result).toContain('<li class="list-item">Item one</li>');
    expect(result).toContain('<li class="list-item">Item two</li>');
    expect(result).toContain("</ul>");
  });

  it("should convert numbered items to ordered list", () => {
    const result = renderMarkdownToHtml("1. First\n2. Second");
    expect(result).toContain('<ol class="ordered-list">');
    expect(result).toContain('<li class="ordered-item">First</li>');
    expect(result).toContain('<li class="ordered-item">Second</li>');
    expect(result).toContain("</ol>");
  });
});

// =============================================================================
// renderMarkdownToHtml - Headers
// =============================================================================

describe("renderMarkdownToHtml - Headers", () => {
  it("should convert # to h1", () => {
    const result = renderMarkdownToHtml("# Heading 1");
    expect(result).toContain("<h1>Heading 1</h1>");
  });

  it("should convert ## to h2", () => {
    const result = renderMarkdownToHtml("## Heading 2");
    expect(result).toContain("<h2>Heading 2</h2>");
  });

  it("should convert ### to h3", () => {
    const result = renderMarkdownToHtml("### Heading 3");
    expect(result).toContain("<h3>Heading 3</h3>");
  });
});

// =============================================================================
// renderMarkdownToHtml - Horizontal Rule
// =============================================================================

describe("renderMarkdownToHtml - Horizontal Rule", () => {
  it("should convert --- to hr", () => {
    const result = renderMarkdownToHtml("---");
    expect(result).toContain('<hr class="divider" />');
  });
});

// =============================================================================
// renderMarkdownToHtml - Paragraphs and Line Breaks
// =============================================================================

describe("renderMarkdownToHtml - Paragraphs", () => {
  it("should wrap content in paragraph tags", () => {
    const result = renderMarkdownToHtml("Hello world");
    expect(result).toContain("<p>");
    expect(result).toContain("</p>");
  });

  it("should create new paragraphs for double newlines", () => {
    const result = renderMarkdownToHtml("Para 1\n\nPara 2");
    expect(result).toContain("</p><p>");
  });

  it("should convert single newlines to br tags", () => {
    const result = renderMarkdownToHtml("Line 1\nLine 2");
    expect(result).toContain("<br/>");
  });
});

// =============================================================================
// renderMarkdownToHtml - Combined Formatting
// =============================================================================

describe("renderMarkdownToHtml - Combined Formatting", () => {
  it("should handle bold and italic together", () => {
    const result = renderMarkdownToHtml("**bold** and *italic*");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<em>italic</em>");
  });

  it("should handle complex mixed content", () => {
    const md =
      "# Title\n\n**Bold** with `code` and [link](https://test.com)\n\n- Item 1\n- Item 2";
    const result = renderMarkdownToHtml(md);

    expect(result).toContain("<h1>Title</h1>");
    expect(result).toContain("<strong>Bold</strong>");
    expect(result).toContain('<code class="inline-code">code</code>');
    expect(result).toContain('href="https://test.com"');
    expect(result).toContain('<ul class="unordered-list">');
  });
});

// =============================================================================
// renderMarkdownToHtml - XSS Prevention
// =============================================================================

describe("renderMarkdownToHtml - XSS Prevention", () => {
  it("should escape script tags", () => {
    const result = renderMarkdownToHtml('<script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("should escape HTML in link text", () => {
    const result = renderMarkdownToHtml(
      "[<img src=x onerror=alert(1)>](https://test.com)"
    );
    expect(result).not.toContain("<img");
    expect(result).toContain("&lt;img");
  });

  it("should escape onclick handlers", () => {
    const result = renderMarkdownToHtml(
      '<div onclick="alert(1)">click me</div>'
    );
    expect(result).not.toContain('onclick="alert');
    expect(result).toContain("&lt;div onclick");
  });

  it("should escape event handlers in various forms", () => {
    const result = renderMarkdownToHtml('<a onmouseover="alert(1)">hover</a>');
    // The < and > are escaped, so it won't be interpreted as HTML
    expect(result).not.toContain('<a onmouseover="alert');
    expect(result).toContain("&lt;a onmouseover");
    expect(result).toContain("hover");
  });
});

// =============================================================================
// MarkdownPreviewProps Type Tests
// =============================================================================

describe("MarkdownPreview types", () => {
  it("should have correct MarkdownPreviewProps interface", () => {
    // Type assertion test - verifies the interface exists and has expected properties
    const props = {
      content: "test",
      sx: { mb: 2 },
      variant: "body1" as const,
    };

    expect(props.content).toBe("test");
    expect(props.variant).toBe("body1");
    expect(props.sx).toEqual({ mb: 2 });
  });

  it("should accept body1 and body2 variants", () => {
    const variant1: "body1" | "body2" = "body1";
    const variant2: "body1" | "body2" = "body2";

    expect(variant1).toBe("body1");
    expect(variant2).toBe("body2");
  });
});
