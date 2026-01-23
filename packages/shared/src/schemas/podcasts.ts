/**
 * Zod schemas for Podcast operations
 *
 * These schemas validate podcast-related API requests for:
 * - Subscribing to podcasts via RSS feed
 * - Managing podcast episodes
 * - Tracking listening progress
 *
 * Validation rules:
 * - Title: 1-500 characters (required)
 * - Author: 1-200 characters (optional)
 * - RSS URL: valid URL format (required)
 * - Description: max 50,000 characters (optional)
 *
 * @example
 * ```typescript
 * import { subscribeToPodcastSchema, podcastQuerySchema } from '@read-master/shared/schemas';
 *
 * // Validate podcast subscription
 * const result = subscribeToPodcastSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 *
 * // Validate query parameters
 * const query = podcastQuerySchema.parse(req.query);
 * ```
 */

import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Podcast source enum - where the podcast was discovered
 */
export const podcastSourceSchema = z.enum([
  "RSS_FEED",
  "APPLE_PODCASTS",
  "SPOTIFY",
  "MANUAL",
]);
export type PodcastSourceSchema = z.infer<typeof podcastSourceSchema>;

/**
 * Episode status enum - user's listening status for an episode
 */
export const episodeStatusSchema = z.enum([
  "NEW",
  "IN_PROGRESS",
  "COMPLETED",
  "SKIPPED",
]);
export type EpisodeStatusSchema = z.infer<typeof episodeStatusSchema>;

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * Podcast title validation
 * - Required field
 * - 1-500 characters
 * - Trimmed of whitespace
 */
export const podcastTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(500, "Title must be at most 500 characters");

/**
 * Podcast author validation
 * - Optional field
 * - 1-200 characters when provided
 * - Trimmed of whitespace
 */
export const podcastAuthorSchema = z
  .string()
  .min(1, "Author name cannot be empty")
  .max(200, "Author name must be at most 200 characters")
  .trim()
  .optional()
  .nullable();

/**
 * Podcast description validation
 * - Optional field
 * - Max 50,000 characters for long descriptions
 * - Trimmed of whitespace
 */
export const podcastDescriptionSchema = z
  .string()
  .max(50000, "Description must be at most 50,000 characters")
  .trim()
  .optional()
  .nullable();

/**
 * RSS URL validation for podcast subscriptions
 */
export const rssUrlSchema = z
  .string()
  .url("Invalid RSS URL format")
  .max(2000, "URL is too long");

/**
 * Cover image URL validation
 */
export const podcastCoverImageSchema = z
  .string()
  .max(2000, "Cover image URL is too long")
  .optional()
  .nullable();

/**
 * Episode duration in seconds
 */
export const episodeDurationSchema = z
  .number()
  .int("Duration must be an integer")
  .nonnegative("Duration cannot be negative")
  .max(86400, "Duration cannot exceed 24 hours"); // 24 hours max

/**
 * Episode audio URL validation
 */
export const episodeAudioUrlSchema = z
  .string()
  .url("Invalid audio URL format")
  .max(2000, "Audio URL is too long");

/**
 * Episode title validation
 */
export const episodeTitleSchema = z
  .string()
  .trim()
  .min(1, "Episode title is required")
  .max(500, "Episode title must be at most 500 characters");

/**
 * Episode description validation
 */
export const episodeDescriptionSchema = z
  .string()
  .max(100000, "Episode description must be at most 100,000 characters")
  .trim()
  .optional()
  .nullable();

/**
 * Listening position in seconds
 */
export const listeningPositionSchema = z
  .number()
  .int("Position must be an integer")
  .nonnegative("Position cannot be negative");

/**
 * Playback speed (0.5x to 3x)
 */
export const playbackSpeedSchema = z
  .number()
  .min(0.5, "Playback speed must be at least 0.5x")
  .max(3, "Playback speed cannot exceed 3x")
  .default(1);

// =============================================================================
// SUBSCRIBE TO PODCAST SCHEMA
// =============================================================================

/**
 * Subscribe to a podcast via RSS URL
 */
export const subscribeToPodcastSchema = z.object({
  rssUrl: rssUrlSchema,
  source: podcastSourceSchema.default("RSS_FEED"),
});
export type SubscribeToPodcastInput = z.infer<typeof subscribeToPodcastSchema>;

