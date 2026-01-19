/**
 * Service Worker Utilities
 * Helper functions for PWA service worker management
 */

import type {
  CacheEntry,
  CacheStats,
  OfflineStatus,
  SWStatus,
  SWUpdateState,
  BeforeInstallPromptEvent,
  PWAInstallState,
} from "./serviceWorkerTypes";
import { CACHE_NAMES } from "./serviceWorkerTypes";

/**
 * Check if service workers are supported in the current browser
 */
export function isServiceWorkerSupported(): boolean {
  return "serviceWorker" in navigator;
}

/**
 * Check if the app is running in standalone mode (installed PWA)
 */
export function isStandaloneMode(): boolean {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isIOSStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;

  return isStandalone || isIOSStandalone;
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Get the current service worker registration if available
 */
export async function getRegistration(): Promise<
  ServiceWorkerRegistration | undefined
> {
  if (!isServiceWorkerSupported()) {
    return undefined;
  }
  return navigator.serviceWorker.getRegistration();
}

/**
 * Check if there's an active service worker
 */
export async function hasActiveServiceWorker(): Promise<boolean> {
  const registration = await getRegistration();
  return registration?.active !== null && registration?.active !== undefined;
}

/**
 * Get the current service worker status
 */
export async function getServiceWorkerStatus(): Promise<SWStatus> {
  if (!isServiceWorkerSupported()) {
    return "error";
  }

  const registration = await getRegistration();

  if (!registration) {
    return "idle";
  }

  if (registration.installing) {
    return "installing";
  }

  if (registration.waiting) {
    return "update-available";
  }

  if (registration.active) {
    return "activated";
  }

  return "registered";
}

/**
 * Force the waiting service worker to activate
 */
export async function skipWaiting(): Promise<void> {
  const registration = await getRegistration();

  if (registration?.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  const registration = await getRegistration();

  if (registration) {
    return registration.unregister();
  }

  return false;
}

/**
 * Get all cache names
 */
export async function getCacheNames(): Promise<string[]> {
  if (!("caches" in window)) {
    return [];
  }
  return caches.keys();
}

/**
 * Calculate total cache size
 */
export async function getCacheStats(): Promise<CacheStats> {
  const cacheNames = await getCacheNames();
  const entries: CacheEntry[] = [];
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.clone().blob();
        const size = blob.size;
        totalSize += size;

        entries.push({
          url: request.url,
          cacheName,
          timestamp: Date.now(),
          size,
        });
      }
    }
  }

  return {
    totalSize,
    entryCount: entries.length,
    cacheNames,
    entries,
  };
}

/**
 * Clear a specific cache by name
 */
export async function clearCache(cacheName: string): Promise<boolean> {
  if (!("caches" in window)) {
    return false;
  }
  return caches.delete(cacheName);
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  const cacheNames = await getCacheNames();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}

/**
 * Clear only API caches (useful after logout)
 */
export async function clearApiCache(): Promise<boolean> {
  return clearCache(CACHE_NAMES.API);
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Get offline status
 */
export async function getOfflineStatus(): Promise<OfflineStatus> {
  const registration = await getRegistration();
  const hasActiveSW =
    registration?.active !== null && registration?.active !== undefined;

  return {
    isOnline: isOnline(),
    isOfflineReady: hasActiveSW,
    lastSyncTime: null,
  };
}

/**
 * Create SW update state
 */
export function createSWUpdateState(
  registration?: ServiceWorkerRegistration
): SWUpdateState {
  return {
    hasUpdate:
      registration?.waiting !== null && registration?.waiting !== undefined,
    isUpdating:
      registration?.installing !== null &&
      registration?.installing !== undefined,
    updateError: null,
    registration: registration ?? null,
  };
}

/**
 * Create initial PWA install state
 */
export function createPWAInstallState(): PWAInstallState {
  return {
    canInstall: false,
    isInstalled: isStandaloneMode(),
    deferredPrompt: null,
  };
}

/**
 * Check if the beforeinstallprompt event is supported
 */
export function isInstallPromptSupported(): boolean {
  return (
    "BeforeInstallPromptEvent" in window || "onbeforeinstallprompt" in window
  );
}

/**
 * Trigger the PWA install prompt
 */
export async function triggerInstallPrompt(
  deferredPrompt: BeforeInstallPromptEvent | null
): Promise<"accepted" | "dismissed" | null> {
  if (!deferredPrompt) {
    return null;
  }

  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  return outcome;
}

/**
 * Check if a URL matches a given pattern
 */
export function urlMatchesPattern(
  url: string,
  pattern: string | RegExp
): boolean {
  if (typeof pattern === "string") {
    return url.includes(pattern);
  }
  return pattern.test(url);
}

/**
 * Determine the appropriate cache strategy for a URL
 */
export function getCacheStrategyForUrl(
  url: string
): "CacheFirst" | "NetworkFirst" | "StaleWhileRevalidate" {
  // API calls - network first with cache fallback
  if (url.includes("/api/")) {
    return "NetworkFirst";
  }

  // Static assets - cache first
  if (
    url.match(/\.(js|css|woff|woff2|ico)$/) ||
    url.includes("fonts.googleapis.com") ||
    url.includes("fonts.gstatic.com")
  ) {
    return "CacheFirst";
  }

  // Images - cache first
  if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
    return "CacheFirst";
  }

  // Default to network first for HTML and other content
  return "NetworkFirst";
}

/**
 * Wait for the service worker to be ready
 */
export async function waitForServiceWorkerReady(): Promise<ServiceWorkerRegistration> {
  if (!isServiceWorkerSupported()) {
    throw new Error("Service workers are not supported");
  }
  return navigator.serviceWorker.ready;
}

/**
 * Send a message to the service worker
 */
export async function sendMessageToServiceWorker(
  message: unknown
): Promise<void> {
  const registration = await getRegistration();
  const activeWorker = registration?.active;

  if (activeWorker) {
    activeWorker.postMessage(message);
  }
}

/**
 * Create an update listener that can be attached to a registration
 */
export function createUpdateListener(
  onUpdate: (registration: ServiceWorkerRegistration) => void
): (registration: ServiceWorkerRegistration) => void {
  return (registration: ServiceWorkerRegistration) => {
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            onUpdate(registration);
          }
        });
      }
    });
  };
}
