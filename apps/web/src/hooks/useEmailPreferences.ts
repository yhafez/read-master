/**
 * Email Preferences Hook
 *
 * React Query hook for fetching and updating email preferences.
 * Connects to /api/users/me/email-preferences endpoint.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut, apiRequest } from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

/**
 * Email preferences structure
 */
export type EmailPreferences = {
  emailEnabled: boolean;
  marketingEmails: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  achievementEmails: boolean;
  recommendationEmails: boolean;
  socialEmails: boolean;
  digestFrequency: "weekly" | "biweekly" | "monthly" | "never";
};

/**
 * Update preferences input
 */
export type UpdateEmailPreferencesInput = Partial<EmailPreferences>;

/**
 * API response for email preferences
 */
type EmailPreferencesApiResponse = {
  data: EmailPreferences;
};

/**
 * API response for update
 */
type UpdateEmailPreferencesApiResponse = {
  data: {
    message: string;
    preferences: EmailPreferences;
  };
};

/**
 * API response for unsubscribe
 */
type UnsubscribeApiResponse = {
  data: {
    message: string;
  };
};

// ============================================================================
// Query Keys
// ============================================================================

export const emailPreferencesKeys = {
  all: ["email-preferences"] as const,
  detail: () => [...emailPreferencesKeys.all, "detail"] as const,
};

// ============================================================================
// Default Preferences
// ============================================================================

/**
 * Default email preferences (used as fallback)
 */
export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  emailEnabled: true,
  marketingEmails: true,
  productUpdates: true,
  weeklyDigest: true,
  achievementEmails: true,
  recommendationEmails: true,
  socialEmails: true,
  digestFrequency: "weekly",
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch email preferences from API
 */
async function fetchEmailPreferences(): Promise<EmailPreferences> {
  const response = await apiGet<EmailPreferencesApiResponse>(
    "/api/users/me/email-preferences"
  );
  return response.data;
}

/**
 * Update email preferences via API
 */
async function updateEmailPreferences(
  input: UpdateEmailPreferencesInput
): Promise<EmailPreferences> {
  const response = await apiPut<UpdateEmailPreferencesApiResponse>(
    "/api/users/me/email-preferences",
    input
  );
  return response.data.preferences;
}

/**
 * Unsubscribe from all emails via API
 */
async function unsubscribeFromAll(): Promise<void> {
  await apiRequest<UnsubscribeApiResponse>("/api/users/me/email-preferences", {
    method: "DELETE",
  });
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch email preferences
 */
export function useEmailPreferences() {
  return useQuery({
    queryKey: emailPreferencesKeys.detail(),
    queryFn: fetchEmailPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: DEFAULT_EMAIL_PREFERENCES,
  });
}

/**
 * Hook to update email preferences
 */
export function useUpdateEmailPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEmailPreferences,
    onSuccess: (data) => {
      // Update cache with new preferences
      queryClient.setQueryData(emailPreferencesKeys.detail(), data);
    },
    onError: () => {
      // Invalidate cache on error to refetch
      queryClient.invalidateQueries({
        queryKey: emailPreferencesKeys.all,
      });
    },
  });
}

/**
 * Hook to unsubscribe from all emails
 */
export function useUnsubscribeFromEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unsubscribeFromAll,
    onSuccess: () => {
      // Update cache to reflect unsubscribed state
      queryClient.setQueryData(emailPreferencesKeys.detail(), {
        ...DEFAULT_EMAIL_PREFERENCES,
        emailEnabled: false,
        marketingEmails: false,
        productUpdates: false,
        weeklyDigest: false,
        achievementEmails: false,
        recommendationEmails: false,
        socialEmails: false,
        digestFrequency: "never",
      });
    },
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display label for digest frequency
 */
export function getDigestFrequencyLabel(
  frequency: EmailPreferences["digestFrequency"]
): string {
  switch (frequency) {
    case "weekly":
      return "Weekly";
    case "biweekly":
      return "Every 2 weeks";
    case "monthly":
      return "Monthly";
    case "never":
      return "Never";
    default:
      return frequency;
  }
}

/**
 * Check if any email category is enabled
 */
export function hasAnyEmailEnabled(prefs: EmailPreferences): boolean {
  if (!prefs.emailEnabled) return false;

  return (
    prefs.marketingEmails ||
    prefs.productUpdates ||
    prefs.weeklyDigest ||
    prefs.achievementEmails ||
    prefs.recommendationEmails ||
    prefs.socialEmails
  );
}

/**
 * Get count of enabled email categories
 */
export function getEnabledCategoryCount(prefs: EmailPreferences): number {
  if (!prefs.emailEnabled) return 0;

  let count = 0;
  if (prefs.marketingEmails) count++;
  if (prefs.productUpdates) count++;
  if (prefs.weeklyDigest) count++;
  if (prefs.achievementEmails) count++;
  if (prefs.recommendationEmails) count++;
  if (prefs.socialEmails) count++;

  return count;
}
