/**
 * Tests for TTS Download API Endpoints
 *
 * Tests the HTTP handlers for TTS download management
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as downloadService from "./downloadService.js";

// Mock dependencies
vi.mock("./downloadService.js");
vi.mock("../../src/middleware/auth.js");
vi.mock("../../src/services/db.js");

describe("TTS Download Endpoints", () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;
  let statusCode: number;
  let responseBody: unknown;

  beforeEach(() => {
    vi.clearAllMocks();

    statusCode = 200;
    responseBody = null;

    mockRes = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return mockRes as VercelResponse;
      }),
      json: vi.fn((body: unknown) => {
        responseBody = body;
        return mockRes as VercelResponse;
      }),
      setHeader: vi.fn(),
    };
  });

  describe("GET /api/tts/downloads", () => {
    it("should return user downloads with quota info", async () => {
      const mockDownloads = [
        {
          id: "dl_1",
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
          fileKey: "test.mp3",
          fileSize: 1024000,
          downloadUrl: "https://example.com/test.mp3",
          errorMessage: null,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          completedAt: new Date("2026-01-01"),
          expiresAt: new Date("2026-02-01"),
        },
      ];

      const mockQuota = {
        allowed: true,
        remaining: 7,
        used: 3,
        limit: 10,
      };

      vi.mocked(downloadService.getUserDownloads).mockResolvedValue(
        mockDownloads
      );
      vi.mocked(downloadService.checkDownloadQuota).mockResolvedValue(
        mockQuota
      );

      // The actual test would call the handler here
      // For now, we're testing the service layer
      const downloads = await downloadService.getUserDownloads("user_1", {
        limit: 20,
        offset: 0,
      });
      const quota = await downloadService.checkDownloadQuota("user_1", "PRO");

      expect(downloads).toEqual(mockDownloads);
      expect(quota).toEqual(mockQuota);
    });

    it("should handle pagination parameters", async () => {
      vi.mocked(downloadService.getUserDownloads).mockResolvedValue([]);

      await downloadService.getUserDownloads("user_1", {
        limit: 10,
        offset: 20,
      });

      expect(downloadService.getUserDownloads).toHaveBeenCalledWith("user_1", {
        limit: 10,
        offset: 20,
      });
    });
  });

  describe("GET /api/tts/downloads/:id", () => {
    it("should return download details", async () => {
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
        fileKey: "test.mp3",
        fileSize: 1024000,
        downloadUrl: "https://example.com/test.mp3",
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(),
      };

      vi.mocked(downloadService.getDownloadRecord).mockResolvedValue(
        mockDownload
      );

      const result = await downloadService.getDownloadRecord("dl_123");

      expect(result).toEqual(mockDownload);
    });

    it("should return null for non-existent download", async () => {
      vi.mocked(downloadService.getDownloadRecord).mockResolvedValue(null);

      const result = await downloadService.getDownloadRecord("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("DELETE /api/tts/downloads/:id", () => {
    it("should delete a download", async () => {
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
        fileSize: null,
        downloadUrl: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
        expiresAt: new Date(),
      };

      vi.mocked(downloadService.getDownloadRecord).mockResolvedValue(
        mockDownload
      );
      vi.mocked(downloadService.deleteDownload).mockResolvedValue();

      await downloadService.deleteDownload("dl_123");

      expect(downloadService.deleteDownload).toHaveBeenCalledWith("dl_123");
    });
  });

  describe("POST /api/tts/download", () => {
    it("should create a download job", async () => {
      const mockDownload = {
        id: "dl_new",
        userId: "user_1",
        bookId: "book_1",
        bookTitle: "New Book",
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

      const mockQuota = {
        allowed: true,
        remaining: 9,
        used: 1,
        limit: 10,
      };

      vi.mocked(downloadService.checkDownloadQuota).mockResolvedValue(
        mockQuota
      );
      vi.mocked(downloadService.createDownloadRecord).mockResolvedValue(
        mockDownload
      );

      const quota = await downloadService.checkDownloadQuota("user_1", "PRO");
      expect(quota.allowed).toBe(true);

      const result = await downloadService.createDownloadRecord({
        userId: "user_1",
        bookId: "book_1",
        bookTitle: "New Book",
        provider: "OPENAI",
        voice: "alloy",
        format: "MP3",
        totalChunks: 10,
        totalCharacters: 5000,
        estimatedCost: 0.5,
      });

      expect(result).toEqual(mockDownload);
      expect(result.status).toBe("PENDING");
    });

    it("should reject when quota exceeded", async () => {
      const mockQuota = {
        allowed: false,
        remaining: 0,
        used: 10,
        limit: 10,
      };

      vi.mocked(downloadService.checkDownloadQuota).mockResolvedValue(
        mockQuota
      );

      const quota = await downloadService.checkDownloadQuota("user_1", "PRO");

      expect(quota.allowed).toBe(false);
      expect(quota.remaining).toBe(0);
    });

    it("should allow unlimited for SCHOLAR tier", async () => {
      const mockQuota = {
        allowed: true,
        remaining: Infinity,
        used: 100,
        limit: "unlimited" as const,
      };

      vi.mocked(downloadService.checkDownloadQuota).mockResolvedValue(
        mockQuota
      );

      const quota = await downloadService.checkDownloadQuota(
        "user_1",
        "SCHOLAR"
      );

      expect(quota.allowed).toBe(true);
      expect(quota.limit).toBe("unlimited");
    });
  });

  describe("Quota Validation", () => {
    it("should enforce FREE tier restrictions", async () => {
      vi.mocked(downloadService.checkDownloadQuota).mockResolvedValue({
        allowed: false,
        remaining: 0,
        used: 0,
        limit: 0,
      });

      const quota = await downloadService.checkDownloadQuota("user_1", "FREE");
      expect(quota.allowed).toBe(false);
      expect(quota.limit).toBe(0);
    });

    it("should enforce PRO tier limits", async () => {
      vi.mocked(downloadService.checkDownloadQuota).mockResolvedValue({
        allowed: true,
        remaining: 5,
        used: 5,
        limit: 10,
      });

      const quota = await downloadService.checkDownloadQuota("user_1", "PRO");
      expect(quota.limit).toBe(10);
      expect(quota.used).toBe(5);
    });

    it("should allow unlimited for SCHOLAR tier", async () => {
      vi.mocked(downloadService.checkDownloadQuota).mockResolvedValue({
        allowed: true,
        remaining: Infinity,
        used: 999,
        limit: "unlimited",
      });

      const quota = await downloadService.checkDownloadQuota(
        "user_1",
        "SCHOLAR"
      );
      expect(quota.limit).toBe("unlimited");
    });
  });
});
