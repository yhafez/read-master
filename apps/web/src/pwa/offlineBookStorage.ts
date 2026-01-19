/**
 * Offline Book Storage Utilities
 * Functions for storing and managing books offline using IndexedDB
 */

import type {
  BatchOperationResult,
  DownloadBookOptions,
  DownloadProgress,
  OfflineBook,
  OfflineBookContent,
  OfflineBookFileType,
  OfflineBookFilter,
  OfflineBookMetadata,
  OfflineBooksSettings,
  OfflineReadingPosition,
  StorageOperationResult,
  StorageQuota,
  StorageQuotaLevel,
} from "./offlineBookTypes";
import {
  DEFAULT_MAX_STORAGE_QUOTA,
  DEFAULT_OFFLINE_SETTINGS,
  DOWNLOAD_TIMEOUT_MS,
  MAX_BOOK_SIZE,
  MAX_UNUSED_AGE_MS,
  MIME_TO_FILE_TYPE,
  MIN_STORAGE_BUFFER,
  OFFLINE_BOOKS_DB_NAME,
  OFFLINE_BOOKS_DB_VERSION,
  OFFLINE_BOOKS_SETTINGS_KEY,
  OFFLINE_BOOKS_STORES,
  PROGRESS_UPDATE_INTERVAL_MS,
  STORAGE_CRITICAL_THRESHOLD,
  STORAGE_WARNING_THRESHOLD,
} from "./offlineBookTypes";

// ============================================================================
// IndexedDB Utilities
// ============================================================================

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  return "indexedDB" in window;
}

/**
 * Open the offline books database
 */
export async function openOfflineBooksDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      OFFLINE_BOOKS_DB_NAME,
      OFFLINE_BOOKS_DB_VERSION
    );

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create metadata store with indexes
      if (!db.objectStoreNames.contains(OFFLINE_BOOKS_STORES.METADATA)) {
        const metadataStore = db.createObjectStore(
          OFFLINE_BOOKS_STORES.METADATA,
          {
            keyPath: "bookId",
          }
        );
        metadataStore.createIndex("title", "title", { unique: false });
        metadataStore.createIndex("author", "author", { unique: false });
        metadataStore.createIndex("downloadedAt", "downloadedAt", {
          unique: false,
        });
        metadataStore.createIndex("lastAccessedAt", "lastAccessedAt", {
          unique: false,
        });
        metadataStore.createIndex("fileType", "fileType", { unique: false });
        metadataStore.createIndex("status", "status", { unique: false });
        metadataStore.createIndex("downloadStatus", "downloadStatus", {
          unique: false,
        });
      }

      // Create content store (large blobs stored separately)
      if (!db.objectStoreNames.contains(OFFLINE_BOOKS_STORES.CONTENT)) {
        db.createObjectStore(OFFLINE_BOOKS_STORES.CONTENT, {
          keyPath: "bookId",
        });
      }

      // Create covers store
      if (!db.objectStoreNames.contains(OFFLINE_BOOKS_STORES.COVERS)) {
        db.createObjectStore(OFFLINE_BOOKS_STORES.COVERS, {
          keyPath: "bookId",
        });
      }
    };
  });
}

/**
 * Close the database connection
 */
export function closeDatabase(db: IDBDatabase): void {
  db.close();
}

/**
 * Wrap IDBRequest in a Promise
 */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Wrap IDBTransaction in a Promise that resolves on complete
 */
function promisifyTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error("Transaction aborted"));
  });
}

// ============================================================================
// Metadata Operations
// ============================================================================

/**
 * Save book metadata to IndexedDB
 */
