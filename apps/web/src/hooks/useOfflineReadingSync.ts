/**
 * useOfflineReadingSync Hook
 *
 * Hook for managing offline reading progress sync in React components.
 */

import { useState, useEffect, useCallback, useRef } from "react";

import type {
  OfflineReadingProgress,
  ProgressSyncState,
  ProgressSyncStatus,
} from "@/pwa/offlineReadingProgressSync";
import {
  updateOfflineProgress,
  getOfflineProgressForBook,
  getProgressNeedingSync,
  queueProgressUpdate,
  syncAllProgress,
  getOverallSyncState,
  getProgressSyncStatus,
  SYNC_DEBOUNCE_MS,
} from "@/pwa/offlineReadingProgressSync";

export interface UseOfflineReadingSyncOptions {
  /** Auto-sync when online */
  autoSync?: boolean;
  /** Sync interval in milliseconds (default: 30 seconds) */
  syncInterval?: number;
}

export interface UseOfflineReadingSyncReturn {
  /** Current sync state */
  syncState: ProgressSyncState;
  /** Sync status for all books */
  bookStatuses: ProgressSyncStatus[];
  /** Update progress offline */
  updateProgress: (
    bookId: string,
    progress: Partial<OfflineReadingProgress>
  ) => void;
  /** Get progress for a book */
  getProgress: (bookId: string) => OfflineReadingProgress | null;
  /** Manually trigger sync */
  syncNow: () => Promise<void>;
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Number of pending sync items */
  pendingCount: number;
}

/**
 * Hook for managing offline reading progress sync
 *
 * @example
 * const { updateProgress, syncState, syncNow } = useOfflineReadingSync();
 *
 * // Update progress offline
 * updateProgress(bookId, { percentage: 50, wordsRead: 1000 });
 *
 * // Manually trigger sync
 * await syncNow();
 */
export function useOfflineReadingSync(
  options: UseOfflineReadingSyncOptions = {}
): UseOfflineReadingSyncReturn {
  const { autoSync = true, syncInterval = 30000 } = options;

  const [syncState, setSyncState] = useState<ProgressSyncState>(
    getOverallSyncState()
  );
  const [bookStatuses, setBookStatuses] = useState<ProgressSyncStatus[]>(
    getProgressSyncStatus()
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  /**
   * Update sync state
   */
  const refreshSyncState = useCallback(() => {
    setSyncState(getOverallSyncState());
    setBookStatuses(getProgressSyncStatus());
  }, []);

  /**
   * Update progress offline
   */
  const updateProgress = useCallback(
    (bookId: string, progress: Partial<OfflineReadingProgress>) => {
      try {
        const updated = updateOfflineProgress(bookId, progress);

        // Queue for sync if significant change
        if (progress.percentage !== undefined) {
          queueProgressUpdate(bookId, {
            position: updated.position,
            percentage: updated.percentage,
            wordsRead: updated.wordsRead,
            totalWords: updated.totalWords,
            timeSpentMs: updated.timeSpentMs,
          });
        }

        refreshSyncState();

        // Debounced auto-sync
        if (autoSync && navigator.onLine) {
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }
          syncTimeoutRef.current = setTimeout(() => {
            syncNow();
          }, SYNC_DEBOUNCE_MS);
        }
      } catch (_error) {
        // Silently fail - offline storage is not critical
      }
    },
    [autoSync, refreshSyncState]
  );

  /**
   * Get progress for a book
   */
  const getProgress = useCallback((bookId: string) => {
    return getOfflineProgressForBook(bookId);
  }, []);

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    if (!navigator.onLine || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setSyncState((prev) => ({ ...prev, isSyncing: true }));

    try {
      const result = await syncAllProgress();

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: Date.now(),
        pendingCount: result.failed,
        errorCount: result.failed,
      }));
    } catch (_error) {
      setSyncState((prev) => ({ ...prev, isSyncing: false }));
    } finally {
      setIsSyncing(false);
      refreshSyncState();
    }
  }, [isSyncing, refreshSyncState]);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      refreshSyncState();
      if (autoSync) {
        syncNow();
      }
    };

    const handleOffline = () => {
      refreshSyncState();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [autoSync, syncNow, refreshSyncState]);

  /**
   * Auto-sync interval
   */
  useEffect(() => {
    if (!autoSync) {
      return;
    }

    autoSyncIntervalRef.current = setInterval(() => {
      const needsSync = getProgressNeedingSync();
      if (needsSync.length > 0 && navigator.onLine) {
        syncNow();
      }
    }, syncInterval);

    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
    };
  }, [autoSync, syncInterval, syncNow]);

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
      }
    };
  }, []);

  return {
    syncState,
    bookStatuses,
    updateProgress,
    getProgress,
    syncNow,
    isSyncing,
    pendingCount: syncState.pendingCount,
  };
}
