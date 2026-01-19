/**
 * Service Worker Update Prompt Component
 * Shows a prompt when a new service worker version is available
 */

import RefreshIcon from "@mui/icons-material/Refresh";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import { useTranslation } from "react-i18next";

import { useServiceWorker } from "./useServiceWorker";

export interface ServiceWorkerUpdatePromptProps {
  /** Callback when the update is accepted */
  onUpdate?: () => void;
  /** Callback when the prompt is dismissed */
  onDismiss?: () => void;
}

/**
 * Displays update and offline-ready notifications for the PWA
 */
export function ServiceWorkerUpdatePrompt({
  onUpdate,
  onDismiss,
}: ServiceWorkerUpdatePromptProps): JSX.Element | null {
  const { t } = useTranslation();
  const {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    closePrompt,
    isOnline,
  } = useServiceWorker();

  const handleUpdate = async () => {
    await updateServiceWorker(true);
    onUpdate?.();
  };

  const handleClose = () => {
    closePrompt();
    onDismiss?.();
  };

  // Show offline indicator when not online
  const showOfflineIndicator = !isOnline;

  return (
    <>
      {/* Update Available Prompt */}
      <Snackbar
        open={needRefresh}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ mb: 2 }}
      >
        <Alert
          severity="info"
          icon={<RefreshIcon />}
          action={
            <>
              <Button color="inherit" size="small" onClick={handleClose}>
                {t("pwa.update.later", "Later")}
              </Button>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={handleUpdate}
                sx={{ ml: 1 }}
              >
                {t("pwa.update.refresh", "Refresh")}
              </Button>
            </>
          }
          sx={{
            width: "100%",
            maxWidth: 500,
            alignItems: "center",
          }}
        >
          {t("pwa.update.available", "A new version is available!")}
        </Alert>
      </Snackbar>

      {/* Offline Ready Notification */}
      <Snackbar
        open={offlineReady}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ mb: 2 }}
      >
        <Alert severity="success" onClose={handleClose}>
          {t("pwa.offline.ready", "App ready to work offline!")}
        </Alert>
      </Snackbar>

      {/* Offline Indicator */}
      <Snackbar
        open={showOfflineIndicator}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="warning"
          icon={<WifiOffIcon />}
          sx={{
            width: "100%",
            maxWidth: 400,
          }}
        >
          {t("pwa.offline.indicator", "You are currently offline")}
        </Alert>
      </Snackbar>
    </>
  );
}

export default ServiceWorkerUpdatePrompt;
