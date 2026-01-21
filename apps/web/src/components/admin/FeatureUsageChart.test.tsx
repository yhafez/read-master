/**
 * Tests for FeatureUsageChart component
 */

import { describe, it, expect } from "vitest";
import { FeatureUsageChart } from "./FeatureUsageChart";

describe("FeatureUsageChart", () => {
  it("should export component", () => {
    expect(FeatureUsageChart).toBeDefined();
    expect(typeof FeatureUsageChart).toBe("function");
  });
});
