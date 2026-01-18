/**
 * Cloudflare R2 Storage Service Tests
 *
 * Tests for the R2 storage service functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock AWS SDK S3 client
const mockSend = vi.fn();
const mockS3Client = {
  send: mockSend,
};

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => mockS3Client),
  PutObjectCommand: vi.fn((input) => ({ input, _type: "PutObjectCommand" })),
  GetObjectCommand: vi.fn((input) => ({ input, _type: "GetObjectCommand" })),
  DeleteObjectCommand: vi.fn((input) => ({
    input,
    _type: "DeleteObjectCommand",
  })),
  HeadObjectCommand: vi.fn((input) => ({ input, _type: "HeadObjectCommand" })),
  ListObjectsV2Command: vi.fn((input) => ({
    input,
    _type: "ListObjectsV2Command",
  })),
  CopyObjectCommand: vi.fn((input) => ({ input, _type: "CopyObjectCommand" })),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-url.example.com"),
}));

// Mock the logger
vi.mock("../utils/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    http: vi.fn(),
  },
}));

// Import after mocking
import {
  storage,
  storageUtils,
  StorageNamespace,
  MaxFileSize,
  ContentTypes,
  BookExtensions,
  ImageExtensions,
  AudioExtensions,
  uploadFile,
  getFile,
  deleteFile,
  deleteFiles,
  getFileInfo,
  fileExists,
  listFiles,
  copyFile,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  getSignedUrl,
  buildBookKey,
  buildCoverKey,
  buildAudioKey,
  buildAvatarKey,
  buildTempKey,
  getFilenameFromKey,
  getExtension,
  inferContentType,
  getStorageClient,
  getBucketName,
  getPublicUrlBase,
  isStorageAvailable,
  resetStorageClient,
  isValidFileSize,
  hasAllowedExtension,
  type UploadOptions,
  type SignedUrlOptions,
  type ListOptions,
  type UploadResult,
  type GetFileResult,
  type FileInfo,
  type ListResult,
  type StorageNamespaceType,
} from "./storage.js";

describe("R2 Storage Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables
    process.env.R2_ACCOUNT_ID = "test-account-id";
    process.env.R2_ACCESS_KEY_ID = "test-access-key";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.R2_BUCKET_NAME = "test-bucket";
    process.env.R2_PUBLIC_URL = "https://test.r2.dev";
    // Reset the client
    resetStorageClient();
  });

  afterEach(() => {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_PUBLIC_URL;
    resetStorageClient();
  });

  // ============================================================================
  // Type Export Tests
  // ============================================================================

  describe("Type Exports", () => {
    it("should export UploadOptions type", () => {
      const options: UploadOptions = {
        contentType: "application/pdf",
        cacheControl: "max-age=3600",
        metadata: { author: "Test" },
        contentDisposition: "attachment",
      };
      expect(options.contentType).toBe("application/pdf");
    });

    it("should export SignedUrlOptions type", () => {
      const options: SignedUrlOptions = {
        expiresIn: 3600,
        contentDisposition: 'attachment; filename="test.pdf"',
        responseContentType: "application/pdf",
      };
      expect(options.expiresIn).toBe(3600);
    });

    it("should export ListOptions type", () => {
      const options: ListOptions = {
        maxKeys: 100,
        continuationToken: "token123",
        delimiter: "/",
      };
      expect(options.maxKeys).toBe(100);
    });

    it("should export UploadResult type", () => {
      const result: UploadResult = {
        success: true,
        key: "test/file.pdf",
        bucket: "test-bucket",
        publicUrl: "https://test.r2.dev/test/file.pdf",
      };
      expect(result.success).toBe(true);
    });

    it("should export GetFileResult type", () => {
      const result: GetFileResult = {
        success: true,
        data: Buffer.from("test"),
        contentType: "application/pdf",
        contentLength: 4,
      };
      expect(result.success).toBe(true);
    });

    it("should export FileInfo type", () => {
      const info: FileInfo = {
        exists: true,
        contentType: "application/pdf",
        contentLength: 1024,
        lastModified: new Date(),
        etag: '"abc123"',
      };
      expect(info.exists).toBe(true);
    });

    it("should export ListResult type", () => {
      const result: ListResult = {
        success: true,
        keys: ["file1.pdf", "file2.pdf"],
        prefixes: ["folder1/", "folder2/"],
        isTruncated: false,
      };
      expect(result.success).toBe(true);
    });

    it("should export StorageNamespaceType type", () => {
      const namespace: StorageNamespaceType = StorageNamespace.BOOKS;
      expect(namespace).toBe("books");
    });
  });

  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe("StorageNamespace", () => {
    it("should have BOOKS namespace", () => {
      expect(StorageNamespace.BOOKS).toBe("books");
    });

    it("should have COVERS namespace", () => {
      expect(StorageNamespace.COVERS).toBe("covers");
    });

    it("should have AUDIO namespace", () => {
      expect(StorageNamespace.AUDIO).toBe("audio");
    });

    it("should have AVATARS namespace", () => {
      expect(StorageNamespace.AVATARS).toBe("avatars");
    });

    it("should have TEMP namespace", () => {
      expect(StorageNamespace.TEMP).toBe("temp");
    });
  });

  describe("MaxFileSize", () => {
    it("should have BOOK size as 50MB", () => {
      expect(MaxFileSize.BOOK).toBe(50 * 1024 * 1024);
    });

    it("should have COVER size as 5MB", () => {
      expect(MaxFileSize.COVER).toBe(5 * 1024 * 1024);
    });

    it("should have AUDIO size as 500MB", () => {
      expect(MaxFileSize.AUDIO).toBe(500 * 1024 * 1024);
    });

    it("should have AVATAR size as 2MB", () => {
      expect(MaxFileSize.AVATAR).toBe(2 * 1024 * 1024);
    });
  });

  describe("ContentTypes", () => {
    it("should have document content types", () => {
      expect(ContentTypes.PDF).toBe("application/pdf");
      expect(ContentTypes.EPUB).toBe("application/epub+zip");
      expect(ContentTypes.DOC).toBe("application/msword");
      expect(ContentTypes.DOCX).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      expect(ContentTypes.TXT).toBe("text/plain");
      expect(ContentTypes.HTML).toBe("text/html");
    });

    it("should have audio content types", () => {
      expect(ContentTypes.MP3).toBe("audio/mpeg");
      expect(ContentTypes.WAV).toBe("audio/wav");
      expect(ContentTypes.OGG).toBe("audio/ogg");
      expect(ContentTypes.M4A).toBe("audio/mp4");
    });

    it("should have image content types", () => {
      expect(ContentTypes.JPEG).toBe("image/jpeg");
      expect(ContentTypes.PNG).toBe("image/png");
      expect(ContentTypes.WEBP).toBe("image/webp");
      expect(ContentTypes.GIF).toBe("image/gif");
    });

    it("should have generic content type", () => {
      expect(ContentTypes.OCTET_STREAM).toBe("application/octet-stream");
    });
  });

  describe("File Extensions", () => {
    it("should have book extensions", () => {
      expect(BookExtensions).toContain("pdf");
      expect(BookExtensions).toContain("epub");
      expect(BookExtensions).toContain("doc");
      expect(BookExtensions).toContain("docx");
      expect(BookExtensions).toContain("txt");
      expect(BookExtensions).toContain("html");
    });

    it("should have image extensions", () => {
      expect(ImageExtensions).toContain("jpg");
      expect(ImageExtensions).toContain("jpeg");
      expect(ImageExtensions).toContain("png");
      expect(ImageExtensions).toContain("webp");
      expect(ImageExtensions).toContain("gif");
    });

    it("should have audio extensions", () => {
      expect(AudioExtensions).toContain("mp3");
      expect(AudioExtensions).toContain("wav");
      expect(AudioExtensions).toContain("ogg");
      expect(AudioExtensions).toContain("m4a");
    });
  });

  // ============================================================================
  // Client Management Tests
  // ============================================================================

  describe("Client Management", () => {
    it("should get storage client when configured", () => {
      const client = getStorageClient();
      expect(client).not.toBeNull();
    });

    it("should return null when R2 is not configured", () => {
      delete process.env.R2_ACCOUNT_ID;
      resetStorageClient();

      const client = getStorageClient();
      expect(client).toBeNull();
    });

    it("should return null when access key is missing", () => {
      delete process.env.R2_ACCESS_KEY_ID;
      resetStorageClient();

      const client = getStorageClient();
      expect(client).toBeNull();
    });

    it("should return null when secret key is missing", () => {
      delete process.env.R2_SECRET_ACCESS_KEY;
      resetStorageClient();

      const client = getStorageClient();
      expect(client).toBeNull();
    });

    it("should return null when bucket name is missing", () => {
      delete process.env.R2_BUCKET_NAME;
      resetStorageClient();

      const client = getStorageClient();
      expect(client).toBeNull();
    });

    it("should get bucket name", () => {
      expect(getBucketName()).toBe("test-bucket");
    });

    it("should return empty string for bucket name when not configured", () => {
      delete process.env.R2_BUCKET_NAME;
      expect(getBucketName()).toBe("");
    });

    it("should get public URL base", () => {
      expect(getPublicUrlBase()).toBe("https://test.r2.dev");
    });

    it("should return undefined for public URL when not configured", () => {
      delete process.env.R2_PUBLIC_URL;
      expect(getPublicUrlBase()).toBeUndefined();
    });

    it("should check if storage is available", () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it("should return false for isStorageAvailable when not configured", () => {
      delete process.env.R2_ACCOUNT_ID;
      resetStorageClient();

      expect(isStorageAvailable()).toBe(false);
    });

    it("should reset the client", () => {
      getStorageClient();
      expect(isStorageAvailable()).toBe(true);

      resetStorageClient();
      expect(getStorageClient()).not.toBeNull();
    });
  });

  // ============================================================================
  // Core Storage Operations Tests
  // ============================================================================

  describe("uploadFile()", () => {
    it("should upload a file successfully", async () => {
      mockSend.mockResolvedValue({});

      const result = await uploadFile(
        "users/123/books/test.pdf",
        Buffer.from("test content"),
        { contentType: "application/pdf" }
      );

      expect(result.success).toBe(true);
      expect(result.key).toBe("users/123/books/test.pdf");
      expect(result.bucket).toBe("test-bucket");
      expect(result.publicUrl).toBe(
        "https://test.r2.dev/users/123/books/test.pdf"
      );
    });

    it("should upload with all options", async () => {
      mockSend.mockResolvedValue({});

      const result = await uploadFile("test/file.pdf", Buffer.from("content"), {
        contentType: "application/pdf",
        cacheControl: "max-age=3600",
        contentDisposition: "attachment",
        metadata: { author: "Test Author" },
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it("should return error when R2 is not configured", async () => {
      delete process.env.R2_ACCOUNT_ID;
      resetStorageClient();

      const result = await uploadFile("test/file.pdf", Buffer.from("content"));

      expect(result.success).toBe(false);
      expect(result.error).toBe("R2 storage is not configured");
    });

    it("should handle upload errors", async () => {
      mockSend.mockRejectedValue(new Error("Upload failed"));

      const result = await uploadFile("test/file.pdf", Buffer.from("content"));

      expect(result.success).toBe(false);
      expect(result.error).toBe("Upload failed");
    });

    it("should use default content type when not specified", async () => {
      mockSend.mockResolvedValue({});

      const result = await uploadFile("test/file.bin", Buffer.from("content"));

      expect(result.success).toBe(true);
    });

    it("should upload string content", async () => {
      mockSend.mockResolvedValue({});

      const result = await uploadFile("test/file.txt", "text content", {
        contentType: "text/plain",
      });

      expect(result.success).toBe(true);
    });

    it("should not include public URL when not configured", async () => {
      delete process.env.R2_PUBLIC_URL;
      resetStorageClient();
      mockSend.mockResolvedValue({});

      const result = await uploadFile("test/file.pdf", Buffer.from("content"));

      expect(result.success).toBe(true);
      expect(result.publicUrl).toBeUndefined();
    });
  });

  describe("getFile()", () => {
    it("should get a file successfully", async () => {
      const mockStream = {
        transformToWebStream: () => {
          return new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array([116, 101, 115, 116])); // "test"
              controller.close();
            },
          });
        },
      };

      mockSend.mockResolvedValue({
        Body: mockStream,
        ContentType: "application/pdf",
        ContentLength: 4,
        Metadata: { author: "Test" },
      });

      const result = await getFile("test/file.pdf");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.contentType).toBe("application/pdf");
      expect(result.contentLength).toBe(4);
      expect(result.metadata).toEqual({ author: "Test" });
    });

    it("should return error when R2 is not configured", async () => {
      delete process.env.R2_ACCOUNT_ID;
      resetStorageClient();

      const result = await getFile("test/file.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toBe("R2 storage is not configured");
    });

    it("should handle file not found", async () => {
      const error = new Error("Not found");
      error.name = "NoSuchKey";
      mockSend.mockRejectedValue(error);

      const result = await getFile("nonexistent/file.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toBe("File not found");
    });

    it("should handle other errors", async () => {
      mockSend.mockRejectedValue(new Error("Network error"));

      const result = await getFile("test/file.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should handle empty body response", async () => {
      mockSend.mockResolvedValue({
        Body: null,
        ContentType: "application/pdf",
      });

      const result = await getFile("test/file.pdf");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No file content returned");
    });
  });

  describe("deleteFile()", () => {
    it("should delete a file successfully", async () => {
      mockSend.mockResolvedValue({});

      const result = await deleteFile("test/file.pdf");

      expect(result).toBe(true);
    });

    it("should return false when R2 is not configured", async () => {
      delete process.env.R2_ACCOUNT_ID;
      resetStorageClient();

      const result = await deleteFile("test/file.pdf");

      expect(result).toBe(false);
    });

    it("should handle delete errors", async () => {
      mockSend.mockRejectedValue(new Error("Delete failed"));

      const result = await deleteFile("test/file.pdf");

      expect(result).toBe(false);
    });
  });

  describe("deleteFiles()", () => {
    it("should delete multiple files", async () => {
      mockSend.mockResolvedValue({});

      const result = await deleteFiles([
        "test/file1.pdf",
        "test/file2.pdf",
        "test/file3.pdf",
      ]);

      expect(result).toBe(3);
    });

    it("should return 0 for empty array", async () => {
      const result = await deleteFiles([]);

      expect(result).toBe(0);
    });

    it("should handle partial failures", async () => {
      mockSend
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({});

      const result = await deleteFiles([
        "test/file1.pdf",
        "test/file2.pdf",
        "test/file3.pdf",
      ]);

      expect(result).toBe(2);
    });
  });

  describe("getFileInfo()", () => {
    it("should get file info successfully", async () => {
      const lastModified = new Date();
      mockSend.mockResolvedValue({
        ContentType: "application/pdf",
        ContentLength: 1024,
        LastModified: lastModified,
        ETag: '"abc123"',
        Metadata: { author: "Test" },
      });

      const result = await getFileInfo("test/file.pdf");

      expect(result.exists).toBe(true);
      expect(result.contentType).toBe("application/pdf");
      expect(result.contentLength).toBe(1024);
      expect(result.lastModified).toEqual(lastModified);
      expect(result.etag).toBe('"abc123"');
      expect(result.metadata).toEqual({ author: "Test" });
    });

    it("should return exists: false when R2 is not configured", async () => {
      delete process.env.R2_ACCOUNT_ID;
      resetStorageClient();

      const result = await getFileInfo("test/file.pdf");

      expect(result.exists).toBe(false);
    });

    it("should return exists: false for nonexistent file", async () => {
      const error = new Error("Not found");
      error.name = "NotFound";
      mockSend.mockRejectedValue(error);

      const result = await getFileInfo("nonexistent/file.pdf");

      expect(result.exists).toBe(false);
    });

    it("should handle other errors", async () => {
      mockSend.mockRejectedValue(new Error("Network error"));

      const result = await getFileInfo("test/file.pdf");

      expect(result.exists).toBe(false);
    });
  });

  describe("fileExists()", () => {
    it("should return true for existing file", async () => {
      mockSend.mockResolvedValue({
        ContentType: "application/pdf",
        ContentLength: 1024,
      });

      const result = await fileExists("test/file.pdf");

      expect(result).toBe(true);
    });

    it("should return false for nonexistent file", async () => {
      const error = new Error("Not found");
      error.name = "NotFound";
      mockSend.mockRejectedValue(error);

      const result = await fileExists("nonexistent/file.pdf");

      expect(result).toBe(false);
    });
  });

  describe("listFiles()", () => {
    it("should list files successfully", async () => {
      mockSend.mockResolvedValue({
        Contents: [{ Key: "test/file1.pdf" }, { Key: "test/file2.pdf" }],
        CommonPrefixes: [{ Prefix: "test/folder1/" }],
        IsTruncated: false,
      });

      const result = await listFiles("test/");

      expect(result.success).toBe(true);
      expect(result.keys).toEqual(["test/file1.pdf", "test/file2.pdf"]);
      expect(result.prefixes).toEqual(["test/folder1/"]);
      expect(result.isTruncated).toBe(false);
    });

    it("should handle pagination", async () => {
      mockSend.mockResolvedValue({
        Contents: [{ Key: "test/file1.pdf" }],
        IsTruncated: true,
        NextContinuationToken: "token123",
      });

      const result = await listFiles("test/", { maxKeys: 1 });

      expect(result.success).toBe(true);
      expect(result.isTruncated).toBe(true);
      expect(result.nextContinuationToken).toBe("token123");
    });

    it("should return error when R2 is not configured", async () => {
      delete process.env.R2_ACCOUNT_ID;
      resetStorageClient();

      const result = await listFiles("test/");

      expect(result.success).toBe(false);
      expect(result.error).toBe("R2 storage is not configured");
    });

    it("should handle list errors", async () => {
      mockSend.mockRejectedValue(new Error("List failed"));

      const result = await listFiles("test/");

      expect(result.success).toBe(false);
      expect(result.error).toBe("List failed");
    });

    it("should handle empty results", async () => {
      mockSend.mockResolvedValue({
        Contents: undefined,
        CommonPrefixes: undefined,
        IsTruncated: false,
      });

      const result = await listFiles("empty/");

      expect(result.success).toBe(true);
      expect(result.keys).toEqual([]);
      expect(result.prefixes).toEqual([]);
    });

    it("should use continuation token", async () => {
      mockSend.mockResolvedValue({
        Contents: [{ Key: "test/file.pdf" }],
        IsTruncated: false,
      });

      await listFiles("test/", { continuationToken: "token123" });

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe("copyFile()", () => {
    it("should copy a file successfully", async () => {
      mockSend.mockResolvedValue({});

      const result = await copyFile("source/file.pdf", "dest/file.pdf");

      expect(result).toBe(true);
    });

    it("should return false when R2 is not configured", async () => {
      delete process.env.R2_ACCOUNT_ID;
      resetStorageClient();

      const result = await copyFile("source/file.pdf", "dest/file.pdf");

      expect(result).toBe(false);
    });

    it("should handle copy errors", async () => {
      mockSend.mockRejectedValue(new Error("Copy failed"));

      const result = await copyFile("source/file.pdf", "dest/file.pdf");

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // Signed URL Tests
  // ============================================================================

  describe("getSignedDownloadUrl()", () => {
    it("should generate signed download URL", async () => {
      const { getSignedUrl: mockGetSignedUrl } =
        await import("@aws-sdk/s3-request-presigner");

      const result = await getSignedDownloadUrl("test/file.pdf");

      expect(result).toBe("https://signed-url.example.com");
      expect(mockGetSignedUrl).toHaveBeenCalled();
    });

    it("should generate URL with options", async () => {
      const result = await getSignedDownloadUrl("test/file.pdf", {
        expiresIn: 7200,
        contentDisposition: 'attachment; filename="book.pdf"',
        responseContentType: "application/pdf",
      });

      expect(result).toBe("https://signed-url.example.com");
    });

    it("should return null when R2 is not configured", async () => {
      delete process.env.R2_ACCOUNT_ID;
      resetStorageClient();

      const result = await getSignedDownloadUrl("test/file.pdf");

      expect(result).toBeNull();
    });

    it("should handle errors", async () => {
      const { getSignedUrl: mockGetSignedUrl } =
        await import("@aws-sdk/s3-request-presigner");
      vi.mocked(mockGetSignedUrl).mockRejectedValueOnce(
        new Error("Sign failed")
      );

      const result = await getSignedDownloadUrl("test/file.pdf");

      expect(result).toBeNull();
    });
  });

  describe("getSignedUploadUrl()", () => {
    it("should generate signed upload URL", async () => {
      const result = await getSignedUploadUrl("test/new-file.pdf", {
        contentType: "application/pdf",
      });

      expect(result).toBe("https://signed-url.example.com");
    });

    it("should return null when R2 is not configured", async () => {
      delete process.env.R2_ACCOUNT_ID;
      resetStorageClient();

      const result = await getSignedUploadUrl("test/new-file.pdf");

      expect(result).toBeNull();
    });

    it("should handle errors", async () => {
      const { getSignedUrl: mockGetSignedUrl } =
        await import("@aws-sdk/s3-request-presigner");
      vi.mocked(mockGetSignedUrl).mockRejectedValueOnce(
        new Error("Sign failed")
      );

      const result = await getSignedUploadUrl("test/new-file.pdf");

      expect(result).toBeNull();
    });
  });

  describe("getSignedUrl()", () => {
    it("should be an alias for getSignedDownloadUrl", () => {
      expect(getSignedUrl).toBe(getSignedDownloadUrl);
    });
  });

  // ============================================================================
  // Key Building Tests
  // ============================================================================

  describe("buildBookKey()", () => {
    it("should build book key", () => {
      const key = buildBookKey("user123", "book456", "mybook.pdf");

      expect(key).toBe("users/user123/books/book456/mybook.pdf");
    });
  });

  describe("buildCoverKey()", () => {
    it("should build cover key", () => {
      const key = buildCoverKey("book456", "cover.jpg");

      expect(key).toBe("covers/book456/cover.jpg");
    });
  });

  describe("buildAudioKey()", () => {
    it("should build audio key", () => {
      const key = buildAudioKey("user123", "book456", "chapter1.mp3");

      expect(key).toBe("users/user123/audio/book456/chapter1.mp3");
    });
  });

  describe("buildAvatarKey()", () => {
    it("should build avatar key", () => {
      const key = buildAvatarKey("user123", "avatar.png");

      expect(key).toBe("users/user123/avatars/avatar.png");
    });
  });

  describe("buildTempKey()", () => {
    it("should build temp key", () => {
      const key = buildTempKey("unique123", "temp.pdf");

      expect(key).toBe("temp/unique123/temp.pdf");
    });
  });

  describe("getFilenameFromKey()", () => {
    it("should extract filename from key", () => {
      expect(getFilenameFromKey("users/123/books/abc/mybook.pdf")).toBe(
        "mybook.pdf"
      );
    });

    it("should return the key if no slashes", () => {
      expect(getFilenameFromKey("filename.pdf")).toBe("filename.pdf");
    });

    it("should handle empty key", () => {
      expect(getFilenameFromKey("")).toBe("");
    });
  });

  describe("getExtension()", () => {
    it("should get extension from filename", () => {
      expect(getExtension("mybook.pdf")).toBe("pdf");
    });

    it("should get extension from full path", () => {
      expect(getExtension("users/123/books/mybook.PDF")).toBe("pdf");
    });

    it("should return empty string for no extension", () => {
      expect(getExtension("filename")).toBe("");
    });

    it("should handle multiple dots", () => {
      expect(getExtension("my.book.file.epub")).toBe("epub");
    });
  });

  describe("inferContentType()", () => {
    it("should infer PDF content type", () => {
      expect(inferContentType("file.pdf")).toBe("application/pdf");
    });

    it("should infer EPUB content type", () => {
      expect(inferContentType("file.epub")).toBe("application/epub+zip");
    });

    it("should infer DOC content type", () => {
      expect(inferContentType("file.doc")).toBe("application/msword");
    });

    it("should infer DOCX content type", () => {
      expect(inferContentType("file.docx")).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    });

    it("should infer MP3 content type", () => {
      expect(inferContentType("file.mp3")).toBe("audio/mpeg");
    });

    it("should infer JPEG content type", () => {
      expect(inferContentType("file.jpg")).toBe("image/jpeg");
      expect(inferContentType("file.jpeg")).toBe("image/jpeg");
    });

    it("should infer PNG content type", () => {
      expect(inferContentType("file.png")).toBe("image/png");
    });

    it("should return octet-stream for unknown extension", () => {
      expect(inferContentType("file.unknown")).toBe("application/octet-stream");
    });

    it("should handle full paths", () => {
      expect(inferContentType("users/123/books/file.pdf")).toBe(
        "application/pdf"
      );
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe("isValidFileSize()", () => {
    it("should return true for valid size", () => {
      expect(isValidFileSize(1024, MaxFileSize.BOOK)).toBe(true);
    });

    it("should return true for size at limit", () => {
      expect(isValidFileSize(MaxFileSize.BOOK, MaxFileSize.BOOK)).toBe(true);
    });

    it("should return false for size over limit", () => {
      expect(isValidFileSize(MaxFileSize.BOOK + 1, MaxFileSize.BOOK)).toBe(
        false
      );
    });

    it("should return false for zero size", () => {
      expect(isValidFileSize(0, MaxFileSize.BOOK)).toBe(false);
    });

    it("should return false for negative size", () => {
      expect(isValidFileSize(-1, MaxFileSize.BOOK)).toBe(false);
    });
  });

  describe("hasAllowedExtension()", () => {
    it("should return true for allowed extension", () => {
      expect(hasAllowedExtension("file.pdf", BookExtensions)).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(hasAllowedExtension("file.PDF", BookExtensions)).toBe(true);
      expect(hasAllowedExtension("file.Epub", BookExtensions)).toBe(true);
    });

    it("should return false for disallowed extension", () => {
      expect(hasAllowedExtension("file.exe", BookExtensions)).toBe(false);
    });

    it("should handle files without extension", () => {
      expect(hasAllowedExtension("filename", BookExtensions)).toBe(false);
    });
  });

  // ============================================================================
  // Storage Object Tests
  // ============================================================================

  describe("storage object", () => {
    it("should export core operations", () => {
      expect(storage.uploadFile).toBeDefined();
      expect(storage.getFile).toBeDefined();
      expect(storage.deleteFile).toBeDefined();
      expect(storage.deleteFiles).toBeDefined();
      expect(storage.getFileInfo).toBeDefined();
      expect(storage.fileExists).toBeDefined();
      expect(storage.listFiles).toBeDefined();
      expect(storage.copyFile).toBeDefined();
    });

    it("should export signed URL functions", () => {
      expect(storage.getSignedDownloadUrl).toBeDefined();
      expect(storage.getSignedUploadUrl).toBeDefined();
      expect(storage.getSignedUrl).toBeDefined();
    });

    it("should export key builders", () => {
      expect(storage.buildBookKey).toBeDefined();
      expect(storage.buildCoverKey).toBeDefined();
      expect(storage.buildAudioKey).toBeDefined();
      expect(storage.buildAvatarKey).toBeDefined();
      expect(storage.buildTempKey).toBeDefined();
      expect(storage.getFilenameFromKey).toBeDefined();
      expect(storage.getExtension).toBeDefined();
      expect(storage.inferContentType).toBeDefined();
    });
  });

  describe("storageUtils object", () => {
    it("should export client management functions", () => {
      expect(storageUtils.getStorageClient).toBeDefined();
      expect(storageUtils.getBucketName).toBeDefined();
      expect(storageUtils.getPublicUrlBase).toBeDefined();
      expect(storageUtils.isStorageAvailable).toBeDefined();
      expect(storageUtils.resetStorageClient).toBeDefined();
    });

    it("should export validation functions", () => {
      expect(storageUtils.isValidFileSize).toBeDefined();
      expect(storageUtils.hasAllowedExtension).toBeDefined();
    });

    it("should export constants", () => {
      expect(storageUtils.StorageNamespace).toBeDefined();
      expect(storageUtils.MaxFileSize).toBeDefined();
      expect(storageUtils.ContentTypes).toBeDefined();
      expect(storageUtils.BookExtensions).toBeDefined();
      expect(storageUtils.ImageExtensions).toBeDefined();
      expect(storageUtils.AudioExtensions).toBeDefined();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Integration", () => {
    it("should work with complete upload workflow", async () => {
      mockSend.mockResolvedValue({});

      // Build key
      const key = buildBookKey("user123", "book456", "mybook.pdf");
      expect(key).toBe("users/user123/books/book456/mybook.pdf");

      // Infer content type
      const contentType = inferContentType(key);
      expect(contentType).toBe("application/pdf");

      // Validate size
      const fileSize = 1024 * 1024; // 1MB
      expect(isValidFileSize(fileSize, MaxFileSize.BOOK)).toBe(true);

      // Upload
      const result = await uploadFile(key, Buffer.from("content"), {
        contentType,
      });
      expect(result.success).toBe(true);
    });

    it("should work with complete download workflow", async () => {
      // Generate signed URL
      const url = await getSignedDownloadUrl("users/123/books/456/book.pdf", {
        expiresIn: 3600,
        contentDisposition: 'attachment; filename="My Book.pdf"',
      });

      expect(url).toBe("https://signed-url.example.com");
    });
  });
});
