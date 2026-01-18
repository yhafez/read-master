/**
 * Tests for POST /api/books/import-url endpoint
 */

import { describe, it, expect } from "vitest";

import {
  importUrlSchema,
  extractArticleFromHtml,
  extractMetaContent,
  extractTitle,
  extractFirstHeading,
  extractMainContent,
  getDomainFromUrl,
  cleanTitle,
  decodeHtmlEntities,
  isHtmlContentType,
  isTextContentType,
  MAX_CONTENT_SIZE,
  FETCH_TIMEOUT_MS,
  USER_AGENT,
} from "./import-url.js";

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("importUrlSchema", () => {
  describe("url validation", () => {
    it("should accept valid https URL", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com/article",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toBe("https://example.com/article");
      }
    });

    it("should accept valid http URL", () => {
      const result = importUrlSchema.safeParse({
        url: "http://example.com/article",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty URL", () => {
      const result = importUrlSchema.safeParse({ url: "" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid URL format", () => {
      const result = importUrlSchema.safeParse({ url: "not-a-url" });
      expect(result.success).toBe(false);
    });

    it("should reject non-http(s) protocols", () => {
      const result = importUrlSchema.safeParse({ url: "ftp://example.com" });
      expect(result.success).toBe(false);
    });

    it("should reject javascript: protocol", () => {
      const result = importUrlSchema.safeParse({
        url: "javascript:alert('xss')",
      });
      expect(result.success).toBe(false);
    });

    it("should reject file: protocol", () => {
      const result = importUrlSchema.safeParse({
        url: "file:///etc/passwd",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("title validation", () => {
    it("should accept valid title", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        title: "My Article",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("My Article");
      }
    });

    it("should trim title", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        title: "  My Article  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("My Article");
      }
    });

    it("should reject title over 500 characters", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        title: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("should allow undefined title", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBeUndefined();
      }
    });
  });

  describe("author validation", () => {
    it("should accept valid author", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        author: "John Doe",
      });
      expect(result.success).toBe(true);
    });

    it("should reject author over 200 characters", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        author: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("should allow null author", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        author: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("tags validation", () => {
    it("should accept valid tags array", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        tags: ["tech", "programming"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject more than 20 tags", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        tags: Array(21).fill("tag"),
      });
      expect(result.success).toBe(false);
    });

    it("should reject tags longer than 50 characters", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        tags: ["a".repeat(51)],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("language validation", () => {
    it("should accept 2-character language code", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        language: "es",
      });
      expect(result.success).toBe(true);
    });

    it("should reject non-2-character language code", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        language: "eng",
      });
      expect(result.success).toBe(false);
    });

    it("should use provided language or leave undefined", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
      });
      expect(result.success).toBe(true);
      // Language defaults when explicitly provided, otherwise undefined
      if (result.success) {
        // Since language is optional, it's undefined when not provided
        expect(result.data.language).toBeUndefined();
      }
    });
  });

  describe("isPublic validation", () => {
    it("should accept boolean true", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
        isPublic: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublic).toBe(true);
      }
    });

    it("should leave undefined when not provided", () => {
      const result = importUrlSchema.safeParse({
        url: "https://example.com",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // Since isPublic is optional with .optional(), it's undefined when not provided
        expect(result.data.isPublic).toBeUndefined();
      }
    });
  });
});

// ============================================================================
// HTML Extraction Tests
// ============================================================================

