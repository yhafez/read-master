# Admin Analytics Dashboard - Implementation Plan

**Created:** 2026-01-19
**Status:** Ready for Implementation
**Priority:** High
**Estimated Effort:** ~40-50 hours

## 🎯 Overview

Build a comprehensive admin analytics dashboard that provides the product owner with real-time insights into business health, user behavior, feature adoption, and technical performance.

## 📊 What Gets Built

### Core Components

1. **Backend Infrastructure**
   - UserRole system (USER, MODERATOR, ADMIN, SUPER_ADMIN)
   - Admin authentication middleware
   - Analytics service with metrics calculation
   - Time-series data storage (DailyAnalytics model)
   - Daily cron job for metric aggregation
   - Admin API endpoints

2. **Frontend Dashboard**
   - Overview dashboard with KPIs
   - Multiple specialized views (users, revenue, engagement, AI costs)
   - Interactive charts and visualizations
   - Real-time data updates
   - Export functionality

3. **Admin Tools**
   - User management interface
   - System settings configuration
   - Alert management

## 🏗️ Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ Daily Cron Job (Midnight UTC)                           │
│ ├─ Calculate metrics for previous day                   │
│ ├─ Store in DailyAnalytics table                        │
│ └─ Send email summary to admins                         │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ DailyAnalytics Table (Historical Data)                  │
│ ├─ User metrics (total, active, new, churned)           │
│ ├─ Revenue metrics (MRR, ARR, churn)                    │
│ ├─ Engagement metrics (DAU, WAU, MAU, sessions)         │
│ └─ AI costs (total, per user, tokens)                   │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ Analytics Service                                        │
│ ├─ Real-time queries (current day)                      │
│ ├─ Historical queries (DailyAnalytics)                  │
│ ├─ Aggregate calculations                               │
│ └─ Response caching (5 minutes)                         │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ Admin API Endpoints (Protected)                         │
│ ├─ /api/admin/analytics/overview                        │
│ ├─ /api/admin/analytics/users                           │
│ ├─ /api/admin/analytics/revenue                         │
│ ├─ /api/admin/analytics/engagement                      │
│ └─ ... (more endpoints)                                 │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ Admin Dashboard (React Frontend)                        │
│ ├─ Overview page                                        │
│ ├─ Specialized views                                    │
│ ├─ Charts and visualizations                            │
│ └─ Export functionality                                 │
└─────────────────────────────────────────────────────────┘
```

## 📝 Implementation Phases

### Phase 1: Backend Foundation (8-10 hours)

#### Task 1.1: Add UserRole System

**PRD ID:** `admin-001`
**Files:**

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/seed.ts`
- `packages/shared/src/types/database.ts`

**Implementation:**

```prisma
// schema.prisma
enum UserRole {
  USER
  MODERATOR
  ADMIN
  SUPER_ADMIN
}

model User {
  // ... existing fields
  role UserRole @default(USER)
}
```

```typescript
// seed.ts - Add admin user
const adminUser = await prisma.user.create({
  data: {
    email: process.env.ADMIN_EMAIL || "admin@readmaster.app",
    username: "admin",
    role: "SUPER_ADMIN",
    subscriptionTier: "SCHOLAR",
    // ... other fields
  },
});
```

**Steps:**

1. Add UserRole enum to schema
2. Add role field to User model
3. Create migration: `pnpm prisma migrate dev --name add_user_roles`
4. Update seed data to include admin user
5. Export UserRole type from shared package
6. Run `pnpm db:seed` to verify

#### Task 1.2: Create Admin Middleware

**PRD ID:** `admin-002`
**File:** `apps/api/src/middleware/requireAdmin.ts`

```typescript
import { Request } from "express";
import { ForbiddenError } from "@/utils/errors";
import { prisma } from "@read-master/database";
import { logger } from "@/utils/logger";

export async function requireAdmin(req: Request) {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new ForbiddenError("Authentication required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    // Audit log unauthorized attempt
    logger.warn("Unauthorized admin access attempt", {
      userId,
      userEmail: user?.email,
      path: req.path,
      method: req.method,
    });

    throw new ForbiddenError("Admin access required");
  }

  // Audit log successful admin access
  logger.info("Admin access granted", {
    userId,
    userEmail: user.email,
    role: user.role,
    path: req.path,
  });

  return user;
}
```

