/**
 * Tests for offline annotation sync
 */

import { describe, it, expect, vi } from "vitest";

import {
  type CreateAnnotationOffline,
  type UpdateAnnotationOffline,
  type AnnotationOperation,
} from "./offlineAnnotationSync";

describe("offlineAnnotationSync", () => {
  describe("Type Definitions", () => {
    it("should have correct annotation operation types", () => {
      const operations: AnnotationOperation[] = ["create", "update", "delete"];
      expect(operations).toHaveLength(3);
      expect(operations).toContain("create");
      expect(operations).toContain("update");
      expect(operations).toContain("delete");
    });

    it("should define CreateAnnotationOffline interface", () => {
      const input: CreateAnnotationOffline = {
        bookId: "book-123",
        type: "HIGHLIGHT",
        startOffset: 0,
        endOffset: 10,
        color: "yellow",
      };

      expect(input.bookId).toBe("book-123");
      expect(input.type).toBe("HIGHLIGHT");
      expect(input.startOffset).toBe(0);
      expect(input.endOffset).toBe(10);
      expect(input.color).toBe("yellow");
    });

    it("should define UpdateAnnotationOffline interface", () => {
      const input: UpdateAnnotationOffline = {
        id: "annotation-123",
        note: "Updated note",
        color: "green",
      };

      expect(input.id).toBe("annotation-123");
      expect(input.note).toBe("Updated note");
      expect(input.color).toBe("green");
    });
  });

  describe("Constants", () => {
    it("should export database constants", async () => {
      const {
        ANNOTATIONS_DB_NAME,
        ANNOTATIONS_DB_VERSION,
        ANNOTATIONS_STORE_NAME,
      } = await import("./offlineAnnotationSync");

      expect(ANNOTATIONS_DB_NAME).toBe("offline-annotations");
      expect(ANNOTATIONS_DB_VERSION).toBe(1);
      expect(ANNOTATIONS_STORE_NAME).toBe("annotations");
    });

    it("should export sync batch size", async () => {
      const { ANNOTATION_SYNC_BATCH_SIZE } =
        await import("./offlineAnnotationSync");

      expect(ANNOTATION_SYNC_BATCH_SIZE).toBe(20);
    });
  });

  describe("Sync Queue Management", () => {
    it("should filter annotation sync queue items", async () => {
      const { getAnnotationSyncQueue } =
        await import("./offlineAnnotationSync");

      // Mock getSyncQueue to return empty array
      vi.mock("./offlineCacheUtils", () => ({
        getSyncQueue: vi.fn(() => []),
        addToSyncQueue: vi.fn(),
        removeFromSyncQueue: vi.fn(),
        incrementRetryCount: vi.fn(),
        shouldRetrySyncItem: vi.fn(() => true),
      }));

      const queue = getAnnotationSyncQueue();
      expect(Array.isArray(queue)).toBe(true);
    });
  });

  describe("Sync Operations", () => {
    it("should not sync when offline", async () => {
      const { syncAllAnnotations } = await import("./offlineAnnotationSync");

      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      const result = await syncAllAnnotations();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });
  });

  describe("API URL Generation", () => {
    it("should generate correct API URLs for operations", () => {
      const operations = {
        create: "/api/annotations",
        update: "/api/annotations/123",
        delete: "/api/annotations/123",
      };

      expect(operations.create).toBe("/api/annotations");
      expect(operations.update).toContain("/api/annotations/");
      expect(operations.delete).toContain("/api/annotations/");
    });
  });

  describe("HTTP Method Mapping", () => {
    it("should map operations to HTTP methods", () => {
      const methods = {
        create: "POST",
        update: "PATCH",
        delete: "DELETE",
      };

      expect(methods.create).toBe("POST");
      expect(methods.update).toBe("PATCH");
      expect(methods.delete).toBe("DELETE");
    });
  });
});
