/**
 * Image Optimization Service
 *
 * Provides image resizing, compression, and format conversion for uploaded images.
 * Uses sharp for image processing in serverless environment.
 */

import type sharp from "sharp";
import { logger } from "../utils/logger.js";

// ============================================================================
// Types
// ============================================================================

export interface ImageSize {
  name: string;
  width: number;
  height?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface OptimizationResult {
  success: boolean;
  original?: ProcessedImage;
  variants?: Map<string, ProcessedImage>;
  error?: string;
}

export interface OptimizationOptions {
  quality?: number;
  format?: "jpeg" | "webp" | "png" | "avif";
  generateVariants?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  preserveOriginal?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default image sizes to generate */
export const DEFAULT_IMAGE_SIZES: ImageSize[] = [
  { name: "thumb", width: 150, height: 150, fit: "cover" },
  { name: "medium", width: 400, fit: "inside" },
  { name: "large", width: 800, fit: "inside" },
];

/** Size configurations for specific use cases */
export const IMAGE_SIZE_PRESETS = {
  bookCover: [
    { name: "thumb", width: 80, height: 120, fit: "cover" as const },
    { name: "medium", width: 200, height: 300, fit: "cover" as const },
    { name: "large", width: 400, height: 600, fit: "cover" as const },
  ],
  avatar: [
    { name: "thumb", width: 40, height: 40, fit: "cover" as const },
    { name: "medium", width: 96, height: 96, fit: "cover" as const },
    { name: "large", width: 200, height: 200, fit: "cover" as const },
  ],
  forum: [
    { name: "thumb", width: 200, fit: "inside" as const },
    { name: "medium", width: 600, fit: "inside" as const },
    { name: "large", width: 1200, fit: "inside" as const },
  ],
};

/** Default quality settings per format */
const DEFAULT_QUALITY: Record<string, number> = {
  jpeg: 85,
  webp: 85,
  png: 85,
  avif: 80,
};

/** Maximum dimensions to prevent extremely large images */
const MAX_DIMENSION = 4096;

// ============================================================================
// Sharp lazy loading
// ============================================================================

type SharpFunction = typeof sharp;
let sharpModule: SharpFunction | null = null;

/**
 * Lazily load sharp module
 * Sharp has native bindings that may not be available in all environments
 */
async function getSharp(): Promise<SharpFunction | null> {
  if (sharpModule) return sharpModule;

  try {
    const module = await import("sharp");
    sharpModule = module.default;
    return sharpModule;
  } catch (error) {
    logger.warn("Sharp module not available, image optimization disabled", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

// ============================================================================
// Image Processing Functions
// ============================================================================

/**
 * Get image metadata
 */
export async function getImageMetadata(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
} | null> {
  const sharp = await getSharp();
  if (!sharp) return null;

  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || "unknown",
    };
  } catch (error) {
    logger.error("Failed to get image metadata", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Resize an image to specific dimensions
 */
export async function resizeImage(
  buffer: Buffer,
  width: number,
  height?: number,
  options: {
    fit?: "cover" | "contain" | "fill" | "inside" | "outside";
    format?: "jpeg" | "webp" | "png" | "avif";
    quality?: number;
  } = {}
): Promise<ProcessedImage | null> {
  const sharp = await getSharp();
  if (!sharp) {
    // Return original if sharp not available
    return {
      buffer,
      width: 0,
      height: 0,
      format: "unknown",
      size: buffer.length,
    };
  }

  const {
    fit = "inside",
    format = "webp",
    quality = DEFAULT_QUALITY[format],
  } = options;

  try {
    let pipeline = sharp(buffer).resize({
      width: Math.min(width, MAX_DIMENSION),
      height: height ? Math.min(height, MAX_DIMENSION) : undefined,
      fit,
      withoutEnlargement: true,
    });

    // Apply format conversion
    switch (format) {
      case "jpeg":
        pipeline = pipeline.jpeg({ quality, progressive: true });
        break;
      case "webp":
        pipeline = pipeline.webp({ quality });
        break;
      case "png":
        pipeline = pipeline.png({ quality, progressive: true });
        break;
      case "avif":
        pipeline = pipeline.avif({ quality });
        break;
    }

    const outputBuffer = await pipeline.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      width: metadata.width || width,
      height: metadata.height || 0,
      format,
      size: outputBuffer.length,
    };
  } catch (error) {
    logger.error("Failed to resize image", {
      error: error instanceof Error ? error.message : "Unknown error",
      targetWidth: width,
      targetHeight: height,
    });
    return null;
  }
}

/**
 * Generate a low-quality placeholder for blur-up effect
 */
export async function generatePlaceholder(
  buffer: Buffer,
  options: {
    width?: number;
    quality?: number;
    format?: "jpeg" | "webp";
  } = {}
): Promise<ProcessedImage | null> {
  const { width = 20, quality = 20, format = "jpeg" } = options;

  return resizeImage(buffer, width, undefined, {
    fit: "inside",
    format,
    quality,
  });
}

/**
 * Generate base64 data URL for inline placeholder
 */
export async function generatePlaceholderDataUrl(
  buffer: Buffer
): Promise<string | null> {
  const placeholder = await generatePlaceholder(buffer, {
    width: 10,
    quality: 10,
    format: "jpeg",
  });

  if (!placeholder) return null;

  return `data:image/jpeg;base64,${placeholder.buffer.toString("base64")}`;
}

/**
 * Optimize an image with multiple size variants
 */
export async function optimizeImage(
  buffer: Buffer,
  sizes: ImageSize[] = DEFAULT_IMAGE_SIZES,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  const {
    quality = 85,
    format = "webp",
    generateVariants = true,
    maxWidth = MAX_DIMENSION,
    maxHeight = MAX_DIMENSION,
    preserveOriginal = true,
  } = options;

  const sharp = await getSharp();

  // If sharp not available, return original
  if (!sharp) {
    return {
      success: true,
      original: {
        buffer,
        width: 0,
        height: 0,
        format: "unknown",
        size: buffer.length,
      },
    };
  }

  try {
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Process original (resize if exceeds max dimensions)
    let originalBuffer = buffer;
    let processedOriginal: ProcessedImage;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const resized = await resizeImage(buffer, maxWidth, maxHeight, {
        fit: "inside",
        format,
        quality,
      });

      if (resized) {
        originalBuffer = resized.buffer;
        processedOriginal = resized;
      } else {
        processedOriginal = {
          buffer,
          width: originalWidth,
          height: originalHeight,
          format: metadata.format || "unknown",
          size: buffer.length,
        };
      }
    } else if (!preserveOriginal) {
      // Convert format but keep dimensions
      const converted = await resizeImage(
        buffer,
        originalWidth,
        originalHeight,
        {
          fit: "fill",
          format,
          quality,
        }
      );
      processedOriginal = converted || {
        buffer,
        width: originalWidth,
        height: originalHeight,
        format: metadata.format || "unknown",
        size: buffer.length,
      };
    } else {
      processedOriginal = {
        buffer,
        width: originalWidth,
        height: originalHeight,
        format: metadata.format || "unknown",
        size: buffer.length,
      };
    }

    // Generate variants if requested
    const variants = new Map<string, ProcessedImage>();

    if (generateVariants) {
      for (const size of sizes) {
        // Skip if variant would be larger than original
        if (size.width >= originalWidth) continue;

        const variant = await resizeImage(
          originalBuffer,
          size.width,
          size.height,
          {
            fit: size.fit || "inside",
            format,
            quality,
          }
        );

        if (variant) {
          variants.set(size.name, variant);
        }
      }
    }

    return {
      success: true,
      original: processedOriginal,
      variants,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to optimize image", { error: message });

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Convert image format
 */
export async function convertImageFormat(
  buffer: Buffer,
  format: "jpeg" | "webp" | "png" | "avif",
  quality?: number
): Promise<ProcessedImage | null> {
  const sharp = await getSharp();
  if (!sharp) return null;

  try {
    let pipeline = sharp(buffer);
    const finalQuality = quality || DEFAULT_QUALITY[format];

    switch (format) {
      case "jpeg":
        pipeline = pipeline.jpeg({ quality: finalQuality, progressive: true });
        break;
      case "webp":
        pipeline = pipeline.webp({ quality: finalQuality });
        break;
      case "png":
        pipeline = pipeline.png({ quality: finalQuality, progressive: true });
        break;
      case "avif":
        pipeline = pipeline.avif({ quality: finalQuality });
        break;
    }

    const outputBuffer = await pipeline.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    return {
      buffer: outputBuffer,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format,
      size: outputBuffer.length,
    };
  } catch (error) {
    logger.error("Failed to convert image format", {
      error: error instanceof Error ? error.message : "Unknown error",
      targetFormat: format,
    });
    return null;
  }
}

// ============================================================================
// URL Helpers
// ============================================================================

/**
 * Generate image key with size suffix
 */
export function getImageKeyWithSize(key: string, sizeName: string): string {
  const lastDot = key.lastIndexOf(".");
  if (lastDot === -1) return `${key}-${sizeName}`;

  const base = key.substring(0, lastDot);
  const ext = key.substring(lastDot);
  return `${base}-${sizeName}${ext}`;
}

/**
 * Get all variant keys for an image
 */
export function getImageVariantKeys(
  baseKey: string,
  sizes: ImageSize[] = DEFAULT_IMAGE_SIZES
): Map<string, string> {
  const keys = new Map<string, string>();

  for (const size of sizes) {
    keys.set(size.name, getImageKeyWithSize(baseKey, size.name));
  }

  return keys;
}

// ============================================================================
// Image Info Helpers
// ============================================================================

/**
 * Check if buffer is a valid image
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  const metadata = await getImageMetadata(buffer);
  return metadata !== null && metadata.width > 0 && metadata.height > 0;
}

/**
 * Get suggested cache duration based on content type
 */
export function getCacheControlHeader(contentType: string): string {
  // Static assets can be cached for a long time
  if (contentType.startsWith("image/")) {
    // Images with hashed names: 1 year
    return "public, max-age=31536000, immutable";
  }

  // Default: 1 day
  return "public, max-age=86400";
}

/**
 * Estimate optimal quality based on image characteristics
 */
export async function estimateOptimalQuality(buffer: Buffer): Promise<number> {
  const sharp = await getSharp();
  if (!sharp) return 85;

  try {
    const metadata = await sharp(buffer).metadata();
    const pixels = (metadata.width || 0) * (metadata.height || 0);

    // Larger images can use lower quality without noticeable loss
    if (pixels > 4000000) return 80; // > 4MP
    if (pixels > 1000000) return 82; // > 1MP
    return 85;
  } catch {
    return 85;
  }
}

export const imageOptimization = {
  getImageMetadata,
  resizeImage,
  generatePlaceholder,
  generatePlaceholderDataUrl,
  optimizeImage,
  convertImageFormat,
  getImageKeyWithSize,
  getImageVariantKeys,
  isValidImage,
  getCacheControlHeader,
  estimateOptimalQuality,
  DEFAULT_IMAGE_SIZES,
  IMAGE_SIZE_PRESETS,
};

export default imageOptimization;
