/**
 * Database Seed Script
 *
 * Populates the database with sample data for development and testing.
 * This script is idempotent - it can be run multiple times safely.
 *
 * Usage: pnpm db:seed
 */

/* eslint-disable no-console */
// Console logging is intentionally used in seed scripts for progress feedback

import { PrismaClient } from "@prisma/client";
import { seedEmailTemplates } from "./seedEmailTemplates.js";

const prisma = new PrismaClient();

// =============================================================================
// ACHIEVEMENT DEFINITIONS
// Based on docs/SPECIFICATIONS.md Achievement Definitions section
// =============================================================================

const ACHIEVEMENTS = [
  // Reading Achievements
  {
    code: "first_book",
    name: "First Chapter",
    description: "Complete your first book",
    category: "READING" as const,
    criteria: { booksCompleted: 1 },
    xpReward: 100,
    tier: "COMMON" as const,
    sortOrder: 1,
    badgeIcon: "book",
    badgeColor: "#4CAF50",
  },
  {
    code: "bookworm",
    name: "Bookworm",
    description: "Complete 10 books",
    category: "READING" as const,
    criteria: { booksCompleted: 10 },
    xpReward: 500,
    tier: "UNCOMMON" as const,
    sortOrder: 2,
    badgeIcon: "books",
    badgeColor: "#2196F3",
  },
  {
    code: "bibliophile",
    name: "Bibliophile",
    description: "Complete 50 books",
    category: "READING" as const,
    criteria: { booksCompleted: 50 },
    xpReward: 2000,
    tier: "RARE" as const,
    sortOrder: 3,
    badgeIcon: "library",
    badgeColor: "#9C27B0",
  },
  {
    code: "scholar",
    name: "Scholar",
    description: "Complete 100 books",
    category: "READING" as const,
    criteria: { booksCompleted: 100 },
    xpReward: 5000,
    tier: "EPIC" as const,
    sortOrder: 4,
    badgeIcon: "graduation",
    badgeColor: "#FF9800",
  },
  {
    code: "speed_reader",
    name: "Speed Reader",
    description: "Read at 500 WPM average",
    category: "READING" as const,
    criteria: { avgReadingSpeed: 500 },
    xpReward: 300,
    tier: "UNCOMMON" as const,
    sortOrder: 5,
    badgeIcon: "speed",
    badgeColor: "#00BCD4",
  },
  {
    code: "marathon",
    name: "Marathon Reader",
    description: "Read for 5 hours in one day",
    category: "READING" as const,
    criteria: { dailyReadTime: 18000 },
    xpReward: 250,
    tier: "UNCOMMON" as const,
    sortOrder: 6,
    badgeIcon: "timer",
    badgeColor: "#795548",
  },
  {
    code: "night_owl",
    name: "Night Owl",
    description: "Read past midnight",
    category: "READING" as const,
    criteria: { readingSessionAfterMidnight: true },
    xpReward: 50,
    tier: "COMMON" as const,
    sortOrder: 7,
    badgeIcon: "moon",
    badgeColor: "#3F51B5",
  },
  {
    code: "early_bird",
    name: "Early Bird",
    description: "Read before 6 AM",
    category: "READING" as const,
    criteria: { readingSessionBefore6am: true },
    xpReward: 50,
    tier: "COMMON" as const,
    sortOrder: 8,
    badgeIcon: "sun",
    badgeColor: "#FFEB3B",
  },

  // Streak Achievements
  {
    code: "streak_7",
    name: "On Fire",
    description: "7-day reading streak",
    category: "STREAK" as const,
    criteria: { currentStreak: 7 },
    xpReward: 100,
    tier: "COMMON" as const,
    sortOrder: 10,
    badgeIcon: "flame",
    badgeColor: "#FF5722",
  },
  {
    code: "streak_30",
    name: "Dedicated",
    description: "30-day reading streak",
    category: "STREAK" as const,
    criteria: { currentStreak: 30 },
    xpReward: 500,
    tier: "UNCOMMON" as const,
    sortOrder: 11,
    badgeIcon: "flame",
    badgeColor: "#FF5722",
  },
  {
    code: "streak_100",
    name: "Unstoppable",
    description: "100-day reading streak",
    category: "STREAK" as const,
    criteria: { currentStreak: 100 },
    xpReward: 2000,
    tier: "EPIC" as const,
    sortOrder: 12,
    badgeIcon: "flame",
    badgeColor: "#FF5722",
  },
  {
    code: "streak_365",
    name: "Legendary",
    description: "365-day reading streak",
    category: "STREAK" as const,
    criteria: { currentStreak: 365 },
    xpReward: 10000,
    tier: "LEGENDARY" as const,
    sortOrder: 13,
    badgeIcon: "crown",
    badgeColor: "#FFD700",
  },

  // SRS/Learning Achievements
  {
    code: "first_review",
    name: "Memory Spark",
    description: "Complete first SRS review",
    category: "LEARNING" as const,
    criteria: { cardsReviewed: 1 },
    xpReward: 25,
    tier: "COMMON" as const,
    sortOrder: 20,
    badgeIcon: "brain",
    badgeColor: "#E91E63",
  },
  {
    code: "cards_100",
    name: "Card Collector",
    description: "Review 100 cards",
    category: "LEARNING" as const,
    criteria: { cardsReviewed: 100 },
    xpReward: 200,
    tier: "COMMON" as const,
    sortOrder: 21,
    badgeIcon: "cards",
    badgeColor: "#673AB7",
  },
  {
    code: "cards_1000",
    name: "Memory Master",
    description: "Review 1000 cards",
    category: "LEARNING" as const,
    criteria: { cardsReviewed: 1000 },
    xpReward: 1000,
    tier: "RARE" as const,
    sortOrder: 22,
    badgeIcon: "cards",
    badgeColor: "#673AB7",
  },
  {
    code: "mastered_50",
    name: "Getting Sharp",
    description: "Master 50 cards",
    category: "LEARNING" as const,
    criteria: { cardsMastered: 50 },
    xpReward: 300,
    tier: "UNCOMMON" as const,
    sortOrder: 23,
    badgeIcon: "star",
    badgeColor: "#FFC107",
  },
  {
    code: "mastered_500",
    name: "Steel Trap",
    description: "Master 500 cards",
    category: "LEARNING" as const,
    criteria: { cardsMastered: 500 },
    xpReward: 1500,
    tier: "RARE" as const,
    sortOrder: 24,
    badgeIcon: "star",
    badgeColor: "#FFC107",
  },
  {
    code: "retention_90",
    name: "Excellent Recall",
    description: "90%+ retention rate",
    category: "LEARNING" as const,
    criteria: { retentionRate: 0.9 },
    xpReward: 500,
    tier: "RARE" as const,
    sortOrder: 25,
    badgeIcon: "brain",
    badgeColor: "#4CAF50",
  },
  {
    code: "perfect_day",
    name: "Perfect Day",
    description: "100% correct in a review session (10+ cards)",
    category: "LEARNING" as const,
    criteria: { sessionAccuracy: 1.0, sessionCards: 10 },
    xpReward: 150,
    tier: "UNCOMMON" as const,
    sortOrder: 26,
    badgeIcon: "check-circle",
    badgeColor: "#4CAF50",
  },

  // Social Achievements
  {
    code: "first_highlight",
    name: "Highlighter",
    description: "Create first highlight",
    category: "SOCIAL" as const,
    criteria: { highlightsCreated: 1 },
    xpReward: 25,
    tier: "COMMON" as const,
    sortOrder: 30,
    badgeIcon: "highlight",
    badgeColor: "#FFEB3B",
  },
  {
    code: "annotator",
    name: "Annotator",
    description: "Create 100 annotations",
    category: "SOCIAL" as const,
    criteria: { annotationsCreated: 100 },
    xpReward: 300,
    tier: "UNCOMMON" as const,
    sortOrder: 31,
    badgeIcon: "edit",
    badgeColor: "#FF9800",
  },
  {
    code: "social_butterfly",
    name: "Social Butterfly",
    description: "Gain 10 followers",
    category: "SOCIAL" as const,
    criteria: { followersCount: 10 },
    xpReward: 200,
    tier: "UNCOMMON" as const,
    sortOrder: 32,
    badgeIcon: "people",
    badgeColor: "#03A9F4",
  },
  {
    code: "influencer",
    name: "Influencer",
    description: "Gain 100 followers",
    category: "SOCIAL" as const,
    criteria: { followersCount: 100 },
    xpReward: 1000,
    tier: "RARE" as const,
    sortOrder: 33,
    badgeIcon: "star",
    badgeColor: "#9C27B0",
  },
  {
    code: "group_founder",
    name: "Group Founder",
    description: "Create a reading group",
    category: "SOCIAL" as const,
    criteria: { groupsCreated: 1 },
    xpReward: 150,
    tier: "UNCOMMON" as const,
    sortOrder: 34,
    badgeIcon: "group",
    badgeColor: "#009688",
  },
  {
    code: "curriculum_creator",
    name: "Curriculum Creator",
    description: "Create a public curriculum",
    category: "SOCIAL" as const,
    criteria: { publicCurriculumsCreated: 1 },
    xpReward: 200,
    tier: "UNCOMMON" as const,
    sortOrder: 35,
    badgeIcon: "list",
    badgeColor: "#607D8B",
  },
  {
    code: "helpful",
    name: "Helpful",
    description: "Get 10 best answers in forum",
    category: "SOCIAL" as const,
    criteria: { bestAnswers: 10 },
    xpReward: 500,
    tier: "RARE" as const,
    sortOrder: 36,
    badgeIcon: "check",
    badgeColor: "#4CAF50",
  },

  // Comprehension Achievements
  {
    code: "first_assessment",
    name: "Pop Quiz",
    description: "Complete first assessment",
    category: "MILESTONE" as const,
    criteria: { assessmentsCompleted: 1 },
    xpReward: 50,
    tier: "COMMON" as const,
    sortOrder: 40,
    badgeIcon: "quiz",
    badgeColor: "#2196F3",
  },
  {
    code: "ace",
    name: "Ace",
    description: "Score 100% on an assessment",
    category: "MILESTONE" as const,
    criteria: { assessmentScore: 1.0 },
    xpReward: 200,
    tier: "UNCOMMON" as const,
    sortOrder: 41,
    badgeIcon: "trophy",
    badgeColor: "#FFD700",
  },
  {
    code: "consistent",
    name: "Consistent",
    description: "Score 80%+ on 10 assessments",
    category: "MILESTONE" as const,
    criteria: { assessments80Plus: 10 },
    xpReward: 400,
    tier: "RARE" as const,
    sortOrder: 42,
    badgeIcon: "trending-up",
    badgeColor: "#4CAF50",
  },
  {
    code: "blooms_master",
    name: "Deep Thinker",
    description: "Score 90%+ on all Bloom's levels",
    category: "MILESTONE" as const,
    criteria: { allBloomsLevels: 0.9 },
    xpReward: 1000,
    tier: "EPIC" as const,
    sortOrder: 43,
    badgeIcon: "brain",
    badgeColor: "#9C27B0",
  },
];

