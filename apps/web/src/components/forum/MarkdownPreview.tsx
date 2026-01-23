/**
 * MarkdownPreview Component
 *
 * Renders markdown content as HTML with proper styling.
 * Used for displaying forum posts, replies, and other markdown content.
 */

import React, { useMemo } from "react";
import { Box, Typography, type SxProps, type Theme } from "@mui/material";

// ============================================================================
// Types
// ============================================================================

export interface MarkdownPreviewProps {
  /** The markdown content to render */
  content: string;
  /** Additional styles to apply to the container */
  sx?: SxProps<Theme>;
  /** Variant for text styling */
  variant?: "body1" | "body2";
}

// ============================================================================
// Markdown Rendering
// ============================================================================

/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renders markdown to HTML with sanitization
 * Supports: bold, italic, code, links, blockquotes, lists, headers
 */
export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = escapeHtml(markdown);

  // Headers (h1-h3)
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Code blocks (must be before inline code)
  html = html.replace(
    /```([\s\S]*?)```/g,
    '<pre class="code-block"><code>$1</code></pre>'
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold (must be before italic)
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Links (with sanitization - only allow http, https, mailto protocols)
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, (_match, text, url) => {
    // Sanitize URL - only allow safe protocols
    const sanitizedUrl = url.trim();
    if (
      sanitizedUrl.startsWith("http://") ||
      sanitizedUrl.startsWith("https://") ||
      sanitizedUrl.startsWith("mailto:")
    ) {
      return `<a href="${escapeHtml(sanitizedUrl)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
    // Return just the text if URL is not safe
    return text;
  });

  // Blockquotes (note: > is already escaped as &gt;)
  html = html.replace(
    /^&gt; (.+)$/gm,
    '<blockquote class="blockquote">$1</blockquote>'
  );

  // Unordered lists (simple - single level)
  html = html.replace(/^- (.+)$/gm, '<li class="list-item">$1</li>');
  // Wrap consecutive li elements in ul
  html = html.replace(
    /(<li class="list-item">.*<\/li>\n?)+/g,
    '<ul class="unordered-list">$&</ul>'
  );

  // Ordered lists (simple - single level)
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ordered-item">$1</li>');
  // Wrap consecutive ordered li elements in ol
  html = html.replace(
    /(<li class="ordered-item">.*<\/li>\n?)+/g,
    '<ol class="ordered-list">$&</ol>'
  );

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="divider" />');

  // Paragraphs (double newlines)
  html = html.replace(/\n\n/g, "</p><p>");

  // Single newlines to line breaks
  html = html.replace(/\n/g, "<br/>");

  // Wrap in paragraph
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs and extra breaks
  html = html.replace(/<p><\/p>/g, "");
  html = html.replace(/<p><br\/><\/p>/g, "");
  html = html.replace(/<p><br\/>/g, "<p>");
  html = html.replace(/<br\/><\/p>/g, "</p>");

  // Fix headers not being wrapped in paragraphs
  html = html.replace(/<p>(<h[1-3]>)/g, "$1");
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, "$1");

  // Fix pre/code blocks not being wrapped in paragraphs
  html = html.replace(/<p>(<pre)/g, "$1");
  html = html.replace(/(<\/pre>)<\/p>/g, "$1");

  // Fix lists not being wrapped in paragraphs
  html = html.replace(/<p>(<[uo]l)/g, "$1");
  html = html.replace(/(<\/[uo]l>)<\/p>/g, "$1");

  // Fix blockquotes
  html = html.replace(/<p>(<blockquote)/g, "$1");
  html = html.replace(/(<\/blockquote>)<\/p>/g, "$1");

  // Fix hr
  html = html.replace(/<p>(<hr)/g, "$1");
  html = html.replace(/(\/><\/p>)/g, "/>");

  return html;
}

// ============================================================================
// Styles
// ============================================================================

const markdownStyles: SxProps<Theme> = {
  "& h1, & h2, & h3": {
    fontWeight: 600,
    mt: 2,
    mb: 1,
  },
  "& h1": {
    fontSize: "1.5rem",
  },
  "& h2": {
    fontSize: "1.25rem",
  },
  "& h3": {
    fontSize: "1.1rem",
  },
  "& p": {
    my: 1,
  },
  "& strong": {
    fontWeight: 600,
  },
  "& em": {
    fontStyle: "italic",
  },
  "& del": {
    textDecoration: "line-through",
    opacity: 0.7,
  },
  "& a": {
    color: "primary.main",
    textDecoration: "underline",
    "&:hover": {
      textDecoration: "none",
    },
  },
  "& .code-block": {
    backgroundColor: "action.hover",
    borderRadius: 1,
    p: 2,
    my: 2,
    overflow: "auto",
    "& code": {
      fontFamily: "monospace",
      fontSize: "0.875rem",
    },
  },
  "& .inline-code": {
    backgroundColor: "action.hover",
    borderRadius: 0.5,
    px: 0.75,
    py: 0.25,
    fontFamily: "monospace",
    fontSize: "0.875em",
  },
  "& .blockquote": {
    borderLeft: 4,
    borderColor: "divider",
    pl: 2,
    ml: 0,
    my: 1,
    fontStyle: "italic",
    color: "text.secondary",
  },
  "& .unordered-list, & .ordered-list": {
    pl: 3,
    my: 1,
  },
  "& .list-item, & .ordered-item": {
    my: 0.5,
  },
  "& .divider": {
    my: 2,
    border: "none",
    borderTop: 1,
    borderColor: "divider",
  },
};

// ============================================================================
// Component
// ============================================================================

export function MarkdownPreview({
  content,
  sx,
  variant = "body1",
}: MarkdownPreviewProps): React.ReactElement {
  const renderedHtml = useMemo(() => renderMarkdownToHtml(content), [content]);

  return (
    <Box
      component={Typography}
      variant={variant}
      sx={[markdownStyles, ...(Array.isArray(sx) ? sx : [sx])]}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}

export default MarkdownPreview;