describe("extractMetaContent", () => {
  it("should extract content from name attribute", () => {
    const html = '<meta name="author" content="John Doe">';
    expect(extractMetaContent(html, "author")).toBe("John Doe");
  });

  it("should extract content when content comes before name", () => {
    const html = '<meta content="John Doe" name="author">';
    expect(extractMetaContent(html, "author")).toBe("John Doe");
  });

  it("should extract content from property attribute (Open Graph)", () => {
    const html = '<meta property="og:title" content="My Article">';
    expect(extractMetaContent(html, "og:title")).toBe("My Article");
  });

  it("should extract content when content comes before property", () => {
    const html = '<meta content="My Article" property="og:title">';
    expect(extractMetaContent(html, "og:title")).toBe("My Article");
  });

  it("should return null when meta tag not found", () => {
    const html = "<html><head></head></html>";
    expect(extractMetaContent(html, "author")).toBeNull();
  });

  it("should decode HTML entities in content", () => {
    const html = '<meta name="title" content="Tom &amp; Jerry">';
    expect(extractMetaContent(html, "title")).toBe("Tom & Jerry");
  });
});

describe("extractTitle", () => {
  it("should extract title from title tag", () => {
    const html = "<title>My Page Title</title>";
    expect(extractTitle(html)).toBe("My Page Title");
  });

  it("should trim whitespace", () => {
    const html = "<title>  My Page Title  </title>";
    expect(extractTitle(html)).toBe("My Page Title");
  });

  it("should return null when no title tag", () => {
    const html = "<html><head></head></html>";
    expect(extractTitle(html)).toBeNull();
  });

  it("should decode HTML entities", () => {
    const html = "<title>Tom &amp; Jerry</title>";
    expect(extractTitle(html)).toBe("Tom & Jerry");
  });
});

describe("extractFirstHeading", () => {
  it("should extract h1 heading", () => {
    const html = "<h1>Main Heading</h1>";
    expect(extractFirstHeading(html)).toBe("Main Heading");
  });

  it("should extract h1 with attributes", () => {
    const html = '<h1 class="title">Main Heading</h1>';
    expect(extractFirstHeading(html)).toBe("Main Heading");
  });

  it("should return null when no h1", () => {
    const html = "<h2>Subheading</h2>";
    expect(extractFirstHeading(html)).toBeNull();
  });

  it("should return null when h1 contains nested HTML (current behavior)", () => {
    // Current regex only extracts direct text content
    const html = "<h1><span>Main</span> Heading</h1>";
    // The regex [^<]* doesn't match nested tags, so it returns null
    expect(extractFirstHeading(html)).toBeNull();
  });

  it("should extract h1 with direct text content", () => {
    const html = "<h1>Main Heading</h1>";
    expect(extractFirstHeading(html)).toBe("Main Heading");
  });
});

describe("extractMainContent", () => {
  it("should extract content from article tag", () => {
    const html = `
      <html><body>
        <header>Nav</header>
        <article>Article content here</article>
        <footer>Footer</footer>
      </body></html>
    `;
    const result = extractMainContent(html);
    expect(result).toContain("Article content here");
    expect(result).not.toContain("Nav");
    expect(result).not.toContain("Footer");
  });

  it("should extract content from main tag", () => {
    const html = `
      <html><body>
        <nav>Navigation</nav>
        <main>Main content here</main>
        <aside>Sidebar</aside>
      </body></html>
    `;
    const result = extractMainContent(html);
    expect(result).toContain("Main content here");
  });

  it("should extract content from div with content class", () => {
    const html = `
      <html><body>
        <div class="sidebar">Sidebar</div>
        <div class="content">Main content here</div>
      </body></html>
    `;
    const result = extractMainContent(html);
    expect(result).toContain("Main content here");
  });

  it("should remove script tags", () => {
    const html = `
      <html><body>
        <script>alert('test')</script>
        <p>Content</p>
      </body></html>
    `;
    const result = extractMainContent(html);
    expect(result).not.toContain("alert");
    expect(result).toContain("Content");
  });

  it("should remove style tags", () => {
    const html = `
      <html><body>
        <style>.red { color: red; }</style>
        <p>Content</p>
      </body></html>
    `;
    const result = extractMainContent(html);
    expect(result).not.toContain("color: red");
    expect(result).toContain("Content");
  });
});