// =============================================================================
// FORUM CATEGORIES
// =============================================================================

const FORUM_CATEGORIES = [
  {
    slug: "general-discussion",
    name: "General Discussion",
    description: "Discuss anything related to reading and learning",
    icon: "chat",
    color: "#2196F3",
    sortOrder: 1,
    minTierToPost: "FREE" as const,
  },
  {
    slug: "book-recommendations",
    name: "Book Recommendations",
    description: "Share and discover great books",
    icon: "thumb-up",
    color: "#4CAF50",
    sortOrder: 2,
    minTierToPost: "FREE" as const,
  },
  {
    slug: "reading-strategies",
    name: "Reading Strategies",
    description: "Tips and techniques for better reading comprehension",
    icon: "lightbulb",
    color: "#FF9800",
    sortOrder: 3,
    minTierToPost: "FREE" as const,
  },
  {
    slug: "flashcard-tips",
    name: "Flashcard Tips",
    description: "SRS strategies and flashcard creation tips",
    icon: "cards",
    color: "#9C27B0",
    sortOrder: 4,
    minTierToPost: "FREE" as const,
  },
  {
    slug: "study-groups",
    name: "Study Groups",
    description: "Find and form study groups",
    icon: "group",
    color: "#00BCD4",
    sortOrder: 5,
    minTierToPost: "FREE" as const,
  },
  {
    slug: "feature-requests",
    name: "Feature Requests",
    description: "Suggest new features and improvements",
    icon: "idea",
    color: "#E91E63",
    sortOrder: 6,
    minTierToPost: "FREE" as const,
  },
  {
    slug: "help-support",
    name: "Help & Support",
    description: "Get help with using Read Master",
    icon: "help",
    color: "#607D8B",
    sortOrder: 7,
    minTierToPost: "FREE" as const,
  },
  {
    slug: "pro-scholar-lounge",
    name: "Pro & Scholar Lounge",
    description: "Exclusive discussions for Pro and Scholar members",
    icon: "star",
    color: "#FFD700",
    sortOrder: 8,
    minTierToPost: "PRO" as const,
  },
];

