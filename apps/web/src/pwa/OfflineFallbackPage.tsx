/**
 * Offline Fallback Page
 * Displayed when the user is offline and the requested page is not cached
 */

import CloudOffIcon from "@mui/icons-material/CloudOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import SignalWifiOffIcon from "@mui/icons-material/SignalWifiOff";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { OfflineFallbackProps } from "./offlineCacheTypes";
import { APP_SHELL_ROUTES } from "./offlineCacheTypes";
import {
  formatTimeSinceOnline,
  getCachedRoutes,
  getLastOnlineTime,
  getOnlineStatus,
} from "./offlineCacheUtils";

/**
 * OfflineFallbackPage component
 * Shows when user is offline and requested page isn't cached
 */
export function OfflineFallbackPage({
  onRetry,
  cachedPages: initialCachedPages,
}: OfflineFallbackProps) {
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);
  const [cachedRoutes, setCachedRoutes] = useState<string[]>(
    initialCachedPages ?? []
  );
  const [lastOnline, setLastOnline] = useState<number | null>(
    getLastOnlineTime()
  );
  const [isOnline, setIsOnline] = useState(getOnlineStatus());

  // Load cached routes on mount
  useEffect(() => {
    const loadCachedRoutes = async () => {
      const routes = await getCachedRoutes();
      setCachedRoutes(routes);
    };

    if (!initialCachedPages) {
      loadCachedRoutes();
    }
  }, [initialCachedPages]);

  // Listen for online status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-redirect after coming back online
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastOnline(Date.now());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onRetry]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);

    // Check if actually online now
    if (navigator.onLine) {
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    } else {
      // Still offline, show message briefly then stop loading
      setTimeout(() => {
        setIsRetrying(false);
      }, 1000);
    }
  }, [onRetry]);

  const handleNavigate = useCallback((path: string) => {
    window.location.href = path;
  }, []);

  // Get route display info
  const getRouteInfo = (path: string) => {
    const route = APP_SHELL_ROUTES.find((r) => r.path === path);
    return route ?? { name: path, path };
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 3,
        }}
      >
        {/* Offline icon */}
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            bgcolor: "action.disabledBackground",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SignalWifiOffIcon sx={{ fontSize: 64, color: "text.secondary" }} />
        </Box>

        {/* Title */}
        <Typography variant="h4" component="h1" gutterBottom>
          {t("offline.title", "You're Offline")}
        </Typography>

        {/* Description */}
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {t(
            "offline.description",
            "It looks like you've lost your internet connection. Some features may not be available."
          )}
        </Typography>

        {/* Last online time */}
        {lastOnline && (
          <Chip
            icon={<CloudOffIcon />}
            label={t("offline.lastOnline", {
              defaultValue: `Last online: ${formatTimeSinceOnline(lastOnline)}`,
              time: formatTimeSinceOnline(lastOnline),
            })}
            variant="outlined"
            color="default"
          />
        )}

        {/* Retry button */}
        <Button
          variant="contained"
          size="large"
          startIcon={
            isRetrying ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <RefreshIcon />
            )
          }
          onClick={handleRetry}
          disabled={isRetrying || isOnline}
          sx={{ minWidth: 200 }}
        >
          {isRetrying
            ? t("offline.checking", "Checking...")
            : t("offline.tryAgain", "Try Again")}
        </Button>

        {/* Cached pages section */}
        {cachedRoutes.length > 0 && (
          <Card sx={{ width: "100%", mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t("offline.availablePages", "Available Offline")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t(
                  "offline.cachedPagesDescription",
                  "These pages are cached and can be viewed offline:"
                )}
              </Typography>
              <List dense disablePadding>
                {cachedRoutes.map((path) => {
                  const routeInfo = getRouteInfo(path);
                  return (
                    <ListItem key={path} disablePadding>
                      <ListItemButton onClick={() => handleNavigate(path)}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Chip
                            label={t("offline.cached", "Cached")}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={routeInfo.name}
                          secondary={path}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Tips section */}
        <Card sx={{ width: "100%", mt: 2, bgcolor: "background.default" }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              {t("offline.tips", "Tips")}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              component="ul"
              sx={{ pl: 2, m: 0 }}
            >
              <li>
                {t(
                  "offline.tip1",
                  "Check your Wi-Fi or mobile data connection"
                )}
              </li>
              <li>
                {t("offline.tip2", "Try moving to an area with better signal")}
              </li>
              <li>
                {t(
                  "offline.tip3",
                  "Download books for offline reading when connected"
                )}
              </li>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export type { OfflineFallbackProps };
