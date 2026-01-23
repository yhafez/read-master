/**
 * Zod schemas for Video content operations
 *
 * These schemas validate video-related API requests for:
 * - Importing and managing video content
 * - Tracking video playback progress
 * - Managing video transcripts
 * - Video annotations
 *
 * Validation rules:
 * - Title: 1-500 characters (required)
 * - Description: max 50,000 characters (optional)
 * - Video URL: valid URL format (required)
 * - Duration: positive integer in seconds (required)
 *
 * @example
 * ```typescript
 * import { importVideoSchema, videoQuerySchema } from '@read-master/shared/schemas';
 *
 * // Validate video import
 * const result = importVideoSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 *
 * // Validate query parameters
 * const query = videoQuerySchema.parse(req.query);
 * ```
 */

import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Video source enum - where the video was imported from
 */
export const videoSourceSchema = z.enum([
  "UPLOAD", // Direct file upload
  "YOUTUBE", // YouTube link
  "VIMEO", // Vimeo link
  "URL", // Direct URL to video file
  "RECORDING", // Screen/camera recording
]);
export type VideoSourceSchema = z.infer<typeof videoSourceSchema>;

/**
 * Video status enum - user's viewing status for a video
 */
export const videoStatusSchema = z.enum([
  "NEW", // Never watched
  "IN_PROGRESS", // Partially watched
  "COMPLETED", // Finished watching
  "BOOKMARKED", // Saved for later
]);
export type VideoStatusSchema = z.infer<typeof videoStatusSchema>;

/**
 * Video quality enum - available quality options
 */
export const videoQualitySchema = z.enum([
  "AUTO",
  "360P",
  "480P",
  "720P",
  "1080P",
  "1440P",
  "4K",
]);
export type VideoQualitySchema = z.infer<typeof videoQualitySchema>;

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * Video title validation
 * - Required field
 * - 1-500 characters
 * - Trimmed of whitespace
 */
export const videoTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(500, "Title must be at most 500 characters");

/**
 * Video description validation
 * - Optional field
 * - Max 50,000 characters for long descriptions
 * - Trimmed of whitespace
 */
export const videoDescriptionSchema = z
  .string()
  .max(50000, "Description must be at most 50,000 characters")
  .trim()
  .optional()
  .nullable();

/**
 * Video URL validation
 */
export const videoUrlSchema = z
  .string()
  .url("Invalid video URL format")
  .max(2000, "URL is too long");

/**
 * Thumbnail image URL validation
 */
export const videoThumbnailSchema = z
  .string()
  .max(2000, "Thumbnail URL is too long")
  .optional()
  .nullable();

/**
 * Video duration in seconds
 */
export const videoDurationSchema = z
  .number()
  .int("Duration must be an integer")
  .nonnegative("Duration cannot be negative")
  .max(86400 * 7, "Duration cannot exceed 7 days"); // 7 days max for long content

/**
 * Video playback position in seconds
 */
export const videoPositionSchema = z
  .number()
  .int("Position must be an integer")
  .nonnegative("Position cannot be negative");

/**
 * Playback speed (0.25x to 3x)
 */
export const videoPlaybackSpeedSchema = z
  .number()
  .min(0.25, "Playback speed must be at least 0.25x")
  .max(3, "Playback speed cannot exceed 3x")
  .default(1);

/**
 * Volume level (0 to 1)
 */
export const videoVolumeSchema = z
  .number()
  .min(0, "Volume must be at least 0")
  .max(1, "Volume cannot exceed 1")
  .default(1);

// =============================================================================
// TRANSCRIPT SCHEMAS
// =============================================================================

/**
 * Transcript cue (single caption/subtitle entry)
 */
export const transcriptCueSchema = z.object({
  /** Start time in seconds */
  startTime: z.number().nonnegative(),
  /** End time in seconds */
  endTime: z.number().nonnegative(),
  /** Caption text */
  text: z.string().max(1000),
});
export type TranscriptCue = z.infer<typeof transcriptCueSchema>;

/**
 * Full transcript for a video
 */
