/**
 * Offline Reading Progress Sync
 *
 * Manages reading progress tracking offline and syncing when online.
 * - Tracks progress offline in IndexedDB
 * - Queues progress updates for sync
 * - Syncs when connection restored
 * - Resolves conflicts with last-write-wins strategy
 */

import type { SyncQueueItem } from "./offlineCacheTypes";
import {
  getSyncQueue,
  addToSyncQueue,
  removeFromSyncQueue,
  incrementRetryCount,
  shouldRetrySyncItem,
} from "./offlineCacheUtils";
import { MAX_SYNC_RETRIES } from "./offlineCacheTypes";

// ============================================================================
// Types
// ============================================================================

/**
 * Reading progress data stored offline
 */
export interface OfflineReadingProgress {
  bookId: string;
  /** Current position (page number, percentage, or CFI) */
  position: string | number;
  /** Total progress percentage (0-100) */
  percentage: number;
  /** Words read so far */
  wordsRead: number;
  /** Total words in book */
  totalWords: number;
  /** Time spent reading (milliseconds) */
  timeSpentMs: number;
  /** Last updated timestamp */
  lastUpdatedAt: number;
  /** Whether this update needs to be synced */
  needsSync: boolean;
}

/**
 * Progress sync queue item
 */
export interface ProgressSyncQueueItem extends SyncQueueItem {
  data: {
    type: "reading-progress";
    bookId: string;
    position: string | number;
    percentage: number;
    wordsRead: number;
    totalWords: number;
    timeSpentMs: number;
  };
}

/**
 * Sync status for a book
 */
export interface ProgressSyncStatus {
  bookId: string;
  syncing: boolean;
  lastSyncedAt: number | null;
  pendingChanges: number;
  error: string | null;
}

/**
 * Overall sync state
 */
export interface ProgressSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  errorCount: number;
}

// ============================================================================
// Constants
// ============================================================================

export const PROGRESS_STORAGE_KEY = "offline-reading-progress";
export const PROGRESS_SYNC_KEY = "reading-progress-sync";
export const SYNC_DEBOUNCE_MS = 2000; // Debounce sync attempts
export const SYNC_BATCH_SIZE = 10; // Sync up to 10 books at once
export const PROGRESS_UPDATE_THRESHOLD = 1; // Minimum % change to trigger sync

// ============================================================================
// Offline Storage
// ============================================================================

/**
 * Get all offline reading progress from localStorage
 */
export function getAllOfflineProgress(): Record<
  string,
  OfflineReadingProgress
> {
  try {
    const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (_error) {
    return {};
  }
}

/**
 * Save offline reading progress
 */
export function saveOfflineProgress(
  progress: Record<string, OfflineReadingProgress>
): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch (_error) {
    // Silently fail if localStorage is full
  }
}

/**
 * Get progress for a specific book
 */
export function getOfflineProgressForBook(
  bookId: string
): OfflineReadingProgress | null {
  const allProgress = getAllOfflineProgress();
  return allProgress[bookId] || null;
}

/**
 * Update reading progress offline
 */
export function updateOfflineProgress(
  bookId: string,
  update: Partial<OfflineReadingProgress>
): OfflineReadingProgress {
  const allProgress = getAllOfflineProgress();
  const existing = allProgress[bookId];

  const updated: OfflineReadingProgress = {
    bookId,
    position: update.position ?? existing?.position ?? 0,
    percentage: update.percentage ?? existing?.percentage ?? 0,
    wordsRead: update.wordsRead ?? existing?.wordsRead ?? 0,
    totalWords: update.totalWords ?? existing?.totalWords ?? 0,
    timeSpentMs: update.timeSpentMs ?? existing?.timeSpentMs ?? 0,
    lastUpdatedAt: Date.now(),
    needsSync: true,
  };

  allProgress[bookId] = updated;
  saveOfflineProgress(allProgress);

  return updated;
}

/**
 * Mark progress as synced
 */
export function markProgressAsSynced(bookId: string): void {
  const allProgress = getAllOfflineProgress();
  const progress = allProgress[bookId];

  if (progress) {
    progress.needsSync = false;
    progress.lastUpdatedAt = Date.now();
    saveOfflineProgress(allProgress);
  }
}

/**
 * Get all progress items that need syncing
 */
export function getProgressNeedingSync(): OfflineReadingProgress[] {
  const allProgress = getAllOfflineProgress();
  return Object.values(allProgress).filter((p) => p.needsSync);
}

/**
 * Clear synced progress (optional cleanup)
 */
export function clearSyncedProgress(): void {
  const allProgress = getAllOfflineProgress();
  const unsynced: Record<string, OfflineReadingProgress> = {};

  Object.entries(allProgress).forEach(([bookId, progress]) => {
    if (progress.needsSync) {
      unsynced[bookId] = progress;
    }
  });

  saveOfflineProgress(unsynced);
}

// ============================================================================
// Sync Queue Management
// ============================================================================

/**
 * Add progress update to sync queue
 */
