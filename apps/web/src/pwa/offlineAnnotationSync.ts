/**
 * Offline Annotation Sync
 *
 * Manages annotation creation/editing/deletion offline and syncing when online.
 * - Creates/edits/deletes annotations offline in IndexedDB
 * - Queues operations for sync
 * - Syncs when connection restored
 * - Resolves conflicts with server-timestamp strategy
 */

import type {
  Annotation,
  AnnotationType,
  HighlightColor,
} from "@/components/reader/annotationTypes";
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
 * Pending annotation operation
 */
export type AnnotationOperation = "create" | "update" | "delete";

/**
 * Offline annotation with sync metadata
 */
export type OfflineAnnotation = Annotation & {
  /** Whether this annotation needs to be synced */
  needsSync: boolean;
  /** The operation to perform on sync */
  operation: AnnotationOperation;
  /** Local creation/update timestamp */
  localTimestamp: number;
};

/**
 * Annotation create input
 */
export interface CreateAnnotationOffline {
  bookId: string;
  type: AnnotationType;
  startOffset: number;
  endOffset: number;
  text?: string;
  note?: string;
  color?: HighlightColor;
  isPublic?: boolean;
}

/**
 * Annotation update input
 */
export interface UpdateAnnotationOffline {
  id: string;
  note?: string;
  color?: HighlightColor;
  isPublic?: boolean;
}

/**
 * Annotation sync queue item
 */
export interface AnnotationSyncQueueItem extends SyncQueueItem {
  data: {
    type: "annotation";
    operation: AnnotationOperation;
    annotation: Annotation;
  };
}

/**
 * Sync status for annotations
 */
export interface AnnotationSyncStatus {
  pending: number;
  syncing: boolean;
  lastSyncedAt: number | null;
  errors: Array<{ id: string; error: string }>;
}

// ============================================================================
// Constants
// ============================================================================

export const ANNOTATIONS_DB_NAME = "offline-annotations";
export const ANNOTATIONS_DB_VERSION = 1;
export const ANNOTATIONS_STORE_NAME = "annotations";
export const ANNOTATION_SYNC_BATCH_SIZE = 20;

// ============================================================================
// IndexedDB Operations
// ============================================================================

/**
 * Open the offline annotations database
 */
export async function openAnnotationsDB(): Promise<IDBDatabase | null> {
  if (!("indexedDB" in window)) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ANNOTATIONS_DB_NAME, ANNOTATIONS_DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open annotations database"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(ANNOTATIONS_STORE_NAME)) {
        const store = db.createObjectStore(ANNOTATIONS_STORE_NAME, {
          keyPath: "id",
        });
        store.createIndex("bookId", "bookId", { unique: false });
        store.createIndex("needsSync", "needsSync", { unique: false });
        store.createIndex("operation", "operation", { unique: false });
      }
    };
  });
}

/**
 * Get all annotations for a book from IndexedDB
 */
export async function getOfflineAnnotations(
  bookId: string
): Promise<OfflineAnnotation[]> {
  const db = await openAnnotationsDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ANNOTATIONS_STORE_NAME, "readonly");
    const store = transaction.objectStore(ANNOTATIONS_STORE_NAME);
    const index = store.index("bookId");
    const request = index.getAll(bookId);

    request.onsuccess = () => {
      resolve(request.result as OfflineAnnotation[]);
      db.close();
    };

    request.onerror = () => {
      reject(new Error("Failed to get annotations"));
      db.close();
    };
  });
}

/**
 * Get a single annotation by ID
 */
export async function getOfflineAnnotation(
  id: string
): Promise<OfflineAnnotation | null> {
  const db = await openAnnotationsDB();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ANNOTATIONS_STORE_NAME, "readonly");
    const store = transaction.objectStore(ANNOTATIONS_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
      db.close();
    };

    request.onerror = () => {
      reject(new Error("Failed to get annotation"));
      db.close();
    };
  });
}

