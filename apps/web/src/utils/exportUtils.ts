/**
 * Export Utilities
 *
 * Utilities for exporting books, annotations, and flashcards to various formats.
 */

import type { Book } from "@/hooks/useBooks";

// ============================================================================
// Types
// ============================================================================

/**
 * Simplified annotation type for export
 * Maps from the database annotation structure to export-friendly format
 */
export type ExportAnnotation = {
  id: string;
  type: "HIGHLIGHT" | "NOTE" | "BOOKMARK";
  text?: string; // Selected text for highlights/notes
  note?: string; // User's note/comment
  color?: string; // Highlight color
  createdAt: Date | string;
};

export type ExportFormat = "pdf" | "epub" | "markdown" | "html" | "json";

export type ExportOptions = {
  includeAnnotations?: boolean;
  includeHighlights?: boolean;
  includeNotes?: boolean;
  includeBookmarks?: boolean;
  includeMetadata?: boolean;
  colorScheme?: "light" | "dark" | "sepia";
  fontSize?: number;
  fontFamily?: string;
};

export type FlashcardExportFormat = "anki" | "quizlet" | "csv" | "json";

export type FlashcardExportOptions = {
  includeTags?: boolean;
  includeMetadata?: boolean;
  deckName?: string;
};

// ============================================================================
// Markdown Export
// ============================================================================

/**
 * Export book content and annotations to Markdown
 */
export function exportToMarkdown(
  book: Book,
  content: string,
  annotations: ExportAnnotation[],
  options: ExportOptions = {}
): string {
  const {
    includeAnnotations = true,
    includeHighlights = true,
    includeNotes = true,
    includeBookmarks = true,
    includeMetadata = true,
  } = options;

  let markdown = "";

  // Title
  markdown += `# ${book.title}\n\n`;

  // Metadata
  if (includeMetadata) {
    if (book.author) {
      markdown += `**Author**: ${book.author}\n\n`;
    }
    markdown += `**Exported**: ${new Date().toLocaleString()}\n\n`;
    markdown += `---\n\n`;
  }

  // Content
  markdown += `## Content\n\n`;
  markdown += `${content}\n\n`;

  // Annotations
  if (includeAnnotations && annotations.length > 0) {
    markdown += `---\n\n`;
    markdown += `## Annotations\n\n`;

    // Highlights
    if (includeHighlights) {
      const highlights = annotations.filter((a) => a.type === "HIGHLIGHT");
      if (highlights.length > 0) {
        markdown += `### Highlights\n\n`;
        for (const highlight of highlights) {
          markdown += `> ${highlight.text || ""}\n\n`;
          if (highlight.note) {
            markdown += `_Note: ${highlight.note}_\n\n`;
          }
          markdown += `*${new Date(highlight.createdAt).toLocaleDateString()}*\n\n`;
          markdown += `---\n\n`;
        }
      }
    }

    // Notes
    if (includeNotes) {
      const notes = annotations.filter((a) => a.type === "NOTE");
      if (notes.length > 0) {
        markdown += `### Notes\n\n`;
        for (const note of notes) {
          markdown += `**${new Date(note.createdAt).toLocaleDateString()}**\n\n`;
          markdown += `${note.note || ""}\n\n`;
          if (note.text) {
            markdown += `> Context: ${note.text}\n\n`;
          }
          markdown += `---\n\n`;
        }
      }
    }

    // Bookmarks
    if (includeBookmarks) {
      const bookmarks = annotations.filter((a) => a.type === "BOOKMARK");
      if (bookmarks.length > 0) {
        markdown += `### Bookmarks\n\n`;
        for (const bookmark of bookmarks) {
          markdown += `- ${bookmark.note || "Bookmark"} (${new Date(bookmark.createdAt).toLocaleDateString()})\n`;
        }
        markdown += `\n`;
      }
    }
  }

  return markdown;
}

// ============================================================================
// HTML Export
// ============================================================================

/**
 * Export book content and annotations to HTML
 */