**Steps:**

1. Create middleware file
2. Implement authentication and role check
3. Add audit logging
4. Export middleware
5. Write tests

#### Task 1.3: Create DailyAnalytics Model

**PRD ID:** `admin-003`
**File:** `packages/database/prisma/schema.prisma`

```prisma
model DailyAnalytics {
  id              String   @id @default(cuid())
  date            DateTime @db.Date

  // User metrics
  totalUsers      Int
  activeUsers     Int
  newSignups      Int
  churned         Int
  freeUsers       Int
  proUsers        Int
  scholarUsers    Int

  // Revenue metrics
  mrr             Decimal  @db.Decimal(10, 2)
  arr             Decimal  @db.Decimal(10, 2)
  newRevenue      Decimal  @db.Decimal(10, 2)
  churnedRevenue  Decimal  @db.Decimal(10, 2)

  // Engagement metrics
  dau             Int
  wau             Int
  mau             Int
  booksRead       Int
  booksCompleted  Int
  sessionsTotal   Int
  avgSessionMin   Float
  totalReadTimeMin Float

  // Feature usage
  aiInteractions  Int
  flashcardReviews Int
  annotationsCreated Int
  ttsUsage        Int
  forumPosts      Int
  socialShares    Int

  // AI costs
  aiCost          Decimal  @db.Decimal(10, 4)
  aiTokens        BigInt
  aiCostPerUser   Decimal  @db.Decimal(10, 4)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([date])
  @@index([date(sort: Desc)])
}
```

**Steps:**

1. Add model to schema
2. Create migration
3. Add seed data with sample analytics (last 30 days)
4. Run migration and seed

### Phase 2: Analytics Service (10-12 hours)

#### Task 2.1: Build Analytics Service

**PRD ID:** `admin-004`
**File:** `apps/api/src/services/analytics.ts`

**Key Functions:**

