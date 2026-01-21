/**
 * TTS Download Background Job Processor
 *
 * Processes TTS download jobs asynchronously:
 * - Fetches pending/processing downloads from database
 * - Generates audio using TTS service
 * - Uploads to R2 storage
 * - Updates download status
 * - Handles errors and retries
 *
 * Note: This is a basic implementation. In production, use a proper
 * job queue like Bull, BullMQ, or Vercel's background functions.
 */

import { db } from "./db.js";
import { generateAudio, chunkText } from "./tts.js";
import { storage } from "./storage.js";
import { logger } from "../utils/logger.js";
import type { TTSProvider, AudioFormat } from "./tts.js";

// ============================================================================
// Types
// ============================================================================

interface ProcessDownloadResult {
  success: boolean;
  downloadId: string;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const CHUNK_DELAY_MS = 500; // Delay between processing chunks to avoid rate limits

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert Prisma enum to service format
 */
function prismaToServiceProvider(
  provider: "WEB_SPEECH" | "OPENAI" | "ELEVENLABS"
): TTSProvider {
  switch (provider) {
    case "ELEVENLABS":
      return "elevenlabs";
    case "OPENAI":
      return "openai";
    default:
      return "web_speech";
  }
}

/**
 * Convert Prisma audio format to lowercase
 */
function prismaToServiceFormat(
  format: "MP3" | "OPUS" | "AAC" | "FLAC" | "WAV" | "PCM"
): AudioFormat {
  return format.toLowerCase() as AudioFormat;
}

/**
 * Generate signed download URL (mock implementation)
 * In production, use R2 presigned URLs or CloudFlare signed URLs
 */
function generateDownloadUrl(fileKey: string): string {
  // This is a placeholder - in production, generate actual signed URL
  return `https://storage.read-master.com/${fileKey}`;
}

// ============================================================================
// Main Processor
// ============================================================================

/**
 * Process a single TTS download
 *
 * This function:
 * 1. Fetches book content from database
 * 2. Chunks the text
 * 3. Generates audio for each chunk using TTS service
 * 4. Combines chunks into single file
 * 5. Uploads to R2 storage
 * 6. Updates download record with file info
 */
export async function processDownload(
  downloadId: string
): Promise<ProcessDownloadResult> {
  try {
    logger.info("Starting TTS download processing", { downloadId });

    // Fetch download record
    const download = await db.tTSDownload.findUnique({
      where: { id: downloadId },
      include: {
        book: true,
        user: true,
      },
    });

    if (!download) {
      logger.error("Download not found", { downloadId });
      return { success: false, downloadId, error: "Download not found" };
    }

    // Skip if not in correct status
    if (download.status !== "PENDING" && download.status !== "PROCESSING") {
      logger.warn("Download not in processable state", {
        downloadId,
        status: download.status,
      });
      return {
        success: false,
        downloadId,
        error: `Invalid status: ${download.status}`,
      };
    }

    // Update status to PROCESSING
    await db.tTSDownload.update({
      where: { id: downloadId },
      data: { status: "PROCESSING", updatedAt: new Date() },
    });

    // TODO: In production, fetch actual book content from file storage (R2/CloudFlare)
    // For now, use a placeholder based on book metadata
    const bookContent = `${download.book.title} by ${download.book.author || "Unknown Author"}. ${download.book.description || ""}`;

    if (!bookContent.trim()) {
      await db.tTSDownload.update({
        where: { id: downloadId },
        data: {
          status: "FAILED",
          errorMessage: "Book content is empty",
          updatedAt: new Date(),
        },
      });
      return { success: false, downloadId, error: "Empty book content" };
    }

    // Chunk the text
    const chunks = chunkText(bookContent);
    const totalChunks = chunks.length;

    logger.info("Processing TTS chunks", {
      downloadId,
      totalChunks,
      totalCharacters: bookContent.length,
    });

    // Convert enums to service format
    const provider = prismaToServiceProvider(download.provider);
    const format = prismaToServiceFormat(download.format);

    // Process chunks (in batches to avoid memory issues)
    const audioBuffers: Buffer[] = [];
    let actualCost = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;

      try {
        // Generate audio for this chunk
        const result = await generateAudio(provider, {
          text: chunk.text,
          voice: download.voice,
          format,
        });

        audioBuffers.push(Buffer.from(result.audioBase64, "base64"));
        actualCost += result.cost;

        // Update progress
        await db.tTSDownload.update({
          where: { id: downloadId },
          data: {
            processedChunks: i + 1,
            actualCost,
            updatedAt: new Date(),
          },
        });

        logger.debug("Processed chunk", {
          downloadId,
          chunkIndex: i,
          progress: Math.round(((i + 1) / totalChunks) * 100),
        });

        // Delay to avoid rate limits
        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
        }
      } catch (error) {
        logger.error("Failed to process chunk", {
          downloadId,
          chunkIndex: i,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // If we fail a chunk, mark the entire download as failed
        await db.tTSDownload.update({
          where: { id: downloadId },
          data: {
            status: "FAILED",
            errorMessage: `Failed to process chunk ${i + 1}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            actualCost,
            updatedAt: new Date(),
          },
        });

        return {
          success: false,
          downloadId,
          error: `Chunk processing failed at ${i + 1}/${totalChunks}`,
        };
      }
    }

    // Combine all audio buffers
    const combinedAudio = Buffer.concat(audioBuffers);
    const fileSize = combinedAudio.length;

    logger.info("Combined audio chunks", {
      downloadId,
      fileSize,
      chunkCount: audioBuffers.length,
    });

    // Upload to R2 storage
    const fileKey = `users/${download.userId}/audio/downloads/${downloadId}.${format}`;

    try {
      await storage.uploadFile(fileKey, combinedAudio, {
        contentType: `audio/${format}`,
      });

      logger.info("Uploaded audio to storage", {
        downloadId,
        fileKey,
        fileSize,
      });
    } catch (error) {
      logger.error("Failed to upload audio", {
        downloadId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      await db.tTSDownload.update({
        where: { id: downloadId },
        data: {
          status: "FAILED",
          errorMessage: "Failed to upload audio file",
          actualCost,
          updatedAt: new Date(),
        },
      });

      return { success: false, downloadId, error: "Upload failed" };
    }

    // Generate download URL
    const downloadUrl = generateDownloadUrl(fileKey);

    // Mark as completed
    await db.tTSDownload.update({
      where: { id: downloadId },
      data: {
        status: "COMPLETED",
        fileKey,
        fileSize,
        downloadUrl,
        actualCost,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logger.info("TTS download completed successfully", {
      downloadId,
      fileSize,
      actualCost,
    });

    return { success: true, downloadId };
  } catch (error) {
    logger.error("TTS download processing failed", {
      downloadId,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Try to mark as failed if possible
    try {
      await db.tTSDownload.update({
        where: { id: downloadId },
        data: {
          status: "FAILED",
          errorMessage:
            error instanceof Error ? error.message : "Processing failed",
          updatedAt: new Date(),
        },
      });
    } catch (updateError) {
      logger.error("Failed to update download status", {
        downloadId,
        updateError,
      });
    }

    return {
      success: false,
      downloadId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process all pending downloads
 *
 * Fetches all PENDING downloads and processes them in sequence.
 * In production, this would be triggered by a cron job or background worker.
 */
export async function processPendingDownloads(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  logger.info("Processing pending TTS downloads");

  // Fetch all pending downloads
  const pendingDownloads = await db.tTSDownload.findMany({
    where: {
      status: "PENDING",
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 10, // Process max 10 at a time
  });

  logger.info("Found pending downloads", { count: pendingDownloads.length });

  let succeeded = 0;
  let failed = 0;

  // Process each download sequentially
  for (const download of pendingDownloads) {
    const result = await processDownload(download.id);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  logger.info("Finished processing pending downloads", {
    processed: pendingDownloads.length,
    succeeded,
    failed,
  });

  return {
    processed: pendingDownloads.length,
    succeeded,
    failed,
  };
}

/**
 * Cleanup expired downloads
 *
 * Deletes download records and files that have expired.
 * Should be run periodically (e.g., daily cron job).
 */
export async function cleanupExpiredDownloads(): Promise<number> {
  logger.info("Cleaning up expired TTS downloads");

  const now = new Date();

  // Find expired downloads
  const expiredDownloads = await db.tTSDownload.findMany({
    where: {
      expiresAt: {
        lt: now,
      },
      deletedAt: null,
    },
  });

  logger.info("Found expired downloads", { count: expiredDownloads.length });

  // Delete files from storage and soft-delete records
  for (const download of expiredDownloads) {
    try {
      // Delete file from storage if exists
      if (download.fileKey) {
        await storage.deleteFile(download.fileKey);
        logger.debug("Deleted expired file", {
          downloadId: download.id,
          fileKey: download.fileKey,
        });
      }

      // Soft delete the record
      await db.tTSDownload.update({
        where: { id: download.id },
        data: {
          deletedAt: now,
          downloadUrl: null, // Clear download URL
        },
      });
    } catch (error) {
      logger.error("Failed to cleanup expired download", {
        downloadId: download.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  logger.info("Finished cleanup", { cleaned: expiredDownloads.length });

  return expiredDownloads.length;
}
