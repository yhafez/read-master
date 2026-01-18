import { baseConfig, ignoreConfig } from "@read-master/config/eslint";

/**
 * Root ESLint configuration for Read Master.
 * Uses shared base configuration from packages/config.
 */

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  ignoreConfig,
  {
    ignores: [
      // Config files at root that don't need strict linting
      "eslint.config.js",
      "prettier.config.js",
    ],
  },
];