// =============================================================================
// UPDATE PODCAST SCHEMA
// =============================================================================

/**
 * Update podcast settings/preferences
 */
export const updatePodcastSchema = z
  .object({
    autoDownload: z.boolean().optional(),
    notifyNewEpisodes: z.boolean().optional(),
    playbackSpeed: playbackSpeedSchema.optional(),
  })
  .refine(
    (data) => {
      return Object.values(data).some((value) => value !== undefined);
    },
    { message: "At least one field must be provided for update" }
  );
export type UpdatePodcastInput = z.infer<typeof updatePodcastSchema>;

// =============================================================================
// PODCAST QUERY SCHEMA
// =============================================================================

/**
 * Podcast sort fields
 */
export const podcastSortFieldSchema = z.enum([
  "title",
  "author",
  "subscribedAt",
  "updatedAt",
  "episodeCount",
]);
export type PodcastSortField = z.infer<typeof podcastSortFieldSchema>;

/**
 * Sort direction
 */
export const podcastSortDirectionSchema = z.enum(["asc", "desc"]);
export type PodcastSortDirection = z.infer<typeof podcastSortDirectionSchema>;

/**
 * Podcast list query parameters
 */
export const podcastQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: podcastSortFieldSchema.default("subscribedAt"),
  sortDirection: podcastSortDirectionSchema.default("desc"),

  // Filters
  hasNewEpisodes: z.coerce.boolean().optional(),

  // Search
  search: z.string().max(200).trim().optional(),
});
export type PodcastQueryInput = z.infer<typeof podcastQuerySchema>;

// =============================================================================
// EPISODE QUERY SCHEMA
// =============================================================================

/**
 * Episode sort fields
 */
export const episodeSortFieldSchema = z.enum([
  "title",
  "publishedAt",
  "duration",
  "status",
]);
export type EpisodeSortField = z.infer<typeof episodeSortFieldSchema>;

/**
 * Episode list query parameters
 */
export const episodeQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: episodeSortFieldSchema.default("publishedAt"),
  sortDirection: podcastSortDirectionSchema.default("desc"),

  // Filters
  status: episodeStatusSchema.optional(),
  unlistenedOnly: z.coerce.boolean().default(false),

  // Search
  search: z.string().max(200).trim().optional(),
});
export type EpisodeQueryInput = z.infer<typeof episodeQuerySchema>;

// =============================================================================
// UPDATE EPISODE PROGRESS SCHEMA
// =============================================================================

/**
 * Update listening progress for an episode
 */
export const updateEpisodeProgressSchema = z.object({
  position: listeningPositionSchema,
  status: episodeStatusSchema.optional(),
});
export type UpdateEpisodeProgressInput = z.infer<
  typeof updateEpisodeProgressSchema
>;

/**
 * Mark episode as listened/completed
 */
export const markEpisodeCompletedSchema = z.object({
  episodeId: z.string().min(1, "Episode ID is required"),
});
export type MarkEpisodeCompletedInput = z.infer<
  typeof markEpisodeCompletedSchema
>;

// =============================================================================
// ID SCHEMAS
// =============================================================================

/**
 * Podcast ID validation (CUID format)
 */
export const podcastIdSchema = z
  .string()
  .min(1, "Podcast ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid podcast ID format");
export type PodcastIdInput = z.infer<typeof podcastIdSchema>;

/**
 * Episode ID validation (CUID format)
 */
export const episodeIdSchema = z
  .string()
  .min(1, "Episode ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid episode ID format");
export type EpisodeIdInput = z.infer<typeof episodeIdSchema>;

/**
 * Podcast ID params schema (for route params)
 */
export const podcastIdParamsSchema = z.object({
  id: podcastIdSchema,
});
export type PodcastIdParamsInput = z.infer<typeof podcastIdParamsSchema>;

/**
 * Episode ID params schema (for route params)
 */
export const episodeIdParamsSchema = z.object({
  episodeId: episodeIdSchema,
});
export type EpisodeIdParamsInput = z.infer<typeof episodeIdParamsSchema>;

