/**
 * Tests for offline reading progress sync
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  updateOfflineProgress,
  getOfflineProgressForBook,
  getAllOfflineProgress,
  getProgressNeedingSync,
  markProgressAsSynced,
  clearSyncedProgress,
  queueProgressUpdate,
  getProgressSyncQueue,
  getProgressSyncStatus,
  getOverallSyncState,
  syncAllProgress,
  resolveProgressConflict,
  clearAllProgressData,
  PROGRESS_STORAGE_KEY,
  type OfflineReadingProgress,
} from "./offlineReadingProgressSync";

describe("offlineReadingProgressSync", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Offline Storage", () => {
    it("should get empty object when no progress stored", () => {
      const progress = getAllOfflineProgress();
      expect(progress).toEqual({});
    });

    it("should update offline progress for a book", () => {
      const bookId = "book-123";
      const update = {
        position: "chapter-5",
        percentage: 50,
        wordsRead: 1000,
        totalWords: 2000,
        timeSpentMs: 60000,
      };

      const result = updateOfflineProgress(bookId, update);

      expect(result.bookId).toBe(bookId);
      expect(result.percentage).toBe(50);
      expect(result.needsSync).toBe(true);
    });

    it("should retrieve progress for a specific book", () => {
      const bookId = "book-123";
      updateOfflineProgress(bookId, { percentage: 50, wordsRead: 1000 });

      const progress = getOfflineProgressForBook(bookId);

      expect(progress).not.toBeNull();
      expect(progress?.bookId).toBe(bookId);
      expect(progress?.percentage).toBe(50);
    });

    it("should return null for non-existent book", () => {
      const progress = getOfflineProgressForBook("non-existent");
      expect(progress).toBeNull();
    });

    it("should mark progress as synced", () => {
      const bookId = "book-123";
      updateOfflineProgress(bookId, { percentage: 50, wordsRead: 1000 });

      markProgressAsSynced(bookId);

      const progress = getOfflineProgressForBook(bookId);
      expect(progress?.needsSync).toBe(false);
    });

    it("should get all progress needing sync", () => {
      updateOfflineProgress("book-1", { percentage: 25, wordsRead: 500 });
      updateOfflineProgress("book-2", { percentage: 75, wordsRead: 1500 });
      markProgressAsSynced("book-1");

      const needsSync = getProgressNeedingSync();

      expect(needsSync).toHaveLength(1);
      expect(needsSync[0]?.bookId).toBe("book-2");
    });

    it("should clear synced progress", () => {
      updateOfflineProgress("book-1", { percentage: 25, wordsRead: 500 });
      updateOfflineProgress("book-2", { percentage: 75, wordsRead: 1500 });
      markProgressAsSynced("book-1");

      clearSyncedProgress();

      const allProgress = getAllOfflineProgress();
      expect(Object.keys(allProgress)).toHaveLength(1);
      expect(allProgress["book-2"]).toBeDefined();
    });

    it("should persist progress to localStorage", () => {
      const bookId = "book-123";
      updateOfflineProgress(bookId, { percentage: 50, wordsRead: 1000 });

      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed[bookId]).toBeDefined();
    });
  });

  describe("Sync Queue", () => {
    it("should add progress to sync queue", async () => {
      const bookId = "book-123";
      await queueProgressUpdate(bookId, {
        position: "chapter-5",
        percentage: 50,
        wordsRead: 1000,
        totalWords: 2000,
        timeSpentMs: 60000,
      });

      const queue = getProgressSyncQueue();
      expect(queue.length).toBeGreaterThan(0);
      expect(queue[0]?.data.bookId).toBe(bookId);
    });

    it("should get sync status for books", () => {
      updateOfflineProgress("book-1", { percentage: 25, wordsRead: 500 });
      updateOfflineProgress("book-2", { percentage: 75, wordsRead: 1500 });

      const statuses = getProgressSyncStatus();
      expect(statuses).toHaveLength(2);
      expect(statuses.every((s) => s.pendingChanges > 0)).toBe(true);
    });

    it("should get overall sync state", () => {
      const state = getOverallSyncState();

      expect(state).toHaveProperty("isOnline");
      expect(state).toHaveProperty("isSyncing");
      expect(state).toHaveProperty("lastSyncAt");
      expect(state).toHaveProperty("pendingCount");
      expect(state).toHaveProperty("errorCount");
    });
  });

  describe("Sync Logic", () => {
    beforeEach(() => {
      // Mock fetch
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve("OK"),
        } as Response)
      );
    });

    it("should not sync when offline", async () => {
      // Mock offline
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      const result = await syncAllProgress();

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should sync progress items when online", async () => {
      // Mock online
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      // Add items to queue
      await queueProgressUpdate("book-1", {
        position: 0,
        percentage: 25,
        wordsRead: 500,
        totalWords: 2000,
        timeSpentMs: 10000,
      });

      await syncAllProgress();

      // Should attempt to sync
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("Conflict Resolution", () => {
    it("should use last-write-wins strategy", () => {
      const local: OfflineReadingProgress = {
        bookId: "book-123",
        position: "chapter-5",
        percentage: 50,
        wordsRead: 1000,
        totalWords: 2000,
        timeSpentMs: 60000,
        lastUpdatedAt: Date.now(),
        needsSync: true,
      };

      const remote = {
        position: "chapter-3",
        percentage: 30,
        wordsRead: 600,
        totalWords: 2000,
        timeSpentMs: 40000,
        updatedAt: Date.now() - 10000, // Older
      };

      const resolved = resolveProgressConflict(local, remote);

      // Local should win (newer)
      expect(resolved.percentage).toBe(50);
      expect(resolved.position).toBe("chapter-5");
    });

    it("should prefer remote when it's newer", () => {
      const local: OfflineReadingProgress = {
        bookId: "book-123",
        position: "chapter-3",
        percentage: 30,
        wordsRead: 600,
        totalWords: 2000,
        timeSpentMs: 40000,
        lastUpdatedAt: Date.now() - 10000, // Older
        needsSync: true,
      };

      const remote = {
        position: "chapter-5",
        percentage: 50,
        wordsRead: 1000,
        totalWords: 2000,
        timeSpentMs: 60000,
        updatedAt: Date.now(), // Newer
      };

      const resolved = resolveProgressConflict(local, remote);

      // Remote should win (newer)
      expect(resolved.percentage).toBe(50);
      expect(resolved.position).toBe("chapter-5");
      expect(resolved.needsSync).toBe(false);
    });
  });

  describe("Cleanup", () => {
    it("should clear all progress data", () => {
      updateOfflineProgress("book-1", { percentage: 25, wordsRead: 500 });
      updateOfflineProgress("book-2", { percentage: 75, wordsRead: 1500 });

      clearAllProgressData();

      const allProgress = getAllOfflineProgress();
      expect(Object.keys(allProgress)).toHaveLength(0);
    });
  });
});
