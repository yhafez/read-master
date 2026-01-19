/**
 * Offline Book Storage Types
 * Types and constants for offline book storage using IndexedDB
 */

import type { Book } from "@/hooks/useBooks";

// ============================================================================
// Types
// ============================================================================

/** Book content data for offline storage */
export interface OfflineBookContent {
  /** Raw file data as ArrayBuffer */
  data: ArrayBuffer;
  /** MIME type of the content */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

/** Metadata for an offline book */
export interface OfflineBookMetadata {
  /** Book ID */
  bookId: string;
  /** Book title */
  title: string;
  /** Book author */
  author: string;
  /** Cover image URL (if cached) */
  coverUrl?: string;
  /** Cover image as data URL (for offline) */
  coverDataUrl?: string;
  /** File type (epub, pdf, txt, etc.) */
  fileType: OfflineBookFileType;
  /** Download timestamp */
  downloadedAt: number;
  /** Last accessed timestamp */
  lastAccessedAt: number;
  /** Content size in bytes */
  contentSize: number;
  /** Reading progress (0-100) */
  progress: number;
  /** Current reading position (for restoration) */
  readingPosition?: OfflineReadingPosition;
  /** Book status */
  status: Book["status"];
  /** Download status */
  downloadStatus: OfflineDownloadStatus;
  /** Error message if download failed */
  errorMessage?: string;
}

/** Complete offline book entry (metadata + content) */
export interface OfflineBook {
  /** Metadata about the book */
  metadata: OfflineBookMetadata;
  /** Book content (stored separately for efficiency) */
  content: OfflineBookContent | null;
}

/** Reading position for restoration */
export interface OfflineReadingPosition {
  /** CFI for EPUB or page number for PDF */
  location: string;
  /** Percentage progress */
  percentage: number;
  /** Scroll position (if applicable) */
  scrollTop?: number;
  /** Chapter index (if applicable) */
  chapterIndex?: number;
  /** Last updated timestamp */
  updatedAt: number;
}

/** Download status states */
export type OfflineDownloadStatus =
  | "pending"
  | "downloading"
  | "completed"
  | "failed"
  | "paused";

/** Supported file types for offline storage */
export type OfflineBookFileType =
  | "epub"
  | "pdf"
  | "txt"
  | "html"
  | "docx"
  | "unknown";

/** Download progress information */
export interface DownloadProgress {
  /** Book ID being downloaded */
  bookId: string;
  /** Bytes downloaded so far */
  bytesDownloaded: number;
  /** Total bytes to download */
  totalBytes: number;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Download speed in bytes per second */
  speed: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number | null;
  /** Download status */
  status: OfflineDownloadStatus;
  /** Error message if failed */
  error?: string;
}

/** Storage quota information */
export interface StorageQuota {
  /** Total storage available (bytes) */
  total: number;
  /** Storage used (bytes) */
  used: number;
  /** Storage available (bytes) */
  available: number;
  /** Storage usage percentage */
  usagePercentage: number;
  /** Whether quota is exceeded */
  isQuotaExceeded: boolean;
  /** Number of books stored */
  bookCount: number;
  /** Total size of stored books */
  totalBooksSize: number;
}

/** Storage quota warning levels */
export type StorageQuotaLevel = "normal" | "warning" | "critical" | "exceeded";

/** Result of a storage operation */
export interface StorageOperationResult<T = void> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data (if applicable) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Error code for specific handling */
  errorCode?: StorageErrorCode;
}

/** Storage error codes */
export type StorageErrorCode =
  | "QUOTA_EXCEEDED"
  | "NOT_FOUND"
  | "INVALID_DATA"
  | "NETWORK_ERROR"
  | "INDEXEDDB_ERROR"
  | "UNKNOWN_ERROR";

