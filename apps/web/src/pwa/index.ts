/**
 * PWA Module Exports
 * Service worker utilities, hooks, and components for Progressive Web App functionality
 */

// Types and constants
export type {
  SWStatus,
  SWEventType,
  SWRegistrationCallback,
  SWErrorCallback,
  SWEventListener,
  SWRegistrationOptions,
  BeforeInstallPromptEvent,
  PWAInstallState,
  CacheStrategy,
  CacheEntry,
  CacheStats,
  OfflineStatus,
  SWUpdateState,
  VersionInfo,
} from "./serviceWorkerTypes";

export {
  CACHE_NAMES,
  CACHE_MAX_AGE,
  NETWORK_TIMEOUT,
} from "./serviceWorkerTypes";

// Utility functions
export {
  isServiceWorkerSupported,
  isStandaloneMode,
  isOnline,
  getRegistration,
  hasActiveServiceWorker,
  getServiceWorkerStatus,
  skipWaiting,
  unregisterServiceWorker,
  getCacheNames,
  getCacheStats,
  clearCache,
  clearAllCaches,
  clearApiCache,
  formatBytes,
  getOfflineStatus,
  createSWUpdateState,
  createPWAInstallState,
  isInstallPromptSupported,
  triggerInstallPrompt,
  urlMatchesPattern,
  getCacheStrategyForUrl,
  waitForServiceWorkerReady,
  sendMessageToServiceWorker,
  createUpdateListener,
} from "./serviceWorkerUtils";

// React hook
export { useServiceWorker } from "./useServiceWorker";
export type { UseServiceWorkerReturn } from "./useServiceWorker";

// Components
export { ServiceWorkerUpdatePrompt } from "./ServiceWorkerUpdatePrompt";
export type { ServiceWorkerUpdatePromptProps } from "./ServiceWorkerUpdatePrompt";
export { OfflineFallbackPage } from "./OfflineFallbackPage";

// Offline cache types and constants
export type {
  CacheableRoute,
  OfflinePageState,
  SyncQueueItem,
  RouteCacheStatus,
  AppShellConfig,
  OfflineFallbackProps,
  NetworkStatusEvent,
  CacheRefreshOptions,
  PrecacheEntry,
} from "./offlineCacheTypes";

export {
  APP_SHELL_ROUTES,
  NETWORK_ONLY_ROUTES,
  PRECACHE_ASSETS,
  OFFLINE_CACHE_VERSION,
  OFFLINE_CACHE_NAME,
  APP_SHELL_CACHE_NAME,
  ROUTE_CACHE_MAX_AGE,
  MAX_SYNC_RETRIES,
  SYNC_QUEUE_KEY,
  LAST_ONLINE_KEY,
  DEFAULT_APP_SHELL_CONFIG,
  NAVIGATION_PRELOAD_HEADER,
} from "./offlineCacheTypes";

// Offline cache utilities
export {
  isCacheAvailable,
  openOfflineCache,
  openAppShellCache,
  cacheUrl,
  cacheUrls,
  isUrlCached,
  getCachedResponse,
  deleteCachedUrl,
  clearOfflineCache,
  cacheAppShell,
  isAppShellCached,
  getAppShellCacheStatus,
  isRouteCacheable,
  getCacheableRoute,
  getHighPriorityRoutes,
  normalizePathForCache,
  shouldShowOfflineFallback,
  getOnlineStatus,
  createNetworkStatusEvent,
  getLastOnlineTime,
  saveLastOnlineTime,
  formatTimeSinceOnline,
  createSyncQueueItem,
  getSyncQueue,
  saveSyncQueue,
  addToSyncQueue,
  removeFromSyncQueue,
  clearSyncQueue,
  incrementRetryCount,
  shouldRetrySyncItem,
  createOfflinePageState,
  getCachedRoutes,
  refreshCache,
  createOnlineHandler,
} from "./offlineCacheUtils";

// Offline book storage types and constants
export type {
  OfflineBookContent,
  OfflineBookMetadata,
  OfflineBook,
  OfflineReadingPosition,
  OfflineDownloadStatus,
  OfflineBookFileType,
  DownloadProgress,
  StorageQuota,
  StorageQuotaLevel,
  StorageOperationResult,
  StorageErrorCode,
  DownloadBookOptions,
  OfflineBookFilter,
  BatchOperationResult,
  OfflineBooksSettings,
} from "./offlineBookTypes";

export {
  OFFLINE_BOOKS_DB_NAME,
  OFFLINE_BOOKS_DB_VERSION,
  OFFLINE_BOOKS_STORES,
  DEFAULT_MAX_STORAGE_QUOTA,
  STORAGE_WARNING_THRESHOLD,
  STORAGE_CRITICAL_THRESHOLD,
  MAX_BOOK_SIZE,
  MIN_STORAGE_BUFFER,
  FILE_TYPE_MIME_MAP,
  MIME_TO_FILE_TYPE,
  DOWNLOAD_TIMEOUT_MS,
  PROGRESS_UPDATE_INTERVAL_MS,
  QUOTA_CHECK_INTERVAL_MS,
  MAX_UNUSED_AGE_MS,
  OFFLINE_BOOKS_SETTINGS_KEY,
  DOWNLOAD_QUEUE_KEY,
  DEFAULT_OFFLINE_SETTINGS,
} from "./offlineBookTypes";

// Offline book storage utilities
export {
  isIndexedDBAvailable,
  openOfflineBooksDB,
  closeDatabase,
  saveBookMetadata,
  getBookMetadata,
  getAllBookMetadata,
  deleteBookMetadata,
  saveBookContent,
  getBookContent,
  deleteBookContent,
  saveBookCover,
  getBookCover,
  deleteBookCover,
  getOfflineBook,
  deleteOfflineBook,
  isBookAvailableOffline,
  getOfflineBooks,
  batchDeleteOfflineBooks,
  updateReadingPosition,
  getReadingPosition,
  getStorageQuota,
  getStorageQuotaLevel,
  hasSpaceForBook,
  getStaleBooks,
  autoCleanupStorage,
  getFileTypeFromMime,
  downloadBookForOffline,
  getOfflineBooksSettings,
  saveOfflineBooksSettings,
  formatBytes as formatBytesOffline,
  blobToDataUrl,
  arrayBufferToBlob,
  getTotalOfflineStorageUsed,
  clearAllOfflineBooks,
} from "./offlineBookStorage";

// Offline reading progress sync types and constants
export type {
  OfflineReadingProgress,
  ProgressSyncQueueItem,
  ProgressSyncStatus,
  ProgressSyncState,
} from "./offlineReadingProgressSync";

export {
  PROGRESS_STORAGE_KEY,
  PROGRESS_SYNC_KEY,
  SYNC_DEBOUNCE_MS,
  SYNC_BATCH_SIZE,
  PROGRESS_UPDATE_THRESHOLD,
} from "./offlineReadingProgressSync";

// Offline reading progress sync utilities
export {
  getAllOfflineProgress,
  saveOfflineProgress,
  getOfflineProgressForBook,
  updateOfflineProgress,
  markProgressAsSynced,
  getProgressNeedingSync,
  clearSyncedProgress,
  queueProgressUpdate,
  getProgressSyncQueue,
  removeProgressFromQueue,
  getProgressSyncStatus,
  getOverallSyncState,
  syncAllProgress,
  resolveProgressConflict,
  clearAllProgressData,
} from "./offlineReadingProgressSync";
