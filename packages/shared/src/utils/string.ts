/**
 * String utility functions
 */

/**
 * Truncates a string to a maximum length, adding an ellipsis if truncated
 * @param str - The string to truncate
 * @param maxLength - Maximum length (default: 100)
 * @param suffix - Suffix to add when truncated (default: "...")
 */
export function truncate(str: string, maxLength = 100, suffix = "..."): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Converts a string to title case
 * @param str - The string to convert
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generates a URL-friendly slug from a string
 * @param str - The string to convert
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Removes HTML tags from a string
 * @param str - The string to sanitize
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}
