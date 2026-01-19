/**
 * Forum form utility functions for validation, character counting,
 * and markdown formatting.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface FormData {
  title: string;
  content: string;
  categoryId: string;
}

export interface FormErrors {
  title?: string;
  content?: string;
  categoryId?: string;
  general?: string;
}

// Translation function type
export type TranslateFn = (
  key: string,
  options?: Record<string, unknown>
) => string;

// =============================================================================
// CONSTANTS
// =============================================================================

export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 200;
export const CONTENT_MIN_LENGTH = 10;
export const CONTENT_MAX_LENGTH = 50000;

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates the form data and returns any errors
 */
export function validateForumPostForm(
  data: FormData,
  t: TranslateFn
): FormErrors {
  const errors: FormErrors = {};

  // Title validation
  const trimmedTitle = data.title.trim();
  if (!trimmedTitle) {
    errors.title = t("forum.form.errors.titleRequired");
  } else if (trimmedTitle.length < TITLE_MIN_LENGTH) {
    errors.title = t("forum.form.errors.titleTooShort", {
      min: TITLE_MIN_LENGTH,
    });
  } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
    errors.title = t("forum.form.errors.titleTooLong", {
      max: TITLE_MAX_LENGTH,
    });
  }

  // Content validation
  const trimmedContent = data.content.trim();
  if (!trimmedContent) {
    errors.content = t("forum.form.errors.contentRequired");
  } else if (trimmedContent.length < CONTENT_MIN_LENGTH) {
    errors.content = t("forum.form.errors.contentTooShort", {
      min: CONTENT_MIN_LENGTH,
    });
  } else if (trimmedContent.length > CONTENT_MAX_LENGTH) {
    errors.content = t("forum.form.errors.contentTooLong", {
      max: CONTENT_MAX_LENGTH,
    });
  }

  // Category validation
  if (!data.categoryId) {
    errors.categoryId = t("forum.form.errors.categoryRequired");
  }

  return errors;
}

/**
 * Checks if form has any errors
 */
export function hasFormErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Gets character count display
 */
export function getCharacterCount(
  text: string,
  max: number
): { count: number; isOver: boolean; display: string } {
  const count = text.length;
  const isOver = count > max;
  return {
    count,
    isOver,
    display: `${count.toLocaleString()}/${max.toLocaleString()}`,
  };
}

// =============================================================================
// MARKDOWN HELPERS
// =============================================================================

/**
 * Inserts markdown formatting around selected text or at cursor
 */
export function insertMarkdownFormat(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix: string = prefix
): { newText: string; newCursorPos: number } {
  const before = text.slice(0, selectionStart);
  const selected = text.slice(selectionStart, selectionEnd);
  const after = text.slice(selectionEnd);

  if (selected) {
    // Wrap selection
    const newText = `${before}${prefix}${selected}${suffix}${after}`;
    return {
      newText,
      newCursorPos: selectionStart + prefix.length + selected.length,
    };
  } else {
    // Insert at cursor
    const newText = `${before}${prefix}${suffix}${after}`;
    return {
      newText,
      newCursorPos: selectionStart + prefix.length,
    };
  }
}

/**
 * Simple markdown to HTML renderer for preview
 */
export function renderMarkdownPreview(markdown: string): string {
  let html = markdown
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Code blocks
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    // Inline code
    .replace(/`(.+?)`/g, "<code>$1</code>")
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    // Blockquotes (note: > is already escaped at this point)
    .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")
    // Unordered lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Paragraphs (double newlines)
    .replace(/\n\n/g, "</p><p>")
    // Single newlines to <br>
    .replace(/\n/g, "<br/>");

  // Wrap in paragraph
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, "").replace(/<p><br\/><\/p>/g, "");

  return html;
}