// =============================================================================
// SAMPLE USERS
// =============================================================================

const SAMPLE_USERS = [
  // Admin users
  {
    clerkId: "seed_user_super_admin",
    email: "admin@readmaster.com",
    username: "admin",
    firstName: "Super",
    lastName: "Admin",
    displayName: "Super Admin",
    bio: "System administrator with full access",
    tier: "SCHOLAR" as const,
    role: "SUPER_ADMIN" as const,
    preferredLang: "en",
    timezone: "UTC",
    profilePublic: false,
    showStats: false,
    showActivity: false,
    aiEnabled: true,
  },
  {
    clerkId: "seed_user_admin",
    email: "support@readmaster.com",
    username: "support",
    firstName: "Admin",
    lastName: "User",
    displayName: "Admin Support",
    bio: "Platform administrator",
    tier: "PRO" as const,
    role: "ADMIN" as const,
    preferredLang: "en",
    timezone: "America/New_York",
    profilePublic: false,
    showStats: false,
    showActivity: false,
    aiEnabled: true,
  },
  {
    clerkId: "seed_user_moderator",
    email: "moderator@readmaster.com",
    username: "moderator",
    firstName: "Content",
    lastName: "Moderator",
    displayName: "Content Mod",
    bio: "Community moderator",
    tier: "PRO" as const,
    role: "MODERATOR" as const,
    preferredLang: "en",
    timezone: "Europe/London",
    profilePublic: false,
    showStats: true,
    showActivity: false,
    aiEnabled: true,
  },
  // Regular users
  {
    clerkId: "seed_user_free_1",
    email: "free.user@example.com",
    username: "freereader",
    firstName: "Alex",
    lastName: "Reader",
    displayName: "Alex the Reader",
    bio: "Just started my reading journey!",
    tier: "FREE" as const,
    role: "USER" as const,
    preferredLang: "en",
    timezone: "America/New_York",
    profilePublic: true,
    showStats: true,
    showActivity: true,
    aiEnabled: true,
  },
  {
    clerkId: "seed_user_pro_1",
    email: "pro.user@example.com",
    username: "proreader",
    firstName: "Jordan",
    lastName: "Scholar",
    displayName: "Jordan the Scholar",
    bio: "Avid reader and lifelong learner. Pro member since 2024.",
    tier: "PRO" as const,
    role: "USER" as const,
    preferredLang: "en",
    timezone: "America/Los_Angeles",
    profilePublic: true,
    showStats: true,
    showActivity: true,
    aiEnabled: true,
  },
  {
    clerkId: "seed_user_scholar_1",
    email: "scholar.user@example.com",
    username: "masterreader",
    firstName: "Sam",
    lastName: "Bookworm",
    displayName: "Master Reader Sam",
    bio: "Reading 100 books a year. Scholar tier power user.",
    tier: "SCHOLAR" as const,
    role: "USER" as const,
    preferredLang: "en",
    timezone: "Europe/London",
    profilePublic: true,
    showStats: true,
    showActivity: true,
    aiEnabled: true,
  },
  {
    clerkId: "seed_user_arabic_1",
    email: "arabic.user@example.com",
    username: "arabicreader",
    firstName: "Fatima",
    lastName: "Al-Kitab",
    displayName: "فاطمة القارئة",
    bio: "أحب القراءة والتعلم",
    tier: "PRO" as const,
    role: "USER" as const,
    preferredLang: "ar",
    timezone: "Asia/Dubai",
    profilePublic: true,
    showStats: true,
    showActivity: false,
    aiEnabled: true,
  },
  {
    clerkId: "seed_user_spanish_1",
    email: "spanish.user@example.com",
    username: "lectorespa",
    firstName: "Carlos",
    lastName: "Libros",
    displayName: "Carlos el Lector",
    bio: "Apasionado por la literatura latinoamericana",
    tier: "FREE" as const,
    role: "USER" as const,
    preferredLang: "es",
    timezone: "America/Mexico_City",
    profilePublic: false,
    showStats: false,
    showActivity: false,
    aiEnabled: true,
  },
];

