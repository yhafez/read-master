import { defineConfig } from "vitest/config";

/**
 * Base Vitest configuration for all packages
 * Extend this config in package-specific vitest.config.ts files
 */
export function createVitestConfig(options = {}) {
  return defineConfig({
    test: {
      globals: true,
      environment: "node",
      include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
      exclude: ["node_modules", "dist"],
      passWithNoTests: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        exclude: ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"],
      },
      ...options,
    },
  });
}

export default createVitestConfig();
