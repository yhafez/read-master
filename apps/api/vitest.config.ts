import { createVitestConfig } from "@read-master/config/vitest/base";

export default createVitestConfig({
  include: [
    "src/**/*.test.ts",
    "src/**/*.spec.ts",
    "api/**/*.test.ts",
    "api/**/*.spec.ts",
  ],
});