// =============================================================================
// SAMPLE BOOKS
// =============================================================================

const SAMPLE_BOOKS = [
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    description:
      "A classic novel about the decadence and excess of the Jazz Age.",
    source: "OPEN_LIBRARY" as const,
    sourceId: "OL26320624M",
    language: "en",
    wordCount: 47094,
    estimatedReadTime: 188,
    genre: "Fiction",
    tags: ["classic", "american-literature", "1920s"],
    status: "COMPLETED" as const,
  },
  {
    title: "1984",
    author: "George Orwell",
    description:
      "A dystopian novel about totalitarianism and surveillance society.",
    source: "GOOGLE_BOOKS" as const,
    sourceId: "kotPYEqx7kMC",
    language: "en",
    wordCount: 88942,
    estimatedReadTime: 356,
    genre: "Fiction",
    tags: ["dystopian", "classic", "political"],
    status: "READING" as const,
  },
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    description:
      "A groundbreaking narrative of humanity from the Stone Age to the twenty-first century.",
    source: "UPLOAD" as const,
    fileType: "EPUB" as const,
    filePath: "users/seed/books/sapiens.epub",
    language: "en",
    wordCount: 149000,
    estimatedReadTime: 596,
    genre: "Non-Fiction",
    tags: ["history", "anthropology", "science"],
    status: "WANT_TO_READ" as const,
  },
  {
    title: "Don Quixote",
    author: "Miguel de Cervantes",
    description:
      "The adventures of a man who reads so many chivalric romances that he loses his sanity.",
    source: "OPEN_LIBRARY" as const,
    sourceId: "OL7177679M",
    language: "es",
    wordCount: 430000,
    estimatedReadTime: 1720,
    genre: "Fiction",
    tags: ["classic", "spanish-literature", "satire"],
    status: "READING" as const,
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    description:
      "An easy and proven way to build good habits and break bad ones.",
    source: "PASTE" as const,
    language: "en",
    wordCount: 73000,
    estimatedReadTime: 292,
    genre: "Self-Help",
    tags: ["productivity", "habits", "self-improvement"],
    status: "COMPLETED" as const,
  },
];

