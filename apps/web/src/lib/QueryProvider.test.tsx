import { describe, it, expect } from "vitest";

import {
  createQueryClient,
  DEFAULT_STALE_TIME,
  DEFAULT_GC_TIME,
} from "./queryClient";

// Since @testing-library/react is not available, test the configuration aspects
// The actual component rendering will be verified via integration tests

describe("QueryProvider configuration", () => {
  describe("createQueryClient for tests", () => {
    it("should create a test-configured QueryClient with disabled retries", () => {
      const client = createQueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 0,
            gcTime: 0,
          },
          mutations: {
            retry: false,
          },
        },
      });

      const defaults = client.getDefaultOptions();
      expect(defaults.queries?.retry).toBe(false);
    });

    it("should create a test-configured QueryClient with zero stale time", () => {
      const client = createQueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 0,
            gcTime: 0,
          },
        },
      });

      const defaults = client.getDefaultOptions();
      expect(defaults.queries?.staleTime).toBe(0);
    });

    it("should create a test-configured QueryClient with zero gc time", () => {
      const client = createQueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 0,
            gcTime: 0,
          },
        },
      });

      const defaults = client.getDefaultOptions();
      expect(defaults.queries?.gcTime).toBe(0);
    });

    it("should create a test-configured QueryClient with disabled mutation retries", () => {
      const client = createQueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      });

      const defaults = client.getDefaultOptions();
      expect(defaults.mutations?.retry).toBe(false);
    });
  });

  describe("createQueryClient default vs custom", () => {
    it("default client should have production defaults", () => {
      const defaultClient = createQueryClient();
      const defaults = defaultClient.getDefaultOptions();

      expect(defaults.queries?.staleTime).toBe(DEFAULT_STALE_TIME);
      expect(defaults.queries?.gcTime).toBe(DEFAULT_GC_TIME);
    });

    it("custom client should override defaults", () => {
      const customClient = createQueryClient({
        defaultOptions: {
          queries: {
            staleTime: 999,
            gcTime: 888,
          },
        },
      });

      const defaults = customClient.getDefaultOptions();
      expect(defaults.queries?.staleTime).toBe(999);
      expect(defaults.queries?.gcTime).toBe(888);
    });

    it("custom client should partially override defaults", () => {
      const customClient = createQueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1234,
          },
        },
      });

      const defaults = customClient.getDefaultOptions();
      // Overridden value
      expect(defaults.queries?.staleTime).toBe(1234);
    });
  });

  describe("QueryClient instance", () => {
    it("should have query data methods", () => {
      const client = createQueryClient();

      expect(typeof client.getQueryData).toBe("function");
      expect(typeof client.setQueryData).toBe("function");
    });

    it("should have query invalidation methods", () => {
      const client = createQueryClient();

      expect(typeof client.invalidateQueries).toBe("function");
      expect(typeof client.refetchQueries).toBe("function");
    });

    it("should have prefetch methods", () => {
      const client = createQueryClient();

      expect(typeof client.prefetchQuery).toBe("function");
    });

    it("should have remove methods", () => {
      const client = createQueryClient();

      expect(typeof client.removeQueries).toBe("function");
    });

    it("should have cache methods", () => {
      const client = createQueryClient();

      expect(typeof client.getQueryCache).toBe("function");
      expect(typeof client.getMutationCache).toBe("function");
      expect(typeof client.clear).toBe("function");
    });

    it("should have default options method", () => {
      const client = createQueryClient();

      expect(typeof client.getDefaultOptions).toBe("function");
      expect(typeof client.setDefaultOptions).toBe("function");
    });
  });

  describe("QueryClient cache operations", () => {
    it("should be able to set and get query data", () => {
      const client = createQueryClient();
      const testData = { name: "test" };

      client.setQueryData(["test-key"], testData);
      const result = client.getQueryData(["test-key"]);

      expect(result).toEqual(testData);
    });

    it("should be able to remove query data", () => {
      const client = createQueryClient();
      const testData = { name: "test" };

      client.setQueryData(["test-key"], testData);
      client.removeQueries({ queryKey: ["test-key"] });
      const result = client.getQueryData(["test-key"]);

      expect(result).toBeUndefined();
    });

    it("should be able to clear all data", () => {
      const client = createQueryClient();

      client.setQueryData(["key1"], { a: 1 });
      client.setQueryData(["key2"], { b: 2 });
      client.clear();

      expect(client.getQueryData(["key1"])).toBeUndefined();
      expect(client.getQueryData(["key2"])).toBeUndefined();
    });
  });

  describe("isolation between clients", () => {
    it("should maintain separate caches for different clients", () => {
      const client1 = createQueryClient();
      const client2 = createQueryClient();

      client1.setQueryData(["shared-key"], { from: "client1" });
      client2.setQueryData(["shared-key"], { from: "client2" });

      expect(client1.getQueryData(["shared-key"])).toEqual({ from: "client1" });
      expect(client2.getQueryData(["shared-key"])).toEqual({ from: "client2" });
    });

    it("clearing one client should not affect another", () => {
      const client1 = createQueryClient();
      const client2 = createQueryClient();

      client1.setQueryData(["key"], { data: 1 });
      client2.setQueryData(["key"], { data: 2 });

      client1.clear();

      expect(client1.getQueryData(["key"])).toBeUndefined();
      expect(client2.getQueryData(["key"])).toEqual({ data: 2 });
    });
  });
});
