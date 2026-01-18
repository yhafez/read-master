import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We can only test the isClerkConfigured function without mocking the entire Clerk module
// since the hooks require the Clerk provider context

describe("auth/hooks", () => {
  describe("isClerkConfigured", () => {
    const originalEnv = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

    beforeEach(() => {
      // Reset environment before each test
      vi.resetModules();
    });

    afterEach(() => {
      // Restore original environment
      if (originalEnv) {
        import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = originalEnv;
      } else {
        delete import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
      }
    });

    it("should return false when VITE_CLERK_PUBLISHABLE_KEY is not set", async () => {
      delete import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
      const { isClerkConfigured } = await import("./hooks");
      expect(isClerkConfigured()).toBe(false);
    });

    it("should return false when VITE_CLERK_PUBLISHABLE_KEY is empty string", async () => {
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = "";
      const { isClerkConfigured } = await import("./hooks");
      expect(isClerkConfigured()).toBe(false);
    });

    it("should return true when VITE_CLERK_PUBLISHABLE_KEY is set", async () => {
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = "pk_test_abc123";
      const { isClerkConfigured } = await import("./hooks");
      expect(isClerkConfigured()).toBe(true);
    });
  });
});