export async function queueProgressUpdate(
  bookId: string,
  progress: Omit<
    OfflineReadingProgress,
    "bookId" | "lastUpdatedAt" | "needsSync"
  >
): Promise<void> {
  const queueItem: ProgressSyncQueueItem = {
    id: `progress-${bookId}-${Date.now()}`,
    url: `/api/reading/progress`,
    method: "POST",
    body: JSON.stringify({
      bookId,
      position: progress.position,
      percentage: progress.percentage,
      wordsRead: progress.wordsRead,
      totalWords: progress.totalWords,
      timeSpentMs: progress.timeSpentMs,
    }),
    data: {
      type: "reading-progress",
      bookId,
      position: progress.position,
      percentage: progress.percentage,
      wordsRead: progress.wordsRead,
      totalWords: progress.totalWords,
      timeSpentMs: progress.timeSpentMs,
    },
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: MAX_SYNC_RETRIES,
  };

  await addToSyncQueue(queueItem);
}

/**
 * Get all progress sync items from queue
 */
export function getProgressSyncQueue(): ProgressSyncQueueItem[] {
  const queue = getSyncQueue();
  return queue.filter(
    (item): item is ProgressSyncQueueItem =>
      "data" in item &&
      typeof item.data === "object" &&
      item.data !== null &&
      "type" in item.data &&
      item.data.type === "reading-progress"
  );
}

/**
 * Remove progress sync item from queue
 */
export async function removeProgressFromQueue(itemId: string): Promise<void> {
  await removeFromSyncQueue(itemId);
}

/**
 * Get sync status for all books with pending changes
 */
export function getProgressSyncStatus(): ProgressSyncStatus[] {
  const progressNeedingSync = getProgressNeedingSync();
  const queue = getProgressSyncQueue();

  const statusMap = new Map<string, ProgressSyncStatus>();

  // Add books with offline progress needing sync
  progressNeedingSync.forEach((progress) => {
    statusMap.set(progress.bookId, {
      bookId: progress.bookId,
      syncing: false,
      lastSyncedAt: null,
      pendingChanges: 1,
      error: null,
    });
  });

  // Update with queue items
  queue.forEach((item) => {
    const bookId = item.data.bookId;
    const existing = statusMap.get(bookId);

    if (existing) {
      existing.pendingChanges += 1;
      if (item.retryCount > 0) {
        existing.error = `Retry ${item.retryCount}`;
      }
    } else {
      statusMap.set(bookId, {
        bookId,
        syncing: false,
        lastSyncedAt: null,
        pendingChanges: 1,
        error: item.retryCount > 0 ? `Retry ${item.retryCount}` : null,
      });
    }
  });

  return Array.from(statusMap.values());
}

/**
 * Get overall sync state
 */
export function getOverallSyncState(): ProgressSyncState {
  const queue = getProgressSyncQueue();
  const errorItems = queue.filter((item) => item.retryCount > 0);

  return {
    isOnline: navigator.onLine,
    isSyncing: false, // Updated during sync
    lastSyncAt: null, // Updated after successful sync
    pendingCount: queue.length,
    errorCount: errorItems.length,
  };
}

// ============================================================================
// Sync Logic
// ============================================================================

/**
 * Sync a single progress update to the server
 */
async function syncProgressItem(
  item: ProgressSyncQueueItem
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(item.url, {
      method: item.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item.data),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync all pending progress updates
 */
export async function syncAllProgress(): Promise<{
  synced: number;
  failed: number;
  errors: Array<{ bookId: string; error: string }>;
}> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0, errors: [] };
  }

  const queue = getProgressSyncQueue();
  const errors: Array<{ bookId: string; error: string }> = [];
  let synced = 0;
  let failed = 0;

  // Process items in batches
  for (let i = 0; i < queue.length; i += SYNC_BATCH_SIZE) {
    const batch = queue.slice(i, i + SYNC_BATCH_SIZE);

    await Promise.all(
      batch.map(async (item) => {
        if (!shouldRetrySyncItem(item)) {
          // Too many retries, remove from queue
          await removeProgressFromQueue(item.id);
          failed++;
          errors.push({
            bookId: item.data.bookId,
            error: "Max retries exceeded",
          });
          return;
        }

        const result = await syncProgressItem(item);

        if (result.success) {
          // Remove from queue and mark as synced
          await removeProgressFromQueue(item.id);
          markProgressAsSynced(item.data.bookId);
          synced++;
        } else {
          // Increment retry count
          await incrementRetryCount(item.id);
          failed++;
          errors.push({
            bookId: item.data.bookId,
            error: result.error || "Sync failed",
          });
        }
      })
    );
  }

  return { synced, failed, errors };
}

/**
 * Resolve conflicts by comparing timestamps (last-write-wins)
 */
export function resolveProgressConflict(
  local: OfflineReadingProgress,
  remote: {
    position: string | number;
    percentage: number;
    wordsRead: number;
    totalWords: number;
    timeSpentMs: number;
    updatedAt: number;
  }
): OfflineReadingProgress {
  // Last-write-wins: keep the progress with the most recent timestamp
  if (local.lastUpdatedAt > remote.updatedAt) {
    return local;
  }

  return {
    ...local,
    position: remote.position,
    percentage: remote.percentage,
    wordsRead: remote.wordsRead,
    totalWords: remote.totalWords,
    timeSpentMs: remote.timeSpentMs,
    lastUpdatedAt: remote.updatedAt,
    needsSync: false,
  };
}

/**
 * Clear all offline progress and queue
 */
export function clearAllProgressData(): void {
  localStorage.removeItem(PROGRESS_STORAGE_KEY);
  const queue = getProgressSyncQueue();
  queue.forEach((item) => removeFromSyncQueue(item.id));
}
