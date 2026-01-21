/**
 * Tests for TTS Download Service
 *
 * Tests the database interaction layer for TTS downloads
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as downloadService from "./downloadService.js";
import { db } from "../../src/services/db.js";

// Mock Prisma
vi.mock("../../src/services/db.js", () => ({
  db: {
    tTSDownload: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("TTS Download Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createDownloadRecord", () => {
    it("should create a new download record", async () => {
      const mockDownload = {
        id: "dl_123",
        userId: "user_1",
        bookId: "book_1",
        bookTitle: "Test Book",
        status: "PENDING" as const,
        provider: "OPENAI" as const,
        voice: "alloy",
        format: "MP3" as const,
        totalChunks: 10,
        processedChunks: 0,
        totalCharacters: 5000,
        estimatedCost: 0.5,
        actualCost: 0,
        fileKey: null,
        fileSize: null,
        downloadUrl: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      vi.mocked(db.tTSDownload.create).mockResolvedValue(mockDownload);

      const result = await downloadService.createDownloadRecord({
        userId: "user_1",
        bookId: "book_1",
        bookTitle: "Test Book",
        provider: "OPENAI",
        voice: "alloy",
        format: "MP3",
        totalChunks: 10,
        totalCharacters: 5000,
        estimatedCost: 0.5,
      });

      expect(result).toEqual(mockDownload);
      expect(db.tTSDownload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user_1",
          bookId: "book_1",
          bookTitle: "Test Book",
          provider: "OPENAI",
          voice: "alloy",
          format: "MP3",
          totalChunks: 10,
          totalCharacters: 5000,
          estimatedCost: 0.5,
        }),
      });
    });
  });

  describe("getDownloadRecord", () => {
    it("should fetch a download by ID", async () => {
      const mockDownload = {
        id: "dl_123",
        userId: "user_1",
        bookId: "book_1",
        bookTitle: "Test Book",
        status: "COMPLETED" as const,
        provider: "OPENAI" as const,
        voice: "alloy",
        format: "MP3" as const,
        totalChunks: 10,
        processedChunks: 10,
        totalCharacters: 5000,
        estimatedCost: 0.5,
        actualCost: 0.5,
        fileKey: "users/user_1/audio/dl_123.mp3",
        fileSize: 1024000,
        downloadUrl: "https://example.com/dl_123.mp3",
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deletedAt: null,
      };

      vi.mocked(db.tTSDownload.findFirst).mockResolvedValue(mockDownload);

      const result = await downloadService.getDownloadRecord("dl_123");

      expect(result).toEqual(mockDownload);
      expect(db.tTSDownload.findFirst).toHaveBeenCalledWith({
        where: { id: "dl_123", deletedAt: null },
      });
    });

    it("should return null for non-existent download", async () => {
      vi.mocked(db.tTSDownload.findFirst).mockResolvedValue(null);

      const result = await downloadService.getDownloadRecord("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getUserDownloads", () => {
    it("should fetch user downloads with pagination", async () => {
      const mockDownloads = [
        {
          id: "dl_1",
          userId: "user_1",
          bookId: "book_1",
          bookTitle: "Book 1",
          status: "COMPLETED" as const,
          provider: "OPENAI" as const,
          voice: "alloy",
          format: "MP3" as const,
          totalChunks: 10,
          processedChunks: 10,
          totalCharacters: 5000,
          estimatedCost: 0.5,
          actualCost: 0.5,
          fileKey: null,
          fileSize: null,
          downloadUrl: null,
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          expiresAt: new Date(),
          deletedAt: null,
        },
      ];

      vi.mocked(db.tTSDownload.findMany).mockResolvedValue(mockDownloads);

      const result = await downloadService.getUserDownloads("user_1", {
        limit: 20,
        offset: 0,
      });

      expect(result).toEqual(mockDownloads);
      expect(db.tTSDownload.findMany).toHaveBeenCalledWith({
        where: { userId: "user_1", deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: 0,
      });
    });
  });

  describe("updateDownloadStatus", () => {
    it("should update download status and progress", async () => {
      const mockUpdated = {
        id: "dl_123",
        status: "PROCESSING" as const,
        processedChunks: 5,
        userId: "user_1",
        bookId: "book_1",
        bookTitle: "Test",
        provider: "OPENAI" as const,
        voice: "alloy",
        format: "MP3" as const,
        totalChunks: 10,
        totalCharacters: 5000,
        estimatedCost: 0.5,
        actualCost: 0,
        fileKey: null,
        fileSize: null,
        downloadUrl: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        expiresAt: new Date(),
      };

      vi.mocked(db.tTSDownload.update).mockResolvedValue(mockUpdated);

      const result = await downloadService.updateDownloadStatus("dl_123", {
        status: "PROCESSING",
        processedChunks: 5,
      });

      expect(result.status).toBe("PROCESSING");
      expect(result.processedChunks).toBe(5);
    });
  });

  describe("deleteDownload", () => {
    it("should soft-delete a download", async () => {
      const mockDownload = {
        id: "dl_123",
        userId: "user_1",
        bookId: "book_1",
        bookTitle: "Test",
        status: "COMPLETED" as const,
        provider: "OPENAI" as const,
        voice: "alloy",
        format: "MP3" as const,
        totalChunks: 10,
        processedChunks: 10,
        totalCharacters: 5000,
        estimatedCost: 0.5,
        actualCost: 0.5,
        fileKey: "test.mp3",
        fileSize: 1024,
        downloadUrl: "https://example.com/test.mp3",
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(),
        deletedAt: null,
      };

      const mockDeleted = { ...mockDownload, deletedAt: new Date() };

      vi.mocked(db.tTSDownload.findFirst).mockResolvedValue(mockDownload);
      vi.mocked(db.tTSDownload.update).mockResolvedValue(mockDeleted);

      const result = await downloadService.deleteDownload("dl_123", "user_1");

      expect(result).toBe(true);
      expect(db.tTSDownload.update).toHaveBeenCalledWith({
        where: { id: "dl_123" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      });
    });

    it("should return false for non-existent download", async () => {
      vi.mocked(db.tTSDownload.findFirst).mockResolvedValue(null);

      const result = await downloadService.deleteDownload("nonexistent", "user_1");

      expect(result).toBe(false);
      expect(db.tTSDownload.update).not.toHaveBeenCalled();
    });

    it("should return false when userId doesn't match", async () => {
      const mockDownload = {
        id: "dl_123",
        userId: "user_1",
        bookId: "book_1",
        bookTitle: "Test",
        status: "COMPLETED" as const,
        provider: "OPENAI" as const,
        voice: "alloy",
        format: "MP3" as const,
        totalChunks: 10,
        processedChunks: 10,
        totalCharacters: 5000,
        estimatedCost: 0.5,
        actualCost: 0.5,
        fileKey: "test.mp3",
        fileSize: 1024,
        downloadUrl: "https://example.com/test.mp3",
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(db.tTSDownload.findFirst).mockResolvedValue(mockDownload);

      const result = await downloadService.deleteDownload("dl_123", "user_2");

      expect(result).toBe(false);
      expect(db.tTSDownload.update).not.toHaveBeenCalled();
    });
  });

  describe("checkDownloadQuota", () => {
    it("should return quota info for FREE tier", async () => {
      vi.mocked(db.tTSDownload.count).mockResolvedValue(0);

      const result = await downloadService.checkDownloadQuota("user_1", "FREE");

      expect(result).toEqual({
        allowed: false,
        remaining: 0,
        used: 0,
        limit: 0,
      });
    });

    it("should return quota info for PRO tier", async () => {
      vi.mocked(db.tTSDownload.count).mockResolvedValue(3);

      const result = await downloadService.checkDownloadQuota("user_1", "PRO");

      expect(result).toEqual({
        allowed: true,
        remaining: 2,
        used: 3,
        limit: 5,
      });
    });

    it("should return unlimited for SCHOLAR tier", async () => {
      vi.mocked(db.tTSDownload.count).mockResolvedValue(100);

      const result = await downloadService.checkDownloadQuota(
        "user_1",
        "SCHOLAR"
      );

      expect(result).toEqual({
        allowed: true,
        remaining: Infinity,
        used: 100,
        limit: Infinity,
      });
    });

    it("should deny when PRO quota exceeded", async () => {
      vi.mocked(db.tTSDownload.count).mockResolvedValue(5);

      const result = await downloadService.checkDownloadQuota("user_1", "PRO");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("getTTSProviderForTier", () => {
    it("should return web_speech for FREE tier", () => {
      const result = downloadService.getTTSProviderForTier("FREE");
      expect(result).toBe("WEB_SPEECH");
    });

    it("should return openai for PRO tier", () => {
      const result = downloadService.getTTSProviderForTier("PRO");
      expect(result).toBe("OPENAI");
    });

    it("should return elevenlabs for SCHOLAR tier", () => {
      const result = downloadService.getTTSProviderForTier("SCHOLAR");
      expect(result).toBe("ELEVENLABS");
    });
  });

  describe("getDefaultVoice", () => {
    it("should return default voice for WEB_SPEECH", () => {
      const result = downloadService.getDefaultVoice("WEB_SPEECH");
      expect(result).toBe("default");
    });

    it("should return default voice for OPENAI", () => {
      const result = downloadService.getDefaultVoice("OPENAI");
      expect(result).toBe("alloy");
    });

    it("should return default voice for ELEVENLABS", () => {
      const result = downloadService.getDefaultVoice("ELEVENLABS");
      expect(result).toBe("rachel");
    });
  });

  describe("calculateExpiryDate", () => {
    it("should calculate expiry 30 days from now", () => {
      const before = new Date();
      const result = downloadService.calculateExpiryDate();
      const after = new Date();

      // Result should be approximately 30 days from now
      const expectedMin = new Date(before);
      expectedMin.setDate(expectedMin.getDate() + 30);
      const expectedMax = new Date(after);
      expectedMax.setDate(expectedMax.getDate() + 30);

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(result.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });
  });

  describe("buildDownloadKey", () => {
    it("should build correct S3 key", () => {
      const result = downloadService.buildDownloadKey(
        "user_123",
        "dl_456",
        "MP3"
      );

      expect(result).toBe("users/user_123/audio/downloads/dl_456.mp3");
    });

    it("should lowercase the format", () => {
      const result = downloadService.buildDownloadKey(
        "user_123",
        "dl_456",
        "OPUS"
      );

      expect(result).toBe("users/user_123/audio/downloads/dl_456.opus");
    });
  });
});
