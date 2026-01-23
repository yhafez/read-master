/**
 * Route constants for the application.
 * These define all available routes and helper functions for generating paths.
 */

// Base routes
export const ROUTES = {
  // Public routes
  HOME: "/",
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",

  // Main app routes (protected)
  LIBRARY: "/library",
  COLLECTIONS: "/library/collections",
  SHELVES: "/library/shelves",
  READER: "/reader/:bookId",
  DASHBOARD: "/dashboard",
  FLASHCARDS: "/flashcards",
  FLASHCARDS_REVIEW: "/flashcards/review",
  FLASHCARDS_CREATE: "/flashcards/create",
  ASSESSMENTS: "/assessments",
  ASSESSMENTS_TAKE: "/assessments/:assessmentId",

  // Social routes
  PROFILE: "/profile/:username",
  MY_PROFILE: "/profile",
  FEED: "/feed",
  LEADERBOARD: "/leaderboard",

  // Groups
  GROUPS: "/groups",
  GROUP_DETAIL: "/groups/:groupId",
  GROUP_DISCUSSIONS: "/groups/:groupId/discussions",

  // Forum
  FORUM: "/forum",
  FORUM_CATEGORY: "/forum/:categorySlug",
  FORUM_POST: "/forum/post/:postId",
  FORUM_CREATE: "/forum/create",
  FORUM_EDIT: "/forum/edit/:postId",

  // Curriculums
  CURRICULUMS: "/curriculums",
  CURRICULUM_DETAIL: "/curriculums/:curriculumId",
  CURRICULUM_CREATE: "/curriculums/create",
  CURRICULUM_BROWSE: "/curriculums/browse",

  // Challenges
  CHALLENGES: "/challenges",
  CHALLENGE_DETAIL: "/challenges/:challengeId",

  // Podcasts
  PODCASTS: "/podcasts",
  PODCAST_DETAIL: "/podcasts/:id",

  // Settings
  SETTINGS: "/settings",
  SETTINGS_PROFILE: "/settings/profile",
  SETTINGS_READING: "/settings/reading",
  SETTINGS_READER: "/settings/reader",
  SETTINGS_AI: "/settings/ai",
  SETTINGS_TTS: "/settings/tts",
  SETTINGS_SRS: "/settings/srs",
  SETTINGS_ACCESSIBILITY: "/settings/accessibility",
  SETTINGS_NOTIFICATIONS: "/settings/notifications",
  SETTINGS_PRIVACY: "/settings/privacy",
  SETTINGS_SUBSCRIPTION: "/settings/subscription",

  // TTS
  TTS_DOWNLOADS: "/tts/downloads",

  // Stats
  STATS: "/stats",
  ACHIEVEMENTS: "/achievements",
  LEADERBOARDS: "/leaderboards",
  ANALYTICS: "/analytics",

  // Admin
  ADMIN: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",

  // Accessibility
  ACCESSIBILITY_STATEMENT: "/accessibility-statement",
  KEYBOARD_SHORTCUTS: "/keyboard-shortcuts",

  // Documentation (public)
  DOCS: "/docs",
  DOCS_GETTING_STARTED: "/docs/getting-started",
  DOCS_SHORTCUTS: "/docs/shortcuts",
  DOCS_FAQ: "/docs/faq",
  DOCS_TROUBLESHOOTING: "/docs/troubleshooting",
  DOCS_GLOSSARY: "/docs/glossary",
  DOCS_API: "/docs/api",

  // 404
  NOT_FOUND: "*",
} as const;

// Type for route keys
export type RouteKey = keyof typeof ROUTES;

// Type for route values
export type RoutePath = (typeof ROUTES)[RouteKey];

/**
 * Helper functions to generate dynamic route paths
 */