// =============================================================================
// SAMPLE DAILY ANALYTICS
// Time-series data for admin dashboard testing
// =============================================================================

/**
 * Generate sample daily analytics for the past 30 days
 * This creates realistic-looking time-series data with:
 * - Growing user base
 * - Varying engagement metrics
 * - Weekend dips in activity
 * - AI usage patterns
 */
function generateDailyAnalytics(): Array<{
  date: Date;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churned: number;
  freeUsers: number;
  proUsers: number;
  scholarUsers: number;
  totalRevenueCents: number;
  newSubscriptionsCents: number;
  renewalsCents: number;
  upgradesCents: number;
  refundsCents: number;
  booksAdded: number;
  booksCompleted: number;
  totalReadingTimeMin: number;
  assessmentsTaken: number;
  flashcardsCreated: number;
  flashcardsReviewed: number;
  annotationsCreated: number;
  forumPostsCreated: number;
  forumRepliesCreated: number;
  groupsCreated: number;
  curriculumsCreated: number;
  aiRequestsCount: number;
  aiTokensUsed: number;
  aiCostCents: number;
  preReadingGuidesGen: number;
  explanationsGen: number;
  assessmentsGen: number;
  flashcardsGen: number;
  avgPageLoadMs: number;
  avgApiResponseMs: number;
  errorCount: number;
  p99ResponseMs: number;
}> {
  const analytics = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Base metrics that grow over time
  let baseUsers = 1000;
  let baseFreeUsers = 750;
  let baseProUsers = 200;
  let baseScholarUsers = 50;

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Check if weekend (lower activity)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const activityMultiplier = isWeekend ? 0.6 : 1.0;

    // Daily growth
    const dailyGrowth = Math.floor(Math.random() * 15) + 5;
    baseUsers += dailyGrowth;
    baseFreeUsers += Math.floor(dailyGrowth * 0.75);
    baseProUsers += Math.floor(dailyGrowth * 0.2);
    baseScholarUsers += Math.floor(dailyGrowth * 0.05);

    // Calculate metrics with some randomness
    const activeUsers = Math.floor(
      baseUsers * (0.15 + Math.random() * 0.1) * activityMultiplier
    );
    const newUsers = Math.floor(Math.random() * 20) + 5;
    const churned = Math.floor(Math.random() * 5);

    // Revenue (in cents)
    const newSubs = Math.floor(Math.random() * 5) * 999; // $9.99 plans
    const renewals = Math.floor(Math.random() * 10) * 999;
    const upgrades = Math.floor(Math.random() * 3) * 1000; // $10 upgrade difference
    const refunds = Math.floor(Math.random() * 2) * 999;

    // Engagement
    const booksAdded = Math.floor(
      (Math.random() * 30 + 10) * activityMultiplier
    );
    const booksCompleted = Math.floor(
      (Math.random() * 10 + 2) * activityMultiplier
    );
    const readingTime = Math.floor(
      (Math.random() * 5000 + 2000) * activityMultiplier
    );
    const assessments = Math.floor(
      (Math.random() * 20 + 5) * activityMultiplier
    );
    const flashcardsCreated = Math.floor(
      (Math.random() * 100 + 30) * activityMultiplier
    );
    const flashcardsReviewed = Math.floor(
      (Math.random() * 500 + 100) * activityMultiplier
    );
    const annotations = Math.floor(
      (Math.random() * 80 + 20) * activityMultiplier
    );
    const forumPosts = Math.floor(
      (Math.random() * 15 + 2) * activityMultiplier
    );
    const forumReplies = Math.floor(
      (Math.random() * 40 + 10) * activityMultiplier
    );
    const groups = Math.floor(Math.random() * 3);
    const curriculums = Math.floor(Math.random() * 2);

    // AI usage
    const aiRequests = Math.floor(
      (Math.random() * 200 + 50) * activityMultiplier
    );
    const aiTokens = aiRequests * (Math.floor(Math.random() * 1000) + 500);
    const aiCost = Math.floor(aiTokens * 0.002); // ~$0.002 per 1k tokens

    // Pre-reading guides (most expensive, less frequent)
    const preReadingGuides = Math.floor(
      (Math.random() * 10 + 2) * activityMultiplier
    );
    // Explanations (moderate usage)
    const explanations = Math.floor(
      (Math.random() * 50 + 10) * activityMultiplier
    );
    // AI assessments
    const aiAssessments = Math.floor(
      (Math.random() * 15 + 3) * activityMultiplier
    );
    // AI flashcards
    const aiFlashcards = Math.floor(
      (Math.random() * 40 + 10) * activityMultiplier
    );

    // Performance
    const avgPageLoad = Math.floor(Math.random() * 500) + 300;
    const avgApiResponse = Math.floor(Math.random() * 100) + 50;
    const errors = Math.floor(Math.random() * 10);
    const p99Response = avgApiResponse * 3 + Math.floor(Math.random() * 200);

    analytics.push({
      date,
      totalUsers: baseUsers,
      activeUsers,
      newUsers,
      churned,
      freeUsers: baseFreeUsers,
      proUsers: baseProUsers,
      scholarUsers: baseScholarUsers,
      totalRevenueCents: newSubs + renewals + upgrades - refunds,
      newSubscriptionsCents: newSubs,
      renewalsCents: renewals,
      upgradesCents: upgrades,
      refundsCents: refunds,
      booksAdded,
      booksCompleted,
      totalReadingTimeMin: readingTime,
      assessmentsTaken: assessments,
      flashcardsCreated,
      flashcardsReviewed,
      annotationsCreated: annotations,
      forumPostsCreated: forumPosts,
      forumRepliesCreated: forumReplies,
      groupsCreated: groups,
      curriculumsCreated: curriculums,
      aiRequestsCount: aiRequests,
      aiTokensUsed: aiTokens,
      aiCostCents: aiCost,
      preReadingGuidesGen: preReadingGuides,
      explanationsGen: explanations,
      assessmentsGen: aiAssessments,
      flashcardsGen: aiFlashcards,
      avgPageLoadMs: avgPageLoad,
      avgApiResponseMs: avgApiResponse,
      errorCount: errors,
      p99ResponseMs: p99Response,
    });
  }

  return analytics;
}

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedAchievements() {
  console.log("🏆 Seeding achievements...");

  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        criteria: achievement.criteria,
        xpReward: achievement.xpReward,
        tier: achievement.tier,
        sortOrder: achievement.sortOrder,
        badgeIcon: achievement.badgeIcon,
        badgeColor: achievement.badgeColor,
        isActive: true,
      },
      create: {
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        criteria: achievement.criteria,
        xpReward: achievement.xpReward,
        tier: achievement.tier,
        sortOrder: achievement.sortOrder,
        badgeIcon: achievement.badgeIcon,
        badgeColor: achievement.badgeColor,
        isActive: true,
      },
    });
  }

  console.log(`   ✓ Seeded ${ACHIEVEMENTS.length} achievements`);
}

