/**
 * Tests for Database Service
 *
 * Tests the database service singleton, connection management,
 * query helpers, soft delete helpers, and transaction helpers.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// ============================================================================
// MOCK SETUP - Using vi.hoisted for proper hoisting
// ============================================================================

// Use vi.hoisted to create variables that can be used in vi.mock factories
const {
  mockUserFindUnique,
  mockUserUpdate,
  mockBookFindUnique,
  mockBookUpdate,
  mockReadingProgressFindUnique,
  mockReadingProgressUpsert,
  mockTransaction,
  mockDbConnect,
  mockDbDisconnect,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockBookFindUnique: vi.fn(),
  mockBookUpdate: vi.fn(),
  mockReadingProgressFindUnique: vi.fn(),
  mockReadingProgressUpsert: vi.fn(),
  mockTransaction: vi.fn(),
  mockDbConnect: vi.fn(),
  mockDbDisconnect: vi.fn(),
}));

// Mock the @read-master/database module
vi.mock("@read-master/database", () => {
  const mockPrisma = {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
      findMany: vi.fn(),
    },
    book: {
      findUnique: mockBookFindUnique,
      update: mockBookUpdate,
    },
    readingProgress: {
      findUnique: mockReadingProgressFindUnique,
      upsert: mockReadingProgressUpsert,
    },
    $transaction: mockTransaction,
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  return {
    prisma: mockPrisma,
    connect: mockDbConnect,
    disconnect: mockDbDisconnect,
    PrismaClient: vi.fn(),
  };
});

// Import after mock setup
import {
  db,
  getDb,
  ensureConnection,
  gracefulShutdown,
  isDbConnected,
  getUserByClerkId,
  getUserById,
  getBookById,
  getBookWithChapters,
  getReadingProgress,
  upsertReadingProgress,
  withSoftDeleteFilter,
  softDeleteUser,
  softDeleteBook,
  withTransaction,
  batchTransaction,
  dbUtils,
  connect,
  disconnect,
  type GetUserOptions,
  type GetBookOptions,
  type TransactionClient,
  type SoftDeletableModel,
} from "./db.js";

// ============================================================================
// TEST SUITES
// ============================================================================

describe("Database Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // SINGLETON CLIENT TESTS
  // ========================================================================

  describe("Singleton Client", () => {
    it("should export db as the Prisma client", () => {
      expect(db).toBeDefined();
      expect(db.user).toBeDefined();
      expect(db.book).toBeDefined();
    });

    it("should return Prisma client from getDb()", () => {
      const client = getDb();
      expect(client).toBe(db);
    });
  });

  // ========================================================================
  // CONNECTION MANAGEMENT TESTS
  // ========================================================================

  describe("Connection Management", () => {
    describe("ensureConnection", () => {
      it("should call connect() when not connected", async () => {
        mockDbConnect.mockResolvedValueOnce(undefined);

        await ensureConnection();

        expect(mockDbConnect).toHaveBeenCalledTimes(1);
      });

      it("should not call connect() multiple times if already connected", async () => {
        // First call connects
        mockDbConnect.mockResolvedValueOnce(undefined);
        await ensureConnection();

        // Clear mock to check subsequent calls
        mockDbConnect.mockClear();

        // Second call should not trigger connect since already connected
        await ensureConnection();
        await ensureConnection();

        // Should not have been called again
        expect(mockDbConnect).toHaveBeenCalledTimes(0);
      });
    });

    describe("gracefulShutdown", () => {
      it("should call disconnect() when connected", async () => {
        mockDbDisconnect.mockResolvedValueOnce(undefined);

        await gracefulShutdown();

        expect(mockDbDisconnect).toHaveBeenCalledTimes(1);
      });

      it("should handle disconnect errors gracefully", async () => {
        // First reconnect
        mockDbConnect.mockResolvedValueOnce(undefined);
        await ensureConnection();

        mockDbDisconnect.mockRejectedValueOnce(new Error("Disconnect failed"));

        // Should not throw
        await expect(gracefulShutdown()).resolves.not.toThrow();
      });
    });

    describe("isDbConnected", () => {
      it("should return boolean", () => {
        const result = isDbConnected();
        expect(typeof result).toBe("boolean");
      });
    });

    describe("re-exported connect/disconnect", () => {
      it("should export connect function", () => {
        expect(connect).toBe(mockDbConnect);
      });

      it("should export disconnect function", () => {
        expect(disconnect).toBe(mockDbDisconnect);
      });
    });
  });

  // ========================================================================
  // QUERY HELPER TESTS
  // ========================================================================

  describe("Query Helpers", () => {
    describe("getUserByClerkId", () => {
      const mockUser = {
        id: "user_123",
        clerkId: "clerk_abc",
        email: "test@example.com",
      };

      it("should find user by clerkId", async () => {
        mockUserFindUnique.mockResolvedValueOnce(mockUser);

        const result = await getUserByClerkId("clerk_abc");

        expect(mockUserFindUnique).toHaveBeenCalledWith({
          where: { clerkId: "clerk_abc", deletedAt: null },
          include: {
            books: false,
            stats: false,
            achievements: false,
          },
        });
        expect(result).toEqual(mockUser);
      });

      it("should include books when option is set", async () => {
        mockUserFindUnique.mockResolvedValueOnce({
          ...mockUser,
          books: [],
        });

        await getUserByClerkId("clerk_abc", { includeBooks: true });

        expect(mockUserFindUnique).toHaveBeenCalledWith({
          where: { clerkId: "clerk_abc", deletedAt: null },
          include: {
            books: { where: { deletedAt: null } },
            stats: false,
            achievements: false,
          },
        });
      });

      it("should include stats when option is set", async () => {
        mockUserFindUnique.mockResolvedValueOnce({
          ...mockUser,
          stats: { totalXP: 100 },
        });

        await getUserByClerkId("clerk_abc", { includeStats: true });

        expect(mockUserFindUnique).toHaveBeenCalledWith({
          where: { clerkId: "clerk_abc", deletedAt: null },
          include: {
            books: false,
            stats: true,
            achievements: false,
          },
        });
      });

      it("should include achievements when option is set", async () => {
        mockUserFindUnique.mockResolvedValueOnce({
          ...mockUser,
          achievements: [],
        });

        await getUserByClerkId("clerk_abc", { includeAchievements: true });

        expect(mockUserFindUnique).toHaveBeenCalledWith({
          where: { clerkId: "clerk_abc", deletedAt: null },
          include: {
            books: false,
            stats: false,
            achievements: { include: { achievement: true } },
          },
        });
      });

      it("should return null for non-existent user", async () => {
        mockUserFindUnique.mockResolvedValueOnce(null);

        const result = await getUserByClerkId("nonexistent");

        expect(result).toBeNull();
      });
    });

    describe("getUserById", () => {
      const mockUser = {
        id: "user_123",
        clerkId: "clerk_abc",
        email: "test@example.com",
      };

      it("should find user by id", async () => {
        mockUserFindUnique.mockResolvedValueOnce(mockUser);

        const result = await getUserById("user_123");

        expect(mockUserFindUnique).toHaveBeenCalledWith({
          where: { id: "user_123", deletedAt: null },
          include: {
            books: false,
            stats: false,
            achievements: false,
          },
        });
        expect(result).toEqual(mockUser);
      });

      it("should include all relations when all options are set", async () => {
        mockUserFindUnique.mockResolvedValueOnce({
          ...mockUser,
          books: [],
          stats: { totalXP: 100 },
          achievements: [],
        });

        await getUserById("user_123", {
          includeBooks: true,
          includeStats: true,
          includeAchievements: true,
        });

        expect(mockUserFindUnique).toHaveBeenCalledWith({
          where: { id: "user_123", deletedAt: null },
          include: {
            books: { where: { deletedAt: null } },
            stats: true,
            achievements: { include: { achievement: true } },
          },
        });
      });
    });

    describe("getBookById", () => {
      const mockBook = {
        id: "book_123",
        title: "Test Book",
        author: "Author",
      };

      it("should find book by id", async () => {
        mockBookFindUnique.mockResolvedValueOnce(mockBook);

        const result = await getBookById("book_123");

        expect(mockBookFindUnique).toHaveBeenCalledWith({
          where: { id: "book_123", deletedAt: null },
          include: {
            chapters: false,
            preReadingGuide: false,
            annotations: false,
          },
        });
        expect(result).toEqual(mockBook);
      });

      it("should include chapters when option is set", async () => {
        mockBookFindUnique.mockResolvedValueOnce({
          ...mockBook,
          chapters: [],
        });

        await getBookById("book_123", { includeChapters: true });

        expect(mockBookFindUnique).toHaveBeenCalledWith({
          where: { id: "book_123", deletedAt: null },
          include: {
            chapters: { orderBy: { orderIndex: "asc" } },
            preReadingGuide: false,
            annotations: false,
          },
        });
      });

      it("should include preReadingGuide when option is set", async () => {
        mockBookFindUnique.mockResolvedValueOnce({
          ...mockBook,
          preReadingGuide: {},
        });

        await getBookById("book_123", { includePreReadingGuide: true });

        expect(mockBookFindUnique).toHaveBeenCalledWith({
          where: { id: "book_123", deletedAt: null },
          include: {
            chapters: false,
            preReadingGuide: true,
            annotations: false,
          },
        });
      });

      it("should include annotations when option is set", async () => {
        mockBookFindUnique.mockResolvedValueOnce({
          ...mockBook,
          annotations: [],
        });

        await getBookById("book_123", { includeAnnotations: true });

        expect(mockBookFindUnique).toHaveBeenCalledWith({
          where: { id: "book_123", deletedAt: null },
          include: {
            chapters: false,
            preReadingGuide: false,
            annotations: { where: { deletedAt: null } },
          },
        });
      });
    });

    describe("getBookWithChapters", () => {
      it("should get book with chapters ordered by orderIndex", async () => {
        const mockBookWithChapters = {
          id: "book_123",
          title: "Test Book",
          chapters: [
            { id: "ch_1", orderIndex: 0 },
            { id: "ch_2", orderIndex: 1 },
          ],
        };

        mockBookFindUnique.mockResolvedValueOnce(mockBookWithChapters);

        const result = await getBookWithChapters("book_123");

        expect(mockBookFindUnique).toHaveBeenCalledWith({
          where: { id: "book_123", deletedAt: null },
          include: {
            chapters: { orderBy: { orderIndex: "asc" } },
          },
        });
        expect(result).toEqual(mockBookWithChapters);
      });
    });

    describe("getReadingProgress", () => {
      it("should get reading progress by userId and bookId", async () => {
        const mockProgress = {
          userId: "user_123",
          bookId: "book_123",
          currentPosition: 5000,
          percentage: 25.5,
        };

        mockReadingProgressFindUnique.mockResolvedValueOnce(mockProgress);

        const result = await getReadingProgress("user_123", "book_123");

        expect(mockReadingProgressFindUnique).toHaveBeenCalledWith({
          where: { userId_bookId: { userId: "user_123", bookId: "book_123" } },
        });
        expect(result).toEqual(mockProgress);
      });

      it("should return null for non-existent progress", async () => {
        mockReadingProgressFindUnique.mockResolvedValueOnce(null);

        const result = await getReadingProgress("user_123", "book_456");

        expect(result).toBeNull();
      });
    });

    describe("upsertReadingProgress", () => {
      it("should upsert reading progress with default values", async () => {
        const mockProgress = {
          userId: "user_123",
          bookId: "book_123",
          currentPosition: 0,
          percentage: 0,
          totalReadTime: 0,
        };

        mockReadingProgressUpsert.mockResolvedValueOnce(mockProgress);

        const result = await upsertReadingProgress("user_123", "book_123", {});

        expect(mockReadingProgressUpsert).toHaveBeenCalled();
        const calls = (mockReadingProgressUpsert as Mock).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const call = calls[0]?.[0] as {
          where: { userId_bookId: { userId: string; bookId: string } };
          create: {
            user: unknown;
            book: unknown;
            currentPosition: number;
            percentage: number;
            totalReadTime: number;
          };
          update: unknown;
        };
        expect(call.where).toEqual({
          userId_bookId: { userId: "user_123", bookId: "book_123" },
        });
        expect(call.create.user).toEqual({ connect: { id: "user_123" } });
        expect(call.create.book).toEqual({ connect: { id: "book_123" } });
        expect(call.create.currentPosition).toBe(0);
        expect(call.create.percentage).toBe(0);
        expect(call.create.totalReadTime).toBe(0);
        expect(result).toEqual(mockProgress);
      });

      it("should upsert reading progress with provided values", async () => {
        const mockProgress = {
          userId: "user_123",
          bookId: "book_123",
          currentPosition: 5000,
          percentage: 25.5,
          totalReadTime: 3600,
        };

        mockReadingProgressUpsert.mockResolvedValueOnce(mockProgress);

        await upsertReadingProgress("user_123", "book_123", {
          currentPosition: 5000,
          percentage: 25.5,
          totalReadTime: 3600,
        });

        const calls = (mockReadingProgressUpsert as Mock).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const call = calls[0]?.[0] as {
          where: unknown;
          create: unknown;
          update: {
            currentPosition: number;
            percentage: number;
            totalReadTime: number;
          };
        };
        expect(call.update.currentPosition).toBe(5000);
        expect(call.update.percentage).toBe(25.5);
        expect(call.update.totalReadTime).toBe(3600);
      });

      it("should handle completedAt when provided", async () => {
        const completedAt = new Date();

        mockReadingProgressUpsert.mockResolvedValueOnce({});

        await upsertReadingProgress("user_123", "book_123", {
          completedAt,
        });

        const calls = (mockReadingProgressUpsert as Mock).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const call = calls[0]?.[0] as {
          where: unknown;
          create: { completedAt: Date };
          update: { completedAt: Date };
        };
        expect(call.create.completedAt).toEqual(completedAt);
        expect(call.update.completedAt).toEqual(completedAt);
      });

      it("should handle null completedAt", async () => {
        mockReadingProgressUpsert.mockResolvedValueOnce({});

        await upsertReadingProgress("user_123", "book_123", {
          completedAt: null,
        });

        const calls = (mockReadingProgressUpsert as Mock).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const call = calls[0]?.[0] as {
          where: unknown;
          create: { completedAt: null };
          update: { completedAt: null };
        };
        expect(call.create.completedAt).toBeNull();
        expect(call.update.completedAt).toBeNull();
      });
    });
  });

  // ========================================================================
  // SOFT DELETE HELPER TESTS
  // ========================================================================

  describe("Soft Delete Helpers", () => {
    describe("withSoftDeleteFilter", () => {
      it("should add deletedAt: null to where clause", () => {
        const where = { email: "test@example.com" };
        const result = withSoftDeleteFilter(where);

        expect(result).toEqual({
          email: "test@example.com",
          deletedAt: null,
        });
      });

      it("should work with empty where clause", () => {
        const result = withSoftDeleteFilter({});

        expect(result).toEqual({ deletedAt: null });
      });

      it("should preserve existing where properties", () => {
        const where = {
          id: "123",
          status: "active",
          nested: { field: "value" },
        };
        const result = withSoftDeleteFilter(where);

        expect(result).toEqual({
          id: "123",
          status: "active",
          nested: { field: "value" },
          deletedAt: null,
        });
      });
    });

    describe("softDeleteUser", () => {
      it("should soft delete user by setting deletedAt", async () => {
        const mockUpdatedUser = {
          id: "user_123",
          deletedAt: new Date(),
        };

        mockUserUpdate.mockResolvedValueOnce(mockUpdatedUser);

        const result = await softDeleteUser("user_123");

        expect(mockUserUpdate).toHaveBeenCalledWith({
          where: { id: "user_123" },
          data: { deletedAt: expect.any(Date) },
        });
        expect(result).toEqual(mockUpdatedUser);
      });
    });

    describe("softDeleteBook", () => {
      it("should soft delete book by setting deletedAt", async () => {
        const mockUpdatedBook = {
          id: "book_123",
          deletedAt: new Date(),
        };

        mockBookUpdate.mockResolvedValueOnce(mockUpdatedBook);

        const deletedBook = await softDeleteBook("book_123");

        expect(mockBookUpdate).toHaveBeenCalledWith({
          where: { id: "book_123" },
          data: { deletedAt: expect.any(Date) },
        });
        expect(deletedBook).toEqual(mockUpdatedBook);
      });
    });
  });

  // ========================================================================
  // TRANSACTION HELPER TESTS
  // ========================================================================

  describe("Transaction Helpers", () => {
    describe("withTransaction", () => {
      it("should execute callback in a transaction", async () => {
        const mockResult = { id: "new_123" };
        const callback = vi.fn().mockResolvedValueOnce(mockResult);

        mockTransaction.mockImplementationOnce(
          async (cb: (tx: unknown) => Promise<unknown>) => cb({})
        );

        const txResult = await withTransaction(callback);

        expect(mockTransaction).toHaveBeenCalledWith(callback);
        expect(callback).toHaveBeenCalled();
        expect(txResult).toBeDefined();
      });

      it("should propagate errors from transaction", async () => {
        const error = new Error("Transaction failed");

        mockTransaction.mockRejectedValueOnce(error);

        await expect(withTransaction(async () => {})).rejects.toThrow(
          "Transaction failed"
        );
      });
    });

    describe("batchTransaction", () => {
      it("should execute multiple operations in a batch", async () => {
        const mockResults = [{ id: "1" }, { id: "2" }];
        const mockPromise1 = Promise.resolve({ id: "1" });
        const mockPromise2 = Promise.resolve({ id: "2" });

        mockTransaction.mockResolvedValueOnce(mockResults);

        const result = await batchTransaction([
          mockPromise1 as unknown as ReturnType<typeof db.user.update>,
          mockPromise2 as unknown as ReturnType<typeof db.user.update>,
        ]);

        expect(mockTransaction).toHaveBeenCalled();
        expect(result).toEqual(mockResults);
      });
    });
  });

  // ========================================================================
  // DBUTILS OBJECT TESTS
  // ========================================================================

  describe("dbUtils Object", () => {
    it("should export all connection management functions", () => {
      expect(dbUtils.ensureConnection).toBe(ensureConnection);
      expect(dbUtils.gracefulShutdown).toBe(gracefulShutdown);
      expect(dbUtils.isDbConnected).toBe(isDbConnected);
    });

    it("should export all query helper functions", () => {
      expect(dbUtils.getUserByClerkId).toBe(getUserByClerkId);
      expect(dbUtils.getUserById).toBe(getUserById);
      expect(dbUtils.getBookById).toBe(getBookById);
      expect(dbUtils.getBookWithChapters).toBe(getBookWithChapters);
      expect(dbUtils.getReadingProgress).toBe(getReadingProgress);
      expect(dbUtils.upsertReadingProgress).toBe(upsertReadingProgress);
    });

    it("should export all soft delete helper functions", () => {
      expect(dbUtils.withSoftDeleteFilter).toBe(withSoftDeleteFilter);
      expect(dbUtils.softDeleteUser).toBe(softDeleteUser);
      expect(dbUtils.softDeleteBook).toBe(softDeleteBook);
    });

    it("should export all transaction helper functions", () => {
      expect(dbUtils.withTransaction).toBe(withTransaction);
      expect(dbUtils.batchTransaction).toBe(batchTransaction);
    });
  });

  // ========================================================================
  // TYPE EXPORT TESTS
  // ========================================================================

  describe("Type Exports", () => {
    it("should export GetUserOptions type", () => {
      const options: GetUserOptions = {
        includeBooks: true,
        includeStats: true,
        includeAchievements: true,
      };
      expect(options).toBeDefined();
    });

    it("should export GetBookOptions type", () => {
      const options: GetBookOptions = {
        includeChapters: true,
        includePreReadingGuide: true,
        includeAnnotations: true,
      };
      expect(options).toBeDefined();
    });

    it("should export TransactionClient type", () => {
      // TransactionClient is a type that excludes certain properties
      // Verify the type can be used for type checking purposes
      const typeCheck: TransactionClient = {} as TransactionClient;
      expect(typeCheck).toBeDefined();
    });

    it("should export SoftDeletableModel type", () => {
      const models: SoftDeletableModel[] = [
        "user",
        "book",
        "annotation",
        "flashcard",
        "curriculum",
        "forumPost",
        "forumReply",
        "groupDiscussion",
        "discussionReply",
        "readingGroup",
      ];
      expect(models).toHaveLength(10);
    });
  });

  // ========================================================================
  // EDGE CASE TESTS
  // ========================================================================

  describe("Edge Cases", () => {
    it("should handle empty options object for getUserByClerkId", async () => {
      mockUserFindUnique.mockResolvedValueOnce(null);

      await getUserByClerkId("clerk_abc", {});

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { clerkId: "clerk_abc", deletedAt: null },
        include: {
          books: false,
          stats: false,
          achievements: false,
        },
      });
    });

    it("should handle empty options object for getBookById", async () => {
      mockBookFindUnique.mockResolvedValueOnce(null);

      await getBookById("book_123", {});

      expect(mockBookFindUnique).toHaveBeenCalledWith({
        where: { id: "book_123", deletedAt: null },
        include: {
          chapters: false,
          preReadingGuide: false,
          annotations: false,
        },
      });
    });

    it("should handle partial options for getUserById", async () => {
      mockUserFindUnique.mockResolvedValueOnce(null);

      await getUserById("user_123", { includeBooks: true });

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: "user_123", deletedAt: null },
        include: {
          books: { where: { deletedAt: null } },
          stats: false,
          achievements: false,
        },
      });
    });
  });
});
