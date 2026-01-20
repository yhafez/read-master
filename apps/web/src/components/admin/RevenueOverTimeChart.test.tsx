/**
 * Tests for RevenueOverTimeChart component
 */

import { describe, it, expect } from "vitest";

describe("RevenueOverTimeChart", () => {
  it("should export from index", async () => {
    const module = await import("./index");
    expect(module.RevenueOverTimeChart).toBeDefined();
    expect(typeof module.RevenueOverTimeChart).toBe("function");
  });
});
