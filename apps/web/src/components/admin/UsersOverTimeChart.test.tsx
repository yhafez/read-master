/**
 * Tests for UsersOverTimeChart component
 */

import { describe, it, expect } from "vitest";
import { UsersOverTimeChart } from "./UsersOverTimeChart";

describe("UsersOverTimeChart", () => {
  it("should export component", () => {
    expect(UsersOverTimeChart).toBeDefined();
    expect(typeof UsersOverTimeChart).toBe("function");
  });
});
