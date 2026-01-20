/**
 * useOfflineAnnotationSync Hook
 *
 * Hook for managing offline annotation sync in React components.
 */

import { useState, useEffect, useCallback } from "react";

import type {
  OfflineAnnotation,
  CreateAnnotationOffline,
  UpdateAnnotationOffline,
  AnnotationSyncStatus,
} from "@/pwa/offlineAnnotationSync";
import {
  getOfflineAnnotations,
  createAnnotationOffline,
  updateAnnotationOffline,
  deleteAnnotationOffline,
  syncAllAnnotations,
  getAnnotationSyncStatus,
  getAnnotationsNeedingSync,
} from "@/pwa/offlineAnnotationSync";

export interface UseOfflineAnnotationSyncOptions {
  /** Book ID to sync annotations for */
  bookId: string;
  /** Auto-sync when online */
  autoSync?: boolean;
  /** Sync interval in milliseconds (default: 30 seconds) */
  syncInterval?: number;
}

export interface UseOfflineAnnotationSyncReturn {
  /** All annotations for the book */
  annotations: OfflineAnnotation[];
  /** Current sync status */
  syncStatus: AnnotationSyncStatus;
  /** Create annotation offline */
  createAnnotation: (
    input: CreateAnnotationOffline
  ) => Promise<OfflineAnnotation>;
  /** Update annotation offline */
  updateAnnotation: (
    input: UpdateAnnotationOffline
  ) => Promise<OfflineAnnotation | null>;
  /** Delete annotation offline */
  deleteAnnotation: (id: string) => Promise<void>;
  /** Manually trigger sync */
  syncNow: () => Promise<void>;
  /** Refresh annotations from IndexedDB */
  refresh: () => Promise<void>;
  /** Whether sync is currently in progress */
  isSyncing: boolean;
}

/**
 * Hook for managing offline annotation sync
 *
 * @example
 * const { annotations, createAnnotation, syncNow } = useOfflineAnnotationSync({ bookId });
 *
 * // Create annotation offline
 * await createAnnotation({ bookId, type: 'HIGHLIGHT', startOffset: 0, endOffset: 10 });
 *
 * // Manually trigger sync
 * await syncNow();
 */
export function useOfflineAnnotationSync(
  options: UseOfflineAnnotationSyncOptions
): UseOfflineAnnotationSyncReturn {
  const { bookId, autoSync = true, syncInterval = 30000 } = options;

  const [annotations, setAnnotations] = useState<OfflineAnnotation[]>([]);
  const [syncStatus, setSyncStatus] = useState<AnnotationSyncStatus>({
    pending: 0,
    syncing: false,
    lastSyncedAt: null,
    errors: [],
  });
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * Load annotations from IndexedDB
   */
  const refresh = useCallback(async () => {
    try {
      const loaded = await getOfflineAnnotations(bookId);
      setAnnotations(loaded);

      const status = await getAnnotationSyncStatus();
      setSyncStatus(status);
    } catch (_error) {
      // Silently fail
    }
  }, [bookId]);

  /**
   * Create annotation offline
   */
  const createAnnotation = useCallback(
    async (input: CreateAnnotationOffline) => {
      const annotation = await createAnnotationOffline(input);
      await refresh();
      return annotation;
    },
    [refresh]
  );

  /**
   * Update annotation offline
   */
  const updateAnnotation = useCallback(
    async (input: UpdateAnnotationOffline) => {
      const updated = await updateAnnotationOffline(input);
      await refresh();
      return updated;
    },
    [refresh]
  );

  /**
   * Delete annotation offline
   */
  const deleteAnnotation = useCallback(
    async (id: string) => {
      await deleteAnnotationOffline(id);
      await refresh();
    },
    [refresh]
  );

  /**
   * Manually trigger sync
   */
  const syncNow = useCallback(async () => {
    if (!navigator.onLine || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setSyncStatus((prev) => ({ ...prev, syncing: true }));

    try {
      const result = await syncAllAnnotations();

      setSyncStatus({
        pending: result.failed,
        syncing: false,
        lastSyncedAt: Date.now(),
        errors: result.errors,
      });

      await refresh();
    } catch (_error) {
      setSyncStatus((prev) => ({ ...prev, syncing: false }));
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refresh]);

  /**
   * Handle online/offline events
   */
  useEffect(() => {
    const handleOnline = () => {
      if (autoSync) {
        syncNow();
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [autoSync, syncNow]);

  /**
   * Auto-sync interval
   */
  useEffect(() => {
    if (!autoSync) {
      return;
    }

    const intervalId = setInterval(async () => {
      const needsSync = await getAnnotationsNeedingSync();
      if (needsSync.length > 0 && navigator.onLine) {
        syncNow();
      }
    }, syncInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoSync, syncInterval, syncNow]);

  /**
   * Initial load
   */
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    annotations,
    syncStatus,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    syncNow,
    refresh,
    isSyncing,
  };
}