describe("getDomainFromUrl", () => {
  it("should extract domain from URL", () => {
    expect(getDomainFromUrl("https://example.com/path")).toBe("example.com");
  });

  it("should remove www prefix", () => {
    expect(getDomainFromUrl("https://www.example.com/path")).toBe(
      "example.com"
    );
  });

  it("should handle subdomain", () => {
    expect(getDomainFromUrl("https://blog.example.com")).toBe(
      "blog.example.com"
    );
  });

  it("should return 'Unknown Source' for invalid URL", () => {
    expect(getDomainFromUrl("not-a-url")).toBe("Unknown Source");
  });
});

describe("cleanTitle", () => {
  it("should remove site name with pipe separator", () => {
    expect(cleanTitle("Article Title | Example Site", "Example Site")).toBe(
      "Article Title"
    );
  });

  it("should remove site name with dash separator", () => {
    expect(cleanTitle("Article Title - Example Site", "Example Site")).toBe(
      "Article Title"
    );
  });

  it("should remove site name with en dash separator", () => {
    expect(cleanTitle("Article Title – Example Site", "Example Site")).toBe(
      "Article Title"
    );
  });

  it("should not modify title without site name", () => {
    expect(cleanTitle("Article Title", "Example Site")).toBe("Article Title");
  });

  it("should handle null site name", () => {
    expect(cleanTitle("Article Title | Site", null)).toBe(
      "Article Title | Site"
    );
  });
});