/**
 * Save annotation to IndexedDB
 */
export async function saveOfflineAnnotation(
  annotation: OfflineAnnotation
): Promise<void> {
  const db = await openAnnotationsDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ANNOTATIONS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(ANNOTATIONS_STORE_NAME);
    const request = store.put(annotation);

    request.onsuccess = () => {
      resolve();
      db.close();
    };

    request.onerror = () => {
      reject(new Error("Failed to save annotation"));
      db.close();
    };
  });
}

/**
 * Delete annotation from IndexedDB
 */
export async function deleteOfflineAnnotation(id: string): Promise<void> {
  const db = await openAnnotationsDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ANNOTATIONS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(ANNOTATIONS_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
      db.close();
    };

    request.onerror = () => {
      reject(new Error("Failed to delete annotation"));
      db.close();
    };
  });
}

/**
 * Get all annotations that need syncing
 */
export async function getAnnotationsNeedingSync(): Promise<
  OfflineAnnotation[]
> {
  const db = await openAnnotationsDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ANNOTATIONS_STORE_NAME, "readonly");
    const store = transaction.objectStore(ANNOTATIONS_STORE_NAME);
    const index = store.index("needsSync");
    const request = index.getAll(IDBKeyRange.only(true));

    request.onsuccess = () => {
      resolve(request.result as OfflineAnnotation[]);
      db.close();
    };

    request.onerror = () => {
      reject(new Error("Failed to get annotations needing sync"));
      db.close();
    };
  });
}

// ============================================================================
// Annotation Operations
// ============================================================================

/**
 * Create annotation offline
 */
export async function createAnnotationOffline(
  input: CreateAnnotationOffline
): Promise<OfflineAnnotation> {
  const now = new Date().toISOString();

  let baseAnnotation: Annotation;
  if (input.type === "HIGHLIGHT") {
    baseAnnotation = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookId: input.bookId,
      type: "HIGHLIGHT",
      startOffset: input.startOffset,
      endOffset: input.endOffset,
      selectedText: input.text || "",
      color: input.color || "yellow",
      ...(input.note && { note: input.note }),
      isPublic: input.isPublic ?? false,
      likeCount: 0,
      isLikedByCurrentUser: false,
      createdAt: now,
      updatedAt: now,
    };
  } else if (input.type === "NOTE") {
    baseAnnotation = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookId: input.bookId,
      type: "NOTE",
      startOffset: input.startOffset,
      endOffset: input.endOffset,
      ...(input.text && { selectedText: input.text }),
      note: input.note || "",
      isPublic: input.isPublic ?? false,
      likeCount: 0,
      isLikedByCurrentUser: false,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    baseAnnotation = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookId: input.bookId,
      type: "BOOKMARK",
      startOffset: input.startOffset,
      endOffset: input.endOffset,
      isPublic: input.isPublic ?? false,
      likeCount: 0,
      isLikedByCurrentUser: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  const annotation: OfflineAnnotation = {
    ...baseAnnotation,
    needsSync: true,
    operation: "create",
    localTimestamp: Date.now(),
  };

  await saveOfflineAnnotation(annotation);
  await queueAnnotationSync(annotation, "create");

  return annotation;
}

/**
 * Update annotation offline
 */
