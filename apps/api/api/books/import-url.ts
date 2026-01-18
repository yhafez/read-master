/**
 * POST /api/books/import-url
 *
 * Import a book/article from a URL into the user's library.
 *
 * This endpoint:
 * - Accepts a URL and optional metadata
 * - Validates the URL format
 * - Fetches content from the URL
 * - Extracts text from HTML/articles
 * - Checks user's tier limits (free: 3 books)
 * - Creates a Book record in the database
 * - Stores content for personal use
 *
 * @example
 * ```bash
 * curl -X POST /api/books/import-url \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"url": "https://example.com/article", "title": "My Article"}'
 * ```
 */

import type { VercelResponse } from "@vercel/node";
import { z } from "zod";

import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import {
  sendCreated,
  sendError,
  ErrorCodes,
} from "../../src/utils/response.js";
import { logger } from "../../src/utils/logger.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import {
  countWords,
  calculateReadingTime,
  stripHtmlTags,
} from "../../src/services/books.js";
import { getTierLimits, isWithinLimit } from "@read-master/shared";
import type { BookSource } from "@read-master/database";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of extracting article content from HTML
 */
type ExtractedArticle = {
  title: string;
  content: string;
  textContent: string;
  excerpt: string | null;
  author: string | null;
  publishedDate: string | null;
  siteName: string | null;
  language: string | null;
  wordCount: number;
  estimatedReadTime: number;
};

/**
 * Fetch result with content and metadata
 */
type FetchResult = {
  content: string;
  contentType: string;
  url: string;
  finalUrl: string;
  statusCode: number;
};

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * URL import request validation schema
 */
const importUrlSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .url("Invalid URL format")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ["http:", "https:"].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: "URL must use http or https protocol" }
    ),
  title: z
    .string()
    .trim()
    .min(1, "Title is required if provided")
    .max(500, "Title must be at most 500 characters")
    .optional(),
  author: z
    .string()
    .trim()
    .max(200, "Author must be at most 200 characters")
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(50000, "Description must be at most 50,000 characters")
    .optional()
    .nullable(),
  genre: z
    .string()
    .trim()
    .max(100, "Genre must be at most 100 characters")
    .optional()
    .nullable(),
  tags: z
    .array(z.string().max(50))
    .max(20, "Maximum 20 tags allowed")
    .optional(),
  language: z.string().length(2).default("en").optional(),
  isPublic: z.boolean().default(false).optional(),
});

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum content size to fetch (10MB)
 */
const MAX_CONTENT_SIZE = 10 * 1024 * 1024;

/**
 * Fetch timeout in milliseconds (30 seconds)
 */
const FETCH_TIMEOUT_MS = 30000;

/**
 * User agent for fetching URLs
 */
const USER_AGENT =
  "Mozilla/5.0 (compatible; ReadMaster/1.0; +https://readmaster.app/bot)";

/**
 * Content types that indicate HTML content
 */
const HTML_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "application/xml",
];

/**
 * Content types that indicate plain text
 */
const TEXT_CONTENT_TYPES = ["text/plain", "text/markdown"];

// ============================================================================
// Article Extraction Helpers
// ============================================================================

/**
 * Extract the main content from HTML using heuristics
 * This is a simplified implementation that extracts:
 * - Title from <title> or <h1>
 * - Author from meta tags
 * - Main content from <article>, <main>, or largest text block
 */
