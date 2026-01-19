/**
 * useServiceWorker Hook
 * React hook for managing PWA service worker registration and updates
 */

import { useCallback, useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import type {
  SWStatus,
  SWUpdateState,
  PWAInstallState,
  BeforeInstallPromptEvent,
} from "./serviceWorkerTypes";
import {
  isOnline,
  isStandaloneMode,
  isServiceWorkerSupported,
  getServiceWorkerStatus,
  clearAllCaches,
} from "./serviceWorkerUtils";

/** Service worker hook return type */
export interface UseServiceWorkerReturn {
  /** Current SW registration status */
  status: SWStatus;
  /** Whether an update is available */
  needRefresh: boolean;
  /** Whether the app is ready for offline use */
  offlineReady: boolean;
  /** Whether the browser is currently online */
  isOnline: boolean;
  /** Whether the app is installed as PWA */
  isInstalled: boolean;
  /** Whether install prompt is available */
  canInstall: boolean;
  /** Update the service worker */
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  /** Close the update prompt */
  closePrompt: () => void;
  /** Clear all caches and reset */
  clearCachesAndReset: () => Promise<void>;
  /** Show the install prompt */
  promptInstall: () => Promise<"accepted" | "dismissed" | null>;
  /** SW update state details */
  updateState: SWUpdateState;
  /** PWA install state details */
  installState: PWAInstallState;
}

/**
 * Custom hook for managing PWA service worker
 * Provides registration, update handling, and install prompt functionality
 */
export function useServiceWorker(): UseServiceWorkerReturn {
  // Online status
  const [online, setOnline] = useState<boolean>(isOnline());

  // Install state
  const [installState, setInstallState] = useState<PWAInstallState>({
    canInstall: false,
    isInstalled: isStandaloneMode(),
    deferredPrompt: null,
  });

  // SW status
  const [status, setStatus] = useState<SWStatus>("idle");

  // Use vite-plugin-pwa's register hook
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      setStatus("registered");

      // Check for updates periodically (every hour)
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      }
    },
    onRegisterError() {
      // SW registration failed - set error state
      setStatus("error");
    },
    onOfflineReady() {
      setStatus("offline-ready");
    },
    onNeedRefresh() {
      setStatus("update-available");
    },
  });

  // Update state object
  const updateState: SWUpdateState = {
    hasUpdate: needRefresh,
    isUpdating: status === "installing" || status === "activating",
    updateError:
      status === "error"
        ? new Error("Service worker registration failed")
        : null,
    registration: null,
  };

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Track install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallState((prev) => ({
        ...prev,
        canInstall: true,
        deferredPrompt: e as BeforeInstallPromptEvent,
      }));
    };

    const handleAppInstalled = () => {
      setInstallState((prev) => ({
        ...prev,
        canInstall: false,
        isInstalled: true,
        deferredPrompt: null,
      }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Update status from navigator
  useEffect(() => {
    if (isServiceWorkerSupported()) {
      getServiceWorkerStatus().then(setStatus);
    }
  }, []);

  // Close the update/offline prompt
  const closePrompt = useCallback(() => {
    setOfflineReady(false);
    setNeedRefresh(false);
  }, [setOfflineReady, setNeedRefresh]);

  // Clear all caches and reset
  const clearCachesAndReset = useCallback(async () => {
    await clearAllCaches();
    // Reload to get fresh content
    window.location.reload();
  }, []);

  // Show install prompt
  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | null
  > => {
    const { deferredPrompt } = installState;

    if (!deferredPrompt) {
      return null;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // Clear the prompt after use
    setInstallState((prev) => ({
      ...prev,
      deferredPrompt: null,
      canInstall: false,
    }));

    return outcome;
  }, [installState]);

  return {
    status,
    needRefresh,
    offlineReady,
    isOnline: online,
    isInstalled: installState.isInstalled,
    canInstall: installState.canInstall,
    updateServiceWorker,
    closePrompt,
    clearCachesAndReset,
    promptInstall,
    updateState,
    installState,
  };
}

export default useServiceWorker;
