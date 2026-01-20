/**
 * Tests for FeatureUsageChart component
 */

import { describe, it, expect } from "vitest";

describe("FeatureUsageChart", () => {
  it("should export from index", async () => {
    const module = await import("./index");
    expect(module.FeatureUsageChart).toBeDefined();
    expect(typeof module.FeatureUsageChart).toBe("function");
  });
});