async function seedForumCategories() {
  console.log("💬 Seeding forum categories...");

  for (const category of FORUM_CATEGORIES) {
    await prisma.forumCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sortOrder,
        minTierToPost: category.minTierToPost,
        isActive: true,
        isLocked: false,
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sortOrder,
        minTierToPost: category.minTierToPost,
        isActive: true,
        isLocked: false,
      },
    });
  }

  console.log(`   ✓ Seeded ${FORUM_CATEGORIES.length} forum categories`);
}

async function seedUsers() {
  console.log("👥 Seeding users...");

  const createdUsers = [];

  for (const userData of SAMPLE_USERS) {
    const user = await prisma.user.upsert({
      where: { clerkId: userData.clerkId },
      update: {
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        bio: userData.bio,
        tier: userData.tier,
        role: userData.role,
        preferredLang: userData.preferredLang,
        timezone: userData.timezone,
        profilePublic: userData.profilePublic,
        showStats: userData.showStats,
        showActivity: userData.showActivity,
        aiEnabled: userData.aiEnabled,
      },
      create: {
        clerkId: userData.clerkId,
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName,
        bio: userData.bio,
        tier: userData.tier,
        role: userData.role,
        preferredLang: userData.preferredLang,
        timezone: userData.timezone,
        profilePublic: userData.profilePublic,
        showStats: userData.showStats,
        showActivity: userData.showActivity,
        aiEnabled: userData.aiEnabled,
      },
    });
    createdUsers.push(user);

    // Create UserStats for each user
    await prisma.userStats.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        totalXP: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        booksCompleted: 0,
        totalReadingTime: 0,
        totalWordsRead: 0,
        totalCardsReviewed: 0,
        totalCardsCreated: 0,
        assessmentsCompleted: 0,
        followersCount: 0,
        followingCount: 0,
      },
    });
  }

  console.log(`   ✓ Seeded ${createdUsers.length} users with stats`);
  return createdUsers;
}

