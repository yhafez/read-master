/**
 * Tests for AICostsBreakdown component
 */

import { describe, it, expect } from "vitest";
import { AICostsBreakdown } from "./AICostsBreakdown";

describe("AICostsBreakdown", () => {
  it("should export component", () => {
    expect(AICostsBreakdown).toBeDefined();
    expect(typeof AICostsBreakdown).toBe("function");
  });
});
