/**
 * Tests for MobileBottomNav component
 */

import { describe, it, expect } from "vitest";

import {
  DEFAULT_BOTTOM_NAV_ITEMS,
  type MobileBottomNavItem,
} from "./MobileBottomNav";
import { ROUTES } from "@/router/routes";

describe("MobileBottomNav", () => {
  describe("DEFAULT_BOTTOM_NAV_ITEMS", () => {
    it("should have 5 navigation items", () => {
      expect(DEFAULT_BOTTOM_NAV_ITEMS).toHaveLength(5);
    });

    it("should have valid structure for each item", () => {
      DEFAULT_BOTTOM_NAV_ITEMS.forEach((item: MobileBottomNavItem) => {
        expect(item).toHaveProperty("label");
        expect(item).toHaveProperty("icon");
        expect(item).toHaveProperty("path");
        expect(typeof item.label).toBe("string");
        expect(typeof item.path).toBe("string");
        expect(item.icon).toBeDefined();
      });
    });

    it("should include dashboard navigation", () => {
      const dashboard = DEFAULT_BOTTOM_NAV_ITEMS.find(
        (item) => item.path === ROUTES.DASHBOARD
      );
      expect(dashboard).toBeDefined();
      expect(dashboard?.label).toBe("nav.dashboard");
    });

    it("should include library navigation", () => {
      const library = DEFAULT_BOTTOM_NAV_ITEMS.find(
        (item) => item.path === ROUTES.LIBRARY
      );
      expect(library).toBeDefined();
      expect(library?.label).toBe("nav.library");
    });

    it("should include flashcards navigation", () => {
      const flashcards = DEFAULT_BOTTOM_NAV_ITEMS.find(
        (item) => item.path === ROUTES.FLASHCARDS
      );
      expect(flashcards).toBeDefined();
      expect(flashcards?.label).toBe("nav.flashcards");
    });

    it("should include profile navigation", () => {
      const profile = DEFAULT_BOTTOM_NAV_ITEMS.find(
        (item) => item.path === ROUTES.MY_PROFILE
      );
      expect(profile).toBeDefined();
      expect(profile?.label).toBe("nav.profile");
    });

    it("should include more/settings navigation", () => {
      const more = DEFAULT_BOTTOM_NAV_ITEMS.find(
        (item) => item.path === ROUTES.SETTINGS
      );
      expect(more).toBeDefined();
      expect(more?.label).toBe("nav.more");
    });

    it("should have unique paths", () => {
      const paths = DEFAULT_BOTTOM_NAV_ITEMS.map((item) => item.path);
      const uniquePaths = new Set(paths);
      expect(uniquePaths.size).toBe(paths.length);
    });

    it("should have valid translation keys", () => {
      DEFAULT_BOTTOM_NAV_ITEMS.forEach((item) => {
        expect(item.label).toMatch(/^nav\./);
      });
    });
  });

  describe("Component exports", () => {
    it("should export MobileBottomNav component", async () => {
      const module = await import("./MobileBottomNav");
      expect(module.MobileBottomNav).toBeDefined();
      expect(typeof module.MobileBottomNav).toBe("function");
    });

    it("should export DEFAULT_BOTTOM_NAV_ITEMS", async () => {
      const module = await import("./MobileBottomNav");
      expect(module.DEFAULT_BOTTOM_NAV_ITEMS).toBeDefined();
      expect(Array.isArray(module.DEFAULT_BOTTOM_NAV_ITEMS)).toBe(true);
    });

    it("should export default", async () => {
      const module = await import("./MobileBottomNav");
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe("function");
    });
  });

  describe("Navigation item structure", () => {
    it("should have consistent icon types", () => {
      DEFAULT_BOTTOM_NAV_ITEMS.forEach((item) => {
        expect(item.icon).toBeDefined();
        expect(typeof item.icon).toBe("object");
      });
    });

    it("should have valid route paths", () => {
      const validRoutes = Object.values(ROUTES);
      DEFAULT_BOTTOM_NAV_ITEMS.forEach((item) => {
        expect(validRoutes).toContain(item.path);
      });
    });
  });
});
