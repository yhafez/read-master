/**
 * Tests for AICostsBreakdown component
 */

import { describe, it, expect } from "vitest";

describe("AICostsBreakdown", () => {
  it("should export from index", async () => {
    const module = await import("./index");
    expect(module.AICostsBreakdown).toBeDefined();
    expect(typeof module.AICostsBreakdown).toBe("function");
  });
});
