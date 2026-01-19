/**
 * Offline Cache Types and Constants
 * Types for offline page caching functionality
 */

/** Cacheable route patterns */
export interface CacheableRoute {
  path: string;
  name: string;
  offlineEnabled: boolean;
  cachePriority: "high" | "medium" | "low";
}

/** Offline page state */
export interface OfflinePageState {
  isOffline: boolean;
  lastOnlineTime: number | null;
  cachedRoutes: string[];
  pendingSync: SyncQueueItem[];
}

/** Sync queue item for background sync */
export interface SyncQueueItem {
  id: string;
  url: string;
  method: string;
  body?: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

/** Cache status for a specific route */
export interface RouteCacheStatus {
  path: string;
  isCached: boolean;
  cacheTime: number | null;
  expiresAt: number | null;
}

/** App shell configuration */
export interface AppShellConfig {
  routes: string[];
  assets: string[];
  fallbackPage: string;
}

/** Offline fallback props */
export interface OfflineFallbackProps {
  onRetry?: () => void;
  cachedPages?: string[];
}

/** Network status change event */
export interface NetworkStatusEvent {
  type: "online" | "offline";
  timestamp: number;
  previousState: boolean;
}

/** Cache refresh options */
export interface CacheRefreshOptions {
  forceRefresh?: boolean;
  routesOnly?: boolean;
  assetsOnly?: boolean;
}

/** Precache manifest entry */
export interface PrecacheEntry {
  url: string;
  revision?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** App shell routes that should always be cached */
export const APP_SHELL_ROUTES: CacheableRoute[] = [
  { path: "/", name: "Home", offlineEnabled: true, cachePriority: "high" },
  {
    path: "/library",
    name: "Library",
    offlineEnabled: true,
    cachePriority: "high",
  },
  {
    path: "/flashcards",
    name: "Flashcards",
    offlineEnabled: true,
    cachePriority: "medium",
  },
  {
    path: "/settings",
    name: "Settings",
    offlineEnabled: true,
    cachePriority: "medium",
  },
  {
    path: "/profile",
    name: "Profile",
    offlineEnabled: true,
    cachePriority: "low",
  },
  {
    path: "/offline",
    name: "Offline",
    offlineEnabled: true,
    cachePriority: "high",
  },
];

/** Routes that need network to function (should not be cached) */
export const NETWORK_ONLY_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/api/",
  "/oauth/",
  "/webhook",
];

/** Static assets to precache */
export const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
];

/** Cache version for invalidation */
export const OFFLINE_CACHE_VERSION = "v1";

/** Offline cache name */
export const OFFLINE_CACHE_NAME = `read-master-offline-${OFFLINE_CACHE_VERSION}`;

/** App shell cache name */
export const APP_SHELL_CACHE_NAME = `read-master-app-shell-${OFFLINE_CACHE_VERSION}`;

/** Maximum age for cached routes (in seconds) */
export const ROUTE_CACHE_MAX_AGE = 60 * 60 * 24; // 24 hours

/** Maximum sync retry attempts */
export const MAX_SYNC_RETRIES = 3;

/** Sync queue storage key */
export const SYNC_QUEUE_KEY = "read-master-sync-queue";

/** Last online time storage key */
export const LAST_ONLINE_KEY = "read-master-last-online";

/** Default app shell config */
export const DEFAULT_APP_SHELL_CONFIG: AppShellConfig = {
  routes: APP_SHELL_ROUTES.filter((r) => r.offlineEnabled).map((r) => r.path),
  assets: PRECACHE_ASSETS,
  fallbackPage: "/offline",
};

/** Navigation preload header name */
export const NAVIGATION_PRELOAD_HEADER = "Service-Worker-Navigation-Preload";