```typescript
// User statistics
export async function getUserStats(dateRange?: { start: Date; end: Date }) {
  const where = dateRange
    ? {
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      }
    : {};

  const [totalUsers, activeUsers, usersByTier] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: {
        deletedAt: null,
        lastActiveAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.user.groupBy({
      by: ["subscriptionTier"],
      where: { deletedAt: null },
      _count: true,
    }),
  ]);

  return {
    total: totalUsers,
    active: activeUsers,
    byTier: {
      free: usersByTier.find((t) => t.subscriptionTier === "FREE")?._count || 0,
      pro: usersByTier.find((t) => t.subscriptionTier === "PRO")?._count || 0,
      scholar:
        usersByTier.find((t) => t.subscriptionTier === "SCHOLAR")?._count || 0,
    },
    growth: await calculateUserGrowth(),
  };
}

// Revenue statistics
export async function getRevenueStats(dateRange?: { start: Date; end: Date }) {
  // Calculate MRR from active subscriptions
  const activeSubscriptions = await prisma.user.findMany({
    where: {
      subscriptionTier: { not: "FREE" },
      deletedAt: null,
    },
    select: { subscriptionTier: true },
  });

  const priceMap = {
    PRO: 9.99,
    SCHOLAR: 19.99,
  };

  const mrr = activeSubscriptions.reduce((sum, sub) => {
    return sum + (priceMap[sub.subscriptionTier] || 0);
  }, 0);

  return {
    mrr,
    arr: mrr * 12,
    subscribers: activeSubscriptions.length,
    byTier: {
      pro: activeSubscriptions.filter((s) => s.subscriptionTier === "PRO")
        .length,
      scholar: activeSubscriptions.filter(
        (s) => s.subscriptionTier === "SCHOLAR"
      ).length,
    },
    trends: await getRevenueTrends(dateRange),
  };
}

// Engagement statistics
export async function getEngagementStats() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dau, wau, mau, avgSessionTime] = await Promise.all([
    prisma.user.count({
      where: {
        lastActiveAt: { gte: dayAgo },
        deletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        lastActiveAt: { gte: weekAgo },
        deletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        lastActiveAt: { gte: monthAgo },
        deletedAt: null,
      },
    }),
    prisma.userStats.aggregate({
      _avg: { avgSessionDuration: true },
      where: { updatedAt: { gte: monthAgo } },
    }),
  ]);

  return {
    dau,
    wau,
    mau,
    stickiness: mau > 0 ? (dau / mau) * 100 : 0,
    avgSessionMinutes: (avgSessionTime._avg.avgSessionDuration || 0) / 60,
    booksRead: await getBooksReadCount(monthAgo),
    completionRate: await getCompletionRate(monthAgo),
  };
}

// Feature usage statistics
export async function getFeatureUsageStats() {
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const totalActiveUsers = await prisma.user.count({
    where: {
      lastActiveAt: { gte: monthAgo },
      deletedAt: null,
    },
  });

  const [
    aiUsageCount,
    flashcardUsers,
    annotationUsers,
    ttsUsers,
    forumUsers,
    socialUsers,
  ] = await Promise.all([
    prisma.aIUsageLog.count({
      where: { createdAt: { gte: monthAgo } },
    }),
    prisma.flashcard
      .groupBy({
        by: ["userId"],
        where: { createdAt: { gte: monthAgo } },
      })
      .then((r) => r.length),
    prisma.annotation
      .groupBy({
        by: ["userId"],
        where: { createdAt: { gte: monthAgo } },
      })
      .then((r) => r.length),
    prisma.aIUsageLog
      .groupBy({
        by: ["userId"],
        where: {
          feature: "TTS",
          createdAt: { gte: monthAgo },
        },
      })
      .then((r) => r.length),
    prisma.forumPost
      .groupBy({
        by: ["userId"],
        where: { createdAt: { gte: monthAgo } },
      })
      .then((r) => r.length),
    prisma.follow
      .groupBy({
        by: ["followerId"],
        where: { createdAt: { gte: monthAgo } },
      })
      .then((r) => r.length),
  ]);

  return {
    ai: {
      users: Math.min(aiUsageCount, totalActiveUsers),
      adoptionRate:
        totalActiveUsers > 0 ? (aiUsageCount / totalActiveUsers) * 100 : 0,
      interactions: aiUsageCount,
    },
    flashcards: {
      users: flashcardUsers,
      adoptionRate:
        totalActiveUsers > 0 ? (flashcardUsers / totalActiveUsers) * 100 : 0,
    },
    annotations: {
      users: annotationUsers,
      adoptionRate:
        totalActiveUsers > 0 ? (annotationUsers / totalActiveUsers) * 100 : 0,
    },
    tts: {
      users: ttsUsers,
      adoptionRate:
        totalActiveUsers > 0 ? (ttsUsers / totalActiveUsers) * 100 : 0,
    },
    forum: {
      users: forumUsers,
      adoptionRate:
        totalActiveUsers > 0 ? (forumUsers / totalActiveUsers) * 100 : 0,
    },
    social: {
      users: socialUsers,
      adoptionRate:
        totalActiveUsers > 0 ? (socialUsers / totalActiveUsers) * 100 : 0,
    },
  };
}

// AI cost statistics
export async function getAICostStats(days: number = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [aiUsage, activeUsers] = await Promise.all([
    prisma.aIUsageLog.aggregate({
      where: { createdAt: { gte: startDate } },
      _sum: {
        tokensUsed: true,
        estimatedCost: true,
      },
      _count: true,
    }),
    prisma.user.count({
      where: {
        lastActiveAt: { gte: startDate },
        deletedAt: null,
      },
    }),
  ]);

  const totalCost = Number(aiUsage._sum.estimatedCost || 0);
  const totalTokens = Number(aiUsage._sum.tokensUsed || 0);

  // Cost breakdown by feature
  const costByFeature = await prisma.aIUsageLog.groupBy({
    by: ["feature"],
    where: { createdAt: { gte: startDate } },
    _sum: {
      estimatedCost: true,
      tokensUsed: true,
    },
  });

  return {
    totalCost,
    costPerUser: activeUsers > 0 ? totalCost / activeUsers : 0,
    totalTokens,
    interactions: aiUsage._count,
    costPerInteraction: aiUsage._count > 0 ? totalCost / aiUsage._count : 0,
    byFeature: costByFeature.map((f) => ({
      feature: f.feature,
      cost: Number(f._sum.estimatedCost || 0),
      tokens: Number(f._sum.tokensUsed || 0),
    })),
    trends: await getAICostTrends(startDate),
  };
}

// Content statistics
export async function getContentStats() {
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [popularBooks, popularGenres, contentTypes] = await Promise.all([
    prisma.book.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: monthAgo },
      },
      select: {
        title: true,
        author: true,
        _count: {
          select: { userId: true },
        },
      },
      take: 10,
      orderBy: {
        completedAt: "desc",
      },
    }),
    prisma.book.groupBy({
      by: ["genre"],
      where: { deletedAt: null },
      _count: true,
      orderBy: { _count: { genre: "desc" } },
      take: 10,
    }),
    prisma.book.groupBy({
      by: ["fileType"],
      where: { deletedAt: null },
      _count: true,
    }),
  ]);

  return {
    popularBooks,
    popularGenres,
    contentTypes,
    totalBooks: await prisma.book.count({ where: { deletedAt: null } }),
    completionRate: await calculateCompletionRate(),
  };
}

// Main overview function
export async function getAnalyticsOverview() {
  const [users, revenue, engagement, features, aiCosts, content] =
    await Promise.all([
      getUserStats(),
      getRevenueStats(),
      getEngagementStats(),
      getFeatureUsageStats(),
      getAICostStats(),
      getContentStats(),
    ]);

  return {
    users,
    revenue,
    engagement,
    features,
    aiCosts,
    content,
    generatedAt: new Date(),
  };
}
```

