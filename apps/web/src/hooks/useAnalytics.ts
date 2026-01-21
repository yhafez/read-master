/**
 * React hooks for PostHog analytics
 *
 * Provides convenient hooks for tracking events and checking feature flags
 */

import { useCallback } from "react";
import {
  trackEvent,
  isFeatureEnabled,
  getFeatureFlagValue,
  type EventName,
  type EventProperties,
} from "@/lib/analytics";

// ============================================================================
// Event Tracking Hook
// ============================================================================

/**
 * Hook for tracking events
 * Returns a memoized function that tracks events
 *
 * @example
 * const trackAnalytics = useAnalytics();
 * trackAnalytics("book_added", { title: "1984", author: "George Orwell" });
 */
export function useAnalytics() {
  return useCallback((eventName: EventName, properties?: EventProperties) => {
    trackEvent(eventName, properties);
  }, []);
}

// ============================================================================
// Feature Flags Hook
// ============================================================================

/**
 * Hook for checking feature flags
 * Returns the current state of a feature flag
 *
 * @example
 * const isNewFeatureEnabled = useFeatureFlag("new_reader_ui");
 * if (isNewFeatureEnabled) {
 *   return <NewReaderUI />;
 * }
 */
export function useFeatureFlag(flagKey: string): boolean {
  return isFeatureEnabled(flagKey);
}

/**
 * Hook for getting feature flag value (for multivariate flags)
 *
 * @example
 * const paymentProvider = useFeatureFlagValue("payment_provider");
 * // paymentProvider could be "stripe" | "paypal" | "both"
 */
export function useFeatureFlagValue(
  flagKey: string
): string | boolean | undefined {
  return getFeatureFlagValue(flagKey);
}

// ============================================================================
// Specialized Event Tracking Hooks
// ============================================================================

/**
 * Hook for tracking book events
 */
export function useBookAnalytics() {
  const track = useAnalytics();

  return {
    trackBookAdded: useCallback(
      (bookId: string, title: string, author?: string) => {
        track("book_added", { bookId, title, author });
      },
      [track]
    ),

    trackBookOpened: useCallback(
      (bookId: string, title: string) => {
        track("book_opened", { bookId, title });
      },
      [track]
    ),

    trackBookCompleted: useCallback(
      (bookId: string, title: string, readingTimeMinutes?: number) => {
        track("book_completed", { bookId, title, readingTimeMinutes });
      },
      [track]
    ),

    trackBookDeleted: useCallback(
      (bookId: string, title: string) => {
        track("book_deleted", { bookId, title });
      },
      [track]
    ),
  };
}

/**
 * Hook for tracking reading session events
 */
export function useReadingAnalytics() {
  const track = useAnalytics();

  return {
    trackSessionStarted: useCallback(
      (bookId: string, chapterNumber?: number) => {
        track("reading_session_started", { bookId, chapterNumber });
      },
      [track]
    ),

    trackSessionPaused: useCallback(
      (bookId: string, durationSeconds: number) => {
        track("reading_session_paused", { bookId, durationSeconds });
      },
      [track]
    ),

    trackSessionResumed: useCallback(
      (bookId: string) => {
        track("reading_session_resumed", { bookId });
      },
      [track]
    ),

    trackSessionCompleted: useCallback(
      (bookId: string, durationSeconds: number, pagesRead?: number) => {
        track("reading_session_completed", {
          bookId,
          durationSeconds,
          pagesRead,
        });
      },
      [track]
    ),

    trackChapterCompleted: useCallback(
      (bookId: string, chapterNumber: number) => {
        track("chapter_completed", { bookId, chapterNumber });
      },
      [track]
    ),

    trackPageTurned: useCallback(
      (bookId: string, pageNumber: number) => {
        track("page_turned", { bookId, pageNumber });
      },
      [track]
    ),
  };
}

/**
 * Hook for tracking AI feature usage
 */
export function useAIAnalytics() {
  const track = useAnalytics();

  return {
    trackExplainUsed: useCallback(
      (bookId: string, selectedText: string) => {
        track("ai_explain_used", {
          bookId,
          textLength: selectedText.length,
        });
      },
      [track]
    ),

    trackChatOpened: useCallback(
      (bookId: string) => {
        track("ai_chat_opened", { bookId });
      },
      [track]
    ),

    trackChatMessageSent: useCallback(
      (bookId: string, messageLength: number) => {
        track("ai_chat_message_sent", { bookId, messageLength });
      },
      [track]
    ),

    trackAssessmentStarted: useCallback(
      (bookId: string, assessmentType: string) => {
        track("ai_assessment_started", { bookId, assessmentType });
      },
      [track]
    ),

    trackAssessmentCompleted: useCallback(
      (bookId: string, score: number, totalQuestions: number) => {
        track("ai_assessment_completed", {
          bookId,
          score,
          totalQuestions,
          percentage: (score / totalQuestions) * 100,
        });
      },
      [track]
    ),

    trackFlashcardGenerated: useCallback(
      (bookId: string, flashcardCount: number) => {
        track("flashcard_generated", { bookId, flashcardCount });
      },
      [track]
    ),
  };
}

/**
 * Hook for tracking SRS flashcard events
 */
export function useSRSAnalytics() {
  const track = useAnalytics();

  return {
    trackFlashcardReviewed: useCallback(
      (flashcardId: string, difficulty: string) => {
        track("flashcard_reviewed", { flashcardId, difficulty });
      },
      [track]
    ),

    trackFlashcardCorrect: useCallback(
      (flashcardId: string, streak?: number) => {
        track("flashcard_correct", { flashcardId, streak });
      },
      [track]
    ),

    trackFlashcardIncorrect: useCallback(
      (flashcardId: string) => {
        track("flashcard_incorrect", { flashcardId });
      },
      [track]
    ),

    trackStreakUpdated: useCallback(
      (newStreak: number, previousStreak: number) => {
        track("streak_updated", { newStreak, previousStreak });
      },
      [track]
    ),
  };
}

/**
 * Hook for tracking conversion events
 */
export function useConversionAnalytics() {
  const track = useAnalytics();

  return {
    trackUpgradeInitiated: useCallback(
      (fromTier: string, toTier: string) => {
        track("upgrade_initiated", { fromTier, toTier });
      },
      [track]
    ),

    trackUpgradeCompleted: useCallback(
      (fromTier: string, toTier: string, price: number) => {
        track("upgrade_completed", { fromTier, toTier, price });
      },
      [track]
    ),

    trackSubscriptionCancelled: useCallback(
      (tier: string, reason?: string) => {
        track("subscription_cancelled", { tier, reason });
      },
      [track]
    ),
  };
}

/**
 * Hook for tracking TTS events
 */
export function useTTSAnalytics() {
  const track = useAnalytics();

  return {
    trackTTSStarted: useCallback(
      (bookId: string, voice: string, speed: number) => {
        track("tts_started", { bookId, voice, speed });
      },
      [track]
    ),

    trackTTSPaused: useCallback(
      (bookId: string, playedSeconds: number) => {
        track("tts_paused", { bookId, playedSeconds });
      },
      [track]
    ),

    trackTTSDownloadInitiated: useCallback(
      (bookId: string, voice: string, format: string) => {
        track("tts_download_initiated", { bookId, voice, format });
      },
      [track]
    ),

    trackTTSDownloadCompleted: useCallback(
      (bookId: string, fileSizeMB: number, durationSeconds: number) => {
        track("tts_download_completed", {
          bookId,
          fileSizeMB,
          durationSeconds,
        });
      },
      [track]
    ),
  };
}