export const videoTranscriptSchema = z.object({
  /** Language code (e.g., 'en', 'es', 'ja') */
  language: z.string().min(2).max(10),
  /** Label for the transcript (e.g., 'English', 'Auto-generated') */
  label: z.string().max(100),
  /** Array of cues */
  cues: z.array(transcriptCueSchema),
});
export type VideoTranscript = z.infer<typeof videoTranscriptSchema>;

// =============================================================================
// VIDEO ANNOTATION SCHEMAS
// =============================================================================

/**
 * Video annotation (note at specific timestamp)
 */
export const videoAnnotationSchema = z.object({
  /** Timestamp in seconds */
  timestamp: z.number().nonnegative(),
  /** Note content */
  content: z.string().min(1).max(5000),
  /** Optional color for annotation */
  color: z.string().max(20).optional(),
});
export type VideoAnnotation = z.infer<typeof videoAnnotationSchema>;

/**
 * Create video annotation input
 */
export const createVideoAnnotationSchema = z.object({
  videoId: z.string().min(1, "Video ID is required"),
  timestamp: z.number().nonnegative("Timestamp must be non-negative"),
  content: z
    .string()
    .min(1, "Annotation content is required")
    .max(5000, "Annotation must be at most 5000 characters"),
  color: z.string().max(20).optional(),
});
export type CreateVideoAnnotationInput = z.infer<
  typeof createVideoAnnotationSchema
>;

// =============================================================================
// IMPORT VIDEO SCHEMA
// =============================================================================

/**
 * Import a video to the library
 */
export const importVideoSchema = z.object({
  title: videoTitleSchema,
  description: videoDescriptionSchema.optional(),
  videoUrl: videoUrlSchema,
  thumbnailUrl: videoThumbnailSchema.optional(),
  duration: videoDurationSchema,
  source: videoSourceSchema.default("URL"),
  transcript: videoTranscriptSchema.optional(),
});
export type ImportVideoInput = z.infer<typeof importVideoSchema>;

// =============================================================================
// UPDATE VIDEO SCHEMA
// =============================================================================

/**
 * Update video metadata
 */
export const updateVideoSchema = z
  .object({
    title: videoTitleSchema.optional(),
    description: videoDescriptionSchema,
    thumbnailUrl: videoThumbnailSchema,
  })
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  );
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;

// =============================================================================
// VIDEO QUERY SCHEMA
// =============================================================================

/**
 * Video sort fields
 */
export const videoSortFieldSchema = z.enum([
  "title",
  "createdAt",
  "updatedAt",
  "duration",
  "lastWatchedAt",
]);
export type VideoSortField = z.infer<typeof videoSortFieldSchema>;

/**
 * Sort direction
 */
export const videoSortDirectionSchema = z.enum(["asc", "desc"]);
export type VideoSortDirection = z.infer<typeof videoSortDirectionSchema>;

/**
 * Video list query parameters
 */
export const videoQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: videoSortFieldSchema.default("createdAt"),
  sortDirection: videoSortDirectionSchema.default("desc"),

  // Filters
  status: videoStatusSchema.optional(),
  source: videoSourceSchema.optional(),
  hasTranscript: z.coerce.boolean().optional(),

  // Search
  search: z.string().max(200).trim().optional(),
});
export type VideoQueryInput = z.infer<typeof videoQuerySchema>;

// =============================================================================
// UPDATE VIDEO PROGRESS SCHEMA
// =============================================================================

/**
 * Update viewing progress for a video
 */
export const updateVideoProgressSchema = z.object({
  position: videoPositionSchema,
  status: videoStatusSchema.optional(),
});
export type UpdateVideoProgressInput = z.infer<
  typeof updateVideoProgressSchema
>;

/**
 * Mark video as completed
 */
export const markVideoCompletedSchema = z.object({
  videoId: z.string().min(1, "Video ID is required"),
});
export type MarkVideoCompletedInput = z.infer<typeof markVideoCompletedSchema>;

// =============================================================================
// VIDEO SETTINGS SCHEMA
// =============================================================================

/**
 * User's video playback settings
 */
export const videoSettingsSchema = z.object({
  defaultPlaybackSpeed: videoPlaybackSpeedSchema,
  defaultVolume: videoVolumeSchema,
  defaultQuality: videoQualitySchema.default("AUTO"),
  autoplay: z.boolean().default(false),
  showCaptions: z.boolean().default(false),
  preferredCaptionLanguage: z.string().max(10).optional(),
});
export type VideoSettings = z.infer<typeof videoSettingsSchema>;

