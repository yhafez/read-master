/**
 * Achievement unlock notification component
 * Displays a toast-style notification when achievements are unlocked
 */

import { useState, useEffect } from "react";
import {
  Paper,
  Box,
  Typography,
  IconButton,
  Slide,
  useTheme,
  alpha,
  type SxProps,
  type Theme,
} from "@mui/material";
import {
  Close as CloseIcon,
  EmojiEvents as TrophyIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ROUTES } from "@/router/routes";
import type { Achievement } from "@/stores/achievementsStore";
import { TIER_COLORS } from "@/stores/achievementsStore";

// ============================================================================
// Types
// ============================================================================

export interface AchievementNotificationProps {
  /** Achievement that was unlocked */
  achievement: Achievement;
  /** Callback when notification is dismissed */
  onDismiss: () => void;
  /** Whether to auto-dismiss after delay */
  autoDismiss?: boolean;
  /** Auto-dismiss delay in milliseconds */
  autoDismissDelay?: number;
  /** Whether to show initially (for animation) */
  show?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_AUTO_DISMISS_DELAY = 5000; // 5 seconds

// ============================================================================
// Component
// ============================================================================

/**
 * Achievement unlock notification toast
 */
export function AchievementNotification({
  achievement,
  onDismiss,
  autoDismiss = true,
  autoDismissDelay = DEFAULT_AUTO_DISMISS_DELAY,
  show = true,
}: AchievementNotificationProps): React.ReactElement {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(show);

  // Auto-dismiss after delay
  useEffect(() => {
    if (autoDismiss && isVisible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, isVisible]);

  const handleDismiss = (): void => {
    setIsVisible(false);
    // Wait for slide animation to complete before calling onDismiss
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const handleNavigate = (): void => {
    navigate(ROUTES.ACHIEVEMENTS);
    handleDismiss();
  };

  const tierColor = TIER_COLORS[achievement.tier];

  // Container styles
  const containerSx: SxProps<Theme> = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 2,
    p: 2,
    minWidth: { xs: 280, sm: 360 },
    maxWidth: { xs: 320, sm: 400 },
    backgroundColor: "background.paper",
    border: 2,
    borderColor: tierColor,
    borderRadius: 2,
    boxShadow: theme.shadows[8],
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: theme.shadows[12],
    },
    // Glow effect
    "&::before": {
      content: '""',
      position: "absolute",
      top: -2,
      left: -2,
      right: -2,
      bottom: -2,
      borderRadius: 2,
      background: `linear-gradient(45deg, ${alpha(tierColor, 0.3)}, ${alpha(tierColor, 0.1)})`,
      zIndex: -1,
      filter: "blur(8px)",
      opacity: 0.8,
    },
  };

  // Icon container styles
  const iconContainerSx: SxProps<Theme> = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
    borderRadius: "50%",
    backgroundColor: alpha(tierColor, 0.15),
    border: 2,
    borderColor: tierColor,
    flexShrink: 0,
    // Pulse animation
    animation: "pulse 2s ease-in-out infinite",
    "@keyframes pulse": {
      "0%, 100%": {
        transform: "scale(1)",
        opacity: 1,
      },
      "50%": {
        transform: "scale(1.05)",
        opacity: 0.8,
      },
    },
  };

  return (
    <Slide direction="left" in={isVisible} timeout={300}>
      <Paper sx={containerSx} elevation={0} onClick={handleNavigate}>
        {/* Icon */}
        <Box sx={iconContainerSx}>
          <TrophyIcon
            sx={{
              fontSize: 32,
              color: tierColor,
            }}
          />
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mb: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: "bold",
                textTransform: "uppercase",
                color: tierColor,
                letterSpacing: 0.5,
              }}
            >
              {t("achievements.unlocked", "Achievement Unlocked!")}
            </Typography>
          </Box>

          {/* Achievement name */}
          <Typography
            variant="subtitle1"
            noWrap
            sx={{
              fontWeight: "bold",
              mb: 0.5,
            }}
          >
            {t(achievement.nameKey, achievement.nameKey)}
          </Typography>

          {/* XP reward */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: tierColor,
                fontWeight: "medium",
              }}
            >
              +{achievement.xpReward} XP
            </Typography>
            <ArrowForwardIcon
              sx={{
                fontSize: 14,
                color: "text.secondary",
              }}
            />
          </Box>
        </Box>

        {/* Close button */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            color: "text.secondary",
            "&:hover": {
              backgroundColor: alpha(theme.palette.text.secondary, 0.1),
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Slide>
  );
}