export function exportToHTML(
  book: Book,
  content: string,
  annotations: ExportAnnotation[],
  options: ExportOptions = {}
): string {
  const {
    includeAnnotations = true,
    includeHighlights = true,
    includeNotes = true,
    includeBookmarks = true,
    includeMetadata = true,
    colorScheme = "light",
    fontSize = 16,
    fontFamily = "Georgia, serif",
  } = options;

  const backgroundColor =
    colorScheme === "dark"
      ? "#1a1a1a"
      : colorScheme === "sepia"
        ? "#f4ecd8"
        : "#ffffff";
  const textColor = colorScheme === "dark" ? "#e0e0e0" : "#333333";
  const linkColor = colorScheme === "dark" ? "#64b5f6" : "#1976d2";

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${book.title}</title>
  <style>
    body {
      font-family: ${fontFamily};
      font-size: ${fontSize}px;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background-color: ${backgroundColor};
      color: ${textColor};
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 0.5rem;
      border-bottom: 2px solid ${linkColor};
      padding-bottom: 0.5rem;
    }
    h2 {
      font-size: 1.8em;
      margin-top: 2rem;
      margin-bottom: 1rem;
      color: ${linkColor};
    }
    h3 {
      font-size: 1.4em;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    .metadata {
      color: ${colorScheme === "dark" ? "#9e9e9e" : "#666666"};
      margin-bottom: 2rem;
    }
    .content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .highlight {
      background-color: ${colorScheme === "dark" ? "#4a4a2a" : "#ffeb3b"};
      padding: 0.5rem;
      border-left: 4px solid ${linkColor};
      margin: 1rem 0;
    }
    .note {
      background-color: ${colorScheme === "dark" ? "#2a3a4a" : "#e3f2fd"};
      padding: 1rem;
      border-left: 4px solid ${linkColor};
      margin: 1rem 0;
      border-radius: 4px;
    }
    .date {
      font-size: 0.85em;
      color: ${colorScheme === "dark" ? "#9e9e9e" : "#666666"};
      font-style: italic;
    }
    hr {
      border: none;
      border-top: 1px solid ${colorScheme === "dark" ? "#424242" : "#e0e0e0"};
      margin: 2rem 0;
    }
    @media print {
      body {
        background-color: white;
        color: black;
      }
    }
  </style>
</head>
<body>
  <h1>${book.title}</h1>
`;

  // Metadata
  if (includeMetadata) {
    html += `  <div class="metadata">\n`;
    if (book.author) {
      html += `    <p><strong>Author:</strong> ${book.author}</p>\n`;
    }
    html += `    <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>\n`;
    html += `  </div>\n\n`;
    html += `  <hr>\n\n`;
  }

  // Content
  html += `  <h2>Content</h2>\n`;
  html += `  <div class="content">${escapeHtml(content)}</div>\n\n`;

  // Annotations
  if (includeAnnotations && annotations.length > 0) {
    html += `  <hr>\n\n`;
    html += `  <h2>Annotations</h2>\n\n`;

    // Highlights
    if (includeHighlights) {
      const highlights = annotations.filter((a) => a.type === "HIGHLIGHT");
      if (highlights.length > 0) {
        html += `  <h3>Highlights</h3>\n`;
        for (const highlight of highlights) {
          html += `  <div class="highlight">\n`;
          html += `    <p>${escapeHtml(highlight.text || "")}</p>\n`;
          if (highlight.note) {
            html += `    <p><em>Note: ${escapeHtml(highlight.note)}</em></p>\n`;
          }
          html += `    <p class="date">${new Date(highlight.createdAt).toLocaleDateString()}</p>\n`;
          html += `  </div>\n`;
        }
      }
    }

    // Notes
    if (includeNotes) {
      const notes = annotations.filter((a) => a.type === "NOTE");
      if (notes.length > 0) {
        html += `  <h3>Notes</h3>\n`;
        for (const note of notes) {
          html += `  <div class="note">\n`;
          html += `    <p><strong>${new Date(note.createdAt).toLocaleDateString()}</strong></p>\n`;
          html += `    <p>${escapeHtml(note.note || "")}</p>\n`;
          if (note.text) {
            html += `    <p><em>Context: ${escapeHtml(note.text)}</em></p>\n`;
          }
          html += `  </div>\n`;
        }
      }
    }

    // Bookmarks
    if (includeBookmarks) {
      const bookmarks = annotations.filter((a) => a.type === "BOOKMARK");
      if (bookmarks.length > 0) {
        html += `  <h3>Bookmarks</h3>\n`;
        html += `  <ul>\n`;
        for (const bookmark of bookmarks) {
          html += `    <li>${escapeHtml(bookmark.note || "Bookmark")} <span class="date">(${new Date(bookmark.createdAt).toLocaleDateString()})</span></li>\n`;
        }
        html += `  </ul>\n`;
      }
    }
  }

  html += `</body>
</html>`;

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

// ============================================================================
// JSON Export
// ============================================================================

/**
 * Export book and annotations to JSON
 */
export function exportToJSON(
  book: Book,
  content: string,
  annotations: ExportAnnotation[],
  options: ExportOptions = {}
): string {
  const { includeAnnotations = true, includeMetadata = true } = options;

  const data: {
    book: Partial<Book>;
    content?: string;
    annotations?: ExportAnnotation[];
    exportedAt: string;
  } = {
    book: {},
    exportedAt: new Date().toISOString(),
  };

  // Book metadata
  if (includeMetadata) {
    data.book = {
      id: book.id,
      title: book.title,
      author: book.author,
      ...(book.wordCount !== undefined && { wordCount: book.wordCount }),
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  } else {
    data.book = {
      title: book.title,
      author: book.author,
    };
  }

  // Content
  data.content = content;

  // Annotations
  if (includeAnnotations) {
    data.annotations = annotations;
  }

  return JSON.stringify(data, null, 2);
}

// ============================================================================
// Flashcard Export
// ============================================================================

/**
 * Export flashcards to Anki format (tab-separated values)
 */
export function exportToAnki(
  flashcards: Array<{ front: string; back: string; tags?: string[] }>,
  options: FlashcardExportOptions = {}
): string {
  const { includeTags = true } = options;

  let output = "";

  for (const card of flashcards) {
    // Front and back are separated by tab
    output += `${card.front}\t${card.back}`;

    // Tags are space-separated
    if (includeTags && card.tags && card.tags.length > 0) {
      output += `\t${card.tags.join(" ")}`;
    }

    output += "\n";
  }

  return output;
}

/**
 * Export flashcards to Quizlet format (tab-separated values)
 */
export function exportToQuizlet(
  flashcards: Array<{ front: string; back: string }>,
  _options: FlashcardExportOptions = {}
): string {
  let output = "";

  for (const card of flashcards) {
    output += `${card.front}\t${card.back}\n`;
  }

  return output;
}

/**
 * Export flashcards to CSV
 */
export function exportToCSV(
  flashcards: Array<{ front: string; back: string; tags?: string[] }>,
  options: FlashcardExportOptions = {}
): string {
  const { includeTags = true } = options;

  let csv = "Front,Back";
  if (includeTags) {
    csv += ",Tags";
  }
  csv += "\n";

  for (const card of flashcards) {
    csv += `"${escapeCSV(card.front)}","${escapeCSV(card.back)}"`;
    if (includeTags) {
      csv += `,"${card.tags ? card.tags.join(", ") : ""}"`;
    }
    csv += "\n";
  }

  return csv;
}

/**
 * Escape CSV special characters
 */
function escapeCSV(text: string): string {
  return text.replace(/"/g, '""');
}

/**
 * Export flashcards to JSON
 */
export function exportFlashcardsToJSON(
  flashcards: Array<{ front: string; back: string; tags?: string[] }>,
  options: FlashcardExportOptions = {}
): string {
  const { includeMetadata = true, deckName } = options;

  const data: {
    deck?: string;
    cards: typeof flashcards;
    exportedAt?: string;
  } = {
    cards: flashcards,
  };

  if (includeMetadata) {
    data.exportedAt = new Date().toISOString();
    if (deckName) {
      data.deck = deckName;
    }
  }

  return JSON.stringify(data, null, 2);
}

// ============================================================================
// Download Helper
// ============================================================================

/**
 * Trigger a download of a file in the browser
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get MIME type for export format
 */
export function getMimeType(
  format: ExportFormat | FlashcardExportFormat
): string {
  switch (format) {
    case "pdf":
      return "application/pdf";
    case "epub":
      return "application/epub+zip";
    case "markdown":
      return "text/markdown";
    case "html":
      return "text/html";
    case "json":
      return "application/json";
    case "anki":
    case "quizlet":
      return "text/plain";
    case "csv":
      return "text/csv";
    default:
      return "text/plain";
  }
}

/**
 * Get file extension for export format
 */
export function getFileExtension(
  format: ExportFormat | FlashcardExportFormat
): string {
  switch (format) {
    case "pdf":
      return ".pdf";
    case "epub":
      return ".epub";
    case "markdown":
      return ".md";
    case "html":
      return ".html";
    case "json":
      return ".json";
    case "anki":
    case "quizlet":
      return ".txt";
    case "csv":
      return ".csv";
    default:
      return ".txt";
  }
}
