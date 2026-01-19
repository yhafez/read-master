import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useMemo } from "react";

import { ROUTES } from "./routes";
import { ProtectedRoute } from "./ProtectedRoute";
import { RootLayout } from "./RootLayout";
import { MainLayout, ReaderLayout } from "@/components/layout";
import {
  HomePage,
  NotFoundPage,
  SignInPage,
  SignUpPage,
  DashboardPage,
  LibraryPage,
  CollectionsPage,
  ShelvesPage,
  ReaderPage,
  FlashcardsPage,
  FlashcardsReviewPage,
  FlashcardsCreatePage,
  AssessmentsPage,
  AssessmentTakePage,
  ProfilePage,
  FeedPage,
  LeaderboardPage,
  GroupsPage,
  GroupDetailPage,
  GroupDiscussionsPage,
  ForumPage,
  ForumCategoryPage,
  ForumPostPage,
  ForumCreatePage,
  CurriculumsPage,
  CurriculumDetailPage,
  CurriculumCreatePage,
  CurriculumBrowsePage,
  SettingsPage,
  SettingsProfilePage,
  SettingsReadingPage,
  SettingsAIPage,
  SettingsNotificationsPage,
  SettingsPrivacyPage,
  SettingsSubscriptionPage,
  UserStatsPage,
} from "@/pages";

/**
 * Creates the application router with all routes configured.
 * Routes are organized by:
 * - Root layout (ClerkProvider wrapper)
 *   - Public routes (no auth required)
 *   - Protected routes with MainLayout (sidebar, header)
 *   - Protected routes with ReaderLayout (minimal UI)
 */
function createAppRouter() {
  return createBrowserRouter([
    {
      // Root layout wraps all routes with ClerkProvider
      element: <RootLayout />,
      children: [
        // Public routes (no layout)
        {
          path: ROUTES.HOME,
          element: <HomePage />,
        },
        {
          path: ROUTES.SIGN_IN,
          element: <SignInPage />,
        },
        {
          path: ROUTES.SIGN_UP,
          element: <SignUpPage />,
        },

        // Reader layout (minimal UI for distraction-free reading)
        {
          element: (
            <ProtectedRoute>
              <ReaderLayout />
            </ProtectedRoute>
          ),
          children: [
            {
              path: ROUTES.READER,
              element: <ReaderPage />,
            },
          ],
        },

        // Main layout (sidebar + header)
        {
          element: (
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          ),
          children: [
            // Dashboard
            {
              path: ROUTES.DASHBOARD,
              element: <DashboardPage />,
            },

            // Library
            {
              path: ROUTES.LIBRARY,
              element: <LibraryPage />,
            },
            {
              path: ROUTES.COLLECTIONS,
              element: <CollectionsPage />,
            },
            {
              path: ROUTES.SHELVES,
              element: <ShelvesPage />,
            },

            // Flashcards
            {
              path: ROUTES.FLASHCARDS,
              element: <FlashcardsPage />,
            },
            {
              path: ROUTES.FLASHCARDS_REVIEW,
              element: <FlashcardsReviewPage />,
            },
            {
              path: ROUTES.FLASHCARDS_CREATE,
              element: <FlashcardsCreatePage />,
            },

            // Assessments
            {
              path: ROUTES.ASSESSMENTS,
              element: <AssessmentsPage />,
            },
            {
              path: ROUTES.ASSESSMENTS_TAKE,
              element: <AssessmentTakePage />,
            },

            // Social - Profile
            {
              path: ROUTES.MY_PROFILE,
              element: <ProfilePage />,
            },
            {
              path: ROUTES.PROFILE,
              element: <ProfilePage />,
            },
            {
              path: ROUTES.FEED,
              element: <FeedPage />,
            },
            {
              path: ROUTES.LEADERBOARD,
              element: <LeaderboardPage />,
            },

            // Groups
            {
              path: ROUTES.GROUPS,
              element: <GroupsPage />,
            },
            {
              path: ROUTES.GROUP_DETAIL,
              element: <GroupDetailPage />,
            },
            {
              path: ROUTES.GROUP_DISCUSSIONS,
              element: <GroupDiscussionsPage />,
            },

            // Forum
            {
              path: ROUTES.FORUM,
              element: <ForumPage />,
            },
            {
              path: ROUTES.FORUM_CREATE,
              element: <ForumCreatePage />,
            },
            {
              path: ROUTES.FORUM_CATEGORY,
              element: <ForumCategoryPage />,
            },
            {
              path: ROUTES.FORUM_POST,
              element: <ForumPostPage />,
            },

            // Curriculums
            {
              path: ROUTES.CURRICULUMS,
              element: <CurriculumsPage />,
            },
            {
              path: ROUTES.CURRICULUM_CREATE,
              element: <CurriculumCreatePage />,
            },
            {
              path: ROUTES.CURRICULUM_BROWSE,
              element: <CurriculumBrowsePage />,
            },
            {
              path: ROUTES.CURRICULUM_DETAIL,
              element: <CurriculumDetailPage />,
            },

            // Settings
            {
              path: ROUTES.SETTINGS,
              element: <SettingsPage />,
            },
            {
              path: ROUTES.SETTINGS_PROFILE,
              element: <SettingsProfilePage />,
            },
            {
              path: ROUTES.SETTINGS_READING,
              element: <SettingsReadingPage />,
            },
            {
              path: ROUTES.SETTINGS_AI,
              element: <SettingsAIPage />,
            },
            {
              path: ROUTES.SETTINGS_NOTIFICATIONS,
              element: <SettingsNotificationsPage />,
            },
            {
              path: ROUTES.SETTINGS_PRIVACY,
              element: <SettingsPrivacyPage />,
            },
            {
              path: ROUTES.SETTINGS_SUBSCRIPTION,
              element: <SettingsSubscriptionPage />,
            },

            // Stats
            {
              path: ROUTES.STATS,
              element: <UserStatsPage />,
            },
          ],
        },

        // 404 - catch all unmatched routes
        {
          path: ROUTES.NOT_FOUND,
          element: <NotFoundPage />,
        },
      ],
    },
  ]);
}

/**
 * AppRouter component that provides the router to the application.
 * Uses useMemo to prevent unnecessary re-creation of the router.
 */
export function AppRouter(): React.ReactElement {
  const router = useMemo(() => createAppRouter(), []);

  return <RouterProvider router={router} />;
}

export default AppRouter;
