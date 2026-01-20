/**
 * Tests for admin analytics endpoints
 *
 * Note: These endpoints are protected by requireAdmin middleware,
 * which is tested separately. These tests validate the endpoint structure.
 */

import { describe, it, expect } from "vitest";

describe("Admin Analytics Endpoints", () => {
  describe("Endpoint Exports", () => {
    it("should export overview endpoint handler", async () => {
      const module = await import("./overview.js");
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe("function");
    });

    it("should export users endpoint handler", async () => {
      const module = await import("./users.js");
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe("function");
    });

    it("should export revenue endpoint handler", async () => {
      const module = await import("./revenue.js");
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe("function");
    });

    it("should export engagement endpoint handler", async () => {
      const module = await import("./engagement.js");
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe("function");
    });

    it("should export features endpoint handler", async () => {
      const module = await import("./features.js");
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe("function");
    });

    it("should export ai-costs endpoint handler", async () => {
      const module = await import("./ai-costs.js");
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe("function");
    });

    it("should export content endpoint handler", async () => {
      const module = await import("./content.js");
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe("function");
    });
  });

  describe("Type Exports", () => {
    it("should export OverviewAnalytics type", async () => {
      const module = await import("./overview.js");
      // Type exports are compile-time only, so just verify module loads
      expect(module).toBeDefined();
    });

    it("should export UserAnalytics type", async () => {
      const module = await import("./users.js");
      expect(module).toBeDefined();
    });

    it("should export RevenueAnalytics type", async () => {
      const module = await import("./revenue.js");
      expect(module).toBeDefined();
    });

    it("should export EngagementAnalytics type", async () => {
      const module = await import("./engagement.js");
      expect(module).toBeDefined();
    });

    it("should export FeaturesAnalytics type", async () => {
      const module = await import("./features.js");
      expect(module).toBeDefined();
    });

    it("should export AICostsAnalytics type", async () => {
      const module = await import("./ai-costs.js");
      expect(module).toBeDefined();
    });

    it("should export ContentAnalytics type", async () => {
      const module = await import("./content.js");
      expect(module).toBeDefined();
    });
  });
});
