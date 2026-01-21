/**
 * Tests for RevenueOverTimeChart component
 */

import { describe, it, expect } from "vitest";
import { RevenueOverTimeChart } from "./RevenueOverTimeChart";

describe("RevenueOverTimeChart", () => {
  it("should export component", () => {
    expect(RevenueOverTimeChart).toBeDefined();
    expect(typeof RevenueOverTimeChart).toBe("function");
  });
});
