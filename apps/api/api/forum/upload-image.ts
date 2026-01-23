/**
 * Forum Image Upload API Endpoint
 *
 * POST /api/forum/upload-image
 * Uploads an image for use in forum posts/replies
 *
 * Request: multipart/form-data with 'image' file field
 * Response: { success: true, url: string, key: string }
 */

import type { VercelResponse } from "@vercel/node";
import {
  withAuth,
  type AuthenticatedRequest,
} from "../../src/middleware/auth.js";
import { logger } from "../../src/utils/logger.js";
import {
  sendError,
  sendSuccess,
  ErrorCodes,
} from "../../src/utils/response.js";
import { getUserByClerkId } from "../../src/services/db.js";
import {
  storage,
  storageUtils,
  MaxFileSize,
} from "../../src/services/storage.js";
import {
  imageOptimization,
  IMAGE_SIZE_PRESETS,
} from "../../src/services/imageOptimization.js";
import crypto from "crypto";

// ============================================================================
// Constants
// ============================================================================

/** Maximum image file size: 5MB */
const MAX_IMAGE_SIZE = MaxFileSize.FORUM_IMAGE;

/** Allowed MIME types for images */
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// ============================================================================
// Types
// ============================================================================

/** Response type for successful upload */
export type ForumImageUploadResponse = {
  success: true;
  url: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
  optimized: boolean;
  variants?: Record<string, string>;
  width?: number;
  height?: number;
};

/** Response type for upload errors */
export type ForumImageUploadError = {
  success: false;
  error: string;
  code?: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for images
 */
export function generateImageId(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 16);
}

/**
 * Validate MIME type is an allowed image type
 */
export function isAllowedMimeType(mimeType: string): boolean {
  return Object.keys(ALLOWED_MIME_TYPES).includes(mimeType.toLowerCase());
}

/**
 * Get extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string | null {
  return ALLOWED_MIME_TYPES[mimeType.toLowerCase()] ?? null;
}

/**
 * Validate image file buffer - basic check for image signature
 */
export function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }

  // Check file signatures (magic bytes)
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }

  // GIF: 47 49 46 38
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return true;
  }

  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  return false;
}

/**
 * Sanitize filename - remove path components and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators
  let sanitized = filename.replace(/[/\\]/g, "_");

  // Remove special characters except dots, dashes, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Collapse multiple underscores
  sanitized = sanitized.replace(/_+/g, "_");

  // Trim underscores from start and end
  sanitized = sanitized.replace(/^_+|_+$/g, "");

  // Ensure filename is not empty
  if (!sanitized || sanitized === ".") {
    sanitized = "image";
  }

  // Truncate if too long (max 100 chars)
  if (sanitized.length > 100) {
    const ext = sanitized.split(".").pop() || "";
    const base = sanitized.substring(0, 90 - ext.length);
    sanitized = ext ? `${base}.${ext}` : base;
  }

  return sanitized;
}

/**
 * Parse multipart form data from Vercel request
 * Vercel automatically parses multipart/form-data and puts file data in body
 */
export function extractFileFromRequest(body: unknown): {
  data: Buffer | null;
  filename: string | null;
  contentType: string | null;
} {
  if (!body || typeof body !== "object") {
    return { data: null, filename: null, contentType: null };
  }

  const bodyObj = body as Record<string, unknown>;

  // Check for base64 encoded image in body (common for form uploads)
  if (typeof bodyObj.imageData === "string") {
    const base64Data = bodyObj.imageData;
    // Handle data URL format: data:image/png;base64,xxxxx
    const match = base64Data.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (match && match[1] && match[2]) {
      const contentType = match[1];
      const data = Buffer.from(match[2], "base64");
      const ext = getExtensionFromMimeType(contentType) || "png";
      return {
        data,
        filename: `image.${ext}`,
        contentType,
      };
    }
    // Try plain base64
    try {
      const data = Buffer.from(base64Data, "base64");
      const filename =
        typeof bodyObj.filename === "string" ? bodyObj.filename : "image.png";
      const contentType =
        typeof bodyObj.contentType === "string"
          ? bodyObj.contentType
          : "image/png";
      return { data, filename, contentType };
    } catch {
      // Not valid base64
    }
  }

  // Check for raw buffer in body (Vercel's file parsing)
  if (bodyObj.image) {
    const image = bodyObj.image as {
      data?: Buffer | string | number[];
      filename?: string;
      mimetype?: string;
      type?: string;
    };

    let data: Buffer | null = null;

    if (Buffer.isBuffer(image.data)) {
      data = image.data;
    } else if (Array.isArray(image.data)) {
      data = Buffer.from(image.data);
    } else if (typeof image.data === "string") {
      data = Buffer.from(image.data, "base64");
    } else if (Buffer.isBuffer(image)) {
      data = image as unknown as Buffer;
    }

    if (data) {
      return {
        data,
        filename: image.filename || "image",
        contentType: image.mimetype || image.type || "application/octet-stream",
      };
    }
  }

  return { data: null, filename: null, contentType: null };
}

// ============================================================================
// Handler
// ============================================================================

