/**
 * Cloudflare R2 Storage Service for Read Master API
 *
 * Provides file storage functionality using Cloudflare R2 with an S3-compatible API.
 * Handles book files (EPUB, PDF, DOC), audio files (TTS downloads), and cover images.
 *
 * @example
 * ```typescript
 * import { storage, storageUtils } from './services/storage';
 *
 * // Upload a file
 * const result = await storage.uploadFile('users/123/books/abc.pdf', buffer, {
 *   contentType: 'application/pdf',
 * });
 *
 * // Get a signed URL for download
 * const url = await storage.getSignedUrl('users/123/books/abc.pdf', { expiresIn: 3600 });
 *
 * // Delete a file
 * await storage.deleteFile('users/123/books/abc.pdf');
 * ```
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  type PutObjectCommandInput,
  type GetObjectCommandInput,
  type DeleteObjectCommandInput,
  type HeadObjectCommandOutput,
  type ListObjectsV2CommandInput,
  type CopyObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for file upload operations
 */
export type UploadOptions = {
  /** MIME type of the file */
  contentType?: string;
  /** Cache control header */
  cacheControl?: string;
  /** Custom metadata to store with the file */
  metadata?: Record<string, string>;
  /** Content disposition (inline or attachment) */
  contentDisposition?: string;
};

/**
 * Options for generating signed URLs
 */
export type SignedUrlOptions = {
  /** URL expiration time in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
  /** Content disposition for download (e.g., 'attachment; filename="book.pdf"') */
  contentDisposition?: string;
  /** Response content type */
  responseContentType?: string;
};

/**
 * Options for listing objects
 */
export type ListOptions = {
  /** Maximum number of objects to return */
  maxKeys?: number;
  /** Continuation token for pagination */
  continuationToken?: string;
  /** Delimiter to use for grouping (typically '/') */
  delimiter?: string;
};

/**
 * Result of an upload operation
 */
export type UploadResult = {
  /** Whether the upload succeeded */
  success: boolean;
  /** The full key of the uploaded file */
  key: string;
  /** The bucket name */
  bucket: string;
  /** Public URL if available */
  publicUrl?: string | undefined;
  /** Error message if failed */
  error?: string | undefined;
};

/**
 * Result of a get operation
 */
export type GetFileResult = {
  /** Whether the operation succeeded */
  success: boolean;
  /** The file data as a Buffer */
  data?: Buffer | undefined;
  /** Content type of the file */
  contentType?: string | undefined;
  /** Content length in bytes */
  contentLength?: number | undefined;
  /** Custom metadata */
  metadata?: Record<string, string> | undefined;
  /** Error message if failed */
  error?: string | undefined;
};

/**
 * Result of a head (file info) operation
 */
export type FileInfo = {
  /** Whether the file exists */
  exists: boolean;
  /** Content type of the file */
  contentType?: string | undefined;
  /** Content length in bytes */
  contentLength?: number | undefined;
  /** Last modified date */
  lastModified?: Date | undefined;
  /** ETag of the file */
  etag?: string | undefined;
  /** Custom metadata */
  metadata?: Record<string, string> | undefined;
};

/**
 * Result of a list objects operation
 */
export type ListResult = {
  /** Whether the operation succeeded */
  success: boolean;
  /** Array of object keys */
  keys: string[];
  /** Common prefixes (folders) when using delimiter */
  prefixes: string[];
  /** Whether there are more results */
  isTruncated: boolean;
  /** Token for next page of results */
  nextContinuationToken?: string | undefined;
  /** Error message if failed */
  error?: string | undefined;
};

/**
 * Standard file namespaces for organization
 */
export const StorageNamespace = {
  /** User-uploaded books */
  BOOKS: "books",
  /** Book cover images */
  COVERS: "covers",
  /** Generated audio files (TTS) */
  AUDIO: "audio",
  /** User avatar images */
  AVATARS: "avatars",
  /** Temporary files */
  TEMP: "temp",
} as const;

export type StorageNamespaceType =
  (typeof StorageNamespace)[keyof typeof StorageNamespace];

/**
 * Maximum file sizes by type (in bytes)
 */
export const MaxFileSize = {
  /** Maximum book file size: 50MB */
  BOOK: 50 * 1024 * 1024,
  /** Maximum cover image size: 5MB */
  COVER: 5 * 1024 * 1024,
  /** Maximum audio file size: 500MB */
  AUDIO: 500 * 1024 * 1024,
  /** Maximum avatar size: 2MB */
  AVATAR: 2 * 1024 * 1024,
} as const;

