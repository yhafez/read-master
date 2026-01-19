/**
 * Sync Status Indicator Component
 *
 * Shows the current sync status for offline reading progress.
 * - Syncing animation
 * - Pending changes count
 * - Error states
 * - Manual sync trigger
 */

import {
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Badge,
  useTheme,
} from "@mui/material";
import {
  CloudDone,
  CloudOff,
  CloudQueue,
  CloudSync,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";

import type { ProgressSyncState } from "@/pwa/offlineReadingProgressSync";

export interface SyncStatusIndicatorProps {
  /** Current sync state */
  syncState: ProgressSyncState;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Number of pending sync items */
  pendingCount: number;
  /** Callback to trigger manual sync */
  onSyncNow?: (() => void) | undefined;
  /** Show label (default: false) */
  showLabel?: boolean | undefined;
  /** Compact mode (smaller size) */
  compact?: boolean | undefined;
}

/**
 * Sync Status Indicator
 *
 * Displays the current sync status with appropriate icon and color.
 *
 * @example
 * <SyncStatusIndicator
 *   syncState={syncState}
 *   isSyncing={isSyncing}
 *   pendingCount={pendingCount}
 *   onSyncNow={syncNow}
 * />
 */
export function SyncStatusIndicator({
  syncState,
  isSyncing,
  pendingCount,
  onSyncNow,
  showLabel = false,
  compact = false,
}: SyncStatusIndicatorProps): React.ReactElement | null {
  const { t } = useTranslation();
  const theme = useTheme();

  // Don't show if no pending changes and not syncing
  if (!isSyncing && pendingCount === 0 && syncState.errorCount === 0) {
    if (!syncState.isOnline) {
      // Show offline indicator
      return (
        <Tooltip title={t("sync.offline")}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              color: "text.disabled",
            }}
          >
            <CloudOff fontSize={compact ? "small" : "medium"} />
            {showLabel && (
              <Box
                component="span"
                sx={{ fontSize: compact ? "0.75rem" : "0.875rem" }}
              >
                {t("sync.offline")}
              </Box>
            )}
          </Box>
        </Tooltip>
      );
    }
    return null;
  }

  // Determine icon and tooltip
  let icon: React.ReactNode;
  let tooltip: string;
  let color: string;

  if (isSyncing) {
    icon = (
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CloudSync fontSize={compact ? "small" : "medium"} />
        <CircularProgress
          size={compact ? 16 : 20}
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            marginTop: compact ? "-8px" : "-10px",
            marginLeft: compact ? "-8px" : "-10px",
          }}
        />
      </Box>
    );
    tooltip = t("sync.syncing");
    color = theme.palette.info.main;
  } else if (syncState.errorCount > 0) {
    icon = <ErrorIcon fontSize={compact ? "small" : "medium"} />;
    tooltip = t("sync.syncError", { count: syncState.errorCount });
    color = theme.palette.error.main;
  } else if (pendingCount > 0) {
    icon = <CloudQueue fontSize={compact ? "small" : "medium"} />;
    tooltip = t("sync.pendingChanges", { count: pendingCount });
    color = theme.palette.warning.main;
  } else {
    icon = <CloudDone fontSize={compact ? "small" : "medium"} />;
    tooltip = t("sync.synced");
    color = theme.palette.success.main;
  }

  // With manual sync button
  if (onSyncNow && !isSyncing) {
    return (
      <Tooltip title={tooltip}>
        <IconButton
          size={compact ? "small" : "medium"}
          onClick={onSyncNow}
          disabled={!syncState.isOnline || isSyncing}
          aria-label={t("sync.syncNow")}
          sx={{ color }}
        >
          <Badge
            badgeContent={pendingCount > 0 ? pendingCount : undefined}
            color={syncState.errorCount > 0 ? "error" : "warning"}
          >
            {icon}
          </Badge>
        </IconButton>
      </Tooltip>
    );
  }

  // Display only (no manual sync)
  return (
    <Tooltip title={tooltip}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          color,
        }}
      >
        <Badge
          badgeContent={pendingCount > 0 ? pendingCount : undefined}
          color={syncState.errorCount > 0 ? "error" : "warning"}
        >
          {icon}
        </Badge>
        {showLabel && (
          <Box
            component="span"
            sx={{ fontSize: compact ? "0.75rem" : "0.875rem" }}
          >
            {tooltip}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
}

export interface CompactSyncStatusProps {
  syncState: ProgressSyncState;
  isSyncing: boolean;
  pendingCount: number;
  onSyncNow?: () => void;
}

/**
 * Compact Sync Status Badge
 *
 * Minimal version for toolbars and headers.
 */
export function CompactSyncStatus({
  syncState,
  isSyncing,
  pendingCount,
  onSyncNow,
}: CompactSyncStatusProps): React.ReactElement | null {
  return (
    <SyncStatusIndicator
      syncState={syncState}
      isSyncing={isSyncing}
      pendingCount={pendingCount}
      onSyncNow={onSyncNow}
      compact={true}
    />
  );
}

/**
 * Sync Status with Label
 *
 * Full version with text label for sidebars and panels.
 */
export function SyncStatusWithLabel({
  syncState,
  isSyncing,
  pendingCount,
  onSyncNow,
}: CompactSyncStatusProps): React.ReactElement | null {
  return (
    <SyncStatusIndicator
      syncState={syncState}
      isSyncing={isSyncing}
      pendingCount={pendingCount}
      onSyncNow={onSyncNow ?? undefined}
      showLabel={true}
      compact={false}
    />
  );
}

export default SyncStatusIndicator;
