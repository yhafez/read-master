# PostHog Analytics - Setup Guide

## Overview

Read Master uses PostHog for product analytics, feature flags, and session recording. This guide covers the complete setup and usage.

## Table of Contents

1. [PostHog Account Setup](#posthog-account-setup)
2. [Environment Variables](#environment-variables)
3. [Event Tracking](#event-tracking)
4. [Feature Flags](#feature-flags)
5. [Session Recording](#session-recording)
6. [Privacy Settings](#privacy-settings)
7. [Best Practices](#best-practices)

---

## PostHog Account Setup

### Option 1: PostHog Cloud (Recommended)

1. Go to [https://app.posthog.com/signup](https://app.posthog.com/signup)
2. Sign up for an account (free tier available)
3. Create a new project
4. Copy your **Project API Key** (starts with `phc_`)

### Option 2: Self-Hosted

1. Follow [PostHog self-hosted installation](https://posthog.com/docs/self-host)
2. Deploy PostHog to your infrastructure
3. Get your API key from the project settings
4. Set custom `VITE_POSTHOG_HOST` to your instance URL

---

## Environment Variables

### Development (.env.local)

```bash
# PostHog Configuration
VITE_POSTHOG_KEY=phc_your_project_api_key_here
VITE_POSTHOG_HOST=https://app.posthog.com  # Optional, defaults to app.posthog.com
```

### Production (Vercel)

In Vercel Dashboard:

1. Go to **Settings** > **Environment Variables**
2. Add:
   - `VITE_POSTHOG_KEY` - Your production project API key
   - `VITE_POSTHOG_HOST` - (Optional) Custom host URL

---

## Event Tracking

### Automatic Events

PostHog automatically tracks:
- **Pageviews**: Every page navigation
- **Clicks**: Button and link clicks
- **Form submissions**: All form submits

### Custom Events

Read Master tracks 40+ custom events across 7 categories:

#### 1. User Lifecycle

```typescript
import { trackEvent } from "@/lib/analytics";

// User signed up
trackEvent("user_signed_up", {
  method: "email",
  source: "landing_page",
});

// User logged in
trackEvent("user_logged_in");

// Tier changed
trackEvent("user_tier_changed", {
  from: "FREE",
  to: "PRO",
});
```

#### 2. Book Events

```typescript
import { useBookAnalytics } from "@/hooks/useAnalytics";

const { trackBookAdded, trackBookOpened, trackBookCompleted } = useBookAnalytics();

// Book added to library
trackBookAdded("book_123", "1984", "George Orwell");

// Book opened in reader
trackBookOpened("book_123", "1984");

// Book completed
trackBookCompleted("book_123", "1984", 480); // 480 minutes reading time
```

#### 3. Reading Sessions

```typescript
import { useReadingAnalytics } from "@/hooks/useAnalytics";

const {
  trackSessionStarted,
  trackSessionPaused,
  trackSessionCompleted,
  trackChapterCompleted,
} = useReadingAnalytics();

// Session started
trackSessionStarted("book_123", 1); // Chapter 1

// Session paused
trackSessionPaused("book_123", 300); // 5 minutes

// Chapter completed
trackChapterCompleted("book_123", 1);

// Session completed
trackSessionCompleted("book_123", 600, 10); // 10 minutes, 10 pages
```

#### 4. AI Feature Usage

```typescript
import { useAIAnalytics } from "@/hooks/useAnalytics";

const {
  trackExplainUsed,
  trackChatMessageSent,
  trackAssessmentCompleted,
  trackFlashcardGenerated,
} = useAIAnalytics();

// User asked AI to explain text
trackExplainUsed("book_123", "selected text here");

// AI chat message sent
trackChatMessageSent("book_123", 150); // 150 characters

// Comprehension assessment completed
trackAssessmentCompleted("book_123", 8, 10); // 8/10 correct

// Flashcards generated
trackFlashcardGenerated("book_123", 5);
```

#### 5. SRS Flashcards

```typescript
import { useSRSAnalytics } from "@/hooks/useAnalytics";

const {
  trackFlashcardReviewed,
  trackFlashcardCorrect,
  trackStreakUpdated,
} = useSRSAnalytics();

// Flashcard reviewed
trackFlashcardReviewed("card_123", "easy");

// Answered correctly
trackFlashcardCorrect("card_123", 7); // 7-day streak

// Streak updated
trackStreakUpdated(14, 7); // From 7 to 14 days
```

#### 6. Conversion Events

```typescript
import { useConversionAnalytics } from "@/hooks/useAnalytics";

const {
  trackUpgradeInitiated,
  trackUpgradeCompleted,
  trackSubscriptionCancelled,
} = useConversionAnalytics();

// User clicked upgrade button
trackUpgradeInitiated("FREE", "PRO");

// Payment completed
trackUpgradeCompleted("FREE", "PRO", 9.99);

// Subscription cancelled
trackSubscriptionCancelled("PRO", "too_expensive");
```

#### 7. TTS Events

```typescript
import { useTTSAnalytics } from "@/hooks/useAnalytics";

const {
  trackTTSStarted,
  trackTTSPaused,
  trackTTSDownloadInitiated,
  trackTTSDownloadCompleted,
} = useTTSAnalytics();

// TTS started
trackTTSStarted("book_123", "alloy", 1.0); // Voice: alloy, Speed: 1.0x

// TTS paused
trackTTSPaused("book_123", 120); // 2 minutes played

// TTS download initiated
trackTTSDownloadInitiated("book_123", "rachel", "MP3");

// Download completed
trackTTSDownloadCompleted("book_123", 12.5, 300); // 12.5 MB, 5 minutes
```

---

## Feature Flags

### Creating a Feature Flag

1. In PostHog Dashboard, go to **Feature Flags**
2. Click **New feature flag**
3. Set:
   - **Key**: `new_reader_ui` (lowercase, underscores)
   - **Name**: New Reader UI
   - **Description**: Test new reader interface
   - **Rollout percentage**: 10% (or 100% for everyone)
4. Click **Save**

### Using Feature Flags in Code

```typescript
import { useFeatureFlag } from "@/hooks/useAnalytics";

function ReaderComponent() {
  const isNewUIEnabled = useFeatureFlag("new_reader_ui");

  if (isNewUIEnabled) {
    return <NewReaderUI />;
  }

  return <OldReaderUI />;
}
```

### Multivariate Flags

For A/B/C testing:

```typescript
import { useFeatureFlagValue } from "@/hooks/useAnalytics";

function PaymentComponent() {
  const paymentProvider = useFeatureFlagValue("payment_provider");

  switch (paymentProvider) {
    case "stripe":
      return <StripeCheckout />;
    case "paypal":
      return <PayPalCheckout />;
    case "both":
      return <MultiProviderCheckout />;
    default:
      return <DefaultCheckout />;
  }
}
```

### Reloading Flags

Flags are cached locally. To reload from server:

```typescript
import { reloadFeatureFlags } from "@/lib/analytics";

// Reload after user upgrades
reloadFeatureFlags();
```

---

## Session Recording

### How It Works

PostHog records user sessions (mouse movements, clicks, scrolls) for debugging and UX analysis.

### Privacy Settings

Read Master has **strict privacy controls**:

✅ **All input fields are masked** (passwords, emails, credit cards)
✅ **Elements with `data-sensitive` are masked**
✅ **10% sampling in production** (only 1 in 10 sessions recorded)
✅ **Minimum 5-second duration** (brief sessions not recorded)
✅ **Cross-origin iframes blocked**

### Marking Sensitive Data

Add `data-sensitive` attribute to any element:

```tsx
<div data-sensitive>
  User's private notes: {userNotes}
</div>
```

This will be masked in recordings as `***`.

### Manually Control Recording

```typescript
import { startSessionRecording, stopSessionRecording } from "@/lib/analytics";

// Start recording for specific user action
startSessionRecording();

// Stop recording (e.g., user enters sensitive screen)
stopSessionRecording();
```

---

## Privacy Settings

### What We Track

✅ **Anonymous user behavior** (clicks, pageviews, navigation)
✅ **Feature usage** (which features are used, how often)
✅ **Reading patterns** (session duration, completion rates)
✅ **Conversion events** (upgrades, cancellations)

### What We DON'T Track

❌ **Passwords or auth tokens**
❌ **Credit card numbers**
❌ **Email addresses in properties** (sanitized automatically)
❌ **Book content** (only metadata like title, author)
❌ **Private notes or annotations** (marked as sensitive)

### GDPR Compliance

PostHog is GDPR-compliant. Users can:
- **Opt-out**: Use browser Do Not Track
- **Request data deletion**: Via PostHog API
- **Export their data**: Via PostHog Dashboard

---

## Best Practices

### 1. Track User-Centric Events

**Good:**
```typescript
trackEvent("book_completed", {
  title: "1984",
  readingTimeMinutes: 480,
  sessionCount: 12,
});
```

**Bad:**
```typescript
trackEvent("button_clicked"); // Too generic, not useful
```

### 2. Use Consistent Property Names

Always use snake_case for properties:

```typescript
// Good
trackEvent("ai_chat_message_sent", {
  message_length: 150,
  conversation_id: "conv_123",
});

// Bad
trackEvent("ai_chat_message_sent", {
  messageLength: 150, // camelCase
  ConversationID: "conv_123", // PascalCase
});
```

### 3. Track Conversions with Context

Include relevant context in conversion events:

```typescript
trackUpgradeCompleted("FREE", "PRO", {
  price: 9.99,
  billing_cycle: "monthly",
  campaign_source: "email",
  days_since_signup: 7,
});
```

### 4. Use Feature Flags for Gradual Rollout

Don't ship risky features to everyone at once:

```typescript
// Ship to 10% of users first
const isEnabled = useFeatureFlag("new_ai_chat_ui");

// Monitor in PostHog for errors/feedback
// Then increase to 50%, then 100%
```

### 5. Respect User Privacy

Always mask sensitive data:

```tsx
<TextField
  type="password"
  data-sensitive // Will be masked in session recordings
  value={password}
/>
```

---

## Analyzing Data in PostHog

### Key Dashboards

1. **User Lifecycle**:
   - Signups per day
   - Login frequency
   - Tier distribution

2. **Feature Adoption**:
   - AI explain usage
   - Flashcard generation
   - TTS downloads

3. **Conversion Funnel**:
   - Signup → Add book → Complete chapter → Upgrade

4. **Retention**:
   - Daily/weekly/monthly active users
   - Churn rate
   - Reading streak retention

### Creating Insights

In PostHog Dashboard:

1. Go to **Insights** > **New insight**
2. Select **Trends**, **Funnels**, or **Retention**
3. Choose event (e.g., `book_completed`)
4. Add filters (e.g., tier = PRO)
5. Group by properties (e.g., genre)
6. Save to dashboard

---

## Troubleshooting

### Events Not Appearing

1. **Check PostHog key**: Verify `VITE_POSTHOG_KEY` is set correctly
2. **Check initialization**: Look for "PostHog loaded successfully" in console
3. **Check network tab**: Verify requests to `app.posthog.com` are successful
4. **Wait a few seconds**: Events are batched and sent in intervals

### Feature Flags Not Working

1. **Reload flags**: Call `reloadFeatureFlags()` after user identification
2. **Check rollout**: Verify flag is enabled for your user in PostHog Dashboard
3. **Check user identification**: Ensure `identifyUser()` was called

### Session Recordings Missing

1. **Check sampling**: Only 10% of sessions are recorded in production
2. **Check duration**: Sessions < 5 seconds are not recorded
3. **Check user consent**: Respect Do Not Track browser setting

---

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog JavaScript SDK](https://posthog.com/docs/libraries/js)
- [Feature Flags Guide](https://posthog.com/docs/features/feature-flags)
- [Session Recording Guide](https://posthog.com/docs/session-replay)
- [PostHog API Reference](https://posthog.com/docs/api)

---

**Last Updated:** January 21, 2026
