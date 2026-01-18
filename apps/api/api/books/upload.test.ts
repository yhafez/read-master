/**
 * Tests for POST /api/books/upload endpoint
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Mock modules before imports
vi.mock("../../src/middleware/auth.js", () => ({
  withAuth: <T extends (...args: unknown[]) => unknown>(handler: T) => handler,
  authenticateRequest: vi.fn(),
}));

vi.mock("../../src/services/db.js", () => ({
  db: {
    book: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
  getUserByClerkId: vi.fn(),
}));

vi.mock("../../src/services/storage.js", () => ({
  storage: {
    uploadFile: vi.fn(),
    buildBookKey: vi.fn(),
    buildCoverKey: vi.fn(),
  },
  storageUtils: {
    isValidFileSize: vi.fn(),
  },
  MaxFileSize: {
    BOOK: 50 * 1024 * 1024,
  },
  BookExtensions: ["pdf", "epub", "doc", "docx", "txt", "html"],
}));

vi.mock("../../src/services/books.js", () => ({
  parseEPUBFromBuffer: vi.fn(),
  parsePDFFromBuffer: vi.fn(),
  parseDOCXFromBuffer: vi.fn(),
  countWords: vi.fn(),
  calculateReadingTime: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@read-master/shared", () => ({
  getTierLimits: vi.fn(),
  isWithinLimit: vi.fn(),
}));

// Import after mocks
import handler from "./upload.js";
import { db, getUserByClerkId } from "../../src/services/db.js";
import { storage, storageUtils } from "../../src/services/storage.js";
import {
  parsePDFFromBuffer,
  parseEPUBFromBuffer,
  parseDOCXFromBuffer,
  countWords,
  calculateReadingTime,
} from "../../src/services/books.js";
import { isWithinLimit, getTierLimits } from "@read-master/shared";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRequest(
  overrides: Partial<VercelRequest> & { auth?: { userId: string } } = {}
): VercelRequest & { auth: { userId: string } } {
  return {
    method: "POST",
    headers: {
      "content-type": "multipart/form-data",
      authorization: "Bearer test-token",
    },
    body: {},
    auth: { userId: "user_test123" },
    ...overrides,
  } as VercelRequest & { auth: { userId: string } };
}

function createMockResponse(): VercelResponse & {
  _status: number;
  _json: unknown;
  _ended: boolean;
} {
  const res = {
    _status: 200,
    _json: null as unknown,
    _ended: false,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(data: unknown) {
      this._json = data;
      return this;
    },
    end() {
      this._ended = true;
      return this;
    },
  };
  return res as unknown as VercelResponse & {
    _status: number;
    _json: unknown;
    _ended: boolean;
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("POST /api/books/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(getUserByClerkId).mockResolvedValue({
      id: "user_123",
      clerkId: "user_test123",
      tier: "FREE",
    } as Awaited<ReturnType<typeof getUserByClerkId>>);
    vi.mocked(db.book.count).mockResolvedValue(0);
    vi.mocked(isWithinLimit).mockReturnValue(true);
    vi.mocked(getTierLimits).mockReturnValue({
      maxBooks: 3,
      maxAiInteractionsPerDay: 5,
      maxActiveFlashcards: 50,
      maxTtsDownloadsPerMonth: 0,
      ttsProvider: "web_speech",
      showAds: true,
      canCreateReadingGroups: false,
      canCreateCurriculums: false,
      hasApiAccess: false,
      hasPrioritySupport: false,
      hasEarlyAccess: false,
      hasFullAnalytics: false,
      hasAcademicCitations: false,
      hasBulkImport: false,
      aiGuideDepth: "basic",
      maxUploadSize: 50 * 1024 * 1024,
    });
    vi.mocked(storageUtils.isValidFileSize).mockReturnValue(true);
    vi.mocked(storage.buildBookKey).mockReturnValue(
      "users/user_123/books/book_123/test.pdf"
    );
    vi.mocked(storage.buildCoverKey).mockReturnValue(
      "covers/book_123/cover.jpg"
    );
    vi.mocked(storage.uploadFile).mockResolvedValue({
      success: true,
      key: "test-key",
      bucket: "test-bucket",
    });
    vi.mocked(db.book.create).mockResolvedValue({
      id: "book_123",
      userId: "user_123",
      title: "Test Book",
      author: "Test Author",
      description: "A test book",
      source: "UPLOAD",
      fileType: "PDF",
      filePath: "users/user_123/books/book_123/test.pdf",
      coverImage: null,
      wordCount: 10000,
      estimatedReadTime: 40,
      genre: null,
      tags: [],
      language: "en",
      isPublic: false,
      status: "WANT_TO_READ",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      chapters: [],
    } as unknown as Awaited<ReturnType<typeof db.book.create>>);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Method Validation", () => {
    it("should reject non-POST requests", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(405);
      expect(res._json).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: expect.stringContaining("Method not allowed"),
        },
      });
    });

    it("should reject PUT requests", async () => {
      const req = createMockRequest({ method: "PUT" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(405);
    });

    it("should reject DELETE requests", async () => {
      const req = createMockRequest({ method: "DELETE" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(405);
    });
  });

  describe("User Validation", () => {
    it("should return 404 if user not found", async () => {
      vi.mocked(getUserByClerkId).mockResolvedValue(null);

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test content"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(404);
      expect(res._json).toMatchObject({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    });

    it("should check tier limits for free users", async () => {
      vi.mocked(isWithinLimit).mockReturnValue(false);
      vi.mocked(db.book.count).mockResolvedValue(3);

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test content"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(403);
      expect(res._json).toMatchObject({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: expect.stringContaining("book limit"),
        },
      });
    });

    it("should allow upload when within tier limits", async () => {
      vi.mocked(isWithinLimit).mockReturnValue(true);
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Test PDF",
            author: "Author",
            subject: "",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 10,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "test content",
          totalWordCount: 1000,
          estimatedReadingTimeMinutes: 4,
          sections: [],
          pageCount: 10,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test content"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(201);
    });
  });

  describe("File Validation", () => {
    it("should reject requests without a file", async () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: expect.stringContaining("No file provided"),
        },
      });
    });

    it("should reject files exceeding size limit", async () => {
      vi.mocked(storageUtils.isValidFileSize).mockReturnValue(false);

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test content"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: expect.stringContaining("File size exceeds"),
        },
      });
    });

    it("should reject unsupported file types", async () => {
      const req = createMockRequest({
        body: {
          file: Buffer.from("executable content"),
          filename: "test.exe",
          contentType: "application/octet-stream",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: expect.stringContaining("Unsupported file type"),
        },
      });
    });
  });

  describe("File Parsing", () => {
    it("should parse PDF files successfully", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Test PDF",
            author: "PDF Author",
            subject: "PDF Description",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 10,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "PDF content here",
          totalWordCount: 5000,
          estimatedReadingTimeMinutes: 20,
          sections: [],
          pageCount: 10,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test content"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(parsePDFFromBuffer).toHaveBeenCalled();
      expect(res._status).toBe(201);
    });

    it("should parse EPUB files successfully", async () => {
      vi.mocked(parseEPUBFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Test EPUB",
            author: "EPUB Author",
            description: "EPUB Description",
            language: "en",
            publisher: "",
            publicationDate: "",
            isbn: "",
            subjects: [],
            rights: "",
            identifier: "",
          },
          rawContent: "EPUB content here",
          totalWordCount: 8000,
          estimatedReadingTimeMinutes: 32,
          chapters: [],
          coverImage: {
            data: Buffer.from("cover image data"),
            mimeType: "image/jpeg",
            filename: "cover.jpg",
          },
          hasDRM: false,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("PK epub content"),
          filename: "test.epub",
          contentType: "application/epub+zip",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(parseEPUBFromBuffer).toHaveBeenCalled();
      expect(res._status).toBe(201);
    });

    it("should parse DOCX files successfully", async () => {
      vi.mocked(parseDOCXFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Test DOCX",
            author: "DOCX Author",
            description: "",
            subject: "",
            creator: "",
            lastModifiedBy: "",
            revision: "",
            created: "",
            modified: "",
          },
          rawContent: "DOCX content here",
          htmlContent: "<p>DOCX content here</p>",
          totalWordCount: 3000,
          estimatedReadingTimeMinutes: 12,
          sections: [],
          messages: [],
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("PK docx content"),
          filename: "test.docx",
          contentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(parseDOCXFromBuffer).toHaveBeenCalled();
      expect(res._status).toBe(201);
    });

    it("should handle text files", async () => {
      vi.mocked(countWords).mockReturnValue(500);
      vi.mocked(calculateReadingTime).mockReturnValue(2);

      const req = createMockRequest({
        body: {
          file: Buffer.from("Plain text content here"),
          filename: "test.txt",
          contentType: "text/plain",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(countWords).toHaveBeenCalled();
      expect(res._status).toBe(201);
    });

    it("should return error for parse failures", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: false,
        error: "Failed to parse PDF: corrupted file",
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-corrupted"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: expect.stringContaining("Failed to parse PDF"),
        },
      });
    });
  });

  describe("Storage Upload", () => {
    it("should upload file to R2 storage", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Test",
            author: "",
            subject: "",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 1,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "content",
          totalWordCount: 100,
          estimatedReadingTimeMinutes: 1,
          sections: [],
          pageCount: 1,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(storage.uploadFile).toHaveBeenCalled();
      expect(storage.buildBookKey).toHaveBeenCalled();
    });

    it("should handle R2 upload failure", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Test",
            author: "",
            subject: "",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 1,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "content",
          totalWordCount: 100,
          estimatedReadingTimeMinutes: 1,
          sections: [],
          pageCount: 1,
        },
      });
      vi.mocked(storage.uploadFile).mockResolvedValue({
        success: false,
        key: "",
        bucket: "",
        error: "Storage error",
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: expect.stringContaining("Failed to store file"),
        },
      });
    });

    it("should upload cover image for EPUB files", async () => {
      vi.mocked(parseEPUBFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Test EPUB",
            author: "",
            description: "",
            language: "en",
            publisher: "",
            publicationDate: "",
            isbn: "",
            subjects: [],
            rights: "",
            identifier: "",
          },
          rawContent: "content",
          totalWordCount: 100,
          estimatedReadingTimeMinutes: 1,
          chapters: [],
          coverImage: {
            data: Buffer.from("cover data"),
            mimeType: "image/jpeg",
            filename: "cover.jpg",
          },
          hasDRM: false,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("PK epub"),
          filename: "test.epub",
          contentType: "application/epub+zip",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      // Should call uploadFile twice: once for book, once for cover
      expect(storage.uploadFile).toHaveBeenCalledTimes(2);
      expect(storage.buildCoverKey).toHaveBeenCalled();
    });
  });

  describe("Database Creation", () => {
    it("should create book record in database", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Database Test",
            author: "Test Author",
            subject: "Test Description",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 20,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "content",
          totalWordCount: 2000,
          estimatedReadingTimeMinutes: 8,
          sections: [],
          pageCount: 20,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test"),
          filename: "test.pdf",
          contentType: "application/pdf",
          title: "Custom Title",
          author: "Custom Author",
          genre: "Fiction",
          tags: "tag1,tag2",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(db.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Custom Title",
            author: "Custom Author",
            source: "UPLOAD",
            fileType: "PDF",
            genre: "Fiction",
            tags: ["tag1", "tag2"],
          }),
        })
      );
    });

    it("should use parsed metadata when custom metadata not provided", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Parsed Title",
            author: "Parsed Author",
            subject: "Parsed Description",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 10,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "content",
          totalWordCount: 1000,
          estimatedReadingTimeMinutes: 4,
          sections: [],
          pageCount: 10,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(db.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Parsed Title",
            author: "Parsed Author",
            description: "Parsed Description",
          }),
        })
      );
    });
  });

  describe("Success Response", () => {
    it("should return 201 with created book data", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Success Test",
            author: "",
            subject: "",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 5,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "content",
          totalWordCount: 500,
          estimatedReadingTimeMinutes: 2,
          sections: [],
          pageCount: 5,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(201);
      expect(res._json).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          source: "UPLOAD",
          fileType: "PDF",
          createdAt: expect.any(String),
        }),
      });
    });
  });

  describe("Metadata Validation", () => {
    it("should validate title length", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "T",
            author: "",
            subject: "",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 1,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "content",
          totalWordCount: 100,
          estimatedReadingTimeMinutes: 1,
          sections: [],
          pageCount: 1,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test"),
          filename: "test.pdf",
          contentType: "application/pdf",
          title: "a".repeat(501), // Exceeds 500 char limit
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._json).toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid metadata",
        },
      });
    });

    it("should accept valid language codes", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Test",
            author: "",
            subject: "",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 1,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "content",
          totalWordCount: 100,
          estimatedReadingTimeMinutes: 1,
          sections: [],
          pageCount: 1,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test"),
          filename: "test.pdf",
          contentType: "application/pdf",
          language: "es",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(201);
      expect(db.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            language: "es",
          }),
        })
      );
    });

    it("should parse tags from comma-separated string", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Test",
            author: "",
            subject: "",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 1,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "content",
          totalWordCount: 100,
          estimatedReadingTimeMinutes: 1,
          sections: [],
          pageCount: 1,
        },
      });

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test"),
          filename: "test.pdf",
          contentType: "application/pdf",
          tags: "fiction, science, adventure",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(db.book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: ["fiction", "science", "adventure"],
          }),
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Test",
            author: "",
            subject: "",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 1,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "content",
          totalWordCount: 100,
          estimatedReadingTimeMinutes: 1,
          sections: [],
          pageCount: 1,
        },
      });
      vi.mocked(db.book.create).mockRejectedValue(new Error("Database error"));

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: expect.stringContaining("Failed to upload book"),
        },
      });
    });

    it("should handle getUserByClerkId errors", async () => {
      vi.mocked(getUserByClerkId).mockRejectedValue(
        new Error("DB connection error")
      );

      const req = createMockRequest({
        body: {
          file: Buffer.from("%PDF-1.4 test"),
          filename: "test.pdf",
          contentType: "application/pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(500);
    });
  });

  describe("Base64 File Upload", () => {
    it("should handle base64 encoded file data", async () => {
      vi.mocked(parsePDFFromBuffer).mockResolvedValue({
        success: true,
        data: {
          metadata: {
            title: "Base64 Test",
            author: "",
            subject: "",
            creator: "",
            producer: "",
            creationDate: "",
            modificationDate: "",
            pageCount: 1,
            pdfVersion: "1.4",
            isEncrypted: false,
          },
          rawContent: "content",
          totalWordCount: 100,
          estimatedReadingTimeMinutes: 1,
          sections: [],
          pageCount: 1,
        },
      });

      const pdfContent = Buffer.from("%PDF-1.4 test").toString("base64");
      const req = createMockRequest({
        body: {
          file: `data:application/pdf;base64,${pdfContent}`,
          filename: "test.pdf",
        },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(201);
    });
  });
});

describe("Upload endpoint exports", () => {
  it("should export default handler function", async () => {
    const module = await import("./upload.js");
    expect(typeof module.default).toBe("function");
  });
});