**Additional Helper Functions:**

```typescript
async function calculateUserGrowth() {
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [thisWeek, previousWeek] = await Promise.all([
    prisma.user.count({
      where: {
        createdAt: { gte: lastWeek },
        deletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: twoWeeksAgo, lt: lastWeek },
        deletedAt: null,
      },
    }),
  ]);

  const growthRate =
    previousWeek > 0 ? ((thisWeek - previousWeek) / previousWeek) * 100 : 0;

  return {
    thisWeek,
    previousWeek,
    growthRate,
  };
}

async function getRevenueTrends(dateRange?: { start: Date; end: Date }) {
  const days = 30;
  const trends = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    date.setHours(0, 0, 0, 0);

    const analytics = await prisma.dailyAnalytics.findUnique({
      where: { date },
      select: { mrr: true, newRevenue: true },
    });

    trends.push({
      date,
      mrr: analytics ? Number(analytics.mrr) : 0,
      newRevenue: analytics ? Number(analytics.newRevenue) : 0,
    });
  }

  return trends;
}

async function getAICostTrends(startDate: Date) {
  const dailyCosts = await prisma.aIUsageLog.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: startDate } },
    _sum: { estimatedCost: true },
  });

  // Group by day
  const trendsByDay = new Map();
  dailyCosts.forEach((day) => {
    const dateKey = day.createdAt.toISOString().split("T")[0];
    const existing = trendsByDay.get(dateKey) || 0;
    trendsByDay.set(dateKey, existing + Number(day._sum.estimatedCost || 0));
  });

  return Array.from(trendsByDay.entries()).map(([date, cost]) => ({
    date: new Date(date),
    cost,
  }));
}

async function calculateCompletionRate() {
  const [completed, total] = await Promise.all([
    prisma.book.count({
      where: {
        status: "COMPLETED",
        deletedAt: null,
      },
    }),
    prisma.book.count({
      where: {
        status: { in: ["READING", "COMPLETED"] },
        deletedAt: null,
      },
    }),
  ]);

  return total > 0 ? (completed / total) * 100 : 0;
}
```

**Steps:**

1. Create analytics service file
2. Implement all stat functions
3. Add caching layer (Redis, 5-minute TTL)
4. Write comprehensive tests
5. Optimize slow queries

### Phase 3: API Endpoints (4-6 hours)

#### Task 3.1: Create Admin API Endpoints

**PRD ID:** `admin-005`

**Endpoints to Create:**

