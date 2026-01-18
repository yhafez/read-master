import globals from "globals";
import { baseConfig, ignoreConfig } from "./base.js";

/**
 * Node.js-specific ESLint configuration.
 * Extends base config with Node.js globals and settings.
 */

/** @type {import('eslint').Linter.Config[]} */
export const nodeConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // Node.js-specific rules can be added here
    },
  },
  ignoreConfig,
];

export default nodeConfig;