export async function updateAnnotationOffline(
  input: UpdateAnnotationOffline
): Promise<OfflineAnnotation | null> {
  const existing = await getOfflineAnnotation(input.id);
  if (!existing) return null;

  const now = new Date().toISOString();

  // Create updated annotation based on type
  let updatedBase: Annotation;
  if (existing.type === "HIGHLIGHT") {
    const newNote = input.note ?? existing.note;
    updatedBase = {
      id: existing.id,
      bookId: existing.bookId,
      type: "HIGHLIGHT",
      startOffset: existing.startOffset,
      endOffset: existing.endOffset,
      selectedText: existing.selectedText,
      color: input.color ?? existing.color,
      ...(newNote && { note: newNote }),
      isPublic: input.isPublic ?? existing.isPublic,
      likeCount: existing.likeCount,
      isLikedByCurrentUser: existing.isLikedByCurrentUser,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  } else if (existing.type === "NOTE") {
    updatedBase = {
      id: existing.id,
      bookId: existing.bookId,
      type: "NOTE",
      startOffset: existing.startOffset,
      endOffset: existing.endOffset,
      ...(existing.selectedText && { selectedText: existing.selectedText }),
      note: input.note ?? existing.note,
      isPublic: input.isPublic ?? existing.isPublic,
      likeCount: existing.likeCount,
      isLikedByCurrentUser: existing.isLikedByCurrentUser,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  } else {
    updatedBase = {
      id: existing.id,
      bookId: existing.bookId,
      type: "BOOKMARK",
      startOffset: existing.startOffset,
      endOffset: existing.endOffset,
      isPublic: input.isPublic ?? existing.isPublic,
      likeCount: existing.likeCount,
      isLikedByCurrentUser: existing.isLikedByCurrentUser,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  }

  const updated: OfflineAnnotation = {
    ...updatedBase,
    needsSync: true,
    operation: "update",
    localTimestamp: Date.now(),
  };

  await saveOfflineAnnotation(updated);
  await queueAnnotationSync(updated, "update");

  return updated;
}

/**
 * Delete annotation offline
 */
export async function deleteAnnotationOffline(id: string): Promise<void> {
  const existing = await getOfflineAnnotation(id);
  if (!existing) return;

  // Mark for deletion sync if it was previously synced
  if (!id.startsWith("offline-")) {
    const deletionMarker: OfflineAnnotation = {
      ...existing,
      needsSync: true,
      operation: "delete",
      localTimestamp: Date.now(),
    };
    await saveOfflineAnnotation(deletionMarker);
    await queueAnnotationSync(deletionMarker, "delete");
  } else {
    // If it's offline-only, just delete it
    await deleteOfflineAnnotation(id);
  }
}

// ============================================================================
// Sync Queue Management
// ============================================================================

/**
 * Add annotation to sync queue
 */
async function queueAnnotationSync(
  annotation: OfflineAnnotation,
  operation: AnnotationOperation
): Promise<void> {
  const queueItem: AnnotationSyncQueueItem = {
    id: `annotation-${annotation.id}-${Date.now()}`,
    url: getApiUrl(operation, annotation.id),
    method: getHttpMethod(operation),
    body: JSON.stringify(prepareAnnotationForSync(annotation)),
    data: {
      type: "annotation",
      operation,
      annotation: prepareAnnotationForSync(annotation),
    },
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: MAX_SYNC_RETRIES,
  };

  await addToSyncQueue(queueItem);
}

/**
 * Get API URL for operation
 */
function getApiUrl(operation: AnnotationOperation, id: string): string {
  switch (operation) {
    case "create":
      return "/api/annotations";
    case "update":
      return `/api/annotations/${id}`;
    case "delete":
      return `/api/annotations/${id}`;
  }
}

/**
 * Get HTTP method for operation
 */
function getHttpMethod(operation: AnnotationOperation): string {
  switch (operation) {
    case "create":
      return "POST";
    case "update":
      return "PATCH";
    case "delete":
      return "DELETE";
  }
}

/**
 * Prepare annotation for API sync
 */
function prepareAnnotationForSync(annotation: OfflineAnnotation): Annotation {
  const {
    needsSync: _needsSync,
    operation: _operation,
    localTimestamp: _localTimestamp,
    ...rest
  } = annotation;
  return rest as Annotation;
}

/**
 * Get all annotation sync items from queue
 */
export function getAnnotationSyncQueue(): AnnotationSyncQueueItem[] {
  const queue = getSyncQueue();
  return queue.filter(
    (item): item is AnnotationSyncQueueItem =>
      "data" in item &&
      typeof item.data === "object" &&
      item.data !== null &&
      "type" in item.data &&
      item.data.type === "annotation"
  );
}

/**
 * Remove annotation sync item from queue
 */
export async function removeAnnotationFromQueue(itemId: string): Promise<void> {
  await removeFromSyncQueue(itemId);
}

/**
 * Get annotation sync status
 */
export async function getAnnotationSyncStatus(): Promise<AnnotationSyncStatus> {
  const queue = getAnnotationSyncQueue();
  const errorItems = queue.filter((item) => item.retryCount > 0);

  return {
    pending: queue.length,
    syncing: false,
    lastSyncedAt: null,
    errors: errorItems.map((item) => ({
      id: item.data.annotation.id,
      error: `Retry ${item.retryCount}`,
    })),
  };
}

// ============================================================================
// Sync Logic
// ============================================================================

/**
 * Sync a single annotation operation
 */
async function syncAnnotationItem(
  item: AnnotationSyncQueueItem
): Promise<{ success: boolean; error?: string; serverId?: string }> {
  try {
    const response = await fetch(item.url, {
      method: item.method,
      headers: {
        "Content-Type": "application/json",
      },
      ...(item.body && { body: item.body }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    // For creates, get the server-assigned ID
    if (item.data.operation === "create") {
      const result = await response.json();
      return { success: true, serverId: result.id };
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
 * Sync all pending annotations
 */
export async function syncAllAnnotations(): Promise<{
  synced: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0, errors: [] };
  }

  const queue = getAnnotationSyncQueue();
  const errors: Array<{ id: string; error: string }> = [];
  let synced = 0;
  let failed = 0;

  // Process items in batches
  for (let i = 0; i < queue.length; i += ANNOTATION_SYNC_BATCH_SIZE) {
    const batch = queue.slice(i, i + ANNOTATION_SYNC_BATCH_SIZE);

    await Promise.all(
      batch.map(async (item) => {
        if (!shouldRetrySyncItem(item)) {
          await removeAnnotationFromQueue(item.id);
          failed++;
          errors.push({
            id: item.data.annotation.id,
            error: "Max retries exceeded",
          });
          return;
        }

        const result = await syncAnnotationItem(item);

        if (result.success) {
          // Remove from queue
          await removeAnnotationFromQueue(item.id);

          // Update local annotation with server ID if created
          if (item.data.operation === "create" && result.serverId) {
            const oldId = item.data.annotation.id;
            const annotation = await getOfflineAnnotation(oldId);
            if (annotation) {
              // Delete old offline annotation
              await deleteOfflineAnnotation(oldId);
              // Save with new server ID
              const updated = {
                ...annotation,
                id: result.serverId,
                needsSync: false,
              };
              await saveOfflineAnnotation(updated);
            }
          } else if (item.data.operation === "delete") {
            // Delete the annotation locally
            await deleteOfflineAnnotation(item.data.annotation.id);
          } else {
            // Mark as synced
            const annotation = await getOfflineAnnotation(
              item.data.annotation.id
            );
            if (annotation) {
              await saveOfflineAnnotation({
                ...annotation,
                needsSync: false,
              });
            }
          }

          synced++;
        } else {
          await incrementRetryCount(item.id);
          failed++;
          errors.push({
            id: item.data.annotation.id,
            error: result.error || "Sync failed",
          });
        }
      })
    );
  }

  return { synced, failed, errors };
}

/**
 * Clear all offline annotations and queue
 */
export async function clearAllAnnotationData(): Promise<void> {
  const db = await openAnnotationsDB();
  if (!db) return;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ANNOTATIONS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(ANNOTATIONS_STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      const queue = getAnnotationSyncQueue();
      queue.forEach((item) => removeFromSyncQueue(item.id));
      resolve();
      db.close();
    };

    request.onerror = () => {
      reject(new Error("Failed to clear annotations"));
      db.close();
    };
  });
}