```typescript
// apps/api/api/admin/analytics/overview.ts
import { requireAdmin } from "@/middleware/requireAdmin";
import { getAnalyticsOverview } from "@/services/analytics";
import { redis } from "@/services/redis";

export default async function handler(req: Request) {
  await requireAdmin(req);

  // Check cache
  const cacheKey = "admin:analytics:overview";
  const cached = await redis.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Calculate fresh data
  const data = await getAnalyticsOverview();

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(data));

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

// apps/api/api/admin/analytics/users.ts
export default async function handler(req: Request) {
  await requireAdmin(req);

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "30");

  const data = await getUserStats({
    start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

// Similar for:
// - /api/admin/analytics/revenue
// - /api/admin/analytics/engagement
// - /api/admin/analytics/features
// - /api/admin/analytics/ai-costs
// - /api/admin/analytics/content
```

**Steps:**

1. Create all endpoint files
2. Apply requireAdmin middleware
3. Add response caching
4. Add query parameter parsing (date ranges, filters)
5. Write tests

### Phase 4: Daily Cron Job (3-4 hours)

#### Task 4.1: Create Daily Analytics Cron

**PRD ID:** `admin-006`
**File:** `apps/api/api/cron/daily-analytics.ts`

```typescript
import { prisma } from "@read-master/database";
import { logger } from "@/utils/logger";

export default async function handler(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Calculate for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);

    logger.info("Starting daily analytics calculation", { date: yesterday });

    // Calculate all metrics
    const metrics = await calculateDailyMetrics(yesterday, endOfDay);

    // Store in database
    await prisma.dailyAnalytics.upsert({
      where: { date: yesterday },
      create: {
        date: yesterday,
        ...metrics,
      },
      update: metrics,
    });

    logger.info("Daily analytics completed", { date: yesterday, metrics });

    // Send email summary to admins
    await sendAdminEmailSummary(yesterday, metrics);

    return new Response(JSON.stringify({ success: true, date: yesterday }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Daily analytics failed", { error });

    // Send error notification
    await sendErrorNotification(error);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function calculateDailyMetrics(startDate: Date, endDate: Date) {
  const [
    userMetrics,
    revenueMetrics,
    engagementMetrics,
    featureMetrics,
    aiMetrics,
  ] = await Promise.all([
    calculateUserMetrics(startDate, endDate),
    calculateRevenueMetrics(startDate, endDate),
    calculateEngagementMetrics(startDate, endDate),
    calculateFeatureMetrics(startDate, endDate),
    calculateAIMetrics(startDate, endDate),
  ]);

  return {
    ...userMetrics,
    ...revenueMetrics,
    ...engagementMetrics,
    ...featureMetrics,
    ...aiMetrics,
  };
}

async function calculateUserMetrics(startDate: Date, endDate: Date) {
  const [totalUsers, activeUsers, newSignups, tierCounts] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: {
        lastActiveAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
    }),
    prisma.user.groupBy({
      by: ["subscriptionTier"],
      where: { deletedAt: null },
      _count: true,
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    newSignups,
    churned: 0, // Calculate based on lastActiveAt > 30 days
    freeUsers:
      tierCounts.find((t) => t.subscriptionTier === "FREE")?._count || 0,
    proUsers: tierCounts.find((t) => t.subscriptionTier === "PRO")?._count || 0,
    scholarUsers:
      tierCounts.find((t) => t.subscriptionTier === "SCHOLAR")?._count || 0,
  };
}

// Similar functions for revenue, engagement, features, AI metrics...
```

**Configure in vercel.json:**

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-analytics",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Steps:**

1. Create cron endpoint
2. Implement metric calculation functions
3. Add error handling and notifications
4. Configure in vercel.json
5. Test manually with cron secret
6. Write tests

### Phase 5: Frontend Dashboard (12-15 hours)

#### Task 5.1: Overview Dashboard

