import { describe, it, expect, vi } from "vitest";

import {
  createQueryClient,
  queryKeys,
  DEFAULT_STALE_TIME,
  DEFAULT_GC_TIME,
  DEFAULT_RETRY_COUNT,
  setGlobalErrorHandler,
} from "./queryClient";

describe("queryClient", () => {
  describe("constants", () => {
    it("should have correct default stale time (5 minutes)", () => {
      expect(DEFAULT_STALE_TIME).toBe(1000 * 60 * 5);
    });

    it("should have correct default GC time (30 minutes)", () => {
      expect(DEFAULT_GC_TIME).toBe(1000 * 60 * 30);
    });

    it("should have correct default retry count", () => {
      expect(DEFAULT_RETRY_COUNT).toBe(1);
    });
  });

  describe("createQueryClient", () => {
    it("should create a QueryClient instance", () => {
      const client = createQueryClient();
      expect(client).toBeDefined();
      expect(typeof client.getQueryData).toBe("function");
      expect(typeof client.setQueryData).toBe("function");
    });

    it("should have default query options", () => {
      const client = createQueryClient();
      const defaults = client.getDefaultOptions();

      expect(defaults.queries?.staleTime).toBe(DEFAULT_STALE_TIME);
      expect(defaults.queries?.gcTime).toBe(DEFAULT_GC_TIME);
      expect(defaults.queries?.retry).toBe(DEFAULT_RETRY_COUNT);
    });

    it("should have refetchOnWindowFocus disabled by default", () => {
      const client = createQueryClient();
      const defaults = client.getDefaultOptions();

      expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    });

    it("should have mutation retry set to 0", () => {
      const client = createQueryClient();
      const defaults = client.getDefaultOptions();

      expect(defaults.mutations?.retry).toBe(0);
    });

    it("should allow custom configuration overrides", () => {
      const client = createQueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000,
            retry: 3,
          },
        },
      });
      const defaults = client.getDefaultOptions();

      expect(defaults.queries?.staleTime).toBe(1000);
      expect(defaults.queries?.retry).toBe(3);
    });
  });

  describe("setGlobalErrorHandler", () => {
    it("should allow setting a custom error handler", () => {
      const mockHandler = vi.fn();
      setGlobalErrorHandler(mockHandler);

      // Handler is set but we can't easily test it without triggering an error
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});

describe("queryKeys", () => {
  describe("books", () => {
    it("should have correct base key", () => {
      expect(queryKeys.books.all).toEqual(["books"]);
    });

    it("should generate lists key", () => {
      expect(queryKeys.books.lists()).toEqual(["books", "list"]);
    });

    it("should generate list key with filters", () => {
      const filters = { status: "reading", page: 1 };
      expect(queryKeys.books.list(filters)).toEqual(["books", "list", filters]);
    });

    it("should generate list key without filters", () => {
      expect(queryKeys.books.list()).toEqual(["books", "list", undefined]);
    });

    it("should generate details base key", () => {
      expect(queryKeys.books.details()).toEqual(["books", "detail"]);
    });

    it("should generate detail key for specific book", () => {
      expect(queryKeys.books.detail("book-123")).toEqual([
        "books",
        "detail",
        "book-123",
      ]);
    });

    it("should generate content key for specific book", () => {
      expect(queryKeys.books.content("book-123")).toEqual([
        "books",
        "detail",
        "book-123",
        "content",
      ]);
    });

    it("should generate search key with query", () => {
      expect(queryKeys.books.search("Harry Potter")).toEqual([
        "books",
        "search",
        "Harry Potter",
      ]);
    });
  });

  describe("readingProgress", () => {
    it("should have correct base key", () => {
      expect(queryKeys.readingProgress.all).toEqual(["readingProgress"]);
    });

    it("should generate byBook key", () => {
      expect(queryKeys.readingProgress.byBook("book-123")).toEqual([
        "readingProgress",
        "book-123",
      ]);
    });
  });

  describe("annotations", () => {
    it("should have correct base key", () => {
      expect(queryKeys.annotations.all).toEqual(["annotations"]);
    });

    it("should generate byBook key", () => {
      expect(queryKeys.annotations.byBook("book-123")).toEqual([
        "annotations",
        "book",
        "book-123",
      ]);
    });
  });

  describe("flashcards", () => {
    it("should have correct base key", () => {
      expect(queryKeys.flashcards.all).toEqual(["flashcards"]);
    });

    it("should generate lists key", () => {
      expect(queryKeys.flashcards.lists()).toEqual(["flashcards", "list"]);
    });

    it("should generate list key with filters", () => {
      const filters = { status: "due" };
      expect(queryKeys.flashcards.list(filters)).toEqual([
        "flashcards",
        "list",
        filters,
      ]);
    });

    it("should generate due key", () => {
      expect(queryKeys.flashcards.due()).toEqual(["flashcards", "due"]);
    });

    it("should generate stats key", () => {
      expect(queryKeys.flashcards.stats()).toEqual(["flashcards", "stats"]);
    });
  });

  describe("user", () => {
    it("should have correct base key", () => {
      expect(queryKeys.user.all).toEqual(["user"]);
    });

    it("should generate profile key", () => {
      expect(queryKeys.user.profile()).toEqual(["user", "profile"]);
    });

    it("should generate stats key", () => {
      expect(queryKeys.user.stats()).toEqual(["user", "stats"]);
    });

    it("should generate settings key", () => {
      expect(queryKeys.user.settings()).toEqual(["user", "settings"]);
    });

    it("should generate achievements key", () => {
      expect(queryKeys.user.achievements()).toEqual(["user", "achievements"]);
    });
  });

  describe("ai", () => {
    it("should have correct base key", () => {
      expect(queryKeys.ai.all).toEqual(["ai"]);
    });

    it("should generate preReadingGuide key", () => {
      expect(queryKeys.ai.preReadingGuide("book-123")).toEqual([
        "ai",
        "preReadingGuide",
        "book-123",
      ]);
    });

    it("should generate usage key", () => {
      expect(queryKeys.ai.usage()).toEqual(["ai", "usage"]);
    });
  });

  describe("leaderboard", () => {
    it("should have correct base key", () => {
      expect(queryKeys.leaderboard.all).toEqual(["leaderboard"]);
    });

    it("should generate global key with timeframe", () => {
      expect(queryKeys.leaderboard.global("weekly")).toEqual([
        "leaderboard",
        "global",
        "weekly",
      ]);
    });

    it("should generate global key without timeframe", () => {
      expect(queryKeys.leaderboard.global()).toEqual([
        "leaderboard",
        "global",
        undefined,
      ]);
    });

    it("should generate friends key with timeframe", () => {
      expect(queryKeys.leaderboard.friends("monthly")).toEqual([
        "leaderboard",
        "friends",
        "monthly",
      ]);
    });
  });

  describe("social", () => {
    it("should have correct base key", () => {
      expect(queryKeys.social.all).toEqual(["social"]);
    });

    it("should generate feed key", () => {
      expect(queryKeys.social.feed()).toEqual(["social", "feed"]);
    });

    it("should generate followers key", () => {
      expect(queryKeys.social.followers("user-123")).toEqual([
        "social",
        "followers",
        "user-123",
      ]);
    });

    it("should generate following key", () => {
      expect(queryKeys.social.following("user-123")).toEqual([
        "social",
        "following",
        "user-123",
      ]);
    });
  });

  describe("groups", () => {
    it("should have correct base key", () => {
      expect(queryKeys.groups.all).toEqual(["groups"]);
    });

    it("should generate lists key", () => {
      expect(queryKeys.groups.lists()).toEqual(["groups", "list"]);
    });

    it("should generate list key with filters", () => {
      const filters = { isPublic: true };
      expect(queryKeys.groups.list(filters)).toEqual([
        "groups",
        "list",
        filters,
      ]);
    });

    it("should generate detail key", () => {
      expect(queryKeys.groups.detail("group-123")).toEqual([
        "groups",
        "detail",
        "group-123",
      ]);
    });

    it("should generate discussions key", () => {
      expect(queryKeys.groups.discussions("group-123")).toEqual([
        "groups",
        "detail",
        "group-123",
        "discussions",
      ]);
    });
  });

  describe("curriculums", () => {
    it("should have correct base key", () => {
      expect(queryKeys.curriculums.all).toEqual(["curriculums"]);
    });

    it("should generate lists key", () => {
      expect(queryKeys.curriculums.lists()).toEqual(["curriculums", "list"]);
    });

    it("should generate list key with filters", () => {
      const filters = { category: "fiction" };
      expect(queryKeys.curriculums.list(filters)).toEqual([
        "curriculums",
        "list",
        filters,
      ]);
    });

    it("should generate detail key", () => {
      expect(queryKeys.curriculums.detail("curriculum-123")).toEqual([
        "curriculums",
        "detail",
        "curriculum-123",
      ]);
    });

    it("should generate browse key with filters", () => {
      const filters = { difficulty: "beginner" };
      expect(queryKeys.curriculums.browse(filters)).toEqual([
        "curriculums",
        "browse",
        filters,
      ]);
    });
  });

  describe("forum", () => {
    it("should have correct base key", () => {
      expect(queryKeys.forum.all).toEqual(["forum"]);
    });

    it("should generate categories key", () => {
      expect(queryKeys.forum.categories()).toEqual(["forum", "categories"]);
    });

    it("should generate posts key with filters", () => {
      const filters = { category: "general" };
      expect(queryKeys.forum.posts(filters)).toEqual([
        "forum",
        "posts",
        filters,
      ]);
    });

    it("should generate post key", () => {
      expect(queryKeys.forum.post("post-123")).toEqual([
        "forum",
        "post",
        "post-123",
      ]);
    });
  });

  describe("assessments", () => {
    it("should have correct base key", () => {
      expect(queryKeys.assessments.all).toEqual(["assessments"]);
    });

    it("should generate lists key", () => {
      expect(queryKeys.assessments.lists()).toEqual(["assessments", "list"]);
    });

    it("should generate list key with filters", () => {
      const filters = { status: "completed" };
      expect(queryKeys.assessments.list(filters)).toEqual([
        "assessments",
        "list",
        filters,
      ]);
    });

    it("should generate detail key", () => {
      expect(queryKeys.assessments.detail("assessment-123")).toEqual([
        "assessments",
        "detail",
        "assessment-123",
      ]);
    });

    it("should generate byBook key", () => {
      expect(queryKeys.assessments.byBook("book-123")).toEqual([
        "assessments",
        "book",
        "book-123",
      ]);
    });
  });

  describe("tts", () => {
    it("should have correct base key", () => {
      expect(queryKeys.tts.all).toEqual(["tts"]);
    });

    it("should generate voices key", () => {
      expect(queryKeys.tts.voices()).toEqual(["tts", "voices"]);
    });

    it("should generate downloads key", () => {
      expect(queryKeys.tts.downloads()).toEqual(["tts", "downloads"]);
    });
  });

  describe("queryKeys structure", () => {
    it("should have all expected top-level keys", () => {
      const expectedKeys = [
        "books",
        "readingProgress",
        "annotations",
        "flashcards",
        "user",
        "ai",
        "leaderboard",
        "social",
        "groups",
        "curriculums",
        "forum",
        "assessments",
        "tts",
      ];

      expect(Object.keys(queryKeys)).toEqual(expectedKeys);
    });

    it("should have all key generators be functions or arrays", () => {
      // Recursive check that all values are arrays or objects with functions/arrays
      function checkKeys(obj: Record<string, unknown>, path = ""): void {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (typeof value === "function") {
            // Functions are allowed
            continue;
          } else if (Array.isArray(value)) {
            // Arrays are allowed (base keys)
            continue;
          } else if (typeof value === "object" && value !== null) {
            // Nested objects are allowed
            checkKeys(value as Record<string, unknown>, currentPath);
          } else {
            throw new Error(`Unexpected value type at ${currentPath}`);
          }
        }
      }

      expect(() =>
        checkKeys(queryKeys as unknown as Record<string, unknown>)
      ).not.toThrow();
    });
  });
});
