import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for React packages
 * Uses jsdom environment for DOM testing
 */
export function createReactVitestConfig(options = {}) {
  return defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.spec.ts", "src/**/*.spec.tsx"],
      exclude: ["node_modules", "dist"],
      passWithNoTests: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
      },
      ...options,
    },
  });
}

export default createReactVitestConfig();