function extractArticleFromHtml(html: string, url: string): ExtractedArticle {
  // Extract title
  let title =
    extractMetaContent(html, "og:title") ||
    extractMetaContent(html, "twitter:title") ||
    extractTitle(html) ||
    extractFirstHeading(html) ||
    getDomainFromUrl(url);

  // Extract author
  const author =
    extractMetaContent(html, "author") ||
    extractMetaContent(html, "article:author") ||
    extractMetaContent(html, "twitter:creator") ||
    extractJsonLdAuthor(html);

  // Extract description/excerpt
  const excerpt =
    extractMetaContent(html, "og:description") ||
    extractMetaContent(html, "description") ||
    extractMetaContent(html, "twitter:description");

  // Extract published date
  const publishedDate =
    extractMetaContent(html, "article:published_time") ||
    extractMetaContent(html, "date") ||
    extractMetaContent(html, "datePublished") ||
    extractJsonLdDate(html);

  // Extract site name
  const siteName =
    extractMetaContent(html, "og:site_name") || getDomainFromUrl(url);

  // Extract language
  const language = extractHtmlLang(html) || "en";

  // Extract main content
  const mainContent = extractMainContent(html);
  const textContent = stripHtmlTags(mainContent);

  // Calculate word count and reading time
  const wordCount = countWords(textContent);
  const estimatedReadTime = calculateReadingTime(wordCount);

  // Clean up title
  title = cleanTitle(title, siteName);

  return {
    title,
    content: mainContent,
    textContent,
    excerpt,
    author,
    publishedDate,
    siteName,
    language,
    wordCount,
    estimatedReadTime,
  };
}

/**
 * Extract content from meta tags
 */
function extractMetaContent(html: string, name: string): string | null {
  // Try name attribute
  const nameMatch = html.match(
    new RegExp(
      `<meta[^>]*name=["']${escapeRegex(name)}["'][^>]*content=["']([^"']*)["']`,
      "i"
    )
  );
  if (nameMatch?.[1]) return decodeHtmlEntities(nameMatch[1]);

  // Try content before name
  const contentFirstMatch = html.match(
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${escapeRegex(name)}["']`,
      "i"
    )
  );
  if (contentFirstMatch?.[1]) return decodeHtmlEntities(contentFirstMatch[1]);

  // Try property attribute (for Open Graph)
  const propertyMatch = html.match(
    new RegExp(
      `<meta[^>]*property=["']${escapeRegex(name)}["'][^>]*content=["']([^"']*)["']`,
      "i"
    )
  );
  if (propertyMatch?.[1]) return decodeHtmlEntities(propertyMatch[1]);

  // Try content before property
  const contentPropertyMatch = html.match(
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${escapeRegex(name)}["']`,
      "i"
    )
  );
  if (contentPropertyMatch?.[1])
    return decodeHtmlEntities(contentPropertyMatch[1]);

  return null;
}

/**
 * Extract title from <title> tag
 */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

/**
 * Extract first h1 heading
 */
function extractFirstHeading(html: string): string | null {
  const match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  return match?.[1] ? stripHtmlTags(decodeHtmlEntities(match[1].trim())) : null;
}

/**
 * Extract language from <html lang="">
 */
function extractHtmlLang(html: string): string | null {
  const match = html.match(/<html[^>]*lang=["']([a-z]{2})(?:-[A-Z]{2})?["']/i);
  return match?.[1] || null;
}

/**
 * Extract author from JSON-LD
 */
function extractJsonLdAuthor(html: string): string | null {
  const match = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match?.[1]) return null;

  try {
    const data = JSON.parse(match[1]) as Record<string, unknown>;
    const author = data.author as
      | string
      | { name?: string }
      | Array<{ name?: string }>;
    if (typeof author === "string") return author;
    if (Array.isArray(author) && author[0]?.name) return author[0].name;
    if (author && typeof author === "object" && "name" in author)
      return author.name || null;
  } catch {
    // Ignore JSON parse errors
  }
  return null;
}

/**
 * Extract published date from JSON-LD
 */
function extractJsonLdDate(html: string): string | null {
  const match = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match?.[1]) return null;

  try {
    const data = JSON.parse(match[1]) as Record<string, unknown>;
    if (typeof data.datePublished === "string") return data.datePublished;
    if (typeof data.dateCreated === "string") return data.dateCreated;
  } catch {
    // Ignore JSON parse errors
  }
  return null;
}

/**
 * Extract main content from HTML
 * Uses a priority-based approach to find the most likely content area
 */
