/**
 * Tests for UsersOverTimeChart component
 */

import { describe, it, expect } from "vitest";

describe("UsersOverTimeChart", () => {
  it("should export from index", async () => {
    const module = await import("./index");
    expect(module.UsersOverTimeChart).toBeDefined();
    expect(typeof module.UsersOverTimeChart).toBe("function");
  });
});
