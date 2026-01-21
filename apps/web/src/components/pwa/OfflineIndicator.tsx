/**
 * Offline Indicator Component
 *
 * Shows connection status and provides feedback when the user goes offline.
 * Displays a banner when offline and automatically dismisses when back online.
 */

import React, { useState, useEffect } from "react";
import { Alert, Snackbar, Stack, Typography } from "@mui/material";
import {
  CloudOff as OfflineIcon,
  CloudQueue as OnlineIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export interface OfflineIndicatorProps {
  /** Whether to show the indicator */
  show?: boolean;
  /** Position of the indicator */
  position?: "top" | "bottom";
}

export function OfflineIndicator({
  show = true,
  position = "bottom",
}: OfflineIndicatorProps): React.ReactElement {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      // Auto-hide reconnection message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!show) {
    return <></>;
  }

  return (
    <>
      {/* Offline Banner */}
      <Snackbar
        open={isOffline}
        anchorOrigin={{
          vertical: position,
          horizontal: "center",
        }}
        sx={{ bottom: position === "bottom" ? 24 : undefined }}
      >
        <Alert
          severity="warning"
          icon={<OfflineIcon />}
          sx={{ width: "100%", alignItems: "center" }}
        >
          <Stack spacing={0.5}>
            <Typography variant="body2" fontWeight="bold">
              {t("pwa.offline.title")}
            </Typography>
            <Typography variant="caption">
              {t("pwa.offline.description")}
            </Typography>
          </Stack>
        </Alert>
      </Snackbar>

      {/* Back Online Notification */}
      <Snackbar
        open={showReconnected}
        autoHideDuration={3000}
        onClose={() => setShowReconnected(false)}
        anchorOrigin={{
          vertical: position,
          horizontal: "center",
        }}
      >
        <Alert
          severity="success"
          icon={<OnlineIcon />}
          onClose={() => setShowReconnected(false)}
          sx={{ width: "100%", alignItems: "center" }}
        >
          <Typography variant="body2" fontWeight="bold">
            {t("pwa.online.title")}
          </Typography>
        </Alert>
      </Snackbar>
    </>
  );
}

export default OfflineIndicator;
