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
