/**
 * SessionParticipants Component
 *
 * Displays the list of participants in a live reading session.
 * Shows presence, sync status, and current page for each participant.
 *
 * Features:
 * - Host badge for session host
 * - Moderator badge
 * - Sync status indicator
 * - Current page display
 * - Active/inactive status based on lastActiveAt
 */

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  PeopleOutline,
  StarOutlined,
  VerifiedUserOutlined,
  SyncOutlined,
  SyncDisabledOutlined,
  FiberManualRecord,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import type { SessionParticipant } from "@/hooks/useSessionRealtime";

// ============================================================================
// Types
// ============================================================================

export type SessionParticipantsProps = {
  participants: SessionParticipant[];
  isLoading?: boolean;
  currentUserId?: string;
  maxParticipants?: number;
};

// ============================================================================
// Constants
// ============================================================================

/**
 * Threshold in milliseconds for considering a participant "active"
 * (5 minutes)
 */
export const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if participant is actively online
 */
export function isParticipantActive(
  lastActiveAt: string,
  thresholdMs = ACTIVE_THRESHOLD_MS
): boolean {
  const lastActive = new Date(lastActiveAt).getTime();
  const now = Date.now();
  return now - lastActive < thresholdMs;
}

/**
 * Get display name for participant
 */
export function getParticipantDisplayName(
  participant: SessionParticipant
): string {
  return participant.displayName ?? participant.username ?? "Anonymous";
}

/**
 * Get status color for participant
 */
export function getStatusColor(isActive: boolean): "success" | "default" {
  return isActive ? "success" : "default";
}

/**
 * Sort participants: host first, then moderators, then by activity
 */
export function sortParticipants(
  participants: SessionParticipant[]
): SessionParticipant[] {
  return [...participants].sort((a, b) => {
    // Host always first
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;

    // Then moderators
    if (a.isModerator && !b.isModerator) return -1;
    if (!a.isModerator && b.isModerator) return 1;

    // Then by activity
    const aActive = isParticipantActive(a.lastActiveAt);
    const bActive = isParticipantActive(b.lastActiveAt);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;

    // Finally alphabetically
    return getParticipantDisplayName(a).localeCompare(
      getParticipantDisplayName(b)
    );
  });
}

// ============================================================================
// Sub-components
// ============================================================================

type ParticipantItemProps = {
  participant: SessionParticipant;
  isCurrentUser: boolean;
};

function ParticipantItem({
  participant,
  isCurrentUser,
}: ParticipantItemProps): React.ReactElement {
  const { t } = useTranslation();
  const isActive = isParticipantActive(participant.lastActiveAt);
  const statusColor = getStatusColor(isActive);
  const displayName = getParticipantDisplayName(participant);

  return (
    <ListItem
      sx={{
        py: 1,
        bgcolor: isCurrentUser ? "action.selected" : "transparent",
        borderRadius: 1,
      }}
    >
      <ListItemAvatar>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          badgeContent={
            <FiberManualRecord
              sx={{
                fontSize: 12,
                color: isActive ? "success.main" : "grey.400",
              }}
            />
          }
        >
          <Avatar
            {...(participant.avatarUrl ? { src: participant.avatarUrl } : {})}
            sx={{ width: 40, height: 40 }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
        </Badge>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography variant="subtitle2">
              {displayName}
              {isCurrentUser && (
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 0.5 }}
                >
                  ({t("common.you", "you")})
                </Typography>
              )}
            </Typography>
            {participant.isHost && (
              <Tooltip title={t("liveSessions.sync.youAreHost")}>
                <StarOutlined sx={{ fontSize: 16, color: "warning.main" }} />
              </Tooltip>
            )}
            {participant.isModerator && !participant.isHost && (
              <Tooltip title={t("common.moderator", "Moderator")}>
                <VerifiedUserOutlined
                  sx={{ fontSize: 16, color: "info.main" }}
                />
              </Tooltip>
            )}
          </Stack>
        }
        secondary={
          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
            <Chip
              size="small"
              label={`p.${participant.currentPage}`}
              sx={{ height: 20, fontSize: "0.7rem" }}
            />
            <Tooltip
              title={
                participant.isSynced
                  ? t("liveSessions.sync.following")
                  : t("liveSessions.sync.notFollowing")
              }
            >
              {participant.isSynced ? (
                <SyncOutlined sx={{ fontSize: 16, color: "success.main" }} />
              ) : (
                <SyncDisabledOutlined
                  sx={{ fontSize: 16, color: "grey.500" }}
                />
              )}
            </Tooltip>
            <Chip
              size="small"
              label={
                isActive
                  ? t("common.online", "Online")
                  : t("common.away", "Away")
              }
              color={statusColor}
              variant="outlined"
              sx={{ height: 18, fontSize: "0.65rem" }}
            />
          </Stack>
        }
      />
    </ListItem>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SessionParticipants({
  participants,
  isLoading,
  currentUserId,
  maxParticipants,
}: SessionParticipantsProps): React.ReactElement {
  const { t } = useTranslation();
  const sortedParticipants = sortParticipants(participants);
  const activeCount = participants.filter((p) =>
    isParticipantActive(p.lastActiveAt)
  ).length;

  return (
    <Paper variant="outlined" sx={{ height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PeopleOutline color="primary" />
          <Typography variant="h6">
            {t("liveSessions.details.participants")}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {activeCount} {t("common.online", "online")} / {participants.length}{" "}
          {t("common.total", "total")}
          {maxParticipants &&
            ` (${t("liveSessions.details.maxParticipants", { max: maxParticipants })})`}
        </Typography>
      </Box>

      {/* Participant List */}
      <Box sx={{ overflow: "auto", maxHeight: 400 }}>
        {isLoading ? (
          <Box p={2} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              {t("common.loading")}
            </Typography>
          </Box>
        ) : sortedParticipants.length === 0 ? (
          <Box p={2} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              {t("liveSessions.empty.noParticipants", "No participants yet")}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {sortedParticipants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                isCurrentUser={participant.userId === currentUserId}
              />
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
}

export default SessionParticipants;