export const routeHelpers = {
  reader: (bookId: string): string => `/reader/${bookId}`,
  profile: (username: string): string => `/profile/${username}`,
  assessment: (assessmentId: string): string => `/assessments/${assessmentId}`,
  group: (groupId: string): string => `/groups/${groupId}`,
  groupDiscussions: (groupId: string): string =>
    `/groups/${groupId}/discussions`,
  forumCategory: (categorySlug: string): string => `/forum/${categorySlug}`,
  forumPost: (postId: string): string => `/forum/post/${postId}`,
  forumEdit: (postId: string): string => `/forum/edit/${postId}`,
  curriculum: (curriculumId: string): string => `/curriculums/${curriculumId}`,
  challenge: (challengeId: string): string => `/challenges/${challengeId}`,
  podcast: (podcastId: string): string => `/podcasts/${podcastId}`,
} as const;

/**
 * Routes that require authentication
 */
export const PROTECTED_ROUTES: readonly RoutePath[] = [
  ROUTES.LIBRARY,
  ROUTES.COLLECTIONS,
  ROUTES.SHELVES,
  ROUTES.READER,
  ROUTES.DASHBOARD,
  ROUTES.FLASHCARDS,
  ROUTES.FLASHCARDS_REVIEW,
  ROUTES.FLASHCARDS_CREATE,
  ROUTES.ASSESSMENTS,
  ROUTES.ASSESSMENTS_TAKE,
  ROUTES.MY_PROFILE,
  ROUTES.FEED,
  ROUTES.GROUPS,
  ROUTES.GROUP_DETAIL,
  ROUTES.GROUP_DISCUSSIONS,
  ROUTES.FORUM_CREATE,
  ROUTES.FORUM_EDIT,
  ROUTES.CURRICULUMS,
  ROUTES.CURRICULUM_DETAIL,
  ROUTES.CURRICULUM_CREATE,
  ROUTES.CHALLENGES,
  ROUTES.CHALLENGE_DETAIL,
  ROUTES.PODCASTS,
  ROUTES.PODCAST_DETAIL,
  ROUTES.SETTINGS,
  ROUTES.SETTINGS_PROFILE,
  ROUTES.SETTINGS_READING,
  ROUTES.SETTINGS_AI,
  ROUTES.SETTINGS_TTS,
  ROUTES.SETTINGS_ACCESSIBILITY,
  ROUTES.SETTINGS_NOTIFICATIONS,
  ROUTES.SETTINGS_PRIVACY,
  ROUTES.SETTINGS_SUBSCRIPTION,
  ROUTES.TTS_DOWNLOADS,
  ROUTES.STATS,
  ROUTES.ACHIEVEMENTS,
  ROUTES.LEADERBOARDS,
  ROUTES.ANALYTICS,
] as const;

/**
 * Routes that are public (no auth required)
 */
export const PUBLIC_ROUTES: readonly RoutePath[] = [
  ROUTES.HOME,
  ROUTES.SIGN_IN,
  ROUTES.SIGN_UP,
  ROUTES.LEADERBOARD,
  ROUTES.PROFILE,
  ROUTES.FORUM,
  ROUTES.FORUM_CATEGORY,
  ROUTES.FORUM_POST,
  ROUTES.CURRICULUM_BROWSE,
  ROUTES.ACCESSIBILITY_STATEMENT,
  ROUTES.KEYBOARD_SHORTCUTS,
  ROUTES.DOCS,
  ROUTES.DOCS_GETTING_STARTED,
  ROUTES.DOCS_SHORTCUTS,
  ROUTES.DOCS_FAQ,
  ROUTES.DOCS_TROUBLESHOOTING,
  ROUTES.DOCS_GLOSSARY,
  ROUTES.DOCS_API,
] as const;

/**
 * Check if a route requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  // Check exact matches first
  if (PROTECTED_ROUTES.includes(path as RoutePath)) {
    return true;
  }

  // Check pattern matches for dynamic routes
  const protectedPatterns = [
    /^\/reader\/.+$/,
    /^\/assessments\/.+$/,
    /^\/groups\/.+$/,
    /^\/curriculums\/(?!browse).+$/,
    /^\/settings(?:\/.*)?$/,
    /^\/flashcards(?:\/.*)?$/,
  ];

  return protectedPatterns.some((pattern) => pattern.test(path));
}
