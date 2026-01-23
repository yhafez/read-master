/**
 * @vitest-environment jsdom
 */

/**
 * Offline Cache Utilities Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  APP_SHELL_ROUTES,
  DEFAULT_APP_SHELL_CONFIG,
  LAST_ONLINE_KEY,
  MAX_SYNC_RETRIES,
  NETWORK_ONLY_ROUTES,
  SYNC_QUEUE_KEY,
} from "./offlineCacheTypes";
import {
  addToSyncQueue,
  clearSyncQueue,
  createNetworkStatusEvent,
  createOfflinePageState,
  createOnlineHandler,
  createSyncQueueItem,
  formatTimeSinceOnline,
  getCacheableRoute,
  getHighPriorityRoutes,
  getLastOnlineTime,
  getOnlineStatus,
  getSyncQueue,
  incrementRetryCount,
  isCacheAvailable,
  isRouteCacheable,
  normalizePathForCache,
  removeFromSyncQueue,
  saveLastOnlineTime,
  saveSyncQueue,
  shouldRetrySyncItem,
  shouldShowOfflineFallback,
} from "./offlineCacheUtils";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock navigator.onLine
let mockOnline = true;
Object.defineProperty(navigator, "onLine", {
  get: () => mockOnline,
  configurable: true,
});

describe("offlineCacheUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockOnline = true;
  });

  // =========================================================================
  // Cache Availability
  // =========================================================================
  describe("isCacheAvailable", () => {
    it("returns a boolean indicating caches API availability", () => {
      // isCacheAvailable returns a boolean
      const result = isCacheAvailable();
      expect(typeof result).toBe("boolean");
    });
  });

  // =========================================================================
  // Route Utilities
  // =========================================================================
  describe("isRouteCacheable", () => {
    it("returns false for API routes", () => {
      expect(isRouteCacheable("/api/books")).toBe(false);
      expect(isRouteCacheable("/api/users/123")).toBe(false);
    });

    it("returns false for auth routes", () => {
      expect(isRouteCacheable("/sign-in")).toBe(false);
      expect(isRouteCacheable("/sign-up")).toBe(false);
    });

    it("returns false for OAuth routes", () => {
      expect(isRouteCacheable("/oauth/callback")).toBe(false);
    });

    it("returns false for webhook routes", () => {
      expect(isRouteCacheable("/webhook")).toBe(false);
    });

    it("returns true for normal app routes", () => {
      expect(isRouteCacheable("/")).toBe(true);
      expect(isRouteCacheable("/library")).toBe(true);
      expect(isRouteCacheable("/flashcards")).toBe(true);
      expect(isRouteCacheable("/settings")).toBe(true);
    });
  });

  describe("getCacheableRoute", () => {
    it("returns route info for known routes", () => {
      const homeRoute = getCacheableRoute("/");
      expect(homeRoute).toBeDefined();
      expect(homeRoute?.name).toBe("Home");
      expect(homeRoute?.offlineEnabled).toBe(true);
    });

    it("returns route info for library route", () => {
      const libraryRoute = getCacheableRoute("/library");
      expect(libraryRoute).toBeDefined();
      expect(libraryRoute?.name).toBe("Library");
      expect(libraryRoute?.cachePriority).toBe("high");
    });

    it("returns null for unknown routes", () => {
      expect(getCacheableRoute("/unknown")).toBeNull();
      expect(getCacheableRoute("/some/nested/route")).toBeNull();
    });
  });

  describe("getHighPriorityRoutes", () => {
    it("returns only high priority routes", () => {
      const highPriority = getHighPriorityRoutes();
      expect(highPriority.length).toBeGreaterThan(0);
      expect(highPriority.every((r) => r.cachePriority === "high")).toBe(true);
    });

    it("includes home and library routes", () => {
      const highPriority = getHighPriorityRoutes();
      const paths = highPriority.map((r) => r.path);
      expect(paths).toContain("/");
      expect(paths).toContain("/library");
    });
  });

  describe("normalizePathForCache", () => {
    it("removes query strings", () => {
      expect(normalizePathForCache("/library?filter=reading")).toBe("/library");
    });

    it("preserves path without query", () => {
      expect(normalizePathForCache("/library")).toBe("/library");
    });

    it("handles root path", () => {
      expect(normalizePathForCache("/")).toBe("/");
    });

    it("handles nested paths", () => {
      expect(normalizePathForCache("/books/123/read")).toBe("/books/123/read");
    });
  });

  describe("shouldShowOfflineFallback", () => {
    it("returns false for non-cacheable routes", () => {
      expect(shouldShowOfflineFallback("/api/books")).toBe(false);
      expect(shouldShowOfflineFallback("/sign-in")).toBe(false);
    });

    it("returns true for offline-enabled routes", () => {
      expect(shouldShowOfflineFallback("/")).toBe(true);
      expect(shouldShowOfflineFallback("/library")).toBe(true);
    });

    it("returns true for unknown routes (default)", () => {
      expect(shouldShowOfflineFallback("/some/unknown/route")).toBe(true);
    });
  });

  // =========================================================================
  // Network Status
  // =========================================================================
  describe("getOnlineStatus", () => {
    it("returns true when online", () => {
      mockOnline = true;
      expect(getOnlineStatus()).toBe(true);
    });

    it("returns false when offline", () => {
      mockOnline = false;
      expect(getOnlineStatus()).toBe(false);
    });
  });

  describe("createNetworkStatusEvent", () => {
    it("creates online event", () => {
      const event = createNetworkStatusEvent(true, false);
      expect(event.type).toBe("online");
      expect(event.previousState).toBe(false);
      expect(event.timestamp).toBeDefined();
    });

    it("creates offline event", () => {
      const event = createNetworkStatusEvent(false, true);
      expect(event.type).toBe("offline");
      expect(event.previousState).toBe(true);
    });

    it("includes timestamp", () => {
      const before = Date.now();
      const event = createNetworkStatusEvent(true, false);
      const after = Date.now();
      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });
  });

  // =========================================================================
  // Last Online Time
  // =========================================================================
  describe("getLastOnlineTime", () => {
    it("returns null when no time is stored", () => {
      expect(getLastOnlineTime()).toBeNull();
    });

    it("returns stored time", () => {
      const time = Date.now();
      localStorageMock.setItem(LAST_ONLINE_KEY, time.toString());
      expect(getLastOnlineTime()).toBe(time);
    });

    it("handles invalid stored value", () => {
      localStorageMock.setItem(LAST_ONLINE_KEY, "invalid");
      expect(getLastOnlineTime()).toBeNaN();
    });
  });

  describe("saveLastOnlineTime", () => {
    it("saves current time by default", () => {
      const before = Date.now();
      saveLastOnlineTime();
      const stored = parseInt(
        localStorageMock.getItem(LAST_ONLINE_KEY) ?? "0",
        10
      );
      expect(stored).toBeGreaterThanOrEqual(before);
    });

    it("saves specific time", () => {
      const time = 1234567890;
      saveLastOnlineTime(time);
      expect(localStorageMock.getItem(LAST_ONLINE_KEY)).toBe("1234567890");
    });
  });

  describe("formatTimeSinceOnline", () => {
    it("returns 'Unknown' for null", () => {
      expect(formatTimeSinceOnline(null)).toBe("Unknown");
    });

    it("returns 'Just now' for recent time", () => {
      const now = Date.now();
      expect(formatTimeSinceOnline(now - 30000)).toBe("Just now");
    });

    it("returns minutes for time within hour", () => {
      const time = Date.now() - 5 * 60 * 1000;
      expect(formatTimeSinceOnline(time)).toBe("5 minutes ago");
    });

    it("returns hours for time within day", () => {
      const time = Date.now() - 2 * 60 * 60 * 1000;
      expect(formatTimeSinceOnline(time)).toBe("2 hours ago");
    });

    it("returns days for older time", () => {
      const time = Date.now() - 3 * 24 * 60 * 60 * 1000;
      expect(formatTimeSinceOnline(time)).toBe("3 days ago");
    });

    it("handles singular minute", () => {
      const time = Date.now() - 1 * 60 * 1000;
      expect(formatTimeSinceOnline(time)).toBe("1 minute ago");
    });

    it("handles singular hour", () => {
      const time = Date.now() - 1 * 60 * 60 * 1000;
      expect(formatTimeSinceOnline(time)).toBe("1 hour ago");
    });

    it("handles singular day", () => {
      const time = Date.now() - 1 * 24 * 60 * 60 * 1000;
      expect(formatTimeSinceOnline(time)).toBe("1 day ago");
    });
  });

  // =========================================================================
  // Sync Queue
  // =========================================================================
  describe("createSyncQueueItem", () => {
    it("creates item with URL and method", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      expect(item.url).toBe("/api/books");
      expect(item.method).toBe("POST");
    });

    it("includes optional body", () => {
      const body = JSON.stringify({ title: "Test" });
      const item = createSyncQueueItem("/api/books", "POST", body);
      expect(item.body).toBe(body);
    });

    it("generates unique ID", () => {
      const item1 = createSyncQueueItem("/api/books", "POST");
      const item2 = createSyncQueueItem("/api/books", "POST");
      expect(item1.id).not.toBe(item2.id);
    });

    it("initializes retry count to 0", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      expect(item.retryCount).toBe(0);
    });

    it("sets max retries", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      expect(item.maxRetries).toBe(MAX_SYNC_RETRIES);
    });

    it("includes timestamp", () => {
      const before = Date.now();
      const item = createSyncQueueItem("/api/books", "POST");
      expect(item.timestamp).toBeGreaterThanOrEqual(before);
    });
  });

  describe("getSyncQueue", () => {
    it("returns empty array when no queue", () => {
      expect(getSyncQueue()).toEqual([]);
    });

    it("returns stored queue", () => {
      const queue = [createSyncQueueItem("/api/books", "POST")];
      localStorageMock.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      const result = getSyncQueue();
      expect(result.length).toBe(1);
      expect(result[0]?.url).toBe("/api/books");
    });

    it("handles invalid JSON", () => {
      localStorageMock.setItem(SYNC_QUEUE_KEY, "invalid json");
      expect(getSyncQueue()).toEqual([]);
    });
  });

  describe("saveSyncQueue", () => {
    it("saves queue to storage", () => {
      const queue = [createSyncQueueItem("/api/books", "POST")];
      saveSyncQueue(queue);
      const stored = JSON.parse(
        localStorageMock.getItem(SYNC_QUEUE_KEY) ?? "[]"
      );
      expect(stored.length).toBe(1);
    });

    it("saves empty queue", () => {
      saveSyncQueue([]);
      const stored = JSON.parse(
        localStorageMock.getItem(SYNC_QUEUE_KEY) ?? "[]"
      );
      expect(stored).toEqual([]);
    });
  });

  describe("addToSyncQueue", () => {
    it("adds item to empty queue", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      const result = addToSyncQueue(item);
      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe(item.id);
    });

    it("adds item to existing queue", () => {
      const item1 = createSyncQueueItem("/api/books", "POST");
      addToSyncQueue(item1);
      const item2 = createSyncQueueItem("/api/users", "PUT");
      const result = addToSyncQueue(item2);
      expect(result.length).toBe(2);
    });
  });

  describe("removeFromSyncQueue", () => {
    it("removes item by ID", () => {
      const item1 = createSyncQueueItem("/api/books", "POST");
      const item2 = createSyncQueueItem("/api/users", "PUT");
      addToSyncQueue(item1);
      addToSyncQueue(item2);
      const result = removeFromSyncQueue(item1.id);
      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe(item2.id);
    });

    it("handles non-existent ID", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      addToSyncQueue(item);
      const result = removeFromSyncQueue("non-existent-id");
      expect(result.length).toBe(1);
    });
  });

  describe("clearSyncQueue", () => {
    it("removes queue from storage", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      addToSyncQueue(item);
      clearSyncQueue();
      expect(getSyncQueue()).toEqual([]);
    });
  });

  describe("incrementRetryCount", () => {
    it("increments retry count for item", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      addToSyncQueue(item);
      const result = incrementRetryCount(item.id);
      expect(result?.retryCount).toBe(1);
    });

    it("returns null for non-existent item", () => {
      expect(incrementRetryCount("non-existent-id")).toBeNull();
    });

    it("persists incremented count", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      addToSyncQueue(item);
      incrementRetryCount(item.id);
      const queue = getSyncQueue();
      expect(queue[0]?.retryCount).toBe(1);
    });
  });

  describe("shouldRetrySyncItem", () => {
    it("returns true when retry count below max", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      expect(shouldRetrySyncItem(item)).toBe(true);
    });

    it("returns false when retry count at max", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      item.retryCount = item.maxRetries;
      expect(shouldRetrySyncItem(item)).toBe(false);
    });

    it("returns false when retry count above max", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      item.retryCount = item.maxRetries + 1;
      expect(shouldRetrySyncItem(item)).toBe(false);
    });
  });

  // =========================================================================
  // Offline Page State
  // =========================================================================
  describe("createOfflinePageState", () => {
    it("creates initial state with online status", () => {
      mockOnline = true;
      const state = createOfflinePageState();
      expect(state.isOffline).toBe(false);
    });

    it("creates initial state with offline status", () => {
      mockOnline = false;
      const state = createOfflinePageState();
      expect(state.isOffline).toBe(true);
    });

    it("includes last online time", () => {
      const time = Date.now();
      saveLastOnlineTime(time);
      const state = createOfflinePageState();
      expect(state.lastOnlineTime).toBe(time);
    });

    it("includes pending sync items", () => {
      const item = createSyncQueueItem("/api/books", "POST");
      addToSyncQueue(item);
      const state = createOfflinePageState();
      expect(state.pendingSync.length).toBe(1);
    });

    it("initializes with empty cached routes", () => {
      const state = createOfflinePageState();
      expect(state.cachedRoutes).toEqual([]);
    });
  });

  // =========================================================================
  // Online Handler
  // =========================================================================
  describe("createOnlineHandler", () => {
    it("returns cleanup function", () => {
      const callback = vi.fn();
      const cleanup = createOnlineHandler(callback);
      expect(typeof cleanup).toBe("function");
      cleanup();
    });

    it("calls callback on online event", () => {
      const callback = vi.fn();
      createOnlineHandler(callback);
      window.dispatchEvent(new Event("online"));
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: "online" })
      );
    });

    it("calls callback on offline event", () => {
      const callback = vi.fn();
      createOnlineHandler(callback);
      window.dispatchEvent(new Event("offline"));
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ type: "offline" })
      );
    });

    it("removes listeners on cleanup", () => {
      const callback = vi.fn();
      const cleanup = createOnlineHandler(callback);
      cleanup();
      window.dispatchEvent(new Event("online"));
      expect(callback).not.toHaveBeenCalled();
    });

    it("tracks previous state", () => {
      mockOnline = false;
      const callback = vi.fn();
      createOnlineHandler(callback);
      window.dispatchEvent(new Event("online"));
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ previousState: false })
      );
    });
  });

  // =========================================================================
  // Constants Validation
  // =========================================================================
  describe("Constants", () => {
    it("APP_SHELL_ROUTES contains required routes", () => {
      const paths = APP_SHELL_ROUTES.map((r) => r.path);
      expect(paths).toContain("/");
      expect(paths).toContain("/library");
      expect(paths).toContain("/offline");
    });

    it("NETWORK_ONLY_ROUTES contains API routes", () => {
      expect(NETWORK_ONLY_ROUTES).toContain("/api/");
    });

    it("DEFAULT_APP_SHELL_CONFIG has required properties", () => {
      expect(DEFAULT_APP_SHELL_CONFIG.routes).toBeDefined();
      expect(DEFAULT_APP_SHELL_CONFIG.assets).toBeDefined();
      expect(DEFAULT_APP_SHELL_CONFIG.fallbackPage).toBe("/offline");
    });
  });
});
