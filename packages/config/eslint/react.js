import globals from "globals";
import { baseConfig, ignoreConfig } from "./base.js";

/**
 * React-specific ESLint configuration.
 * Extends base config with React/JSX support.
 */

/** @type {import('eslint').Linter.Config[]} */
export const reactConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // React-specific rules can be added here when react-eslint-plugin is added
    },
  },
  ignoreConfig,
];

export default reactConfig;
