import globals from "globals";
import { baseConfig, ignoreConfig } from "./base.js";

/**
 * Library package ESLint configuration.
 * For shared packages that may be used in both Node.js and browser environments.
 */

/** @type {import('eslint').Linter.Config[]} */
export const libraryConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // Library-specific rules - be extra careful about exports
    },
  },
  ignoreConfig,
];

export default libraryConfig;
