/**
 * Achievement notification manager
 * Monitors the achievements store and displays notifications when achievements are unlocked
 */

import { useEffect, useState, useCallback } from "react";
import { Box, Portal } from "@mui/material";

import { useAchievementsStore } from "@/stores/achievementsStore";
import { getAchievementById } from "@/stores/achievementsStore";
import { AchievementNotification } from "./AchievementNotification";

// ============================================================================
// Types
// ============================================================================

interface QueuedNotification {
  /** Unique ID for the notification */
  id: string;
  /** Achievement ID */
  achievementId: string;
  /** Timestamp when added to queue */
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_VISIBLE_NOTIFICATIONS = 3;
const NOTIFICATION_SPACING = 16; // px between notifications

// ============================================================================
// Sound Effects
// ============================================================================

/**
 * Play achievement unlock sound
 * Uses Web Audio API for a pleasant notification sound
 */
function playAchievementSound(): void {
  try {
    const audioContext = new (
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    )();

    if (!audioContext) return;

    // Create oscillator for a pleasant chime sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configure pleasant chime (major chord)
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

    // Fade out
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (_error) {
    // Silently fail if audio not supported
    // No-op: Audio playback failed but this is not critical
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * Achievement notification manager
 * Automatically shows notifications when achievements are unlocked
 */
export function AchievementNotificationManager(): React.ReactElement {
  const newlyUnlocked = useAchievementsStore((state) => state.newlyUnlocked);
  const clearNewlyUnlocked = useAchievementsStore(
    (state) => state.clearNewlyUnlocked
  );

  const [visibleNotifications, setVisibleNotifications] = useState<
    QueuedNotification[]
  >([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  // Process newly unlocked achievements
  useEffect(() => {
    if (newlyUnlocked.length === 0) return;

    // Filter out already processed achievements
    const unprocessedAchievements = newlyUnlocked.filter(
      (id) => !processedIds.has(id)
    );

    if (unprocessedAchievements.length === 0) return;

    // Add new notifications to queue
    const newNotifications: QueuedNotification[] = unprocessedAchievements.map(
      (achievementId) => ({
        id: `${achievementId}-${Date.now()}`,
        achievementId,
        timestamp: Date.now(),
      })
    );

    setVisibleNotifications((prev) => [
      ...prev,
      ...newNotifications.slice(0, MAX_VISIBLE_NOTIFICATIONS - prev.length),
    ]);

    // Mark as processed
    setProcessedIds(
      (prev) =>
        new Set([
          ...prev,
          ...unprocessedAchievements.map((id) => `${id}-${Date.now()}`),
        ])
    );

    // Play sound for first notification
    if (newNotifications.length > 0) {
      playAchievementSound();
    }

    // Clear from store after processing
    clearNewlyUnlocked();
  }, [newlyUnlocked, processedIds, clearNewlyUnlocked]);

  // Handle notification dismissal
  const handleDismiss = useCallback((notificationId: string) => {
    setVisibleNotifications((prev) =>
      prev.filter((n) => n.id !== notificationId)
    );
  }, []);

  // Don't render anything if no notifications
  if (visibleNotifications.length === 0) {
    return <></>;
  }

  return (
    <Portal>
      <Box
        sx={{
          position: "fixed",
          top: { xs: 16, md: 24 },
          right: { xs: 16, md: 24 },
          zIndex: (theme) => theme.zIndex.snackbar + 1,
          display: "flex",
          flexDirection: "column",
          gap: `${NOTIFICATION_SPACING}px`,
          pointerEvents: "none",
        }}
      >
        {visibleNotifications.map((notification) => {
          const achievement = getAchievementById(notification.achievementId);
          if (!achievement) return null;

          return (
            <Box
              key={notification.id}
              sx={{
                pointerEvents: "auto",
              }}
            >
              <AchievementNotification
                achievement={achievement}
                onDismiss={() => handleDismiss(notification.id)}
                autoDismiss
                autoDismissDelay={5000}
              />
            </Box>
          );
        })}
      </Box>
    </Portal>
  );
}
