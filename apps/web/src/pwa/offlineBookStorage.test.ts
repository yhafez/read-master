/**
 * Offline Book Storage Tests
 * Tests for IndexedDB-based offline book storage
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  isIndexedDBAvailable,
  formatBytes,
  getFileTypeFromMime,
  blobToDataUrl,
  arrayBufferToBlob,
  getOfflineBooksSettings,
  saveOfflineBooksSettings,
  getStorageQuotaLevel,
} from "./offlineBookStorage";
import {
  DEFAULT_OFFLINE_SETTINGS,
  DEFAULT_MAX_STORAGE_QUOTA,
  OFFLINE_BOOKS_DB_NAME,
  OFFLINE_BOOKS_DB_VERSION,
  OFFLINE_BOOKS_STORES,
  MAX_BOOK_SIZE,
  MIN_STORAGE_BUFFER,
  STORAGE_WARNING_THRESHOLD,
  STORAGE_CRITICAL_THRESHOLD,
  FILE_TYPE_MIME_MAP,
  MIME_TO_FILE_TYPE,
  OFFLINE_BOOKS_SETTINGS_KEY,
} from "./offlineBookTypes";
import type {
  StorageQuota,
  OfflineBookMetadata,
  OfflineBookContent,
  OfflineBooksSettings,
  OfflineBookFileType,
} from "./offlineBookTypes";

// ============================================================================
// Constants Tests
// ============================================================================

describe("Offline Book Types Constants", () => {
  describe("Database Configuration", () => {
    it("should have correct database name", () => {
      expect(OFFLINE_BOOKS_DB_NAME).toBe("read-master-offline-books");
    });

    it("should have database version of 1", () => {
      expect(OFFLINE_BOOKS_DB_VERSION).toBe(1);
    });

    it("should have correct store names", () => {
      expect(OFFLINE_BOOKS_STORES.METADATA).toBe("bookMetadata");
      expect(OFFLINE_BOOKS_STORES.CONTENT).toBe("bookContent");
      expect(OFFLINE_BOOKS_STORES.COVERS).toBe("bookCovers");
    });
  });

  describe("Storage Limits", () => {
    it("should have default max quota of 500MB", () => {
      expect(DEFAULT_MAX_STORAGE_QUOTA).toBe(500 * 1024 * 1024);
    });

    it("should have max book size of 50MB", () => {
      expect(MAX_BOOK_SIZE).toBe(50 * 1024 * 1024);
    });

    it("should have min storage buffer of 10MB", () => {
      expect(MIN_STORAGE_BUFFER).toBe(10 * 1024 * 1024);
    });

    it("should have warning threshold at 80%", () => {
      expect(STORAGE_WARNING_THRESHOLD).toBe(0.8);
    });

    it("should have critical threshold at 95%", () => {
      expect(STORAGE_CRITICAL_THRESHOLD).toBe(0.95);
    });
  });

  describe("File Type Mappings", () => {
    it("should map epub MIME type", () => {
      expect(FILE_TYPE_MIME_MAP.epub).toContain("application/epub+zip");
    });

    it("should map pdf MIME type", () => {
      expect(FILE_TYPE_MIME_MAP.pdf).toContain("application/pdf");
    });

    it("should map txt MIME type", () => {
      expect(FILE_TYPE_MIME_MAP.txt).toContain("text/plain");
    });

    it("should map html MIME type", () => {
      expect(FILE_TYPE_MIME_MAP.html).toContain("text/html");
    });

    it("should map docx MIME type", () => {
      expect(FILE_TYPE_MIME_MAP.docx).toContain(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    });

    it("should have reverse MIME to file type mapping", () => {
      expect(MIME_TO_FILE_TYPE["application/epub+zip"]).toBe("epub");
      expect(MIME_TO_FILE_TYPE["application/pdf"]).toBe("pdf");
      expect(MIME_TO_FILE_TYPE["text/plain"]).toBe("txt");
      expect(MIME_TO_FILE_TYPE["text/html"]).toBe("html");
    });
  });

  describe("Default Settings", () => {
    it("should have correct default offline settings", () => {
      expect(DEFAULT_OFFLINE_SETTINGS).toEqual({
        maxStorageQuota: DEFAULT_MAX_STORAGE_QUOTA,
        autoCleanup: true,
        cleanupAfterDays: 30,
        wifiOnly: false,
        showNotifications: true,
      });
    });
  });
});

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe("Utility Functions", () => {
  describe("isIndexedDBAvailable", () => {
    it("should return boolean based on IndexedDB availability", () => {
      // jsdom doesn't always provide indexedDB, so just verify it returns a boolean
      const result = isIndexedDBAvailable();
      expect(typeof result).toBe("boolean");
      // The actual value depends on test environment
      // In real browsers, this should be true
      expect(result).toBe("indexedDB" in window);
    });
  });

  describe("formatBytes", () => {
    it("should format 0 bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("should format bytes", () => {
      expect(formatBytes(500)).toBe("500 B");
    });

    it("should format kilobytes", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
    });

    it("should format megabytes", () => {
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
    });

    it("should format gigabytes", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
      expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
    });

    it("should handle edge cases", () => {
      expect(formatBytes(1)).toBe("1 B");
      expect(formatBytes(1023)).toBe("1023 B");
      expect(formatBytes(1024 * 1024 - 1)).toMatch(/KB$/);
    });
  });

  describe("getFileTypeFromMime", () => {
    it("should return epub for epub mime type", () => {
      expect(getFileTypeFromMime("application/epub+zip")).toBe("epub");
    });

    it("should return pdf for pdf mime type", () => {
      expect(getFileTypeFromMime("application/pdf")).toBe("pdf");
    });

    it("should return txt for text/plain mime type", () => {
      expect(getFileTypeFromMime("text/plain")).toBe("txt");
    });

    it("should return html for text/html mime type", () => {
      expect(getFileTypeFromMime("text/html")).toBe("html");
    });

    it("should return docx for docx mime type", () => {
      expect(
        getFileTypeFromMime(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
      ).toBe("docx");
    });

    it("should return unknown for unrecognized mime types", () => {
      expect(getFileTypeFromMime("application/unknown")).toBe("unknown");
      expect(getFileTypeFromMime("")).toBe("unknown");
      expect(getFileTypeFromMime("image/png")).toBe("unknown");
    });
  });

  describe("blobToDataUrl", () => {
    it("should convert blob to data URL", async () => {
      const blob = new Blob(["test content"], { type: "text/plain" });
      const dataUrl = await blobToDataUrl(blob);

      expect(dataUrl).toMatch(/^data:text\/plain;base64,/);
    });

    it("should handle empty blob", async () => {
      const blob = new Blob([], { type: "text/plain" });
      const dataUrl = await blobToDataUrl(blob);

      expect(dataUrl).toBe("data:text/plain;base64,");
    });

    it("should handle binary data", async () => {
      const buffer = new Uint8Array([0, 1, 2, 3, 4]).buffer;
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      const dataUrl = await blobToDataUrl(blob);

      expect(dataUrl).toMatch(/^data:application\/octet-stream;base64,/);
    });
  });

  describe("arrayBufferToBlob", () => {
    it("should convert ArrayBuffer to Blob", () => {
      const buffer = new Uint8Array([1, 2, 3, 4]).buffer;
      const blob = arrayBufferToBlob(buffer, "application/pdf");

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/pdf");
      expect(blob.size).toBe(4);
    });

    it("should handle empty buffer", () => {
      const buffer = new ArrayBuffer(0);
      const blob = arrayBufferToBlob(buffer, "text/plain");

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(0);
    });
  });
});

// ============================================================================
// Settings Tests
// ============================================================================

describe("Settings Management", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getOfflineBooksSettings", () => {
    it("should return default settings when nothing stored", () => {
      const settings = getOfflineBooksSettings();
      expect(settings).toEqual(DEFAULT_OFFLINE_SETTINGS);
    });

    it("should return stored settings", () => {
      const customSettings: OfflineBooksSettings = {
        maxStorageQuota: 1000 * 1024 * 1024,
        autoCleanup: false,
        cleanupAfterDays: 60,
        wifiOnly: true,
        showNotifications: false,
      };
      localStorage.setItem(
        OFFLINE_BOOKS_SETTINGS_KEY,
        JSON.stringify(customSettings)
      );

      const settings = getOfflineBooksSettings();
      expect(settings).toEqual(customSettings);
    });

    it("should merge partial stored settings with defaults", () => {
      const partialSettings = { autoCleanup: false };
      localStorage.setItem(
        OFFLINE_BOOKS_SETTINGS_KEY,
        JSON.stringify(partialSettings)
      );

      const settings = getOfflineBooksSettings();
      expect(settings.autoCleanup).toBe(false);
      expect(settings.maxStorageQuota).toBe(
        DEFAULT_OFFLINE_SETTINGS.maxStorageQuota
      );
      expect(settings.cleanupAfterDays).toBe(
        DEFAULT_OFFLINE_SETTINGS.cleanupAfterDays
      );
    });

    it("should return defaults for invalid JSON", () => {
      localStorage.setItem(OFFLINE_BOOKS_SETTINGS_KEY, "invalid json");

      const settings = getOfflineBooksSettings();
      expect(settings).toEqual(DEFAULT_OFFLINE_SETTINGS);
    });
  });

  describe("saveOfflineBooksSettings", () => {
    it("should save partial settings", () => {
      saveOfflineBooksSettings({ autoCleanup: false });

      const stored = JSON.parse(
        localStorage.getItem(OFFLINE_BOOKS_SETTINGS_KEY) ?? "{}"
      );
      expect(stored.autoCleanup).toBe(false);
      expect(stored.maxStorageQuota).toBe(
        DEFAULT_OFFLINE_SETTINGS.maxStorageQuota
      );
    });

    it("should merge with existing settings", () => {
      saveOfflineBooksSettings({ autoCleanup: false });
      saveOfflineBooksSettings({ wifiOnly: true });

      const settings = getOfflineBooksSettings();
      expect(settings.autoCleanup).toBe(false);
      expect(settings.wifiOnly).toBe(true);
    });

    it("should handle multiple setting updates", () => {
      saveOfflineBooksSettings({
        maxStorageQuota: 100 * 1024 * 1024,
        cleanupAfterDays: 7,
      });

      const settings = getOfflineBooksSettings();
      expect(settings.maxStorageQuota).toBe(100 * 1024 * 1024);
      expect(settings.cleanupAfterDays).toBe(7);
    });
  });
});

// ============================================================================
// Storage Quota Level Tests
// ============================================================================

describe("Storage Quota Level", () => {
  describe("getStorageQuotaLevel", () => {
    it('should return "normal" for low usage', () => {
      const quota: StorageQuota = {
        total: 1000,
        used: 500,
        available: 500,
        usagePercentage: 50,
        isQuotaExceeded: false,
        bookCount: 5,
        totalBooksSize: 400,
      };

      expect(getStorageQuotaLevel(quota)).toBe("normal");
    });

    it('should return "warning" at 80% usage', () => {
      const quota: StorageQuota = {
        total: 1000,
        used: 800,
        available: 200,
        usagePercentage: 80,
        isQuotaExceeded: false,
        bookCount: 10,
        totalBooksSize: 750,
      };

      expect(getStorageQuotaLevel(quota)).toBe("warning");
    });

    it('should return "warning" between 80% and 95%', () => {
      const quota: StorageQuota = {
        total: 1000,
        used: 900,
        available: 100,
        usagePercentage: 90,
        isQuotaExceeded: false,
        bookCount: 15,
        totalBooksSize: 850,
      };

      expect(getStorageQuotaLevel(quota)).toBe("warning");
    });

    it('should return "critical" at 95% usage', () => {
      const quota: StorageQuota = {
        total: 1000,
        used: 950,
        available: 50,
        usagePercentage: 95,
        isQuotaExceeded: false,
        bookCount: 20,
        totalBooksSize: 900,
      };

      expect(getStorageQuotaLevel(quota)).toBe("critical");
    });

    it('should return "exceeded" when quota is exceeded', () => {
      const quota: StorageQuota = {
        total: 1000,
        used: 999,
        available: 1,
        usagePercentage: 99.9,
        isQuotaExceeded: true,
        bookCount: 25,
        totalBooksSize: 950,
      };

      expect(getStorageQuotaLevel(quota)).toBe("exceeded");
    });

    it('should return "exceeded" even if usage is normal but quota is exceeded', () => {
      const quota: StorageQuota = {
        total: 1000,
        used: 500,
        available: 5, // Very low available despite low percentage
        usagePercentage: 50,
        isQuotaExceeded: true,
        bookCount: 5,
        totalBooksSize: 400,
      };

      expect(getStorageQuotaLevel(quota)).toBe("exceeded");
    });

    it('should return "normal" at 79% usage (just below warning)', () => {
      const quota: StorageQuota = {
        total: 1000,
        used: 790,
        available: 210,
        usagePercentage: 79,
        isQuotaExceeded: false,
        bookCount: 8,
        totalBooksSize: 700,
      };

      expect(getStorageQuotaLevel(quota)).toBe("normal");
    });

    it('should return "critical" at 99% usage', () => {
      const quota: StorageQuota = {
        total: 1000,
        used: 990,
        available: 10,
        usagePercentage: 99,
        isQuotaExceeded: false,
        bookCount: 22,
        totalBooksSize: 950,
      };

      expect(getStorageQuotaLevel(quota)).toBe("critical");
    });
  });
});

// ============================================================================
// Type Tests (compile-time verification)
// ============================================================================

describe("Type Definitions", () => {
  it("should have valid OfflineBookMetadata type", () => {
    const metadata: OfflineBookMetadata = {
      bookId: "test-123",
      title: "Test Book",
      author: "Test Author",
      fileType: "epub",
      downloadedAt: Date.now(),
      lastAccessedAt: Date.now(),
      contentSize: 1024,
      progress: 50,
      status: "reading",
      downloadStatus: "completed",
    };

    expect(metadata.bookId).toBe("test-123");
    expect(metadata.title).toBe("Test Book");
    expect(metadata.downloadStatus).toBe("completed");
  });

  it("should have valid OfflineBookContent type", () => {
    const content: OfflineBookContent = {
      data: new ArrayBuffer(100),
      mimeType: "application/epub+zip",
      size: 100,
    };

    expect(content.data.byteLength).toBe(100);
    expect(content.mimeType).toBe("application/epub+zip");
    expect(content.size).toBe(100);
  });

  it("should accept all valid file types", () => {
    const validTypes: OfflineBookFileType[] = [
      "epub",
      "pdf",
      "txt",
      "html",
      "docx",
      "unknown",
    ];

    validTypes.forEach((type) => {
      const metadata: Pick<OfflineBookMetadata, "fileType"> = {
        fileType: type,
      };
      expect(metadata.fileType).toBe(type);
    });
  });

  it("should accept all valid download statuses", () => {
    const statuses = [
      "pending",
      "downloading",
      "completed",
      "failed",
      "paused",
    ] as const;

    statuses.forEach((status) => {
      const metadata: Pick<OfflineBookMetadata, "downloadStatus"> = {
        downloadStatus: status,
      };
      expect(metadata.downloadStatus).toBe(status);
    });
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  describe("formatBytes edge cases", () => {
    it("should handle very large numbers", () => {
      const result = formatBytes(10 * 1024 * 1024 * 1024); // 10 GB
      expect(result).toBe("10 GB");
    });

    it("should handle fractional bytes (rounds down)", () => {
      const result = formatBytes(1.5);
      expect(result).toBe("1.5 B");
    });

    it("should handle exact boundaries", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
    });
  });

  describe("MIME type edge cases", () => {
    it("should handle case variations", () => {
      // Our mapping is case-sensitive, should return unknown for wrong case
      expect(getFileTypeFromMime("APPLICATION/PDF")).toBe("unknown");
    });

    it("should handle MIME types with parameters", () => {
      // Our basic mapping doesn't handle parameters
      expect(getFileTypeFromMime("text/plain; charset=utf-8")).toBe("unknown");
    });

    it("should handle empty string", () => {
      expect(getFileTypeFromMime("")).toBe("unknown");
    });

    it("should handle whitespace", () => {
      expect(getFileTypeFromMime(" ")).toBe("unknown");
    });
  });

  describe("Settings edge cases", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it("should handle empty object in localStorage", () => {
      localStorage.setItem(OFFLINE_BOOKS_SETTINGS_KEY, "{}");
      const settings = getOfflineBooksSettings();
      expect(settings).toEqual(DEFAULT_OFFLINE_SETTINGS);
    });

    it("should handle null values in stored settings", () => {
      localStorage.setItem(
        OFFLINE_BOOKS_SETTINGS_KEY,
        JSON.stringify({ autoCleanup: null })
      );
      const settings = getOfflineBooksSettings();
      // null overwrites the default, so it will be null
      expect(settings.autoCleanup).toBeNull();
    });

    it("should preserve extra properties when saving", () => {
      // Save some initial settings
      saveOfflineBooksSettings({ wifiOnly: true });

      // Save more settings
      saveOfflineBooksSettings({ autoCleanup: false });

      // Both should be preserved
      const settings = getOfflineBooksSettings();
      expect(settings.wifiOnly).toBe(true);
      expect(settings.autoCleanup).toBe(false);
    });
  });

  describe("Storage quota edge cases", () => {
    it("should handle zero total quota", () => {
      const quota: StorageQuota = {
        total: 0,
        used: 0,
        available: 0,
        usagePercentage: 0,
        isQuotaExceeded: true,
        bookCount: 0,
        totalBooksSize: 0,
      };

      // Should handle division by zero gracefully
      expect(getStorageQuotaLevel(quota)).toBe("exceeded");
    });

    it("should handle negative values gracefully", () => {
      const quota: StorageQuota = {
        total: 1000,
        used: -100, // Invalid but possible edge case
        available: 1100,
        usagePercentage: -10,
        isQuotaExceeded: false,
        bookCount: 0,
        totalBooksSize: 0,
      };

      // Should return normal for negative usage
      expect(getStorageQuotaLevel(quota)).toBe("normal");
    });
  });
});

// ============================================================================
// Integration Tests (Basic - no actual IndexedDB interaction)
// ============================================================================

describe("Integration-like Tests", () => {
  it("should create valid metadata object structure", () => {
    const now = Date.now();
    const metadata: OfflineBookMetadata = {
      bookId: "book-001",
      title: "Test Book Title",
      author: "Test Author Name",
      coverUrl: "https://example.com/cover.jpg",
      coverDataUrl: "data:image/jpeg;base64,abc123",
      fileType: "epub",
      downloadedAt: now,
      lastAccessedAt: now,
      contentSize: 5 * 1024 * 1024, // 5MB
      progress: 25,
      readingPosition: {
        location: "epubcfi(/6/4!/4/2/2)",
        percentage: 25,
        chapterIndex: 1,
        updatedAt: now,
      },
      status: "reading",
      downloadStatus: "completed",
    };

    // Verify all fields
    expect(metadata.bookId).toBe("book-001");
    expect(metadata.title).toBe("Test Book Title");
    expect(metadata.author).toBe("Test Author Name");
    expect(metadata.coverUrl).toBe("https://example.com/cover.jpg");
    expect(metadata.coverDataUrl).toMatch(/^data:image/);
    expect(metadata.fileType).toBe("epub");
    expect(metadata.downloadedAt).toBe(now);
    expect(metadata.lastAccessedAt).toBe(now);
    expect(metadata.contentSize).toBe(5 * 1024 * 1024);
    expect(metadata.progress).toBe(25);
    expect(metadata.readingPosition?.location).toBe("epubcfi(/6/4!/4/2/2)");
    expect(metadata.readingPosition?.percentage).toBe(25);
    expect(metadata.status).toBe("reading");
    expect(metadata.downloadStatus).toBe("completed");
  });

  it("should create valid content object structure", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const content: OfflineBookContent = {
      data,
      mimeType: "application/epub+zip",
      size: 5,
    };

    expect(content.data).toBe(data);
    expect(content.data.byteLength).toBe(5);
    expect(content.mimeType).toBe("application/epub+zip");
    expect(content.size).toBe(5);
  });

  it("should calculate storage quota correctly", () => {
    const total = 500 * 1024 * 1024; // 500MB
    const used = 400 * 1024 * 1024; // 400MB
    const available = total - used;
    const usagePercentage = (used / total) * 100;

    const quota: StorageQuota = {
      total,
      used,
      available,
      usagePercentage,
      isQuotaExceeded: available < MIN_STORAGE_BUFFER,
      bookCount: 10,
      totalBooksSize: 350 * 1024 * 1024,
    };

    expect(quota.total).toBe(500 * 1024 * 1024);
    expect(quota.available).toBe(100 * 1024 * 1024);
    expect(quota.usagePercentage).toBe(80);
    expect(quota.isQuotaExceeded).toBe(false);
    expect(getStorageQuotaLevel(quota)).toBe("warning");
  });
});