function extractMainContent(html: string): string {
  // Remove script and style tags first
  const cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Try to find main content area in priority order
  const contentSelectors = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
    /<div[^>]*class=["'][^"']*(?:content|article|post|entry|story)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*id=["'](?:content|article|post|main)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
  ];

  for (const selector of contentSelectors) {
    const matches = [...cleaned.matchAll(selector)];
    if (matches.length > 0) {
      // Use the longest match (most content)
      let longestMatch = matches[0];
      for (const match of matches) {
        if ((match[1]?.length || 0) > (longestMatch?.[1]?.length || 0)) {
          longestMatch = match;
        }
      }
      if (longestMatch?.[1]) {
        return longestMatch[1];
      }
    }
  }

  // Fallback: extract body content
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) {
    // Remove common non-content elements
    return bodyMatch[1]
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, "");
  }

  // Last resort: return cleaned HTML
  return cleaned;
}

/**
 * Get domain name from URL
 */
function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Unknown Source";
  }
}

/**
 * Clean title by removing site name suffix
 */
function cleanTitle(title: string, siteName: string | null): string {
  if (!siteName) return title;

  // Remove common separators with site name
  const separators = [" | ", " - ", " – ", " — ", " :: ", " » "];
  for (const sep of separators) {
    if (title.endsWith(`${sep}${siteName}`)) {
      return title.slice(0, -(sep.length + siteName.length)).trim();
    }
  }
  return title;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// URL Fetching
// ============================================================================

/**
 * Fetch content from a URL with timeout and size limits
 */
async function fetchUrl(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_CONTENT_SIZE) {
      throw new Error(
        `Content too large: ${Math.round(parseInt(contentLength, 10) / 1024 / 1024)}MB exceeds ${MAX_CONTENT_SIZE / 1024 / 1024}MB limit`
      );
    }

    // Get content type
    const contentType =
      response.headers.get("content-type") || "text/html; charset=utf-8";

    // Read the content
    const content = await response.text();

    // Verify size after reading
    if (content.length > MAX_CONTENT_SIZE) {
      throw new Error(
        `Content too large: ${Math.round(content.length / 1024 / 1024)}MB exceeds ${MAX_CONTENT_SIZE / 1024 / 1024}MB limit`
      );
    }

    return {
      content,
      contentType,
      url,
      finalUrl: response.url,
      statusCode: response.status,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  }
}

/**
 * Check if content type is HTML
 */
function isHtmlContentType(contentType: string): boolean {
  const type = contentType.split(";")[0]?.trim().toLowerCase() || "";
  return HTML_CONTENT_TYPES.includes(type);
}

/**
 * Check if content type is plain text
 */