/** Options for downloading a book */
export interface DownloadBookOptions {
  /** Book ID */
  bookId: string;
  /** Book metadata */
  metadata: Omit<
    OfflineBookMetadata,
    "downloadedAt" | "lastAccessedAt" | "downloadStatus"
  >;
  /** Content URL to fetch */
  contentUrl: string;
  /** Whether to download cover image */
  includeCover?: boolean;
  /** Callback for progress updates */
  onProgress?: (progress: DownloadProgress) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/** Filter options for listing offline books */
export interface OfflineBookFilter {
  /** Filter by status */
  status?: Book["status"] | Book["status"][];
  /** Filter by file type */
  fileType?: OfflineBookFileType | OfflineBookFileType[];
  /** Search by title or author */
  search?: string;
  /** Sort field */
  sortBy?:
    | "title"
    | "author"
    | "downloadedAt"
    | "lastAccessedAt"
    | "contentSize";
  /** Sort order */
  sortOrder?: "asc" | "desc";
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** Batch operation result */
export interface BatchOperationResult {
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failCount: number;
  /** IDs that succeeded */
  succeededIds: string[];
  /** IDs that failed with their errors */
  failedIds: Array<{ id: string; error: string }>;
}

// ============================================================================
// Constants
// ============================================================================

/** IndexedDB database name */
export const OFFLINE_BOOKS_DB_NAME = "read-master-offline-books";

/** IndexedDB database version */
export const OFFLINE_BOOKS_DB_VERSION = 1;

/** IndexedDB store names */
export const OFFLINE_BOOKS_STORES = {
  /** Store for book metadata */
  METADATA: "bookMetadata",
  /** Store for book content (large blobs) */
  CONTENT: "bookContent",
  /** Store for cover images */
  COVERS: "bookCovers",
} as const;

/** Maximum storage quota (in bytes) - 500MB default */
export const DEFAULT_MAX_STORAGE_QUOTA = 500 * 1024 * 1024;

/** Warning threshold percentage (show warning at 80% usage) */
export const STORAGE_WARNING_THRESHOLD = 0.8;

/** Critical threshold percentage (show critical at 95% usage) */
export const STORAGE_CRITICAL_THRESHOLD = 0.95;

/** Maximum single book size (50MB) */
export const MAX_BOOK_SIZE = 50 * 1024 * 1024;

/** Minimum storage required to download a book (10MB buffer) */
export const MIN_STORAGE_BUFFER = 10 * 1024 * 1024;

/** File type MIME mappings */
export const FILE_TYPE_MIME_MAP: Record<OfflineBookFileType, string[]> = {
  epub: ["application/epub+zip"],
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  html: ["text/html"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  unknown: ["application/octet-stream"],
};

/** MIME type to file type mapping (reverse lookup) */
export const MIME_TO_FILE_TYPE: Record<string, OfflineBookFileType> = {
  "application/epub+zip": "epub",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/html": "html",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

/** Default download timeout (5 minutes) */
export const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

/** Progress update interval (500ms) */
export const PROGRESS_UPDATE_INTERVAL_MS = 500;

/** Storage quota check interval for cache cleanup (1 hour) */
export const QUOTA_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Maximum age for unused books before suggesting cleanup (30 days) */
export const MAX_UNUSED_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** LocalStorage key for offline books settings */
export const OFFLINE_BOOKS_SETTINGS_KEY = "read-master-offline-books-settings";

/** LocalStorage key for download queue */
export const DOWNLOAD_QUEUE_KEY = "read-master-download-queue";

/** Default offline book settings */
export interface OfflineBooksSettings {
  /** Maximum storage quota (bytes) */
  maxStorageQuota: number;
  /** Auto-cleanup when quota exceeded */
  autoCleanup: boolean;
  /** Days of inactivity before suggesting cleanup */
  cleanupAfterDays: number;
  /** Download over WiFi only */
  wifiOnly: boolean;
  /** Show download progress notifications */
  showNotifications: boolean;
}

/** Default settings values */
export const DEFAULT_OFFLINE_SETTINGS: OfflineBooksSettings = {
  maxStorageQuota: DEFAULT_MAX_STORAGE_QUOTA,
  autoCleanup: true,
  cleanupAfterDays: 30,
  wifiOnly: false,
  showNotifications: true,
};