**PRD ID:** `frontend-106`
**File:** `apps/web/src/pages/admin/AdminDashboardPage.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export function AdminDashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'analytics', 'overview'],
    queryFn: async () => {
      const res = await fetch('/api/admin/analytics/overview');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    enabled: user?.publicMetadata?.role === 'ADMIN' || user?.publicMetadata?.role === 'SUPER_ADMIN',
    refetchInterval: 60000, // Refresh every minute
    staleTime: 300000 // 5 minutes
  });

  // Redirect if not admin
  if (!user?.publicMetadata?.role ||
      (user.publicMetadata.role !== 'ADMIN' && user.publicMetadata.role !== 'SUPER_ADMIN')) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Admin Analytics Dashboard</Typography>
        <IconButton onClick={() => refetch()} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        {/* KPI Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Users"
            value={data.users.total.toLocaleString()}
            subtitle={`${data.users.active.toLocaleString()} active (30d)`}
            trend={data.users.growth.growthRate}
            icon={<PeopleIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="MRR"
            value={`$${data.revenue.mrr.toFixed(2)}`}
            subtitle={`$${data.revenue.arr.toFixed(2)} ARR`}
            icon={<AttachMoneyIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="AI Costs (30d)"
            value={`$${data.aiCosts.totalCost.toFixed(2)}`}
            subtitle={`$${data.aiCosts.costPerUser.toFixed(4)} per user`}
            icon={<SmartToyIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="DAU"
            value={data.engagement.dau.toLocaleString()}
            subtitle={`${data.engagement.stickiness.toFixed(1)}% stickiness`}
            icon={<TrendingUpIcon />}
          />
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Users Over Time (30d)
              </Typography>
              <UsersChart data={data.users.trends} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue Trends (30d)
              </Typography>
              <RevenueChart data={data.revenue.trends} />
            </CardContent>
          </Card>
        </Grid>

        {/* Feature Usage */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Feature Adoption
              </Typography>
              <FeatureUsageTable data={data.features} />
            </CardContent>
          </Card>
        </Grid>

        {/* Popular Content */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Most Popular Books (30d)
              </Typography>
              <List>
                {data.content.popularBooks.slice(0, 5).map((book, idx) => (
                  <ListItem key={idx}>
                    <ListItemText
                      primary={book.title}
                      secondary={book.author}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {book._count.userId} readers
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Popular Genres
              </Typography>
              <GenreChart data={data.content.popularGenres} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// MetricCard component
function MetricCard({ title, value, subtitle, trend, icon }) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="text.secondary" variant="overline">
              {title}
            </Typography>
            <Typography variant="h4">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box color="primary.main">
              {icon}
            </Box>
          )}
        </Box>
        {trend !== undefined && (
          <Box display="flex" alignItems="center" mt={1}>
            {trend >= 0 ? (
              <ArrowUpwardIcon fontSize="small" color="success" />
            ) : (
              <ArrowDownwardIcon fontSize="small" color="error" />
            )}
            <Typography
              variant="body2"
              color={trend >= 0 ? 'success.main' : 'error.main'}
              ml={0.5}
            >
              {Math.abs(trend).toFixed(1)}%
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
```

**Steps:**

1. Create admin dashboard page
2. Add route protection
3. Implement KPI cards
4. Add auto-refresh
5. Create chart components
6. Add loading/error states
7. Make responsive
8. Write tests

#### Task 5.2: Chart Components

**PRD IDs:** `frontend-107`, `frontend-108`, `frontend-109`, `frontend-110`

**Install charting library:**

```bash
pnpm add recharts
```

**Create chart components:**