/**
 * Common content types for files
 */
export const ContentTypes = {
  // Documents
  PDF: "application/pdf",
  EPUB: "application/epub+zip",
  DOC: "application/msword",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  TXT: "text/plain",
  HTML: "text/html",

  // Audio
  MP3: "audio/mpeg",
  WAV: "audio/wav",
  OGG: "audio/ogg",
  M4A: "audio/mp4",

  // Images
  JPEG: "image/jpeg",
  PNG: "image/png",
  WEBP: "image/webp",
  GIF: "image/gif",

  // Generic
  OCTET_STREAM: "application/octet-stream",
} as const;

// ============================================================================
// R2 Client Singleton
// ============================================================================

/**
 * Lazy-initialized R2 client
 */
let r2Client: S3Client | null = null;
let clientInitialized = false;

/**
 * R2 Configuration type
 */
type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string | undefined;
};

/**
 * Get R2 configuration from environment
 */
function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  const config: R2Config = {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };

  if (publicUrl) {
    config.publicUrl = publicUrl;
  }

  return config;
}

/**
 * Initialize the R2 client
 */
function initializeClient(): S3Client | null {
  const config = getR2Config();

  if (!config) {
    logger.warn("R2 not configured - storage disabled", {
      hasAccountId: !!process.env.R2_ACCOUNT_ID,
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      hasBucket: !!process.env.R2_BUCKET_NAME,
    });
    return null;
  }

  try {
    return new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  } catch (error) {
    logger.error("Failed to initialize R2 client", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Get the R2 client instance
 * Returns null if R2 is not configured
 */
export function getStorageClient(): S3Client | null {
  if (!clientInitialized) {
    r2Client = initializeClient();
    clientInitialized = true;
  }
  return r2Client;
}

/**
 * Get the configured bucket name
 */
export function getBucketName(): string {
  return process.env.R2_BUCKET_NAME || "";
}

/**
 * Get the public URL base if configured
 */
export function getPublicUrlBase(): string | undefined {
  return process.env.R2_PUBLIC_URL;
}

/**
 * Check if R2 storage is available and configured
 */
export function isStorageAvailable(): boolean {
  return getStorageClient() !== null;
}

/**
 * Reset the storage client (for testing)
 */
export function resetStorageClient(): void {
  r2Client = null;
  clientInitialized = false;
}

// ============================================================================
// Core Storage Operations
// ============================================================================

/**
 * Upload a file to R2 storage
 *
 * @param key - The object key (path) for the file
 * @param data - The file data as Buffer, Uint8Array, or string
 * @param options - Upload options
 * @returns Upload result with success status and key
 *
 * @example
 * ```typescript
 * const result = await uploadFile(
 *   'users/123/books/my-book.pdf',
 *   fileBuffer,
 *   { contentType: 'application/pdf' }
 * );
 * ```
 */
export async function uploadFile(
  key: string,
  data: Buffer | Uint8Array | string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const client = getStorageClient();
  const bucket = getBucketName();

  if (!client || !bucket) {
    return {
      success: false,
      key,
      bucket,
      error: "R2 storage is not configured",
    };
  }

  try {
    const input: PutObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: options.contentType || ContentTypes.OCTET_STREAM,
    };

    if (options.cacheControl) {
      input.CacheControl = options.cacheControl;
    }

    if (options.contentDisposition) {
      input.ContentDisposition = options.contentDisposition;
    }

    if (options.metadata) {
      input.Metadata = options.metadata;
    }

    const command = new PutObjectCommand(input);
    await client.send(command);

    // Build public URL if available
    const publicUrlBase = getPublicUrlBase();
    const publicUrl = publicUrlBase ? `${publicUrlBase}/${key}` : undefined;

    logger.info("File uploaded to R2", {
      bucket,
      key,
      contentType: options.contentType,
      size: data.length,
    });

    return {
      success: true,
      key,
      bucket,
      publicUrl,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to upload file to R2", {
      bucket,
      key,
      error: errorMessage,
    });

    return {
      success: false,
      key,
      bucket,
      error: errorMessage,
    };
  }
}

/**
 * Get a file from R2 storage
 *
 * @param key - The object key (path) for the file
 * @returns The file data and metadata
 *
 * @example
 * ```typescript
 * const result = await getFile('users/123/books/my-book.pdf');
 * if (result.success && result.data) {
 *   // Use the file buffer
 * }
 * ```
 */
export async function getFile(key: string): Promise<GetFileResult> {
  const client = getStorageClient();
  const bucket = getBucketName();

  if (!client || !bucket) {
    return {
      success: false,
      error: "R2 storage is not configured",
    };
  }

  try {
    const input: GetObjectCommandInput = {
      Bucket: bucket,
      Key: key,
    };

    const command = new GetObjectCommand(input);
    const response = await client.send(command);

    // Convert stream to buffer
    const body = response.Body;
    if (!body) {
      return {
        success: false,
        error: "No file content returned",
      };
    }

    // Read the stream into a buffer
    const chunks: Uint8Array[] = [];
    const reader = body.transformToWebStream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const data = Buffer.concat(chunks);

    return {
      success: true,
      data,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      metadata: response.Metadata,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check if it's a "not found" error
    if (error instanceof Error && error.name === "NoSuchKey") {
      return {
        success: false,
        error: "File not found",
      };
    }

    logger.error("Failed to get file from R2", {
      bucket,
      key,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Delete a file from R2 storage
 *
 * @param key - The object key (path) for the file
 * @returns Whether the deletion was successful
 *
 * @example
 * ```typescript
 * const success = await deleteFile('users/123/books/old-book.pdf');
 * ```
 */
export async function deleteFile(key: string): Promise<boolean> {
  const client = getStorageClient();
  const bucket = getBucketName();

  if (!client || !bucket) {
    logger.warn("Cannot delete file - R2 storage is not configured");
    return false;
  }

  try {
    const input: DeleteObjectCommandInput = {
      Bucket: bucket,
      Key: key,
    };

    const command = new DeleteObjectCommand(input);
    await client.send(command);

    logger.info("File deleted from R2", {
      bucket,
      key,
    });

    return true;
  } catch (error) {
    logger.error("Failed to delete file from R2", {
      bucket,
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Delete multiple files from R2 storage
 *
 * @param keys - Array of object keys to delete
 * @returns Number of successfully deleted files
 */
export async function deleteFiles(keys: string[]): Promise<number> {
  if (keys.length === 0) {
    return 0;
  }

  const results = await Promise.all(keys.map((key) => deleteFile(key)));
  return results.filter(Boolean).length;
}

/**
 * Get file metadata without downloading the file
 *
 * @param key - The object key (path) for the file
 * @returns File info including existence, size, and type
 *
 * @example
 * ```typescript
 * const info = await getFileInfo('users/123/books/my-book.pdf');
 * if (info.exists) {
 *   // File size: info.contentLength
 * }
 * ```
 */
export async function getFileInfo(key: string): Promise<FileInfo> {
  const client = getStorageClient();
  const bucket = getBucketName();

  if (!client || !bucket) {
    return { exists: false };
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response: HeadObjectCommandOutput = await client.send(command);

    return {
      exists: true,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      etag: response.ETag,
      metadata: response.Metadata,
    };
  } catch (error) {
    // NoSuchKey is expected when file doesn't exist
    if (error instanceof Error && error.name === "NotFound") {
      return { exists: false };
    }

    // For other errors, log and return not found
    logger.error("Failed to get file info from R2", {
      bucket,
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return { exists: false };
  }
}

/**
 * Check if a file exists in R2 storage
 *
 * @param key - The object key (path) for the file
 * @returns Whether the file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  const info = await getFileInfo(key);
  return info.exists;
}

/**
 * List objects in R2 storage with a prefix
 *
 * @param prefix - The prefix (folder path) to list
 * @param options - List options for pagination
 * @returns List of object keys and prefixes
 *
 * @example
 * ```typescript
 * const result = await listFiles('users/123/books/');
 * for (const key of result.keys) {
 *   // Process file: key
 * }
 * ```
 */
export async function listFiles(
  prefix: string,
  options: ListOptions = {}
): Promise<ListResult> {
  const client = getStorageClient();
  const bucket = getBucketName();

  if (!client || !bucket) {
    return {
      success: false,
      keys: [],
      prefixes: [],
      isTruncated: false,
      error: "R2 storage is not configured",
    };
  }

  try {
    const input: ListObjectsV2CommandInput = {
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: options.maxKeys || 1000,
      ContinuationToken: options.continuationToken,
      Delimiter: options.delimiter,
    };

    const command = new ListObjectsV2Command(input);
    const response = await client.send(command);

    const keys = (response.Contents || [])
      .map((obj) => obj.Key)
      .filter((key): key is string => key !== undefined);

    const prefixes = (response.CommonPrefixes || [])
      .map((p) => p.Prefix)
      .filter((prefix): prefix is string => prefix !== undefined);

    return {
      success: true,
      keys,
      prefixes,
      isTruncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken,
    };
  } catch (error) {
    logger.error("Failed to list files from R2", {
      bucket,
      prefix,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      keys: [],
      prefixes: [],
      isTruncated: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Copy a file within R2 storage
 *
 * @param sourceKey - The source object key
 * @param destinationKey - The destination object key
 * @returns Whether the copy was successful
 */
export async function copyFile(
  sourceKey: string,
  destinationKey: string
): Promise<boolean> {
  const client = getStorageClient();
  const bucket = getBucketName();

  if (!client || !bucket) {
    logger.warn("Cannot copy file - R2 storage is not configured");
    return false;
  }

  try {
    const input: CopyObjectCommandInput = {
      Bucket: bucket,
      Key: destinationKey,
      CopySource: `${bucket}/${sourceKey}`,
    };

    const command = new CopyObjectCommand(input);
    await client.send(command);

    logger.info("File copied in R2", {
      bucket,
      sourceKey,
      destinationKey,
    });

    return true;
  } catch (error) {
    logger.error("Failed to copy file in R2", {
      bucket,
      sourceKey,
      destinationKey,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

// ============================================================================
// Signed URL Generation
// ============================================================================

/**
 * Generate a signed URL for downloading a file
 *
 * @param key - The object key (path) for the file
 * @param options - Signed URL options
 * @returns The signed URL or null if failed
 *
 * @example
 * ```typescript
 * const url = await getSignedDownloadUrl('users/123/books/my-book.pdf', {
 *   expiresIn: 3600, // 1 hour
 *   contentDisposition: 'attachment; filename="My Book.pdf"',
 * });
 * ```
 */
export async function getSignedDownloadUrl(
  key: string,
  options: SignedUrlOptions = {}
): Promise<string | null> {
  const client = getStorageClient();
  const bucket = getBucketName();

  if (!client || !bucket) {
    logger.warn("Cannot generate signed URL - R2 storage is not configured");
    return null;
  }

  try {
    const commandInput: GetObjectCommandInput = {
      Bucket: bucket,
      Key: key,
    };

    if (options.responseContentType) {
      commandInput.ResponseContentType = options.responseContentType;
    }

    if (options.contentDisposition) {
      commandInput.ResponseContentDisposition = options.contentDisposition;
    }

    const command = new GetObjectCommand(commandInput);

    const url = await awsGetSignedUrl(client, command, {
      expiresIn: options.expiresIn || 3600, // Default 1 hour
    });

    return url;
  } catch (error) {
    logger.error("Failed to generate signed download URL", {
      bucket,
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Generate a signed URL for uploading a file
 *
 * @param key - The object key (path) for the file
 * @param options - Upload options
 * @param expiresIn - URL expiration in seconds (default: 3600)
 * @returns The signed URL or null if failed
 *
 * @example
 * ```typescript
 * const url = await getSignedUploadUrl('users/123/books/new-book.pdf', {
 *   contentType: 'application/pdf',
 * });
 * // Client can then PUT directly to this URL
 * ```
 */
export async function getSignedUploadUrl(
  key: string,
  options: UploadOptions = {},
  expiresIn: number = 3600
): Promise<string | null> {
  const client = getStorageClient();
  const bucket = getBucketName();

  if (!client || !bucket) {
    logger.warn(
      "Cannot generate signed upload URL - R2 storage is not configured"
    );
    return null;
  }

  try {
    const commandInput: PutObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      ContentType: options.contentType || ContentTypes.OCTET_STREAM,
    };

    if (options.metadata) {
      commandInput.Metadata = options.metadata;
    }

    const command = new PutObjectCommand(commandInput);

    const url = await awsGetSignedUrl(client, command, {
      expiresIn,
    });

    return url;
  } catch (error) {
    logger.error("Failed to generate signed upload URL", {
      bucket,
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Alias for getSignedDownloadUrl for convenience
 */
export const getSignedUrl = getSignedDownloadUrl;

// ============================================================================
// Key Building Helpers
// ============================================================================

/**
 * Build a storage key for a user's book file
 *
 * @param userId - The user ID
 * @param bookId - The book ID
 * @param filename - The filename with extension
 * @returns The storage key
 *
 * @example
 * ```typescript
 * const key = buildBookKey('user_123', 'book_456', 'mybook.pdf');
 * // Returns: 'users/user_123/books/book_456/mybook.pdf'
 * ```
 */
export function buildBookKey(
  userId: string,
  bookId: string,
  filename: string
): string {
  return `users/${userId}/${StorageNamespace.BOOKS}/${bookId}/${filename}`;
}

/**
 * Build a storage key for a book cover image
 */
export function buildCoverKey(bookId: string, filename: string): string {
  return `${StorageNamespace.COVERS}/${bookId}/${filename}`;
}

/**
 * Build a storage key for a user's audio file
 */
export function buildAudioKey(
  userId: string,
  bookId: string,
  filename: string
): string {
  return `users/${userId}/${StorageNamespace.AUDIO}/${bookId}/${filename}`;
}

/**
 * Build a storage key for a user's avatar
 */
export function buildAvatarKey(userId: string, filename: string): string {
  return `users/${userId}/${StorageNamespace.AVATARS}/${filename}`;
}

/**
 * Build a storage key for a temporary file
 */
export function buildTempKey(uniqueId: string, filename: string): string {
  return `${StorageNamespace.TEMP}/${uniqueId}/${filename}`;
}

/**
 * Extract the filename from a storage key
 */
export function getFilenameFromKey(key: string): string {
  const parts = key.split("/");
  return parts[parts.length - 1] || key;
}

/**
 * Get the extension from a filename or key
 */
export function getExtension(filenameOrKey: string): string {
  const filename = getFilenameFromKey(filenameOrKey);
  const lastDot = filename.lastIndexOf(".");
  return lastDot !== -1 ? filename.slice(lastDot + 1).toLowerCase() : "";
}

/**
 * Infer content type from filename extension
 */
export function inferContentType(filenameOrKey: string): string {
  const ext = getExtension(filenameOrKey);

  const contentTypeMap: Record<string, string> = {
    pdf: ContentTypes.PDF,
    epub: ContentTypes.EPUB,
    doc: ContentTypes.DOC,
    docx: ContentTypes.DOCX,
    txt: ContentTypes.TXT,
    html: ContentTypes.HTML,
    htm: ContentTypes.HTML,
    mp3: ContentTypes.MP3,
    wav: ContentTypes.WAV,
    ogg: ContentTypes.OGG,
    m4a: ContentTypes.M4A,
    jpg: ContentTypes.JPEG,
    jpeg: ContentTypes.JPEG,
    png: ContentTypes.PNG,
    webp: ContentTypes.WEBP,
    gif: ContentTypes.GIF,
  };

  return contentTypeMap[ext] || ContentTypes.OCTET_STREAM;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate file size against limits
 *
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns Whether the file size is valid
 */
export function isValidFileSize(size: number, maxSize: number): boolean {
  return size > 0 && size <= maxSize;
}

/**
 * Validate that a file has an allowed extension
 *
 * @param filename - The filename to check
 * @param allowedExtensions - Array of allowed extensions (without dots)
 * @returns Whether the extension is allowed
 */
export function hasAllowedExtension(
  filename: string,
  allowedExtensions: string[]
): boolean {
  const ext = getExtension(filename);
  return allowedExtensions
    .map((e) => e.toLowerCase())
    .includes(ext.toLowerCase());
}

/**
 * Book file extensions
 */
export const BookExtensions = ["pdf", "epub", "doc", "docx", "txt", "html"];

/**
 * Image file extensions
 */
export const ImageExtensions = ["jpg", "jpeg", "png", "webp", "gif"];

/**
 * Audio file extensions
 */
export const AudioExtensions = ["mp3", "wav", "ogg", "m4a"];

// ============================================================================
// Exports
// ============================================================================

/**
 * Main storage object with all operations
 */
export const storage = {
  // Core operations
  uploadFile,
  getFile,
  deleteFile,
  deleteFiles,
  getFileInfo,
  fileExists,
  listFiles,
  copyFile,

  // Signed URLs
  getSignedDownloadUrl,
  getSignedUploadUrl,
  getSignedUrl,

  // Key builders
  buildBookKey,
  buildCoverKey,
  buildAudioKey,
  buildAvatarKey,
  buildTempKey,
  getFilenameFromKey,
  getExtension,
  inferContentType,
} as const;

/**
 * Storage utilities for external use
 */
export const storageUtils = {
  // Client management
  getStorageClient,
  getBucketName,
  getPublicUrlBase,
  isStorageAvailable,
  resetStorageClient,

  // Validation
  isValidFileSize,
  hasAllowedExtension,

  // Constants
  StorageNamespace,
  MaxFileSize,
  ContentTypes,
  BookExtensions,
  ImageExtensions,
  AudioExtensions,
} as const;