/**
 * Combined podcast and episode ID params
 */
export const podcastEpisodeIdParamsSchema = z.object({
  id: podcastIdSchema,
  episodeId: episodeIdSchema,
});
export type PodcastEpisodeIdParamsInput = z.infer<
  typeof podcastEpisodeIdParamsSchema
>;

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

/**
 * Podcast episode response schema
 */
export const podcastEpisodeResponseSchema = z.object({
  id: z.string(),
  podcastId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  audioUrl: z.string(),
  duration: z.number(),
  publishedAt: z.string(),
  status: episodeStatusSchema,
  position: z.number(),
  completedAt: z.string().nullable(),
});
export type PodcastEpisodeResponse = z.infer<
  typeof podcastEpisodeResponseSchema
>;

/**
 * Podcast summary response schema
 */
export const podcastSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string().nullable(),
  description: z.string().nullable(),
  coverImage: z.string().nullable(),
  rssUrl: z.string(),
  episodeCount: z.number(),
  newEpisodeCount: z.number(),
  subscribedAt: z.string(),
  updatedAt: z.string(),
});
export type PodcastSummary = z.infer<typeof podcastSummarySchema>;

/**
 * Podcast detail response schema
 */
export const podcastDetailSchema = podcastSummarySchema.extend({
  episodes: z.array(podcastEpisodeResponseSchema),
  autoDownload: z.boolean(),
  notifyNewEpisodes: z.boolean(),
  playbackSpeed: z.number(),
});
export type PodcastDetail = z.infer<typeof podcastDetailSchema>;

// =============================================================================
// RSS FEED PARSING SCHEMAS
// =============================================================================

/**
 * Parsed RSS feed item (episode)
 */
export const rssFeedItemSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  audioUrl: z.string(),
  duration: z.number().optional(),
  publishedAt: z.string().optional(),
  guid: z.string().optional(),
});
export type RssFeedItem = z.infer<typeof rssFeedItemSchema>;

/**
 * Parsed RSS feed (podcast)
 */
export const rssFeedSchema = z.object({
  title: z.string(),
  author: z.string().optional(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  link: z.string().optional(),
  language: z.string().optional(),
  items: z.array(rssFeedItemSchema),
});
export type RssFeed = z.infer<typeof rssFeedSchema>;

// =============================================================================
// SCHEMA INDEX (convenient re-exports)
// =============================================================================

/**
 * All podcast-related schemas for convenient importing
 */
export const podcastSchemas = {
  // Enums
  podcastSource: podcastSourceSchema,
  episodeStatus: episodeStatusSchema,

  // Field schemas
  title: podcastTitleSchema,
  author: podcastAuthorSchema,
  description: podcastDescriptionSchema,
  rssUrl: rssUrlSchema,
  coverImage: podcastCoverImageSchema,
  episodeDuration: episodeDurationSchema,
  episodeAudioUrl: episodeAudioUrlSchema,
  episodeTitle: episodeTitleSchema,
  episodeDescription: episodeDescriptionSchema,
  listeningPosition: listeningPositionSchema,
  playbackSpeed: playbackSpeedSchema,

  // Subscribe schemas
  subscribe: subscribeToPodcastSchema,

  // Update schemas
  update: updatePodcastSchema,
  updateProgress: updateEpisodeProgressSchema,
  markCompleted: markEpisodeCompletedSchema,

  // Query schemas
  query: podcastQuerySchema,
  episodeQuery: episodeQuerySchema,
  sortField: podcastSortFieldSchema,
  episodeSortField: episodeSortFieldSchema,
  sortDirection: podcastSortDirectionSchema,

  // ID schemas
  podcastId: podcastIdSchema,
  episodeId: episodeIdSchema,
  podcastIdParams: podcastIdParamsSchema,
  episodeIdParams: episodeIdParamsSchema,
  podcastEpisodeIdParams: podcastEpisodeIdParamsSchema,

  // Response schemas
  episode: podcastEpisodeResponseSchema,
  summary: podcastSummarySchema,
  detail: podcastDetailSchema,

  // RSS parsing
  rssFeedItem: rssFeedItemSchema,
  rssFeed: rssFeedSchema,
} as const;