export async function saveBookMetadata(
  metadata: OfflineBookMetadata
): Promise<StorageOperationResult> {
  try {
    const db = await openOfflineBooksDB();
    if (!db) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    const transaction = db.transaction(
      OFFLINE_BOOKS_STORES.METADATA,
      "readwrite"
    );
    const store = transaction.objectStore(OFFLINE_BOOKS_STORES.METADATA);
    store.put(metadata);

    await promisifyTransaction(transaction);
    closeDatabase(db);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}

/**
 * Get book metadata by ID
 */
export async function getBookMetadata(
  bookId: string
): Promise<StorageOperationResult<OfflineBookMetadata>> {
  try {
    const db = await openOfflineBooksDB();
    if (!db) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    const transaction = db.transaction(
      OFFLINE_BOOKS_STORES.METADATA,
      "readonly"
    );
    const store = transaction.objectStore(OFFLINE_BOOKS_STORES.METADATA);
    const result = await promisifyRequest(store.get(bookId));

    closeDatabase(db);

    if (!result) {
      return {
        success: false,
        error: "Book not found",
        errorCode: "NOT_FOUND",
      };
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}

/**
 * Get all book metadata
 */
export async function getAllBookMetadata(): Promise<
  StorageOperationResult<OfflineBookMetadata[]>
> {
  try {
    const db = await openOfflineBooksDB();
    if (!db) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    const transaction = db.transaction(
      OFFLINE_BOOKS_STORES.METADATA,
      "readonly"
    );
    const store = transaction.objectStore(OFFLINE_BOOKS_STORES.METADATA);
    const result = await promisifyRequest(store.getAll());

    closeDatabase(db);

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}

/**
 * Delete book metadata
 */
export async function deleteBookMetadata(
  bookId: string
): Promise<StorageOperationResult> {
  try {
    const db = await openOfflineBooksDB();
    if (!db) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    const transaction = db.transaction(
      OFFLINE_BOOKS_STORES.METADATA,
      "readwrite"
    );
    const store = transaction.objectStore(OFFLINE_BOOKS_STORES.METADATA);
    store.delete(bookId);

    await promisifyTransaction(transaction);
    closeDatabase(db);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}

// ============================================================================
// Content Operations
// ============================================================================

/**
 * Save book content to IndexedDB
 */
export async function saveBookContent(
  bookId: string,
  content: OfflineBookContent
): Promise<StorageOperationResult> {
  try {
    const db = await openOfflineBooksDB();
    if (!db) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    const transaction = db.transaction(
      OFFLINE_BOOKS_STORES.CONTENT,
      "readwrite"
    );
    const store = transaction.objectStore(OFFLINE_BOOKS_STORES.CONTENT);
    store.put({ bookId, ...content });

    await promisifyTransaction(transaction);
    closeDatabase(db);

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // Check for quota exceeded
    if (
      errorMessage.includes("QuotaExceeded") ||
      errorMessage.includes("quota")
    ) {
      return {
        success: false,
        error: "Storage quota exceeded",
        errorCode: "QUOTA_EXCEEDED",
      };
    }
    return {
      success: false,
      error: errorMessage,
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}

/**
 * Get book content by ID
 */
export async function getBookContent(
  bookId: string
): Promise<StorageOperationResult<OfflineBookContent>> {
  try {
    const db = await openOfflineBooksDB();
    if (!db) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    const transaction = db.transaction(
      OFFLINE_BOOKS_STORES.CONTENT,
      "readonly"
    );
    const store = transaction.objectStore(OFFLINE_BOOKS_STORES.CONTENT);
    const result = await promisifyRequest(store.get(bookId));

    closeDatabase(db);

    if (!result) {
      return {
        success: false,
        error: "Book content not found",
        errorCode: "NOT_FOUND",
      };
    }

    return {
      success: true,
      data: {
        data: result.data,
        mimeType: result.mimeType,
        size: result.size,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}

/**
 * Delete book content
 */
export async function deleteBookContent(
  bookId: string
): Promise<StorageOperationResult> {
  try {
    const db = await openOfflineBooksDB();
    if (!db) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    const transaction = db.transaction(
      OFFLINE_BOOKS_STORES.CONTENT,
      "readwrite"
    );
    const store = transaction.objectStore(OFFLINE_BOOKS_STORES.CONTENT);
    store.delete(bookId);

    await promisifyTransaction(transaction);
    closeDatabase(db);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}

// ============================================================================
// Cover Image Operations
// ============================================================================

/**
 * Save cover image as data URL
 */
export async function saveBookCover(
  bookId: string,
  coverDataUrl: string
): Promise<StorageOperationResult> {
  try {
    const db = await openOfflineBooksDB();
    if (!db) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    const transaction = db.transaction(
      OFFLINE_BOOKS_STORES.COVERS,
      "readwrite"
    );
    const store = transaction.objectStore(OFFLINE_BOOKS_STORES.COVERS);
    store.put({ bookId, coverDataUrl });

    await promisifyTransaction(transaction);
    closeDatabase(db);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}

/**
 * Get cover image by book ID
 */
export async function getBookCover(
  bookId: string
): Promise<StorageOperationResult<string>> {
  try {
    const db = await openOfflineBooksDB();
    if (!db) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    const transaction = db.transaction(OFFLINE_BOOKS_STORES.COVERS, "readonly");
    const store = transaction.objectStore(OFFLINE_BOOKS_STORES.COVERS);
    const result = await promisifyRequest(store.get(bookId));

    closeDatabase(db);

    if (!result) {
      return {
        success: false,
        error: "Cover not found",
        errorCode: "NOT_FOUND",
      };
    }

    return { success: true, data: result.coverDataUrl };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}

/**
 * Delete cover image
 */
export async function deleteBookCover(
  bookId: string
): Promise<StorageOperationResult> {
  try {
    const db = await openOfflineBooksDB();
    if (!db) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    const transaction = db.transaction(
      OFFLINE_BOOKS_STORES.COVERS,
      "readwrite"
    );
    const store = transaction.objectStore(OFFLINE_BOOKS_STORES.COVERS);
    store.delete(bookId);

    await promisifyTransaction(transaction);
    closeDatabase(db);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}

// ============================================================================
// Complete Book Operations
// ============================================================================

/**
 * Get a complete offline book (metadata + content)
 */
export async function getOfflineBook(
  bookId: string
): Promise<StorageOperationResult<OfflineBook>> {
  const metadataResult = await getBookMetadata(bookId);
  if (!metadataResult.success || !metadataResult.data) {
    const result: StorageOperationResult<OfflineBook> = {
      success: false,
      error: metadataResult.error ?? "Failed to get metadata",
    };
    if (metadataResult.errorCode) {
      result.errorCode = metadataResult.errorCode;
    }
    return result;
  }

  const contentResult = await getBookContent(bookId);
  // Content might not exist yet (downloading)
  const content = contentResult.success ? (contentResult.data ?? null) : null;

  // Update last accessed time
  const updatedMetadata = {
    ...metadataResult.data,
    lastAccessedAt: Date.now(),
  };
  await saveBookMetadata(updatedMetadata);

  return {
    success: true,
    data: {
      metadata: updatedMetadata,
      content,
    },
  };
}

/**
 * Delete a complete offline book (all data)
 */
export async function deleteOfflineBook(
  bookId: string
): Promise<StorageOperationResult> {
  const results = await Promise.all([
    deleteBookMetadata(bookId),
    deleteBookContent(bookId),
    deleteBookCover(bookId),
  ]);

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    return {
      success: false,
      error: `Failed to delete some data: ${failed.map((f) => f.error).join(", ")}`,
      errorCode: "INDEXEDDB_ERROR",
    };
  }

  return { success: true };
}

/**
 * Check if a book is available offline
 */
export async function isBookAvailableOffline(bookId: string): Promise<boolean> {
  const result = await getBookMetadata(bookId);
  return result.success && result.data?.downloadStatus === "completed";
}

/**
 * Get list of offline books with filtering
 */
export async function getOfflineBooks(
  filter?: OfflineBookFilter
): Promise<StorageOperationResult<OfflineBookMetadata[]>> {
  const result = await getAllBookMetadata();
  if (!result.success || !result.data) {
    return result;
  }

  let books = result.data;

  // Apply filters
  if (filter?.status) {
    const statuses = Array.isArray(filter.status)
      ? filter.status
      : [filter.status];
    books = books.filter((b) => statuses.includes(b.status));
  }

  if (filter?.fileType) {
    const types = Array.isArray(filter.fileType)
      ? filter.fileType
      : [filter.fileType];
    books = books.filter((b) => types.includes(b.fileType));
  }

  if (filter?.search) {
    const searchLower = filter.search.toLowerCase();
    books = books.filter(
      (b) =>
        b.title.toLowerCase().includes(searchLower) ||
        b.author.toLowerCase().includes(searchLower)
    );
  }

  // Apply sorting
  if (filter?.sortBy) {
    const sortOrder = filter.sortOrder === "desc" ? -1 : 1;
    books.sort((a, b) => {
      const aVal = a[filter.sortBy!];
      const bVal = b[filter.sortBy!];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * sortOrder;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * sortOrder;
      }
      return 0;
    });
  }

  // Apply pagination
  if (filter?.offset !== undefined || filter?.limit !== undefined) {
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? books.length;
    books = books.slice(offset, offset + limit);
  }

  return { success: true, data: books };
}

/**
 * Batch delete multiple offline books
 */
export async function batchDeleteOfflineBooks(
  bookIds: string[]
): Promise<BatchOperationResult> {
  const succeededIds: string[] = [];
  const failedIds: Array<{ id: string; error: string }> = [];

  for (const bookId of bookIds) {
    const result = await deleteOfflineBook(bookId);
    if (result.success) {
      succeededIds.push(bookId);
    } else {
      failedIds.push({ id: bookId, error: result.error ?? "Unknown error" });
    }
  }

  return {
    successCount: succeededIds.length,
    failCount: failedIds.length,
    succeededIds,
    failedIds,
  };
}

// ============================================================================
// Reading Position Operations
// ============================================================================

/**
 * Update reading position for an offline book
 */
export async function updateReadingPosition(
  bookId: string,
  position: OfflineReadingPosition
): Promise<StorageOperationResult> {
  const result = await getBookMetadata(bookId);
  if (!result.success || !result.data) {
    return {
      success: false,
      error: "Book not found",
      errorCode: "NOT_FOUND",
    };
  }

  const updatedMetadata: OfflineBookMetadata = {
    ...result.data,
    readingPosition: position,
    progress: position.percentage,
    lastAccessedAt: Date.now(),
  };

  return saveBookMetadata(updatedMetadata);
}

/**
 * Get reading position for an offline book
 */
export async function getReadingPosition(
  bookId: string
): Promise<StorageOperationResult<OfflineReadingPosition | undefined>> {
  const result = await getBookMetadata(bookId);
  if (!result.success || !result.data) {
    return {
      success: false,
      error: "Book not found",
      errorCode: "NOT_FOUND",
    };
  }

  return { success: true, data: result.data.readingPosition };
}

// ============================================================================
// Storage Quota Management
// ============================================================================

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<
  StorageOperationResult<StorageQuota>
> {
  try {
    // Use Storage Manager API if available
    let total = DEFAULT_MAX_STORAGE_QUOTA;
    let used = 0;

    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      total = estimate.quota ?? DEFAULT_MAX_STORAGE_QUOTA;
      used = estimate.usage ?? 0;
    }

    // Calculate books-specific usage
    const booksResult = await getAllBookMetadata();
    const bookCount = booksResult.success ? (booksResult.data?.length ?? 0) : 0;
    const totalBooksSize = booksResult.success
      ? (booksResult.data?.reduce((sum, b) => sum + b.contentSize, 0) ?? 0)
      : 0;

    const available = total - used;
    const usagePercentage = total > 0 ? (used / total) * 100 : 0;

    return {
      success: true,
      data: {
        total,
        used,
        available,
        usagePercentage,
        isQuotaExceeded: available < MIN_STORAGE_BUFFER,
        bookCount,
        totalBooksSize,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "UNKNOWN_ERROR",
    };
  }
}

/**
 * Get storage quota warning level
 */
export function getStorageQuotaLevel(quota: StorageQuota): StorageQuotaLevel {
  const usageRatio = quota.used / quota.total;

  if (quota.isQuotaExceeded) {
    return "exceeded";
  }
  if (usageRatio >= STORAGE_CRITICAL_THRESHOLD) {
    return "critical";
  }
  if (usageRatio >= STORAGE_WARNING_THRESHOLD) {
    return "warning";
  }
  return "normal";
}

/**
 * Check if there's enough space to download a book
 */
export async function hasSpaceForBook(
  bookSize: number
): Promise<StorageOperationResult<boolean>> {
  if (bookSize > MAX_BOOK_SIZE) {
    return {
      success: true,
      data: false,
      error: `Book size (${formatBytes(bookSize)}) exceeds maximum (${formatBytes(MAX_BOOK_SIZE)})`,
    };
  }

  const quotaResult = await getStorageQuota();
  if (!quotaResult.success || !quotaResult.data) {
    const result: StorageOperationResult<boolean> = {
      success: false,
      error: quotaResult.error ?? "Failed to get storage quota",
    };
    if (quotaResult.errorCode) {
      result.errorCode = quotaResult.errorCode;
    }
    return result;
  }

  const hasSpace = quotaResult.data.available >= bookSize + MIN_STORAGE_BUFFER;

  const result: StorageOperationResult<boolean> = {
    success: true,
    data: hasSpace,
  };

  if (!hasSpace) {
    result.error = `Not enough space. Available: ${formatBytes(quotaResult.data.available)}, Required: ${formatBytes(bookSize + MIN_STORAGE_BUFFER)}`;
  }

  return result;
}

/**
 * Get books that haven't been accessed recently (candidates for cleanup)
 */
export async function getStaleBooks(
  maxAgeMs: number = MAX_UNUSED_AGE_MS
): Promise<StorageOperationResult<OfflineBookMetadata[]>> {
  const result = await getAllBookMetadata();
  if (!result.success || !result.data) {
    return result;
  }

  const cutoffTime = Date.now() - maxAgeMs;
  const staleBooks = result.data.filter((b) => b.lastAccessedAt < cutoffTime);

  // Sort by last accessed (oldest first)
  staleBooks.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

  return { success: true, data: staleBooks };
}

/**
 * Automatically cleanup old books to free space
 */
export async function autoCleanupStorage(
  targetFreeSpace: number
): Promise<BatchOperationResult> {
  const quotaResult = await getStorageQuota();
  if (!quotaResult.success || !quotaResult.data) {
    return {
      successCount: 0,
      failCount: 0,
      succeededIds: [],
      failedIds: [],
    };
  }

  // Check if cleanup is needed
  if (quotaResult.data.available >= targetFreeSpace) {
    return {
      successCount: 0,
      failCount: 0,
      succeededIds: [],
      failedIds: [],
    };
  }

  // Get stale books sorted by oldest first
  const staleResult = await getStaleBooks();
  if (
    !staleResult.success ||
    !staleResult.data ||
    staleResult.data.length === 0
  ) {
    return {
      successCount: 0,
      failCount: 0,
      succeededIds: [],
      failedIds: [],
    };
  }

  const booksToDelete: string[] = [];
  let freedSpace = 0;
  const spaceNeeded = targetFreeSpace - quotaResult.data.available;

  for (const book of staleResult.data) {
    if (freedSpace >= spaceNeeded) break;
    booksToDelete.push(book.bookId);
    freedSpace += book.contentSize;
  }

  return batchDeleteOfflineBooks(booksToDelete);
}

// ============================================================================
// Download Operations
// ============================================================================

/**
 * Get file type from MIME type
 */
export function getFileTypeFromMime(mimeType: string): OfflineBookFileType {
  return MIME_TO_FILE_TYPE[mimeType] ?? "unknown";
}

/**
 * Download and store a book for offline use
 */
export async function downloadBookForOffline(
  options: DownloadBookOptions
): Promise<StorageOperationResult<OfflineBookMetadata>> {
  const {
    bookId,
    metadata,
    contentUrl,
    includeCover = true,
    onProgress,
    signal,
  } = options;

  // Create initial metadata
  const bookMetadata: OfflineBookMetadata = {
    ...metadata,
    bookId,
    downloadedAt: Date.now(),
    lastAccessedAt: Date.now(),
    downloadStatus: "pending",
  };

  // Save initial metadata
  await saveBookMetadata(bookMetadata);

  // Create progress tracker
  const progressState: DownloadProgress = {
    bookId,
    bytesDownloaded: 0,
    totalBytes: 0,
    percentage: 0,
    speed: 0,
    estimatedTimeRemaining: null,
    status: "downloading",
  };

  let lastProgressUpdate = Date.now();
  let lastBytesDownloaded = 0;

  const updateProgress = () => {
    const now = Date.now();
    const timeDiff = (now - lastProgressUpdate) / 1000; // seconds
    if (timeDiff > 0) {
      progressState.speed =
        (progressState.bytesDownloaded - lastBytesDownloaded) / timeDiff;
      if (progressState.speed > 0 && progressState.totalBytes > 0) {
        const remainingBytes =
          progressState.totalBytes - progressState.bytesDownloaded;
        progressState.estimatedTimeRemaining =
          remainingBytes / progressState.speed;
      }
    }
    lastProgressUpdate = now;
    lastBytesDownloaded = progressState.bytesDownloaded;
    onProgress?.(progressState);
  };

  try {
    // Update status to downloading
    bookMetadata.downloadStatus = "downloading";
    await saveBookMetadata(bookMetadata);

    // Fetch the content
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    // Combine with external signal if provided
    const fetchSignal = signal
      ? AbortSignal.any([controller.signal, signal])
      : controller.signal;

    const response = await fetch(contentUrl, { signal: fetchSignal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get content length
    const contentLength = response.headers.get("content-length");
    progressState.totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    // Check if we have space
    if (progressState.totalBytes > 0) {
      const spaceCheck = await hasSpaceForBook(progressState.totalBytes);
      if (!spaceCheck.success || !spaceCheck.data) {
        throw new Error(spaceCheck.error ?? "Not enough storage space");
      }
    }

    // Read the response body with progress tracking
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    // Set up progress interval
    const progressInterval = setInterval(
      updateProgress,
      PROGRESS_UPDATE_INTERVAL_MS
    );

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;
        progressState.bytesDownloaded = receivedLength;
        progressState.percentage =
          progressState.totalBytes > 0
            ? (receivedLength / progressState.totalBytes) * 100
            : 0;
      }
    } finally {
      clearInterval(progressInterval);
    }

    // Combine chunks into ArrayBuffer
    const contentData = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      contentData.set(chunk, position);
      position += chunk.length;
    }

    // Get MIME type
    const mimeType =
      response.headers.get("content-type") ?? "application/octet-stream";

    // Save content
    const content: OfflineBookContent = {
      data: contentData.buffer,
      mimeType,
      size: receivedLength,
    };

    const saveResult = await saveBookContent(bookId, content);
    if (!saveResult.success) {
      throw new Error(saveResult.error ?? "Failed to save content");
    }

    // Download cover if requested
    if (includeCover && metadata.coverUrl) {
      try {
        const coverResponse = await fetch(metadata.coverUrl);
        if (coverResponse.ok) {
          const coverBlob = await coverResponse.blob();
          const coverDataUrl = await blobToDataUrl(coverBlob);
          await saveBookCover(bookId, coverDataUrl);
          bookMetadata.coverDataUrl = coverDataUrl;
        }
      } catch {
        // Cover download failure is non-fatal
      }
    }

    // Update final metadata
    bookMetadata.contentSize = receivedLength;
    bookMetadata.fileType = getFileTypeFromMime(mimeType);
    bookMetadata.downloadStatus = "completed";
    await saveBookMetadata(bookMetadata);

    progressState.status = "completed";
    progressState.percentage = 100;
    onProgress?.(progressState);

    return { success: true, data: bookMetadata };
  } catch (error) {
    // Update metadata with failure
    bookMetadata.downloadStatus = "failed";
    bookMetadata.errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await saveBookMetadata(bookMetadata);

    progressState.status = "failed";
    progressState.error = bookMetadata.errorMessage;
    onProgress?.(progressState);

    return {
      success: false,
      error: bookMetadata.errorMessage,
      errorCode:
        error instanceof Error && error.name === "AbortError"
          ? "NETWORK_ERROR"
          : "UNKNOWN_ERROR",
    };
  }
}

// ============================================================================
// Settings Operations
// ============================================================================

/**
 * Get offline books settings
 */
export function getOfflineBooksSettings(): OfflineBooksSettings {
  try {
    const stored = localStorage.getItem(OFFLINE_BOOKS_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_OFFLINE_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...DEFAULT_OFFLINE_SETTINGS };
}

/**
 * Save offline books settings
 */
export function saveOfflineBooksSettings(
  settings: Partial<OfflineBooksSettings>
): void {
  try {
    const current = getOfflineBooksSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(OFFLINE_BOOKS_SETTINGS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Convert Blob to data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob to data URL"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert ArrayBuffer to Blob
 */
export function arrayBufferToBlob(buffer: ArrayBuffer, mimeType: string): Blob {
  return new Blob([buffer], { type: mimeType });
}

/**
 * Get total storage used by offline books
 */
export async function getTotalOfflineStorageUsed(): Promise<number> {
  const result = await getAllBookMetadata();
  if (!result.success || !result.data) {
    return 0;
  }
  return result.data.reduce((sum, book) => sum + book.contentSize, 0);
}

/**
 * Clear all offline book data (use with caution!)
 */
export async function clearAllOfflineBooks(): Promise<StorageOperationResult> {
  try {
    if (!isIndexedDBAvailable()) {
      return {
        success: false,
        error: "IndexedDB not available",
        errorCode: "INDEXEDDB_ERROR",
      };
    }

    return new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(OFFLINE_BOOKS_DB_NAME);

      request.onerror = () => {
        resolve({
          success: false,
          error: "Failed to delete database",
          errorCode: "INDEXEDDB_ERROR",
        });
      };

      request.onsuccess = () => {
        resolve({ success: true });
      };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "INDEXEDDB_ERROR",
    };
  }
}
