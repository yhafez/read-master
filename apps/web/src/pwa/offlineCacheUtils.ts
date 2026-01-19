/**
 * Offline Cache Utilities
 * Functions for managing offline page caching
 */

import type {
  AppShellConfig,
  CacheableRoute,
  CacheRefreshOptions,
  NetworkStatusEvent,
  OfflinePageState,
  RouteCacheStatus,
  SyncQueueItem,
} from "./offlineCacheTypes";
import {
  APP_SHELL_CACHE_NAME,
  APP_SHELL_ROUTES,
  DEFAULT_APP_SHELL_CONFIG,
  LAST_ONLINE_KEY,
  MAX_SYNC_RETRIES,
  NETWORK_ONLY_ROUTES,
  OFFLINE_CACHE_NAME,
  ROUTE_CACHE_MAX_AGE,
  SYNC_QUEUE_KEY,
} from "./offlineCacheTypes";

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Check if caches API is available
 */
export function isCacheAvailable(): boolean {
  return "caches" in window;
}

/**
 * Open the offline cache
 */
export async function openOfflineCache(): Promise<Cache | null> {
  if (!isCacheAvailable()) {
    return null;
  }
  return caches.open(OFFLINE_CACHE_NAME);
}

/**
 * Open the app shell cache
 */
export async function openAppShellCache(): Promise<Cache | null> {
  if (!isCacheAvailable()) {
    return null;
  }
  return caches.open(APP_SHELL_CACHE_NAME);
}

/**
 * Cache a single URL
 */