// =============================================================================
// ID SCHEMAS
// =============================================================================

/**
 * Video ID validation (CUID format)
 */
export const videoIdSchema = z
  .string()
  .min(1, "Video ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid video ID format");
export type VideoIdInput = z.infer<typeof videoIdSchema>;

/**
 * Video Annotation ID validation (CUID format)
 */
export const videoAnnotationIdSchema = z
  .string()
  .min(1, "Annotation ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid annotation ID format");
export type VideoAnnotationIdInput = z.infer<typeof videoAnnotationIdSchema>;

/**
 * Video ID params schema (for route params)
 */
export const videoIdParamsSchema = z.object({
  id: videoIdSchema,
});
export type VideoIdParamsInput = z.infer<typeof videoIdParamsSchema>;

/**
 * Video Annotation ID params schema (for route params)
 */
export const videoAnnotationIdParamsSchema = z.object({
  annotationId: videoAnnotationIdSchema,
});
export type VideoAnnotationIdParamsInput = z.infer<
  typeof videoAnnotationIdParamsSchema
>;

/**
 * Combined video and annotation ID params
 */
export const videoWithAnnotationIdParamsSchema = z.object({
  id: videoIdSchema,
  annotationId: videoAnnotationIdSchema,
});
export type VideoWithAnnotationIdParamsInput = z.infer<
  typeof videoWithAnnotationIdParamsSchema
>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Video annotation response schema
 */
export const videoAnnotationResponseSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  userId: z.string(),
  timestamp: z.number(),
  content: z.string(),
  color: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VideoAnnotationResponse = z.infer<
  typeof videoAnnotationResponseSchema
>;

/**
 * Video summary response schema (for list views)
 */
export const videoSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  videoUrl: z.string(),
  duration: z.number(),
  source: videoSourceSchema,
  status: videoStatusSchema,
  position: z.number(),
  hasTranscript: z.boolean(),
  annotationCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastWatchedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type VideoSummary = z.infer<typeof videoSummarySchema>;

/**
 * Video detail response schema
 */
export const videoDetailSchema = videoSummarySchema.extend({
  transcript: videoTranscriptSchema.nullable(),
  annotations: z.array(videoAnnotationResponseSchema),
  settings: videoSettingsSchema.nullable(),
});
export type VideoDetail = z.infer<typeof videoDetailSchema>;

// =============================================================================
// SCHEMA INDEX (convenient re-exports)
// =============================================================================

/**
 * All video-related schemas for convenient importing
 */
export const videoSchemas = {
  // Enums
  videoSource: videoSourceSchema,
  videoStatus: videoStatusSchema,
  videoQuality: videoQualitySchema,

  // Field schemas
  title: videoTitleSchema,
  description: videoDescriptionSchema,
  videoUrl: videoUrlSchema,
  thumbnailUrl: videoThumbnailSchema,
  duration: videoDurationSchema,
  position: videoPositionSchema,
  playbackSpeed: videoPlaybackSpeedSchema,
  volume: videoVolumeSchema,

  // Transcript schemas
  transcriptCue: transcriptCueSchema,
  transcript: videoTranscriptSchema,

  // Annotation schemas
  annotation: videoAnnotationSchema,
  createAnnotation: createVideoAnnotationSchema,

  // Import/update schemas
  import: importVideoSchema,
  update: updateVideoSchema,
  updateProgress: updateVideoProgressSchema,
  markCompleted: markVideoCompletedSchema,

  // Query schemas
  query: videoQuerySchema,
  sortField: videoSortFieldSchema,
  sortDirection: videoSortDirectionSchema,

  // Settings schemas
  settings: videoSettingsSchema,

  // ID schemas
  videoId: videoIdSchema,
  videoAnnotationId: videoAnnotationIdSchema,
  videoIdParams: videoIdParamsSchema,
  videoAnnotationIdParams: videoAnnotationIdParamsSchema,
  videoWithAnnotationIdParams: videoWithAnnotationIdParamsSchema,

  // Response schemas
  annotationResponse: videoAnnotationResponseSchema,
  summary: videoSummarySchema,
  detail: videoDetailSchema,
} as const;