describe("decodeHtmlEntities", () => {
  it("should decode &amp;", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("should decode &lt; and &gt;", () => {
    expect(decodeHtmlEntities("&lt;div&gt;")).toBe("<div>");
  });

  it("should decode &quot;", () => {
    expect(decodeHtmlEntities("Say &quot;Hello&quot;")).toBe('Say "Hello"');
  });

  it("should decode &#039; and &apos;", () => {
    expect(decodeHtmlEntities("It&#039;s great")).toBe("It's great");
    expect(decodeHtmlEntities("It&apos;s great")).toBe("It's great");
  });

  it("should decode numeric entities", () => {
    expect(decodeHtmlEntities("&#65;")).toBe("A");
  });

  it("should decode hex entities", () => {
    expect(decodeHtmlEntities("&#x41;")).toBe("A");
  });

  it("should decode &nbsp;", () => {
    expect(decodeHtmlEntities("Hello&nbsp;World")).toBe("Hello World");
  });
});

describe("extractArticleFromHtml", () => {
  it("should extract complete article data from HTML", () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Test Article - My Site</title>
        <meta property="og:title" content="Test Article">
        <meta property="og:description" content="This is a test article">
        <meta property="og:site_name" content="My Site">
        <meta name="author" content="John Doe">
        <meta property="article:published_time" content="2024-01-15">
      </head>
      <body>
        <header><nav>Navigation</nav></header>
        <article>
          <h1>Test Article</h1>
          <p>This is the content of the test article. It has multiple paragraphs.</p>
          <p>Second paragraph with more content here.</p>
        </article>
        <footer>Footer content</footer>
      </body>
      </html>
    `;

    const result = extractArticleFromHtml(html, "https://example.com/article");

    expect(result.title).toBe("Test Article");
    expect(result.author).toBe("John Doe");
    expect(result.excerpt).toBe("This is a test article");
    expect(result.siteName).toBe("My Site");
    expect(result.publishedDate).toBe("2024-01-15");
    expect(result.language).toBe("en");
    expect(result.textContent).toContain("content of the test article");
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.estimatedReadTime).toBeGreaterThan(0);
  });

  it("should use domain as fallback for title", () => {
    const html = "<html><body><p>Some content</p></body></html>";
    const result = extractArticleFromHtml(html, "https://example.com/page");
    expect(result.title).toBe("example.com");
  });

  it("should handle minimal HTML", () => {
    const html = "<p>Simple text content</p>";
    const result = extractArticleFromHtml(html, "https://example.com");
    expect(result.textContent).toContain("Simple text content");
    expect(result.wordCount).toBe(3);
  });

  it("should extract from JSON-LD author", () => {
    const html = `
      <html>
      <head>
        <script type="application/ld+json">
          {"@type": "Article", "author": {"name": "Jane Smith"}}
        </script>
      </head>
      <body><p>Content</p></body>
      </html>
    `;
    const result = extractArticleFromHtml(html, "https://example.com");
    expect(result.author).toBe("Jane Smith");
  });

  it("should extract from JSON-LD author string", () => {
    const html = `
      <html>
      <head>
        <script type="application/ld+json">
          {"@type": "Article", "author": "Jane Smith"}
        </script>
      </head>
      <body><p>Content</p></body>
      </html>
    `;
    const result = extractArticleFromHtml(html, "https://example.com");
    expect(result.author).toBe("Jane Smith");
  });
});

// ============================================================================
// Content Type Detection Tests
// ============================================================================

describe("isHtmlContentType", () => {
  it("should return true for text/html", () => {
    expect(isHtmlContentType("text/html")).toBe(true);
  });

  it("should return true for text/html with charset", () => {
    expect(isHtmlContentType("text/html; charset=utf-8")).toBe(true);
  });

  it("should return true for application/xhtml+xml", () => {
    expect(isHtmlContentType("application/xhtml+xml")).toBe(true);
  });

  it("should return true for application/xml", () => {
    expect(isHtmlContentType("application/xml")).toBe(true);
  });

  it("should return false for text/plain", () => {
    expect(isHtmlContentType("text/plain")).toBe(false);
  });

  it("should return false for application/json", () => {
    expect(isHtmlContentType("application/json")).toBe(false);
  });
});

describe("isTextContentType", () => {
  it("should return true for text/plain", () => {
    expect(isTextContentType("text/plain")).toBe(true);
  });

  it("should return true for text/plain with charset", () => {
    expect(isTextContentType("text/plain; charset=utf-8")).toBe(true);
  });

  it("should return true for text/markdown", () => {
    expect(isTextContentType("text/markdown")).toBe(true);
  });

  it("should return false for text/html", () => {
    expect(isTextContentType("text/html")).toBe(false);
  });

  it("should return false for application/json", () => {
    expect(isTextContentType("application/json")).toBe(false);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("constants", () => {
  it("should have MAX_CONTENT_SIZE of 10MB", () => {
    expect(MAX_CONTENT_SIZE).toBe(10 * 1024 * 1024);
  });

  it("should have FETCH_TIMEOUT_MS of 30 seconds", () => {
    expect(FETCH_TIMEOUT_MS).toBe(30000);
  });

  it("should have appropriate USER_AGENT", () => {
    expect(USER_AGENT).toContain("ReadMaster");
    expect(USER_AGENT).toContain("compatible");
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("edge cases", () => {
  describe("extractArticleFromHtml edge cases", () => {
    it("should handle empty HTML", () => {
      const result = extractArticleFromHtml("", "https://example.com");
      expect(result.title).toBe("example.com");
      expect(result.wordCount).toBe(0);
    });

    it("should handle HTML with only scripts", () => {
      const html = "<script>var x = 1;</script><script>var y = 2;</script>";
      const result = extractArticleFromHtml(html, "https://example.com");
      expect(result.textContent.trim()).toBe("");
    });

    it("should handle nested HTML entities", () => {
      const html = '<meta name="description" content="A &amp;amp; B">';
      const content = extractMetaContent(html, "description");
      expect(content).toBe("A &amp; B");
    });

    it("should handle malformed HTML", () => {
      const html = "<html><head<title>Broken</head><body>Content</bod";
      // Should not throw, should extract what it can
      const result = extractArticleFromHtml(html, "https://example.com");
      expect(result).toBeDefined();
    });

    it("should handle very long content", () => {
      const longParagraph = "<p>" + "word ".repeat(10000) + "</p>";
      const html = `<article>${longParagraph}</article>`;
      const result = extractArticleFromHtml(html, "https://example.com");
      expect(result.wordCount).toBe(10000);
    });
  });

  describe("URL edge cases", () => {
    it("should handle URL with port (returns hostname only)", () => {
      // URL.hostname returns host without port
      expect(getDomainFromUrl("https://example.com:8080/path")).toBe(
        "example.com"
      );
    });

    it("should handle URL with authentication (strips it)", () => {
      // URLs with auth are deprecated but should not throw
      const url = "https://user:pass@example.com/path";
      expect(getDomainFromUrl(url)).toBe("example.com");
    });

    it("should handle localhost (returns hostname only)", () => {
      // URL.hostname returns host without port
      expect(getDomainFromUrl("http://localhost:3000")).toBe("localhost");
    });

    it("should handle IP address", () => {
      expect(getDomainFromUrl("http://192.168.1.1/page")).toBe("192.168.1.1");
    });
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe("full extraction workflow", () => {
  it("should extract Wikipedia-style article", () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Albert Einstein - Wikipedia</title>
        <meta property="og:title" content="Albert Einstein">
        <meta property="og:site_name" content="Wikipedia">
        <meta name="description" content="German-born theoretical physicist">
      </head>
      <body>
        <div id="content" class="mw-body">
          <h1>Albert Einstein</h1>
          <div class="mw-parser-output">
            <p>Albert Einstein was a German-born theoretical physicist who developed the theory of relativity.</p>
            <p>He received the Nobel Prize in Physics in 1921.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = extractArticleFromHtml(
      html,
      "https://en.wikipedia.org/wiki/Albert_Einstein"
    );

    expect(result.title).toBe("Albert Einstein");
    expect(result.siteName).toBe("Wikipedia");
    expect(result.excerpt).toBe("German-born theoretical physicist");
    expect(result.textContent).toContain("theoretical physicist");
    expect(result.textContent).toContain("Nobel Prize");
  });

  it("should extract Medium-style article", () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>How to Learn Programming | Medium</title>
        <meta property="og:title" content="How to Learn Programming">
        <meta property="og:description" content="A comprehensive guide">
        <meta property="og:site_name" content="Medium">
        <meta name="author" content="Tech Writer">
        <meta property="article:published_time" content="2024-03-15T10:00:00Z">
      </head>
      <body>
        <article>
          <h1>How to Learn Programming</h1>
          <section>
            <p>Learning to program is a valuable skill in today's digital world.</p>
            <p>Start with the basics and build your way up.</p>
          </section>
        </article>
      </body>
      </html>
    `;

    const result = extractArticleFromHtml(html, "https://medium.com/article");

    expect(result.title).toBe("How to Learn Programming");
    expect(result.author).toBe("Tech Writer");
    expect(result.siteName).toBe("Medium");
    expect(result.publishedDate).toBe("2024-03-15T10:00:00Z");
    expect(result.textContent).toContain("valuable skill");
  });

  it("should extract news article", () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Breaking News Story - News Site</title>
        <meta property="og:title" content="Breaking News Story">
        <meta property="og:description" content="Latest developments">
        <meta name="article:author" content="Jane Reporter">
        <script type="application/ld+json">
          {
            "@type": "NewsArticle",
            "datePublished": "2024-03-20",
            "author": {"@type": "Person", "name": "Jane Reporter"}
          }
        </script>
      </head>
      <body>
        <main>
          <article class="story">
            <h1>Breaking News Story</h1>
            <p class="lead">This is the lead paragraph with important information.</p>
            <p>More details about the story follow here with additional context.</p>
          </article>
        </main>
      </body>
      </html>
    `;

    const result = extractArticleFromHtml(
      html,
      "https://news.example.com/story"
    );

    expect(result.title).toBe("Breaking News Story");
    expect(result.author).toBe("Jane Reporter");
    expect(result.publishedDate).toBe("2024-03-20");
    expect(result.textContent).toContain("lead paragraph");
  });
});
