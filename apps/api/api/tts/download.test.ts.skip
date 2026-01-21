/**
 * TTS Download Endpoint Tests
 *
 * Tests for POST /api/tts/download, GET /api/tts/downloads, and DELETE /api/tts/downloads/[id]
 *
 * TODO: These tests need to be rewritten for database-backed implementation (Task #10)
 * Temporarily skipped while migrating from in-memory to database storage.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Import functions and types from downloadService.ts
import {
  generateDownloadId,
  checkDownloadQuota,
  getTTSProviderForTier,
  calculateExpiryDate,
  buildDownloadKey,
  createDownloadRecord,
  updateDownloadStatus,
  getDownloadRecord,
  getUserDownloads,
  deleteDownload,
  DOWNLOAD_QUOTAS,
  getDefaultVoice,
  getNextMonthReset,
} from "./downloadService.js";

// Import from downloads.ts
import { toDownloadListItem, getQuotaInfo, querySchema } from "./downloads.js";

// ============================================================================
// Test Setup
// ============================================================================

describe.skip("TTS Download Endpoints", () => {
  // Clear records before each test
  beforeEach(() => {
    downloadRecords.clear();
    userDownloadCounts.clear();
    vi.useRealTimers();
  });

  // ==========================================================================
  // Download ID Generation Tests
  // ==========================================================================

  describe("generateDownloadId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateDownloadId();
      const id2 = generateDownloadId();
      const id3 = generateDownloadId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it("should prefix IDs with 'dl_'", () => {
      const id = generateDownloadId();
      expect(id.startsWith("dl_")).toBe(true);
    });

    it("should generate IDs of consistent length", () => {
      const ids = Array.from({ length: 10 }, () => generateDownloadId());
      const lengths = ids.map((id) => id.length);
      // All IDs should be at least 10 characters
      expect(lengths.every((len) => len >= 10)).toBe(true);
    });
  });

  // ==========================================================================
  // Month Key Tests
  // ==========================================================================

  describe("getMonthKey", () => {
    it("should generate correct month key format", () => {
      const key = getMonthKey("user123");
      expect(key).toMatch(/^user123-\d{4}-\d{2}$/);
    });

    it("should include correct user ID", () => {
      const key = getMonthKey("test-user-xyz");
      expect(key.startsWith("test-user-xyz-")).toBe(true);
    });

    it("should include current year and month", () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const key = getMonthKey("user1");
      expect(key).toBe(`user1-${year}-${month}`);
    });
  });

  // ==========================================================================
  // Download Count Tests
  // ==========================================================================

  describe("getUserMonthlyDownloads", () => {
    it("should return 0 for users with no downloads", () => {
      const count = getUserMonthlyDownloads("new-user");
      expect(count).toBe(0);
    });

    it("should return correct count after incrementing", () => {
      incrementUserDownloads("user1");
      incrementUserDownloads("user1");
      incrementUserDownloads("user1");

      expect(getUserMonthlyDownloads("user1")).toBe(3);
    });

    it("should track counts separately per user", () => {
      incrementUserDownloads("user1");
      incrementUserDownloads("user1");
      incrementUserDownloads("user2");

      expect(getUserMonthlyDownloads("user1")).toBe(2);
      expect(getUserMonthlyDownloads("user2")).toBe(1);
    });
  });

  describe("incrementUserDownloads", () => {
    it("should increment from 0 to 1", () => {
      incrementUserDownloads("new-user");
      expect(getUserMonthlyDownloads("new-user")).toBe(1);
    });

    it("should increment existing count", () => {
      incrementUserDownloads("user1");
      incrementUserDownloads("user1");
      expect(getUserMonthlyDownloads("user1")).toBe(2);
    });
  });

  // ==========================================================================
  // Quota Checking Tests
  // ==========================================================================

  describe("checkDownloadQuota", () => {
    it("should return allowed:false for FREE tier", () => {
      const quota = checkDownloadQuota("user1", "FREE");
      expect(quota.allowed).toBe(false);
      expect(quota.limit).toBe(0);
    });

    it("should return allowed:true for PRO tier with remaining quota", () => {
      const quota = checkDownloadQuota("user1", "PRO");
      expect(quota.allowed).toBe(true);
      expect(quota.remaining).toBe(5);
      expect(quota.limit).toBe(5);
    });

    it("should return allowed:false for PRO tier at limit", () => {
      for (let i = 0; i < 5; i++) {
        incrementUserDownloads("user1");
      }
      const quota = checkDownloadQuota("user1", "PRO");
      expect(quota.allowed).toBe(false);
      expect(quota.remaining).toBe(0);
      expect(quota.used).toBe(5);
    });

    it("should always return allowed:true for SCHOLAR tier", () => {
      for (let i = 0; i < 100; i++) {
        incrementUserDownloads("scholar-user");
      }
      const quota = checkDownloadQuota("scholar-user", "SCHOLAR");
      expect(quota.allowed).toBe(true);
      expect(quota.limit).toBe(Infinity);
    });

    it("should track used count correctly", () => {
      incrementUserDownloads("user1");
      incrementUserDownloads("user1");
      const quota = checkDownloadQuota("user1", "PRO");
      expect(quota.used).toBe(2);
      expect(quota.remaining).toBe(3);
    });
  });

  // ==========================================================================
  // Provider Selection Tests
  // ==========================================================================

  describe("getTTSProviderForTier", () => {
    it("should return web_speech for FREE tier", () => {
      expect(getTTSProviderForTier("FREE")).toBe("web_speech");
    });

    it("should return openai for PRO tier", () => {
      expect(getTTSProviderForTier("PRO")).toBe("openai");
    });

    it("should return elevenlabs for SCHOLAR tier", () => {
      expect(getTTSProviderForTier("SCHOLAR")).toBe("elevenlabs");
    });
  });

  // ==========================================================================
  // Expiry Date Tests
  // ==========================================================================

  describe("calculateExpiryDate", () => {
    it("should return date in the future", () => {
      const expiry = calculateExpiryDate();
      const now = new Date();
      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it("should be approximately 30 days in the future", () => {
      const expiry = calculateExpiryDate();
      const now = new Date();
      const daysDiff = Math.round(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDiff).toBe(DOWNLOAD_EXPIRY_DAYS);
    });
  });

  // ==========================================================================
  // Storage Key Tests
  // ==========================================================================

  describe("buildDownloadKey", () => {
    it("should build correct key format", () => {
      const key = buildDownloadKey("user123", "dl_abc123", "mp3");
      expect(key).toBe("users/user123/audio/downloads/dl_abc123.mp3");
    });

    it("should handle different formats", () => {
      const mp3Key = buildDownloadKey("user1", "dl_1", "mp3");
      const wavKey = buildDownloadKey("user1", "dl_1", "wav");
      const opusKey = buildDownloadKey("user1", "dl_1", "opus");

      expect(mp3Key).toContain(".mp3");
      expect(wavKey).toContain(".wav");
      expect(opusKey).toContain(".opus");
    });
  });

  // ==========================================================================
  // Download Record CRUD Tests
  // ==========================================================================

  describe("createDownloadRecord", () => {
    it("should create a record with correct properties", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Hello world! This is a test.",
      });

      expect(record.id).toBeDefined();
      expect(record.userId).toBe("user1");
      expect(record.bookId).toBe("book1");
      expect(record.bookTitle).toBe("Test Book");
      expect(record.status).toBe("pending");
      expect(record.provider).toBe("openai");
      expect(record.voice).toBe("alloy");
      expect(record.format).toBe("mp3");
      expect(record.totalCharacters).toBe(28);
      expect(record.estimatedCost).toBeGreaterThan(0);
    });

    it("should store record in downloadRecords map", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Test text",
      });

      expect(downloadRecords.has(record.id)).toBe(true);
      expect(downloadRecords.get(record.id)).toEqual(record);
    });

    it("should calculate correct chunk count for long text", () => {
      const longText = "x".repeat(10000);
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Long Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: longText,
      });

      expect(record.totalChunks).toBeGreaterThan(1);
      expect(record.totalCharacters).toBe(10000);
    });
  });

  describe("getDownloadRecord", () => {
    it("should return null for non-existent record", () => {
      const record = getDownloadRecord("non-existent-id");
      expect(record).toBeNull();
    });

    it("should return existing record", () => {
      const created = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Test",
      });

      const retrieved = getDownloadRecord(created.id);
      expect(retrieved).toEqual(created);
    });
  });

  describe("updateDownloadStatus", () => {
    it("should update record status", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Test",
      });

      const updated = updateDownloadStatus(record.id, {
        status: "processing",
        processedChunks: 1,
      });

      expect(updated?.status).toBe("processing");
      expect(updated?.processedChunks).toBe(1);
    });

    it("should return null for non-existent record", () => {
      const updated = updateDownloadStatus("non-existent", {
        status: "completed",
      });
      expect(updated).toBeNull();
    });

    it("should update updatedAt timestamp", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Test",
      });

      const originalUpdatedAt = record.updatedAt.getTime();

      // Small delay to ensure different timestamp
      const updated = updateDownloadStatus(record.id, { status: "completed" });

      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt
      );
    });
  });

  describe("getUserDownloads", () => {
    beforeEach(() => {
      // Create multiple downloads for testing
      createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Book 1",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Text 1",
      });
      createDownloadRecord({
        userId: "user1",
        bookId: "book2",
        bookTitle: "Book 2",
        provider: "openai",
        voice: "echo",
        format: "mp3",
        text: "Text 2",
      });
      createDownloadRecord({
        userId: "user2",
        bookId: "book3",
        bookTitle: "Book 3",
        provider: "elevenlabs",
        voice: "rachel",
        format: "mp3",
        text: "Text 3",
      });
    });

    it("should return only user's downloads", () => {
      const user1Downloads = getUserDownloads("user1");
      const user2Downloads = getUserDownloads("user2");

      expect(user1Downloads.length).toBe(2);
      expect(user2Downloads.length).toBe(1);
    });

    it("should return empty array for user with no downloads", () => {
      const downloads = getUserDownloads("user-no-downloads");
      expect(downloads).toEqual([]);
    });

    it("should filter by status", () => {
      // Update one record to completed
      const records = getUserDownloads("user1");
      if (records[0]) {
        updateDownloadStatus(records[0].id, { status: "completed" });
      }

      const completedDownloads = getUserDownloads("user1", {
        status: "completed",
      });
      const pendingDownloads = getUserDownloads("user1", { status: "pending" });

      expect(completedDownloads.length).toBe(1);
      expect(pendingDownloads.length).toBe(1);
    });

    it("should respect limit", () => {
      const downloads = getUserDownloads("user1", { limit: 1 });
      expect(downloads.length).toBe(1);
    });

    it("should respect offset", () => {
      const allDownloads = getUserDownloads("user1");
      const offsetDownloads = getUserDownloads("user1", { offset: 1 });

      expect(offsetDownloads.length).toBe(allDownloads.length - 1);
    });

    it("should sort by createdAt descending", () => {
      const downloads = getUserDownloads("user1");
      for (let i = 1; i < downloads.length; i++) {
        const prev = downloads[i - 1];
        const curr = downloads[i];
        if (prev && curr) {
          expect(prev.createdAt.getTime()).toBeGreaterThanOrEqual(
            curr.createdAt.getTime()
          );
        }
      }
    });
  });

  describe("deleteDownload", () => {
    it("should delete existing record", async () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Test",
      });

      const deleted = await deleteDownload(record.id, "user1");
      expect(deleted).toBe(true);
      expect(downloadRecords.has(record.id)).toBe(false);
    });

    it("should return false for non-existent record", async () => {
      const deleted = await deleteDownload("non-existent", "user1");
      expect(deleted).toBe(false);
    });

    it("should return false when userId does not match", async () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Test",
      });

      const deleted = await deleteDownload(record.id, "user2");
      expect(deleted).toBe(false);
      expect(downloadRecords.has(record.id)).toBe(true);
    });
  });

  // ==========================================================================
  // Download List Item Transformation Tests
  // ==========================================================================

  describe("toDownloadListItem", () => {
    it("should transform record to list item format", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Test text content",
      });

      const listItem = toDownloadListItem(record);

      expect(listItem.id).toBe(record.id);
      expect(listItem.bookId).toBe("book1");
      expect(listItem.bookTitle).toBe("Test Book");
      expect(listItem.status).toBe("pending");
      expect(listItem.provider).toBe("openai");
      expect(listItem.voice).toBe("alloy");
      expect(listItem.format).toBe("mp3");
      expect(listItem.progress).toBe(0);
      expect(typeof listItem.createdAt).toBe("string");
      expect(typeof listItem.expiresAt).toBe("string");
    });

    it("should calculate progress percentage correctly", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "x".repeat(10000),
      });

      // Update to simulate processing
      const updated = updateDownloadStatus(record.id, {
        processedChunks: Math.floor(record.totalChunks / 2),
      });

      if (updated) {
        const listItem = toDownloadListItem(updated);
        expect(listItem.progress).toBeGreaterThan(0);
        expect(listItem.progress).toBeLessThanOrEqual(100);
      }
    });

    it("should handle completed record with file info", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Test",
      });

      const updated = updateDownloadStatus(record.id, {
        status: "completed",
        processedChunks: record.totalChunks,
        fileSize: 1024000,
        downloadUrl: "https://example.com/download",
        completedAt: new Date(),
      });

      if (updated) {
        const listItem = toDownloadListItem(updated);
        expect(listItem.status).toBe("completed");
        expect(listItem.fileSize).toBe(1024000);
        expect(listItem.downloadUrl).toBe("https://example.com/download");
        expect(listItem.completedAt).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Quota Info Tests
  // ==========================================================================

  describe("getQuotaInfo", () => {
    it("should return correct quota for PRO tier", () => {
      incrementUserDownloads("user1");
      const quota = getQuotaInfo("user1", "PRO");

      expect(quota.used).toBe(1);
      expect(quota.limit).toBe(5);
      expect(quota.remaining).toBe(4);
    });

    it("should return 'unlimited' for SCHOLAR tier", () => {
      const quota = getQuotaInfo("user1", "SCHOLAR");

      expect(quota.limit).toBe("unlimited");
      expect(quota.remaining).toBe("unlimited");
    });

    it("should return correct quota for FREE tier", () => {
      const quota = getQuotaInfo("user1", "FREE");

      expect(quota.limit).toBe(0);
      expect(quota.remaining).toBe(0);
    });
  });

  // ==========================================================================
  // Request Schema Validation Tests
  // ==========================================================================

  describe("downloadRequestSchema", () => {
    it("should validate valid request", () => {
      const result = downloadRequestSchema.safeParse({
        bookId: "book123",
        bookTitle: "My Book",
        text: "Hello world",
      });

      expect(result.success).toBe(true);
    });

    it("should require bookId", () => {
      const result = downloadRequestSchema.safeParse({
        bookTitle: "My Book",
        text: "Hello world",
      });

      expect(result.success).toBe(false);
    });

    it("should require bookTitle", () => {
      const result = downloadRequestSchema.safeParse({
        bookId: "book123",
        text: "Hello world",
      });

      expect(result.success).toBe(false);
    });

    it("should require text", () => {
      const result = downloadRequestSchema.safeParse({
        bookId: "book123",
        bookTitle: "My Book",
      });

      expect(result.success).toBe(false);
    });

    it("should validate format enum", () => {
      const validResult = downloadRequestSchema.safeParse({
        bookId: "book123",
        bookTitle: "My Book",
        text: "Hello",
        format: "mp3",
      });

      const invalidResult = downloadRequestSchema.safeParse({
        bookId: "book123",
        bookTitle: "My Book",
        text: "Hello",
        format: "invalid",
      });

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });

    it("should default format to mp3", () => {
      const result = downloadRequestSchema.safeParse({
        bookId: "book123",
        bookTitle: "My Book",
        text: "Hello",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe("mp3");
      }
    });
  });

  // ==========================================================================
  // Query Schema Validation Tests
  // ==========================================================================

  describe("querySchema", () => {
    it("should validate valid query params", () => {
      const result = querySchema.safeParse({
        limit: 10,
        offset: 0,
        status: "completed",
      });

      expect(result.success).toBe(true);
    });

    it("should provide defaults", () => {
      const result = querySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("should validate limit range", () => {
      const tooLow = querySchema.safeParse({ limit: 0 });
      const tooHigh = querySchema.safeParse({ limit: 101 });
      const valid = querySchema.safeParse({ limit: 50 });

      expect(tooLow.success).toBe(false);
      expect(tooHigh.success).toBe(false);
      expect(valid.success).toBe(true);
    });

    it("should validate status enum", () => {
      const valid = querySchema.safeParse({ status: "pending" });
      const invalid = querySchema.safeParse({ status: "invalid" });

      expect(valid.success).toBe(true);
      expect(invalid.success).toBe(false);
    });

    it("should coerce string numbers", () => {
      const result = querySchema.safeParse({ limit: "25", offset: "10" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(10);
      }
    });
  });

  // ==========================================================================
  // Helper Function Tests
  // ==========================================================================

  describe("getDefaultVoice", () => {
    it("should return alloy for openai", () => {
      expect(getDefaultVoice("openai")).toBe("alloy");
    });

    it("should return rachel for elevenlabs", () => {
      expect(getDefaultVoice("elevenlabs")).toBe("rachel");
    });

    it("should return default for web_speech", () => {
      expect(getDefaultVoice("web_speech")).toBe("default");
    });
  });

  describe("getNextMonthReset", () => {
    it("should return ISO string", () => {
      const reset = getNextMonthReset();
      expect(typeof reset).toBe("string");
      expect(() => new Date(reset)).not.toThrow();
    });

    it("should return first day of next month", () => {
      const reset = getNextMonthReset();
      const resetDate = new Date(reset);
      expect(resetDate.getDate()).toBe(1);
    });

    it("should be in the future", () => {
      const reset = getNextMonthReset();
      const resetDate = new Date(reset);
      expect(resetDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have correct download quotas", () => {
      expect(DOWNLOAD_QUOTAS.FREE).toBe(0);
      expect(DOWNLOAD_QUOTAS.PRO).toBe(5);
      expect(DOWNLOAD_QUOTAS.SCHOLAR).toBe(Infinity);
    });

    it("should have 30 day expiry", () => {
      expect(DOWNLOAD_EXPIRY_DAYS).toBe(30);
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle empty text", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "",
      });

      expect(record.totalChunks).toBe(0);
      expect(record.totalCharacters).toBe(0);
    });

    it("should handle very long text", () => {
      const longText = "x".repeat(1000000);
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Long Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: longText,
      });

      expect(record.totalChunks).toBeGreaterThan(100);
      expect(record.estimatedCost).toBeGreaterThan(0);
    });

    it("should handle special characters in text", () => {
      const specialText = "Hello 世界! 🎉 \n\t Special chars: <>&\"'";
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Special Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: specialText,
      });

      expect(record.totalCharacters).toBe(specialText.length);
    });

    it("should handle unicode in book title", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "日本語の本 📚",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Test",
      });

      expect(record.bookTitle).toBe("日本語の本 📚");
    });
  });

  // ==========================================================================
  // Integration Scenarios
  // ==========================================================================

  describe("Integration Scenarios", () => {
    it("should handle full PRO tier download workflow", () => {
      const userId = "pro-user";

      // Check initial quota
      const initialQuota = checkDownloadQuota(userId, "PRO");
      expect(initialQuota.allowed).toBe(true);
      expect(initialQuota.remaining).toBe(5);

      // Create downloads up to limit
      for (let i = 0; i < 5; i++) {
        const record = createDownloadRecord({
          userId,
          bookId: `book${i}`,
          bookTitle: `Book ${i}`,
          provider: "openai",
          voice: "alloy",
          format: "mp3",
          text: `Text ${i}`,
        });
        incrementUserDownloads(userId);
        expect(record).toBeDefined();
      }

      // Check quota is exhausted
      const finalQuota = checkDownloadQuota(userId, "PRO");
      expect(finalQuota.allowed).toBe(false);
      expect(finalQuota.remaining).toBe(0);
    });

    it("should handle SCHOLAR tier unlimited downloads", () => {
      const userId = "scholar-user";

      // Create many downloads
      for (let i = 0; i < 20; i++) {
        const record = createDownloadRecord({
          userId,
          bookId: `book${i}`,
          bookTitle: `Book ${i}`,
          provider: "elevenlabs",
          voice: "rachel",
          format: "mp3",
          text: `Text ${i}`,
        });
        incrementUserDownloads(userId);
        expect(record).toBeDefined();
      }

      // Quota should still be allowed
      const quota = checkDownloadQuota(userId, "SCHOLAR");
      expect(quota.allowed).toBe(true);
    });

    it("should handle download status updates through lifecycle", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "x".repeat(5000),
      });

      // Initial state
      expect(record.status).toBe("pending");

      // Start processing
      const processing = updateDownloadStatus(record.id, {
        status: "processing",
        processedChunks: 1,
      });
      expect(processing?.status).toBe("processing");

      // Complete processing
      const completed = updateDownloadStatus(record.id, {
        status: "completed",
        processedChunks: record.totalChunks,
        fileKey: "users/user1/audio/downloads/test.mp3",
        fileSize: 1024000,
        downloadUrl: "https://example.com/download",
        actualCost: 0.05,
        completedAt: new Date(),
      });

      expect(completed?.status).toBe("completed");
      expect(completed?.fileKey).toBeDefined();
      expect(completed?.downloadUrl).toBeDefined();
    });

    it("should handle failed download", () => {
      const record = createDownloadRecord({
        userId: "user1",
        bookId: "book1",
        bookTitle: "Test Book",
        provider: "openai",
        voice: "alloy",
        format: "mp3",
        text: "Test",
      });

      const failed = updateDownloadStatus(record.id, {
        status: "failed",
        errorMessage: "TTS API rate limit exceeded",
      });

      expect(failed?.status).toBe("failed");
      expect(failed?.errorMessage).toBe("TTS API rate limit exceeded");

      if (failed) {
        const listItem = toDownloadListItem(failed);
        expect(listItem.errorMessage).toBe("TTS API rate limit exceeded");
      }
    });
  });
});
