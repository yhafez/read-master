/**
 * Read Master - Shared Prettier Configuration
 *
 * Consistent code formatting across all packages in the monorepo.
 * Following the coding standards in CLAUDE.md.
 */

/** @type {import('prettier').Config} */
export const prettierConfig = {
  // Use semicolons at the end of statements
  semi: true,

  // Use double quotes for strings
  singleQuote: false,

  // 2 spaces for indentation
  tabWidth: 2,

  // Trailing commas for better git diffs
  trailingComma: "es5",

  // Line width for wrapping
  printWidth: 80,

  // Use spaces instead of tabs
  useTabs: false,

  // Spaces inside object braces
  bracketSpacing: true,

  // Always include parentheses around arrow function parameters
  arrowParens: "always",

  // Use Unix line endings
  endOfLine: "lf",

  // JSX-specific: put closing bracket on new line
  bracketSameLine: false,

  // Don't require @format pragma
  requirePragma: false,

  // Don't insert @format pragma
  insertPragma: false,

  // Preserve prose wrapping in markdown
  proseWrap: "preserve",

  // HTML whitespace sensitivity
  htmlWhitespaceSensitivity: "css",

  // Single attribute per line in HTML/JSX (when more than 1 attribute)
  singleAttributePerLine: false,
};

export default prettierConfig;