```typescript
// UsersOverTimeChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function UsersOverTimeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(date) => new Date(date).toLocaleDateString()}
        />
        <YAxis />
        <Tooltip
          labelFormatter={(date) => new Date(date).toLocaleDateString()}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#8884d8"
          name="Total Users"
        />
        <Line
          type="monotone"
          dataKey="active"
          stroke="#82ca9d"
          name="Active Users"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// RevenueOverTimeChart.tsx
export function RevenueOverTimeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(date) => new Date(date).toLocaleDateString()}
        />
        <YAxis tickFormatter={(value) => `$${value}`} />
        <Tooltip
          labelFormatter={(date) => new Date(date).toLocaleDateString()}
          formatter={(value) => `$${value.toFixed(2)}`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="mrr"
          stroke="#8884d8"
          name="MRR"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// FeatureUsageTable.tsx
export function FeatureUsageTable({ data }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Feature</TableCell>
          <TableCell align="right">Users</TableCell>
          <TableCell align="right">Adoption Rate</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.entries(data).map(([feature, stats]) => (
          <TableRow key={feature}>
            <TableCell>{formatFeatureName(feature)}</TableCell>
            <TableCell align="right">{stats.users.toLocaleString()}</TableCell>
            <TableCell align="right">
              <Box display="flex" alignItems="center" justifyContent="flex-end">
                <LinearProgress
                  variant="determinate"
                  value={stats.adoptionRate}
                  sx={{ width: 100, mr: 1 }}
                />
                <Typography variant="body2">
                  {stats.adoptionRate.toFixed(1)}%
                </Typography>
              </Box>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// AICostsDashboard.tsx
export function AICostsDashboard({ data }) {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Typography variant="h6">Cost by Feature</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.byFeature}
              dataKey="cost"
              nameKey="feature"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {data.byFeature.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `$${value.toFixed(4)}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography variant="h6">Cost Trends (30d)</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            <YAxis tickFormatter={(value) => `$${value}`} />
            <Tooltip
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
              formatter={(value) => `$${value.toFixed(2)}`}
            />
            <Line type="monotone" dataKey="cost" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </Grid>
    </Grid>
  );
}
```

#### Task 5.3: User Management Page

**PRD ID:** `admin-007`

Create admin user management interface for managing user roles, tiers, and deletions.

#### Task 5.4: Export Functionality

**PRD ID:** `frontend-112`

Add ability to export analytics data as CSV, JSON, or PDF.

### Phase 6: Testing & Polish (4-6 hours)

#### Task 6.1: Write Tests

**Backend Tests:**

- Analytics service functions
- Admin middleware
- API endpoints
- Cron job logic

**Frontend Tests:**

- Dashboard rendering
- Chart components
- Route protection
- Data fetching

#### Task 6.2: Performance Optimization

- Add database indexes
- Optimize slow queries
- Implement proper caching
- Add query pagination

#### Task 6.3: Documentation

- Add inline code comments
- Create admin user guide
- Document metric calculations
- Update API documentation

## 📊 Success Metrics

The admin dashboard is successful when:

✅ **Functional Requirements:**

- All metrics display accurately
- Charts render correctly and are interactive
- Real-time updates work (60s refresh)
- Export functionality works for all formats
- Only admins can access
- Mobile responsive (tablet+)

✅ **Performance Requirements:**

- Dashboard loads in < 3 seconds
- API responses in < 2 seconds
- Charts render smoothly
- No janky scrolling

✅ **Security Requirements:**

- Non-admins blocked from access
- All admin actions audit logged
- No PII exposed in aggregate views
- Rate limiting works

✅ **Business Value:**

- Product owner can make data-driven decisions
- Easy to identify trends and issues
- Can track feature adoption
- Can monitor costs

## 🚀 Deployment Checklist

Before deploying to production:

```
□ All PRD tasks completed and passing tests
□ Database migrations run successfully
□ Seed data includes admin user
□ Cron job configured in vercel.json
□ Environment variables set (CRON_SECRET, ADMIN_EMAIL)
□ Analytics endpoints return correct data
□ Dashboard accessible only to admins
□ Charts render correctly on all screen sizes
□ Export functionality tested
□ Performance acceptable (< 3s load time)
□ No console errors or warnings
□ Audit logging works
□ Documentation updated
```

## 📚 Additional Resources

- **Recharts Documentation**: https://recharts.org/
- **Prisma Grouping & Aggregation**: https://www.prisma.io/docs/concepts/components/prisma-client/aggregation-grouping-summarizing
- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs
- **React Query Best Practices**: https://tanstack.com/query/latest/docs/react/guides/best-practices

## 🎉 Summary

This implementation plan provides everything needed to build a comprehensive admin analytics dashboard. The phased approach ensures systematic development with clear milestones:

1. **Phase 1-2**: Backend foundation (analytics service, data models)
2. **Phase 3-4**: API layer and automation (endpoints, cron)
3. **Phase 5**: Frontend dashboard (UI, charts, interactions)
4. **Phase 6**: Polish and deployment

**Total Estimated Time:** 40-50 hours
**Total PRD Tasks:** 15 tasks (8 backend, 7 frontend)
**High Priority:** This gives you critical business insights!

---

**Ready to start building!** 🚀📊
