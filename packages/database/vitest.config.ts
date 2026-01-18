import { createVitestConfig } from "@read-master/config/vitest/base";

export default createVitestConfig({
  include: ["src/**/*.test.ts", "src/**/*.spec.ts", "prisma/**/*.test.ts"],
});
