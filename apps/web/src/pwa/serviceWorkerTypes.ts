/**
 * Service Worker Types and Constants
 * Provides type definitions for PWA functionality
 */

/** Service worker registration status */
export type SWStatus =
  | "idle"
  | "registering"
  | "registered"
  | "installing"
  | "installed"
  | "activating"
  | "activated"
  | "update-available"
  | "offline-ready"
  | "error";

/** Service worker event types */
export type SWEventType =
  | "registered"
  | "registeredSW"
  | "cached"
  | "updatefound"
  | "updated"
  | "offline"
  | "error";

/** Service worker registration callback */
export type SWRegistrationCallback = (
  registration: ServiceWorkerRegistration
) => void;

/** Service worker error callback */
export type SWErrorCallback = (error: Error) => void;

/** Service worker event listener */
export type SWEventListener = (event: SWEventType, data?: unknown) => void;

/** Service worker registration options */
export interface SWRegistrationOptions {
  immediate?: boolean;
  onRegistered?: SWRegistrationCallback;
  onRegisteredSW?: (
    swUrl: string,
    registration: ServiceWorkerRegistration
  ) => void;
  onCached?: SWRegistrationCallback;
  onUpdateFound?: SWRegistrationCallback;
  onUpdated?: SWRegistrationCallback;
  onOfflineReady?: SWRegistrationCallback;
  onError?: SWErrorCallback;
}

/** PWA install prompt event (BeforeInstallPromptEvent) */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/** PWA install state */
export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

/** Cache strategy type */
export type CacheStrategy =
  | "CacheFirst"
  | "NetworkFirst"
  | "NetworkOnly"
  | "CacheOnly"
  | "StaleWhileRevalidate";

/** Cache entry info */
export interface CacheEntry {
  url: string;
  cacheName: string;
  timestamp: number;
  size?: number;
}

/** Cache statistics */
export interface CacheStats {
  totalSize: number;
  entryCount: number;
  cacheNames: string[];
  entries: CacheEntry[];
}

/** Offline status */
export interface OfflineStatus {
  isOnline: boolean;
  isOfflineReady: boolean;
  lastSyncTime: number | null;
}

/** SW update state */
export interface SWUpdateState {
  hasUpdate: boolean;
  isUpdating: boolean;
  updateError: Error | null;
  registration: ServiceWorkerRegistration | null;
}

/** Version info for cache management */
export interface VersionInfo {
  version: string;
  buildTime: string;
  cacheVersion: string;
}

/** Common cache names used by the application */
export const CACHE_NAMES = {
  STATIC: "read-master-static-v1",
  IMAGES: "images-cache",
  FONTS: "google-fonts-cache",
  FONTS_GSTATIC: "gstatic-fonts-cache",
  API: "api-cache",
  BOOKS: "books-cache",
  AUDIO: "audio-cache",
} as const;

/** Max age for different cache types (in seconds) */
export const CACHE_MAX_AGE = {
  STATIC: 60 * 60 * 24 * 365, // 1 year
  IMAGES: 60 * 60 * 24 * 30, // 30 days
  FONTS: 60 * 60 * 24 * 365, // 1 year
  API: 60 * 5, // 5 minutes
  BOOKS: 60 * 60 * 24 * 7, // 7 days
  AUDIO: 60 * 60 * 24 * 7, // 7 days
} as const;

/** Network timeout for different request types (in seconds) */
export const NETWORK_TIMEOUT = {
  API: 10,
  BOOKS: 30,
  DEFAULT: 15,
} as const;