async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  // Only POST method allowed
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    sendError(res, ErrorCodes.BAD_REQUEST, "Method not allowed", 405);
    return;
  }

  const { userId: clerkUserId } = req.auth;

  // Get the actual user
  const user = await getUserByClerkId(clerkUserId);
  if (!user) {
    sendError(res, ErrorCodes.NOT_FOUND, "User not found", 404);
    return;
  }

  try {
    // Check if storage is available
    if (!storageUtils.isStorageAvailable()) {
      logger.error("R2 storage not configured for forum image upload");
      sendError(
        res,
        ErrorCodes.INTERNAL_ERROR,
        "File storage is not available",
        503
      );
      return;
    }

    // Extract file from request body
    const { data, filename, contentType } = extractFileFromRequest(req.body);

    if (!data || !filename) {
      sendError(res, ErrorCodes.BAD_REQUEST, "No image file provided", 400);
      return;
    }

    // Validate content type
    if (!contentType || !isAllowedMimeType(contentType)) {
      sendError(
        res,
        ErrorCodes.BAD_REQUEST,
        `Invalid image type. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(", ")}`,
        400
      );
      return;
    }

    // Validate file size
    if (data.length > MAX_IMAGE_SIZE) {
      const maxSizeMB = Math.round(MAX_IMAGE_SIZE / (1024 * 1024));
      sendError(
        res,
        ErrorCodes.BAD_REQUEST,
        `Image too large. Maximum size is ${maxSizeMB}MB`,
        400
      );
      return;
    }

    // Validate image buffer (check magic bytes)
    if (!isValidImageBuffer(data)) {
      sendError(res, ErrorCodes.BAD_REQUEST, "Invalid image file", 400);
      return;
    }

    // Generate unique ID for this image
    const imageId = generateImageId();

    // Sanitize filename and ensure correct extension
    const extension = getExtensionFromMimeType(contentType) || "png";
    const sanitizedFilename = sanitizeFilename(filename);
    const finalFilename = sanitizedFilename.includes(".")
      ? sanitizedFilename
      : `${sanitizedFilename}.${extension}`;

    // Build storage key
    const key = storage.buildForumImageKey(user.id, imageId, finalFilename);

    // Optimize image and generate variants
    const optimizationResult = await imageOptimization.optimizeImage(
      data,
      IMAGE_SIZE_PRESETS.forum,
      {
        quality: 85,
        format: "webp",
        generateVariants: true,
        maxWidth: 2048,
        maxHeight: 2048,
      }
    );

    // Use optimized original if available, otherwise use raw data
    const uploadData =
      optimizationResult.success && optimizationResult.original
        ? optimizationResult.original.buffer
        : data;

    const uploadContentType =
      optimizationResult.success && optimizationResult.original
        ? `image/${optimizationResult.original.format}`
        : contentType;

    // Upload main image to R2
    const uploadResult = await storage.uploadFile(key, uploadData, {
      contentType: uploadContentType,
      cacheControl: "public, max-age=31536000, immutable", // Cache for 1 year
      metadata: {
        uploadedBy: user.id,
        originalFilename: filename,
        optimized: optimizationResult.success ? "true" : "false",
      },
    });

    if (!uploadResult.success) {
      logger.error("Failed to upload forum image to R2", {
        userId: user.id,
        error: uploadResult.error,
      });
      sendError(res, ErrorCodes.INTERNAL_ERROR, "Failed to upload image", 500);
      return;
    }

    // Upload image variants (sizes) in parallel
    const variantUrls: Record<string, string> = {};
    if (optimizationResult.success && optimizationResult.variants) {
      const variantUploads = [...optimizationResult.variants.entries()].map(
        async ([sizeName, variant]) => {
          const variantKey = imageOptimization.getImageKeyWithSize(
            key,
            sizeName
          );
          const variantResult = await storage.uploadFile(
            variantKey,
            variant.buffer,
            {
              contentType: `image/${variant.format}`,
              cacheControl: "public, max-age=31536000, immutable",
              metadata: {
                uploadedBy: user.id,
                variant: sizeName,
                width: String(variant.width),
                height: String(variant.height),
              },
            }
          );

          if (variantResult.success) {
            variantUrls[sizeName] =
              variantResult.publicUrl || `/api/forum/images/${variantKey}`;
          }
        }
      );

      await Promise.all(variantUploads);
    }

    // Build the public URL
    const url = uploadResult.publicUrl || `/api/forum/images/${key}`;

    logger.info("Forum image uploaded successfully", {
      userId: user.id,
      key,
      originalSize: data.length,
      optimizedSize: uploadData.length,
      contentType: uploadContentType,
      variants: Object.keys(variantUrls),
    });

    const response: ForumImageUploadResponse = {
      success: true,
      url,
      key,
      filename: finalFilename,
      contentType: uploadContentType,
      size: uploadData.length,
      optimized: optimizationResult.success,
    };

    if (Object.keys(variantUrls).length > 0) {
      response.variants = variantUrls;
    }

    if (optimizationResult.original?.width) {
      response.width = optimizationResult.original.width;
    }

    if (optimizationResult.original?.height) {
      response.height = optimizationResult.original.height;
    }

    sendSuccess(res, response);
  } catch (error) {
    logger.error("Error uploading forum image", {
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    sendError(res, ErrorCodes.INTERNAL_ERROR, "Internal server error", 500);
  }
}

export default withAuth(handler);
