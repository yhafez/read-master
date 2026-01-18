import { describe, it, expect } from "vitest";
import {
  ROUTES,
  routeHelpers,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  isProtectedRoute,
} from "./routes";

describe("routes", () => {
  describe("ROUTES constants", () => {
    it("should define home route", () => {
      expect(ROUTES.HOME).toBe("/");
    });

    it("should define auth routes", () => {
      expect(ROUTES.SIGN_IN).toBe("/sign-in");
      expect(ROUTES.SIGN_UP).toBe("/sign-up");
    });

    it("should define main app routes", () => {
      expect(ROUTES.LIBRARY).toBe("/library");
      expect(ROUTES.DASHBOARD).toBe("/dashboard");
      expect(ROUTES.READER).toBe("/reader/:bookId");
    });

    it("should define flashcard routes", () => {
      expect(ROUTES.FLASHCARDS).toBe("/flashcards");
      expect(ROUTES.FLASHCARDS_REVIEW).toBe("/flashcards/review");
      expect(ROUTES.FLASHCARDS_CREATE).toBe("/flashcards/create");
    });

    it("should define assessment routes", () => {
      expect(ROUTES.ASSESSMENTS).toBe("/assessments");
      expect(ROUTES.ASSESSMENTS_TAKE).toBe("/assessments/:assessmentId");
    });

    it("should define social routes", () => {
      expect(ROUTES.PROFILE).toBe("/profile/:username");
      expect(ROUTES.MY_PROFILE).toBe("/profile");
      expect(ROUTES.FEED).toBe("/feed");
      expect(ROUTES.LEADERBOARD).toBe("/leaderboard");
    });

    it("should define group routes", () => {
      expect(ROUTES.GROUPS).toBe("/groups");
      expect(ROUTES.GROUP_DETAIL).toBe("/groups/:groupId");
      expect(ROUTES.GROUP_DISCUSSIONS).toBe("/groups/:groupId/discussions");
    });

    it("should define forum routes", () => {
      expect(ROUTES.FORUM).toBe("/forum");
      expect(ROUTES.FORUM_CATEGORY).toBe("/forum/:categorySlug");
      expect(ROUTES.FORUM_POST).toBe("/forum/post/:postId");
      expect(ROUTES.FORUM_CREATE).toBe("/forum/create");
    });

    it("should define curriculum routes", () => {
      expect(ROUTES.CURRICULUMS).toBe("/curriculums");
      expect(ROUTES.CURRICULUM_DETAIL).toBe("/curriculums/:curriculumId");
      expect(ROUTES.CURRICULUM_CREATE).toBe("/curriculums/create");
      expect(ROUTES.CURRICULUM_BROWSE).toBe("/curriculums/browse");
    });

    it("should define settings routes", () => {
      expect(ROUTES.SETTINGS).toBe("/settings");
      expect(ROUTES.SETTINGS_PROFILE).toBe("/settings/profile");
      expect(ROUTES.SETTINGS_READING).toBe("/settings/reading");
      expect(ROUTES.SETTINGS_AI).toBe("/settings/ai");
      expect(ROUTES.SETTINGS_NOTIFICATIONS).toBe("/settings/notifications");
      expect(ROUTES.SETTINGS_PRIVACY).toBe("/settings/privacy");
      expect(ROUTES.SETTINGS_SUBSCRIPTION).toBe("/settings/subscription");
    });

    it("should define 404 route", () => {
      expect(ROUTES.NOT_FOUND).toBe("*");
    });
  });

  describe("routeHelpers", () => {
    it("should generate reader route with bookId", () => {
      expect(routeHelpers.reader("abc123")).toBe("/reader/abc123");
      expect(routeHelpers.reader("book-with-dashes")).toBe(
        "/reader/book-with-dashes"
      );
    });

    it("should generate profile route with username", () => {
      expect(routeHelpers.profile("johndoe")).toBe("/profile/johndoe");
      expect(routeHelpers.profile("user123")).toBe("/profile/user123");
    });

    it("should generate assessment route with assessmentId", () => {
      expect(routeHelpers.assessment("assessment123")).toBe(
        "/assessments/assessment123"
      );
    });

    it("should generate group route with groupId", () => {
      expect(routeHelpers.group("group456")).toBe("/groups/group456");
    });

    it("should generate groupDiscussions route with groupId", () => {
      expect(routeHelpers.groupDiscussions("group789")).toBe(
        "/groups/group789/discussions"
      );
    });

    it("should generate forumCategory route with categorySlug", () => {
      expect(routeHelpers.forumCategory("general")).toBe("/forum/general");
      expect(routeHelpers.forumCategory("book-reviews")).toBe(
        "/forum/book-reviews"
      );
    });

    it("should generate forumPost route with postId", () => {
      expect(routeHelpers.forumPost("post123")).toBe("/forum/post/post123");
    });

    it("should generate curriculum route with curriculumId", () => {
      expect(routeHelpers.curriculum("curriculum999")).toBe(
        "/curriculums/curriculum999"
      );
    });
  });

  describe("PROTECTED_ROUTES", () => {
    it("should include library route", () => {
      expect(PROTECTED_ROUTES).toContain(ROUTES.LIBRARY);
    });

    it("should include reader route", () => {
      expect(PROTECTED_ROUTES).toContain(ROUTES.READER);
    });

    it("should include dashboard route", () => {
      expect(PROTECTED_ROUTES).toContain(ROUTES.DASHBOARD);
    });

    it("should include flashcard routes", () => {
      expect(PROTECTED_ROUTES).toContain(ROUTES.FLASHCARDS);
      expect(PROTECTED_ROUTES).toContain(ROUTES.FLASHCARDS_REVIEW);
      expect(PROTECTED_ROUTES).toContain(ROUTES.FLASHCARDS_CREATE);
    });

    it("should include assessment routes", () => {
      expect(PROTECTED_ROUTES).toContain(ROUTES.ASSESSMENTS);
      expect(PROTECTED_ROUTES).toContain(ROUTES.ASSESSMENTS_TAKE);
    });

    it("should include settings routes", () => {
      expect(PROTECTED_ROUTES).toContain(ROUTES.SETTINGS);
      expect(PROTECTED_ROUTES).toContain(ROUTES.SETTINGS_PROFILE);
      expect(PROTECTED_ROUTES).toContain(ROUTES.SETTINGS_READING);
      expect(PROTECTED_ROUTES).toContain(ROUTES.SETTINGS_AI);
      expect(PROTECTED_ROUTES).toContain(ROUTES.SETTINGS_NOTIFICATIONS);
      expect(PROTECTED_ROUTES).toContain(ROUTES.SETTINGS_PRIVACY);
      expect(PROTECTED_ROUTES).toContain(ROUTES.SETTINGS_SUBSCRIPTION);
    });

    it("should include group routes", () => {
      expect(PROTECTED_ROUTES).toContain(ROUTES.GROUPS);
      expect(PROTECTED_ROUTES).toContain(ROUTES.GROUP_DETAIL);
      expect(PROTECTED_ROUTES).toContain(ROUTES.GROUP_DISCUSSIONS);
    });

    it("should include curriculum routes (except browse)", () => {
      expect(PROTECTED_ROUTES).toContain(ROUTES.CURRICULUMS);
      expect(PROTECTED_ROUTES).toContain(ROUTES.CURRICULUM_DETAIL);
      expect(PROTECTED_ROUTES).toContain(ROUTES.CURRICULUM_CREATE);
    });

    it("should NOT include public forum routes", () => {
      expect(PROTECTED_ROUTES).not.toContain(ROUTES.FORUM);
      expect(PROTECTED_ROUTES).not.toContain(ROUTES.FORUM_CATEGORY);
      expect(PROTECTED_ROUTES).not.toContain(ROUTES.FORUM_POST);
    });
  });

  describe("PUBLIC_ROUTES", () => {
    it("should include home route", () => {
      expect(PUBLIC_ROUTES).toContain(ROUTES.HOME);
    });

    it("should include auth routes", () => {
      expect(PUBLIC_ROUTES).toContain(ROUTES.SIGN_IN);
      expect(PUBLIC_ROUTES).toContain(ROUTES.SIGN_UP);
    });

    it("should include leaderboard route", () => {
      expect(PUBLIC_ROUTES).toContain(ROUTES.LEADERBOARD);
    });

    it("should include public forum routes", () => {
      expect(PUBLIC_ROUTES).toContain(ROUTES.FORUM);
      expect(PUBLIC_ROUTES).toContain(ROUTES.FORUM_CATEGORY);
      expect(PUBLIC_ROUTES).toContain(ROUTES.FORUM_POST);
    });

    it("should include public profile route", () => {
      expect(PUBLIC_ROUTES).toContain(ROUTES.PROFILE);
    });

    it("should include curriculum browse route", () => {
      expect(PUBLIC_ROUTES).toContain(ROUTES.CURRICULUM_BROWSE);
    });

    it("should NOT include library route", () => {
      expect(PUBLIC_ROUTES).not.toContain(ROUTES.LIBRARY);
    });

    it("should NOT include settings routes", () => {
      expect(PUBLIC_ROUTES).not.toContain(ROUTES.SETTINGS);
    });
  });

  describe("isProtectedRoute", () => {
    describe("exact matches", () => {
      it("should return true for protected routes", () => {
        expect(isProtectedRoute("/library")).toBe(true);
        expect(isProtectedRoute("/dashboard")).toBe(true);
        expect(isProtectedRoute("/flashcards")).toBe(true);
        expect(isProtectedRoute("/assessments")).toBe(true);
        expect(isProtectedRoute("/groups")).toBe(true);
      });

      it("should return false for public routes", () => {
        expect(isProtectedRoute("/")).toBe(false);
        expect(isProtectedRoute("/sign-in")).toBe(false);
        expect(isProtectedRoute("/sign-up")).toBe(false);
        expect(isProtectedRoute("/forum")).toBe(false);
        expect(isProtectedRoute("/leaderboard")).toBe(false);
      });
    });

    describe("pattern matches for dynamic routes", () => {
      it("should return true for reader routes", () => {
        expect(isProtectedRoute("/reader/abc123")).toBe(true);
        expect(isProtectedRoute("/reader/book-id")).toBe(true);
      });

      it("should return true for assessment routes", () => {
        expect(isProtectedRoute("/assessments/some-id")).toBe(true);
      });

      it("should return true for group routes", () => {
        expect(isProtectedRoute("/groups/group-123")).toBe(true);
        expect(isProtectedRoute("/groups/abc/discussions")).toBe(true);
      });

      it("should return true for settings sub-routes", () => {
        expect(isProtectedRoute("/settings/profile")).toBe(true);
        expect(isProtectedRoute("/settings/reading")).toBe(true);
        expect(isProtectedRoute("/settings/ai")).toBe(true);
        expect(isProtectedRoute("/settings/custom")).toBe(true);
      });

      it("should return true for flashcard sub-routes", () => {
        expect(isProtectedRoute("/flashcards/review")).toBe(true);
        expect(isProtectedRoute("/flashcards/create")).toBe(true);
      });

      it("should return true for curriculum routes except browse", () => {
        expect(isProtectedRoute("/curriculums/some-id")).toBe(true);
        expect(isProtectedRoute("/curriculums/create")).toBe(true);
      });

      it("should return false for curriculum browse route", () => {
        expect(isProtectedRoute("/curriculums/browse")).toBe(false);
      });
    });
  });
});
