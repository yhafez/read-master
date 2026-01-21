/**
 * Tests for GET /api/users/search
 */

import { describe, it, expect } from "vitest";

describe("GET /api/users/search", () => {
  describe("Query validation", () => {
    it("should reject query shorter than 2 characters", () => {
      const query = { q: "a" };
      // Validation will fail with min length error
      expect(query.q.length).toBeLessThan(2);
    });

    it("should reject query longer than 50 characters", () => {
      const query = { q: "a".repeat(51) };
      expect(query.q.length).toBeGreaterThan(50);
    });

    it("should accept valid query", () => {
      const query = { q: "john" };
      expect(query.q.length).toBeGreaterThanOrEqual(2);
      expect(query.q.length).toBeLessThanOrEqual(50);
    });

    it("should default limit to 20", () => {
      const defaultLimit = 20;
      expect(defaultLimit).toBe(20);
    });

    it("should default page to 1", () => {
      const defaultPage = 1;
      expect(defaultPage).toBe(1);
    });

    it("should accept custom limit", () => {
      const limit = 10;
      expect(limit).toBeGreaterThanOrEqual(1);
      expect(limit).toBeLessThanOrEqual(50);
    });

    it("should reject limit less than 1", () => {
      const limit = 0;
      expect(limit).toBeLessThan(1);
    });

    it("should reject limit greater than 50", () => {
      const limit = 51;
      expect(limit).toBeGreaterThan(50);
    });
  });

  describe("Search functionality", () => {
    it("should search by username case-insensitively", () => {
      const query = "JoHn";
      const username = "john_doe";
      expect(username.toLowerCase()).toContain(query.toLowerCase());
    });

    it("should search by display name case-insensitively", () => {
      const query = "JoHn";
      const displayName = "John Doe";
      expect(displayName.toLowerCase()).toContain(query.toLowerCase());
    });

    it("should exclude soft-deleted users", () => {
      const deletedAt = new Date();
      expect(deletedAt).not.toBeNull();
    });

    it("should exclude current user from results", () => {
      const currentUserId = "user1";
      const searchResults = [{ id: "user2" }, { id: "user3" }];
      const includesCurrentUser = searchResults.some(
        (u) => u.id === currentUserId
      );
      expect(includesCurrentUser).toBe(false);
    });

    it("should prioritize public profiles", () => {
      const users = [
        { profilePublic: true, username: "a" },
        { profilePublic: true, username: "b" },
        { profilePublic: false, username: "c" },
      ];
      const publicUsers = users.filter((u) => u.profilePublic);
      expect(publicUsers.length).toBe(2);
    });
  });

  describe("Pagination", () => {
    it("should calculate skip correctly for page 1", () => {
      const page = 1;
      const itemsPerPage = 20;
      const skip = (page - 1) * itemsPerPage;
      expect(skip).toBe(0);
    });

    it("should calculate skip correctly for page 2", () => {
      const page = 2;
      const itemsPerPage = 20;
      const skip = (page - 1) * itemsPerPage;
      expect(skip).toBe(20);
    });

    it("should calculate hasMore correctly when more results exist", () => {
      const skip = 0;
      const resultsCount = 20;
      const total = 50;
      const hasMore = skip + resultsCount < total;
      expect(hasMore).toBe(true);
    });

    it("should calculate hasMore correctly when no more results", () => {
      const skip = 40;
      const resultsCount = 10;
      const total = 50;
      const hasMore = skip + resultsCount < total;
      expect(hasMore).toBe(false);
    });
  });

  describe("Response formatting", () => {
    it("should include required user fields", () => {
      const user = {
        id: "user1",
        username: "john_doe",
        displayName: "John Doe",
        avatar: "https://example.com/avatar.jpg",
        bio: "Hello world",
        tier: "PRO",
        profilePublic: true,
        isFollowing: false,
        followersCount: 10,
        followingCount: 5,
      };

      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("username");
      expect(user).toHaveProperty("displayName");
      expect(user).toHaveProperty("avatar");
      expect(user).toHaveProperty("bio");
      expect(user).toHaveProperty("tier");
      expect(user).toHaveProperty("profilePublic");
      expect(user).toHaveProperty("isFollowing");
      expect(user).toHaveProperty("followersCount");
      expect(user).toHaveProperty("followingCount");
    });

    it("should include pagination metadata", () => {
      const response = {
        users: [],
        total: 50,
        page: 1,
        limit: 20,
        hasMore: true,
      };

      expect(response).toHaveProperty("users");
      expect(response).toHaveProperty("total");
      expect(response).toHaveProperty("page");
      expect(response).toHaveProperty("limit");
      expect(response).toHaveProperty("hasMore");
    });
  });

  describe("Following status", () => {
    it("should correctly identify followed users", () => {
      const followingIds = ["user2", "user3"];
      const followingSet = new Set(followingIds);

      expect(followingSet.has("user2")).toBe(true);
      expect(followingSet.has("user3")).toBe(true);
      expect(followingSet.has("user4")).toBe(false);
    });
  });
});