function isTextContentType(contentType: string): boolean {
  const type = contentType.split(";")[0]?.trim().toLowerCase() || "";
  return TEXT_CONTENT_TYPES.includes(type);
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle URL import request
 */
async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== "POST") {
    sendError(
      res,
      ErrorCodes.VALIDATION_ERROR,
      "Method not allowed. Use POST.",
      405
    );
    return;
  }

  const { userId } = req.auth;

  try {
    // Validate request body
    const validationResult = importUrlSchema.safeParse(req.body);
    if (!validationResult.success) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Invalid request body",
        400,
        validationResult.error.flatten()
      );
      return;
    }

    const { url, title, author, description, genre, tags, language, isPublic } =
      validationResult.data;

    // Get user from database
    const user = await getUserByClerkId(userId);
    if (!user) {
      sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
      return;
    }

    // Get book count for tier limit check
    const bookCount = await db.book.count({
      where: {
        userId: user.id,
        deletedAt: null,
      },
    });

    // Check tier limits
    if (!isWithinLimit(bookCount, user.tier, "maxBooks")) {
      const limits = getTierLimits(user.tier);
      sendError(
        res,
        ErrorCodes.FORBIDDEN,
        `You have reached your book limit (${limits.maxBooks} books). Upgrade to Pro for unlimited books.`,
        403
      );
      return;
    }

    // Fetch content from URL
    let fetchResult: FetchResult;
    try {
      fetchResult = await fetchUrl(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch URL";
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        `Failed to fetch URL: ${message}`,
        400
      );
      return;
    }

    // Extract content based on content type
    let extractedContent: ExtractedArticle;

    if (isHtmlContentType(fetchResult.contentType)) {
      // Extract article from HTML
      extractedContent = extractArticleFromHtml(
        fetchResult.content,
        fetchResult.finalUrl
      );
    } else if (isTextContentType(fetchResult.contentType)) {
      // Plain text content
      const textContent = fetchResult.content;
      const wordCount = countWords(textContent);
      extractedContent = {
        title: title || getDomainFromUrl(fetchResult.finalUrl),
        content: textContent,
        textContent,
        excerpt:
          textContent.slice(0, 200) + (textContent.length > 200 ? "..." : ""),
        author: null,
        publishedDate: null,
        siteName: getDomainFromUrl(fetchResult.finalUrl),
        language: "en",
        wordCount,
        estimatedReadTime: calculateReadingTime(wordCount),
      };
    } else {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        `Unsupported content type: ${fetchResult.contentType}. Only HTML and plain text are supported.`,
        400
      );
      return;
    }

    // Validate extracted content
    if (
      !extractedContent.textContent ||
      extractedContent.textContent.trim().length < 10
    ) {
      sendError(
        res,
        ErrorCodes.VALIDATION_ERROR,
        "Could not extract meaningful content from the URL. The page may be empty, require JavaScript, or block automated access.",
        400
      );
      return;
    }

    // Determine final metadata (user-provided takes precedence)
    const finalTitle = title || extractedContent.title || "Untitled";
    const finalAuthor = author ?? extractedContent.author;
    const finalDescription =
      description ?? extractedContent.excerpt ?? extractedContent.siteName;
    const finalLanguage = language ?? extractedContent.language ?? "en";

    // Create book record in database
    const book = await db.book.create({
      data: {
        userId: user.id,
        title: finalTitle,
        author: finalAuthor,
        description: finalDescription,
        source: "URL" as BookSource,
        sourceUrl: fetchResult.finalUrl,
        fileType: "HTML",
        filePath: null, // Content stored inline for URL imports
        coverImage: null,
        wordCount: extractedContent.wordCount,
        estimatedReadTime: extractedContent.estimatedReadTime,
        genre: genre ?? null,
        tags: tags ?? [],
        language: finalLanguage,
        isPublic: isPublic ?? false,
        status: "WANT_TO_READ",
        // Store raw content - in production this would go to R2
        // For now, we're not storing the full content since we don't have
        // the rawContent field in the schema, but we have the URL
      },
      include: {
        chapters: true,
      },
    });

    // Log the import
    logger.info("Book imported from URL successfully", {
      userId: user.id,
      bookId: book.id,
      url: fetchResult.finalUrl,
      wordCount: extractedContent.wordCount,
    });

    // Return created book
    sendCreated(res, {
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      source: book.source,
      sourceUrl: book.sourceUrl,
      fileType: book.fileType,
      coverImage: book.coverImage,
      wordCount: book.wordCount,
      estimatedReadTime: book.estimatedReadTime,
      genre: book.genre,
      tags: book.tags,
      language: book.language,
      isPublic: book.isPublic,
      status: book.status,
      createdAt: book.createdAt.toISOString(),
      // Include extraction metadata
      extractedData: {
        siteName: extractedContent.siteName,
        publishedDate: extractedContent.publishedDate,
        originalUrl: url,
        finalUrl: fetchResult.finalUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error importing book from URL", { userId, error: message });
    sendError(
      res,
      ErrorCodes.INTERNAL_ERROR,
      "Failed to import from URL. Please try again.",
      500
    );
  }
}

export default withAuth(handler);

// ============================================================================
// Exports for testing
// ============================================================================

export {
  importUrlSchema,
  extractArticleFromHtml,
  extractMetaContent,
  extractTitle,
  extractFirstHeading,
  extractMainContent,
  getDomainFromUrl,
  cleanTitle,
  decodeHtmlEntities,
  fetchUrl,
  isHtmlContentType,
  isTextContentType,
  MAX_CONTENT_SIZE,
  FETCH_TIMEOUT_MS,
  USER_AGENT,
  type ExtractedArticle,
  type FetchResult,
};
