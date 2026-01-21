# Sentry Integration Guide

This guide explains how to set up and use Sentry for error tracking and performance monitoring in Read Master.

## Table of Contents

- [Overview](#overview)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Web App Integration](#web-app-integration)
- [API Integration](#api-integration)
- [Testing Error Tracking](#testing-error-tracking)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Read Master uses Sentry for:

- **Error Tracking**: Automatic capture of unhandled errors and exceptions
- **Performance Monitoring**: Track API response times and frontend performance
- **Session Replay**: Record user sessions to debug issues
- **User Context**: Associate errors with specific users for better debugging
- **Custom Breadcrumbs**: Track user actions leading up to errors

### Packages Used

- **Web App**: `@sentry/react` (v10.35.0)
- **API**: `@sentry/node` (v10.35.0)
- **Build Tool**: `@sentry/vite-plugin` (v4.7.0)

## Setup Instructions

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io) and sign up
2. Create an organization (e.g., "read-master")
3. Create two projects:
   - **read-master-web** (Platform: React)
   - **read-master-api** (Platform: Node.js)

### 2. Get DSN and Auth Token

#### Get DSN

For each project:

1. Go to **Settings** → **Projects** → Select Project
2. Go to **Client Keys (DSN)**
3. Copy the DSN (looks like: `https://abc123@o123456.ingest.sentry.io/123456`)

#### Get Auth Token

1. Go to **Settings** → **Account** → **Auth Tokens**
2. Click **Create New Token**
3. Name: "Read Master CI/CD"
4. Scopes:
   - `project:read`
   - `project:releases`
   - `org:read`
5. Copy the token (starts with `sntrys_`)

### 3. Configure Environment Variables

#### Web App (`.env` in `apps/web/`)

```bash
# Sentry Configuration
VITE_SENTRY_DSN=https://your-web-dsn@o123456.ingest.sentry.io/123456
VITE_APP_VERSION=1.0.0

# For production builds (source map upload)
SENTRY_ORG=read-master
SENTRY_PROJECT=read-master-web
SENTRY_AUTH_TOKEN=sntrys_your_auth_token_here
```

#### API (`.env` in `apps/api/`)

```bash
# Sentry Configuration
SENTRY_DSN=https://your-api-dsn@o123456.ingest.sentry.io/123456
```

#### Vercel Environment Variables

Add these in Vercel dashboard:

**Production:**

- `VITE_SENTRY_DSN` (Web DSN)
- `SENTRY_DSN` (API DSN)
- `SENTRY_AUTH_TOKEN` (Auth token for source maps)
- `SENTRY_ORG` = `read-master`
- `SENTRY_PROJECT` = `read-master-web`
- `VITE_APP_VERSION` = `production` (or use `VERCEL_GIT_COMMIT_SHA`)

**Preview/Development:**

- Same variables, but can use different DSN for non-production environments

## Web App Integration

### Automatic Integration

Sentry is automatically initialized in `apps/web/src/main.tsx`:

```typescript
import { ErrorBoundary, initSentry } from "./lib/sentry";

// Initialize Sentry before React renders
initSentry();
```

### Error Boundary

All errors in React components are caught by the global ErrorBoundary:

```typescript
<ErrorBoundary
  fallback={({ error, resetError }) => (
    // Custom error UI
  )}
>
  <App />
</ErrorBoundary>
```

### User Context

User context is automatically synced via `SentryUserSync` component in `App.tsx`:

```typescript
// Automatically sets user context when authenticated
<SentryUserSync />
```

### Manual Error Capture

```typescript
import { captureError, captureMessage, addBreadcrumb } from "@/lib/sentry";

// Capture an error
try {
  await fetchData();
} catch (error) {
  captureError(error, { context: "user-action" });
}

// Capture a message
captureMessage("User completed onboarding", "info");

// Add breadcrumb
addBreadcrumb("User clicked export button", "user", { fileType: "pdf" });
```

## API Integration

### Using `withSentry` Middleware

Wrap all API handlers with `withSentry` for automatic error tracking:

```typescript
import { withSentry } from "@/middleware";

export default withSentry(async (req, res) => {
  // Your handler code
  return res.status(200).json({ success: true });
});
```

### Combining with Other Middleware

Use the `compose` utility to combine multiple middlewares:

```typescript
import { compose, withSentry, withErrorHandling, withAuth } from "@/middleware";

export default compose(
  withSentry, // Track errors in Sentry
  withErrorHandling, // Format errors for response
  withAuth // Verify authentication
)(async (req, res) => {
  // Your authenticated handler
});
```

### Manual Error Capture

```typescript
import { captureError, addBreadcrumb, setSentryContext } from "@/utils/sentry";

// Add context
setSentryContext("database", {
  query: "SELECT * FROM users",
  duration: 145,
});

// Add breadcrumb
addBreadcrumb("Database query started", "db", { table: "users" });

// Capture error
try {
  await db.query();
} catch (error) {
  captureError(error, { query: "users" });
  throw error;
}
```

## Performance Monitoring

### Frontend Performance

Sentry automatically tracks:

- **Core Web Vitals**: LCP, FID, CLS
- **React Component Rendering**: Slow components
- **Route Transitions**: Page load times

Sample rate: 10% in production, 100% in development

### API Performance

Sentry automatically tracks:

- **API Response Times**: All endpoints
- **Database Queries**: Via custom spans (optional)
- **External API Calls**: AI, TTS, etc.

Sample rate: 10% in production, 100% in development

### Custom Performance Tracking

```typescript
import { startTransaction } from "@/lib/sentry";

const transaction = startTransaction("process-book-upload", "function");

try {
  // Your code
} finally {
  transaction?.finish();
}
```

## Session Replay

Session replay is enabled for:

- **10% of normal sessions** in production
- **100% of sessions with errors**
- **100% of sessions** in development

Privacy settings:

- All text is masked
- All inputs are masked
- All media is blocked

To view replays:

1. Go to Sentry project
2. Click **Replays** in sidebar
3. Filter by user, error, or date

## Testing Error Tracking

### Test in Development

```typescript
// Throw a test error
throw new Error("Test error for Sentry");

// Capture a test message
import { captureMessage } from "@/lib/sentry";
captureMessage("Testing Sentry integration", "info");
```

### Test in Production

1. Deploy to staging/preview environment
2. Trigger an error (e.g., invalid API request)
3. Check Sentry dashboard for error
4. Verify user context is included
5. Check source maps work (stack traces show actual code)

## Best Practices

### 1. Add Context to Errors

```typescript
import { setSentryContext, setSentryTag } from "@/lib/sentry";

// Before making API call
setSentryContext("api-request", {
  endpoint: "/api/books",
  method: "POST",
  payload: sanitizedPayload,
});

setSentryTag("feature", "library");
setSentryTag("tier", user.tier);
```

### 2. Add Breadcrumbs for User Actions

```typescript
import { addBreadcrumb } from "@/lib/sentry";

function handleBookUpload() {
  addBreadcrumb("User initiated book upload", "user", {
    fileType: file.type,
    fileSize: file.size,
  });

  // Upload logic
}
```

### 3. Filter Sensitive Data

Sentry automatically filters:

- Authorization headers
- Cookies
- API keys
- Passwords

To add custom filters, update `beforeSend` in `sentry.ts`.

### 4. Set Up Alerts

In Sentry dashboard:

1. Go to **Alerts** → **Create Alert**
2. Set conditions (e.g., error rate > 5%)
3. Choose notification channel (Slack, email)
4. Example alerts:
   - High error rate (>1% of requests)
   - New error types
   - Performance degradation (>3s response time)

### 5. Monitor Performance Budget

Track these metrics:

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **API Response Time**: < 500ms (p95)

### 6. Clean Up Old Issues

Regularly:

- Resolve fixed issues
- Merge duplicate issues
- Ignore known issues (browser extensions, etc.)

## Troubleshooting

### Source Maps Not Uploading

**Problem**: Stack traces show minified code

**Solution**:

1. Check `SENTRY_AUTH_TOKEN` is set
2. Verify `SENTRY_ORG` and `SENTRY_PROJECT` are correct
3. Check build logs for upload errors
4. Ensure `sourcemap: true` in `vite.config.ts`

### Errors Not Appearing in Sentry

**Problem**: No errors showing in dashboard

**Solution**:

1. Check DSN is correct in environment variables
2. Verify network access (check browser DevTools)
3. Check sampling rate (might be sampling out)
4. Ensure `initSentry()` is called before app renders
5. Check `ignoreErrors` list in `sentry.ts`

### Too Many Events (Quota Exceeded)

**Problem**: Sentry quota exceeded

**Solution**:

1. Reduce sample rates in production
2. Add more errors to `ignoreErrors` list
3. Filter out noisy errors (browser extensions, etc.)
4. Consider upgrading Sentry plan

### User Context Not Set

**Problem**: Errors don't show user information

**Solution**:

1. Verify `SentryUserSync` component is mounted
2. Check Clerk authentication is working
3. Ensure `setSentryUser` is called after login
4. Check `publicMetadata.tier` exists in Clerk

### Performance Issues

**Problem**: Sentry causing performance degradation

**Solution**:

1. Reduce `tracesSampleRate` (currently 10%)
2. Disable Session Replay in production
3. Increase `beforeSendTransaction` filtering
4. Use `ignoreTransactions` to filter noisy endpoints

## Additional Resources

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
- [Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/)

## Support

For issues with Sentry integration:

1. Check this documentation
2. Review Sentry logs in dashboard
3. Check `apps/web/src/lib/sentry.ts` configuration
4. Check `apps/api/src/utils/sentry.ts` configuration
5. Contact team lead or create issue in repository
