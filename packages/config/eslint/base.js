import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * Base ESLint configuration for all packages in the monorepo.
 * This provides strict TypeScript rules with sensible defaults.
 */

/** @type {import('eslint').Linter.Config[]} */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.es2022,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // Prevent console statements in production code (per CLAUDE.md)
      "no-console": "error",

      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Prevent empty functions (except for arrow function defaults)
      "@typescript-eslint/no-empty-function": [
        "error",
        { allow: ["arrowFunctions"] },
      ],

      // General best practices
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
];

/** @type {import('eslint').Linter.Config} */
export const ignoreConfig = {
  ignores: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.turbo/**",
    "**/coverage/**",
    "**/.next/**",
    "**/.vercel/**",
    "**/.expo/**",
  ],
};

export default baseConfig;