async function seedDailyAnalytics() {
  console.log("📊 Seeding daily analytics...");

  const analyticsData = generateDailyAnalytics();
  let seededCount = 0;

  for (const data of analyticsData) {
    await prisma.dailyAnalytics.upsert({
      where: { date: data.date },
      update: {
        totalUsers: data.totalUsers,
        activeUsers: data.activeUsers,
        newUsers: data.newUsers,
        churned: data.churned,
        freeUsers: data.freeUsers,
        proUsers: data.proUsers,
        scholarUsers: data.scholarUsers,
        totalRevenueCents: data.totalRevenueCents,
        newSubscriptionsCents: data.newSubscriptionsCents,
        renewalsCents: data.renewalsCents,
        upgradesCents: data.upgradesCents,
        refundsCents: data.refundsCents,
        booksAdded: data.booksAdded,
        booksCompleted: data.booksCompleted,
        totalReadingTimeMin: data.totalReadingTimeMin,
        assessmentsTaken: data.assessmentsTaken,
        flashcardsCreated: data.flashcardsCreated,
        flashcardsReviewed: data.flashcardsReviewed,
        annotationsCreated: data.annotationsCreated,
        forumPostsCreated: data.forumPostsCreated,
        forumRepliesCreated: data.forumRepliesCreated,
        groupsCreated: data.groupsCreated,
        curriculumsCreated: data.curriculumsCreated,
        aiRequestsCount: data.aiRequestsCount,
        aiTokensUsed: data.aiTokensUsed,
        aiCostCents: data.aiCostCents,
        preReadingGuidesGen: data.preReadingGuidesGen,
        explanationsGen: data.explanationsGen,
        assessmentsGen: data.assessmentsGen,
        flashcardsGen: data.flashcardsGen,
        avgPageLoadMs: data.avgPageLoadMs,
        avgApiResponseMs: data.avgApiResponseMs,
        errorCount: data.errorCount,
        p99ResponseMs: data.p99ResponseMs,
      },
      create: {
        date: data.date,
        totalUsers: data.totalUsers,
        activeUsers: data.activeUsers,
        newUsers: data.newUsers,
        churned: data.churned,
        freeUsers: data.freeUsers,
        proUsers: data.proUsers,
        scholarUsers: data.scholarUsers,
        totalRevenueCents: data.totalRevenueCents,
        newSubscriptionsCents: data.newSubscriptionsCents,
        renewalsCents: data.renewalsCents,
        upgradesCents: data.upgradesCents,
        refundsCents: data.refundsCents,
        booksAdded: data.booksAdded,
        booksCompleted: data.booksCompleted,
        totalReadingTimeMin: data.totalReadingTimeMin,
        assessmentsTaken: data.assessmentsTaken,
        flashcardsCreated: data.flashcardsCreated,
        flashcardsReviewed: data.flashcardsReviewed,
        annotationsCreated: data.annotationsCreated,
        forumPostsCreated: data.forumPostsCreated,
        forumRepliesCreated: data.forumRepliesCreated,
        groupsCreated: data.groupsCreated,
        curriculumsCreated: data.curriculumsCreated,
        aiRequestsCount: data.aiRequestsCount,
        aiTokensUsed: data.aiTokensUsed,
        aiCostCents: data.aiCostCents,
        preReadingGuidesGen: data.preReadingGuidesGen,
        explanationsGen: data.explanationsGen,
        assessmentsGen: data.assessmentsGen,
        flashcardsGen: data.flashcardsGen,
        avgPageLoadMs: data.avgPageLoadMs,
        avgApiResponseMs: data.avgApiResponseMs,
        errorCount: data.errorCount,
        p99ResponseMs: data.p99ResponseMs,
      },
    });
    seededCount++;
  }

  console.log(`   ✓ Seeded ${seededCount} days of analytics data`);
}

async function seedBooks(users: Array<{ id: string }>) {
  console.log("📚 Seeding books...");

  // Assign books to users in a round-robin fashion
  let bookCount = 0;
  const seededBooks = [];

  for (let i = 0; i < SAMPLE_BOOKS.length; i++) {
    const bookData = SAMPLE_BOOKS[i];
    const user = users[i % users.length];

    // Check if book already exists for this user with this title
    const existingBook = await prisma.book.findFirst({
      where: {
        userId: user.id,
        title: bookData.title,
        deletedAt: null,
      },
    });

    if (!existingBook) {
      const book = await prisma.book.create({
        data: {
          userId: user.id,
          title: bookData.title,
          author: bookData.author,
          description: bookData.description,
          source: bookData.source,
          sourceId: bookData.sourceId,
          filePath: bookData.filePath,
          fileType: bookData.fileType,
          language: bookData.language,
          wordCount: bookData.wordCount,
          estimatedReadTime: bookData.estimatedReadTime,
          genre: bookData.genre,
          tags: bookData.tags,
          status: bookData.status,
        },
      });
      seededBooks.push(book);
      bookCount++;
    } else {
      seededBooks.push(existingBook);
    }
  }

  console.log(`   ✓ Seeded ${bookCount} books`);
  return seededBooks;
}

/**
 * Seed TTS downloads
 */
