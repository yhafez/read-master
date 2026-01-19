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