export async function cacheUrl(
  url: string,
  cacheName: string = OFFLINE_CACHE_NAME
): Promise<boolean> {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    const cache = await caches.open(cacheName);
    const response = await fetch(url);

    if (response.ok) {
      await cache.put(url, response.clone());
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Cache multiple URLs in batch
 */
export async function cacheUrls(
  urls: string[],
  cacheName: string = OFFLINE_CACHE_NAME
): Promise<{ cached: string[]; failed: string[] }> {
  const cached: string[] = [];
  const failed: string[] = [];

  for (const url of urls) {
    const success = await cacheUrl(url, cacheName);
    if (success) {
      cached.push(url);
    } else {
      failed.push(url);
    }
  }

  return { cached, failed };
}

/**
 * Check if a URL is cached
 */
export async function isUrlCached(
  url: string,
  cacheName: string = OFFLINE_CACHE_NAME
): Promise<boolean> {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    const cache = await caches.open(cacheName);
    const response = await cache.match(url);
    return response !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get cached response for a URL
 */
export async function getCachedResponse(
  url: string,
  cacheName: string = OFFLINE_CACHE_NAME
): Promise<Response | null> {
  if (!isCacheAvailable()) {
    return null;
  }

  try {
    const cache = await caches.open(cacheName);
    const response = await cache.match(url);
    return response ?? null;
  } catch {
    return null;
  }
}

/**
 * Delete a URL from cache
 */
export async function deleteCachedUrl(
  url: string,
  cacheName: string = OFFLINE_CACHE_NAME
): Promise<boolean> {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    const cache = await caches.open(cacheName);
    return cache.delete(url);
  } catch {
    return false;
  }
}

/**
 * Clear an entire cache
 */
export async function clearOfflineCache(
  cacheName: string = OFFLINE_CACHE_NAME
): Promise<boolean> {
  if (!isCacheAvailable()) {
    return false;
  }

  try {
    return caches.delete(cacheName);
  } catch {
    return false;
  }
}

// ============================================================================
// App Shell Operations
// ============================================================================

/**
 * Cache the app shell (critical routes and assets)
 */
export async function cacheAppShell(
  config: AppShellConfig = DEFAULT_APP_SHELL_CONFIG
): Promise<{ success: boolean; cachedCount: number; failedCount: number }> {
  const allUrls = [...config.routes, ...config.assets];
  const { cached, failed } = await cacheUrls(allUrls, APP_SHELL_CACHE_NAME);

  return {
    success: failed.length === 0,
    cachedCount: cached.length,
    failedCount: failed.length,
  };
}

/**
 * Check if app shell is fully cached
 */
export async function isAppShellCached(
  config: AppShellConfig = DEFAULT_APP_SHELL_CONFIG
): Promise<boolean> {
  const allUrls = [...config.routes, ...config.assets];

  for (const url of allUrls) {
    const isCached = await isUrlCached(url, APP_SHELL_CACHE_NAME);
    if (!isCached) {
      return false;
    }
  }

  return true;
}

/**
 * Get app shell cache status
 */
export async function getAppShellCacheStatus(
  config: AppShellConfig = DEFAULT_APP_SHELL_CONFIG
): Promise<RouteCacheStatus[]> {
  const allUrls = [...config.routes, ...config.assets];
  const statuses: RouteCacheStatus[] = [];

  for (const url of allUrls) {
    const isCached = await isUrlCached(url, APP_SHELL_CACHE_NAME);
    statuses.push({
      path: url,
      isCached,
      cacheTime: isCached ? Date.now() : null,
      expiresAt: isCached ? Date.now() + ROUTE_CACHE_MAX_AGE * 1000 : null,
    });
  }

  return statuses;
}

// ============================================================================
// Route Utilities
// ============================================================================

/**
 * Check if a route is cacheable
 */
export function isRouteCacheable(path: string): boolean {
  // Check if route is in network-only list
  for (const pattern of NETWORK_ONLY_ROUTES) {
    if (path.startsWith(pattern)) {
      return false;
    }
  }
  return true;
}

/**
 * Get cacheable route info
 */
export function getCacheableRoute(path: string): CacheableRoute | null {
  return APP_SHELL_ROUTES.find((r) => r.path === path) ?? null;
}

/**
 * Get all high-priority cacheable routes
 */
export function getHighPriorityRoutes(): CacheableRoute[] {
  return APP_SHELL_ROUTES.filter((r) => r.cachePriority === "high");
}

/**
 * Normalize a URL path for caching
 */
export function normalizePathForCache(path: string): string {
  // Remove query strings and hash
  const url = new URL(path, window.location.origin);
  return url.pathname;
}

/**
 * Check if current page should fallback to offline page
 */
export function shouldShowOfflineFallback(path: string): boolean {
  if (!isRouteCacheable(path)) {
    return false;
  }

  const route = getCacheableRoute(path);
  return route?.offlineEnabled ?? true;
}

// ============================================================================
// Network Status
// ============================================================================

/**
 * Get current online status
 */
export function getOnlineStatus(): boolean {
  return navigator.onLine;
}

/**
 * Create a network status event
 */
export function createNetworkStatusEvent(
  isOnline: boolean,
  previousState: boolean
): NetworkStatusEvent {
  return {
    type: isOnline ? "online" : "offline",
    timestamp: Date.now(),
    previousState,
  };
}

/**
 * Get last online time from storage
 */
export function getLastOnlineTime(): number | null {
  try {
    const stored = localStorage.getItem(LAST_ONLINE_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Save last online time to storage
 */
export function saveLastOnlineTime(timestamp: number = Date.now()): void {
  try {
    localStorage.setItem(LAST_ONLINE_KEY, timestamp.toString());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Format time since last online
 */
export function formatTimeSinceOnline(lastOnline: number | null): string {
  if (lastOnline === null) {
    return "Unknown";
  }

  const diff = Date.now() - lastOnline;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

// ============================================================================
// Sync Queue Operations
// ============================================================================

/**
 * Create a sync queue item
 */
export function createSyncQueueItem(
  url: string,
  method: string,
  body?: string
): SyncQueueItem {
  const item: SyncQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    url,
    method,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: MAX_SYNC_RETRIES,
  };

  if (body !== undefined) {
    item.body = body;
  }

  return item;
}

/**
 * Get sync queue from storage
 */
export function getSyncQueue(): SyncQueueItem[] {
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save sync queue to storage
 */
export function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Add item to sync queue
 */
export function addToSyncQueue(item: SyncQueueItem): SyncQueueItem[] {
  const queue = getSyncQueue();
  queue.push(item);
  saveSyncQueue(queue);
  return queue;
}

/**
 * Remove item from sync queue
 */
export function removeFromSyncQueue(id: string): SyncQueueItem[] {
  const queue = getSyncQueue().filter((item) => item.id !== id);
  saveSyncQueue(queue);
  return queue;
}

/**
 * Clear sync queue
 */
export function clearSyncQueue(): void {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Increment retry count for a sync item
 */
export function incrementRetryCount(id: string): SyncQueueItem | null {
  const queue = getSyncQueue();
  const item = queue.find((i) => i.id === id);

  if (item) {
    item.retryCount += 1;
    saveSyncQueue(queue);
    return item;
  }

  return null;
}

/**
 * Check if sync item should be retried
 */
export function shouldRetrySyncItem(item: SyncQueueItem): boolean {
  return item.retryCount < item.maxRetries;
}

// ============================================================================
// Offline Page State
// ============================================================================

/**
 * Create initial offline page state
 */
export function createOfflinePageState(): OfflinePageState {
  return {
    isOffline: !getOnlineStatus(),
    lastOnlineTime: getLastOnlineTime(),
    cachedRoutes: [],
    pendingSync: getSyncQueue(),
  };
}

/**
 * Get list of cached routes
 */
export async function getCachedRoutes(): Promise<string[]> {
  if (!isCacheAvailable()) {
    return [];
  }

  const cachedRoutes: string[] = [];

  for (const route of APP_SHELL_ROUTES) {
    const isCached = await isUrlCached(route.path, APP_SHELL_CACHE_NAME);
    if (isCached) {
      cachedRoutes.push(route.path);
    }
  }

  return cachedRoutes;
}

/**
 * Refresh cache with latest content
 */
export async function refreshCache(
  options: CacheRefreshOptions = {}
): Promise<{ success: boolean; refreshedCount: number }> {
  const {
    forceRefresh = false,
    routesOnly = false,
    assetsOnly = false,
  } = options;

  if (forceRefresh) {
    await clearOfflineCache(APP_SHELL_CACHE_NAME);
  }

  const config = DEFAULT_APP_SHELL_CONFIG;
  let urlsToCache: string[] = [];

  if (routesOnly) {
    urlsToCache = config.routes;
  } else if (assetsOnly) {
    urlsToCache = config.assets;
  } else {
    urlsToCache = [...config.routes, ...config.assets];
  }

  const { cached } = await cacheUrls(urlsToCache, APP_SHELL_CACHE_NAME);

  return {
    success: cached.length === urlsToCache.length,
    refreshedCount: cached.length,
  };
}

// ============================================================================
// Event Listeners
// ============================================================================

/**
 * Create online status change handler
 */
export function createOnlineHandler(
  callback: (event: NetworkStatusEvent) => void
): () => void {
  let previousState = getOnlineStatus();

  const handleOnline = () => {
    saveLastOnlineTime();
    callback(createNetworkStatusEvent(true, previousState));
    previousState = true;
  };

  const handleOffline = () => {
    callback(createNetworkStatusEvent(false, previousState));
    previousState = false;
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