async function seedTTSDownloads(users: any[], books: any[]) {
  console.log("📥 Seeding TTS downloads...");

  let downloadCount = 0;

  // Create sample downloads for Pro and Scholar users
  const proUsers = users.filter((u) => u.tier === "PRO");
  const scholarUsers = users.filter((u) => u.tier === "SCHOLAR");

  // Pro user downloads (OpenAI TTS)
  if (proUsers.length > 0 && books.length > 0) {
    const proUser = proUsers[0];
    const book1 = books[0];
    const book2 = books[1];

    // Completed download
    await prisma.tTSDownload.upsert({
      where: { id: "tts-download-pro-1" },
      update: {},
      create: {
        id: "tts-download-pro-1",
        userId: proUser.id,
        bookId: book1.id,
        bookTitle: book1.title,
        status: "COMPLETED",
        provider: "OPENAI",
        voice: "alloy",
        format: "MP3",
        totalChunks: 15,
        processedChunks: 15,
        totalCharacters: 45000,
        estimatedCost: 0.45,
        actualCost: 0.43,
        fileKey: `users/${proUser.id}/audio/downloads/tts-download-pro-1.mp3`,
        fileSize: 5242880, // 5MB
        downloadUrl: "https://example.com/download/tts-download-pro-1",
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
      },
    });
    downloadCount++;

    // Processing download
    await prisma.tTSDownload.upsert({
      where: { id: "tts-download-pro-2" },
      update: {},
      create: {
        id: "tts-download-pro-2",
        userId: proUser.id,
        bookId: book2.id,
        bookTitle: book2.title,
        status: "PROCESSING",
        provider: "OPENAI",
        voice: "shimmer",
        format: "MP3",
        totalChunks: 20,
        processedChunks: 12,
        totalCharacters: 60000,
        estimatedCost: 0.6,
        actualCost: 0.36,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    downloadCount++;
  }

  // Scholar user downloads (ElevenLabs TTS)
  if (scholarUsers.length > 0 && books.length > 2) {
    const scholarUser = scholarUsers[0];
    const book3 = books[2];
    const book4 = books[3];

    // Completed download with ElevenLabs
    await prisma.tTSDownload.upsert({
      where: { id: "tts-download-scholar-1" },
      update: {},
      create: {
        id: "tts-download-scholar-1",
        userId: scholarUser.id,
        bookId: book3.id,
        bookTitle: book3.title,
        status: "COMPLETED",
        provider: "ELEVENLABS",
        voice: "rachel",
        format: "MP3",
        totalChunks: 25,
        processedChunks: 25,
        totalCharacters: 75000,
        estimatedCost: 1.5,
        actualCost: 1.48,
        fileKey: `users/${scholarUser.id}/audio/downloads/tts-download-scholar-1.mp3`,
        fileSize: 8388608, // 8MB
        downloadUrl: "https://example.com/download/tts-download-scholar-1",
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      },
    });
    downloadCount++;

    // Failed download
    await prisma.tTSDownload.upsert({
      where: { id: "tts-download-scholar-2" },
      update: {},
      create: {
        id: "tts-download-scholar-2",
        userId: scholarUser.id,
        bookId: book4.id,
        bookTitle: book4.title,
        status: "FAILED",
        provider: "ELEVENLABS",
        voice: "adam",
        format: "MP3",
        totalChunks: 18,
        processedChunks: 10,
        totalCharacters: 54000,
        estimatedCost: 1.08,
        actualCost: 0.6,
        errorMessage:
          "API rate limit exceeded. Please try again in a few minutes.",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    downloadCount++;

    // Pending download
    await prisma.tTSDownload.upsert({
      where: { id: "tts-download-scholar-3" },
      update: {},
      create: {
        id: "tts-download-scholar-3",
        userId: scholarUser.id,
        bookId: book3.id,
        bookTitle: book3.title,
        status: "PENDING",
        provider: "ELEVENLABS",
        voice: "bella",
        format: "OPUS",
        totalChunks: 22,
        processedChunks: 0,
        totalCharacters: 66000,
        estimatedCost: 1.32,
        actualCost: 0,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    downloadCount++;
  }

  console.log(`   ✓ Seeded ${downloadCount} TTS downloads`);
}

async function main() {
  console.log("");
  console.log("🌱 Starting database seed...");
  console.log("");

  try {
    // Seed in order of dependencies
    await seedAchievements();
    await seedForumCategories();
    const users = await seedUsers();
    const books = await seedBooks(users);
    await seedTTSDownloads(users, books);
    await seedDailyAnalytics();
    await seedEmailTemplates();

    console.log("");
    console.log("✅ Database seeded successfully!");
    console.log("");
    console.log("Summary:");
    console.log(`  - ${ACHIEVEMENTS.length} achievements`);
    console.log(`  - ${FORUM_CATEGORIES.length} forum categories`);
    console.log(`  - ${SAMPLE_USERS.length} sample users`);
    console.log(`  - ${SAMPLE_BOOKS.length} sample books`);
    console.log(`  - 5 TTS downloads (various states)`);
    console.log(`  - 30 days of analytics data`);
    console.log(`  - 6 email templates`);
    console.log("");
  } catch (error) {
    console.error("");
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
