/**
 * PWA Install Prompt Component
 *
 * Prompts users to install the app as a PWA with:
 * - Detects installability
 * - Shows install banner
 * - Handles install flow
 * - Dismissible with persistence
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  GetApp as InstallIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

// BeforeInstallPromptEvent type
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallPromptProps {
  /** Whether to show the prompt */
  show?: boolean;
}

export function InstallPrompt({
  show = true,
}: InstallPromptProps): React.ReactElement | null {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install prompt
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      // User accepted the install prompt
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember that user dismissed the prompt
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!show || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1300,
        maxWidth: 400,
        mx: "auto",
      }}
    >
      <Card elevation={8}>
        <CardContent>
          <Stack spacing={2}>
            {/* Header */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <InstallIcon color="primary" />
                <Typography variant="h6" component="h2">
                  {t("pwa.install.title")}
                </Typography>
              </Stack>
              <IconButton size="small" onClick={handleDismiss}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            {/* Description */}
            <Typography variant="body2" color="text.secondary">
              {t("pwa.install.description")}
            </Typography>

            {/* Benefits */}
            <Box component="ul" sx={{ pl: 2, my: 0 }}>
              <Typography component="li" variant="body2">
                {t("pwa.install.benefit1")}
              </Typography>
              <Typography component="li" variant="body2">
                {t("pwa.install.benefit2")}
              </Typography>
              <Typography component="li" variant="body2">
                {t("pwa.install.benefit3")}
              </Typography>
            </Box>

            {/* Actions */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<InstallIcon />}
                onClick={handleInstall}
                fullWidth
              >
                {t("pwa.install.install")}
              </Button>
              <Button variant="outlined" onClick={handleDismiss}>
                {t("pwa.install.notNow")}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

export default InstallPrompt;
