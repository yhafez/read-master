export {
  useBooks,
  useBook,
  useUpdateBook,
  useDeleteBook,
  usePrefetchBook,
  type Book,
  type BookListFilters,
  type PaginatedResponse,
} from "./useBooks";

export {
  useFocusTrap,
  useFocusRestore,
  useFocusWithin,
  useRovingTabindex,
  useSkipLink,
  useFocusVisible,
  DEFAULT_FOCUS_TRAP_OPTIONS,
  FOCUSABLE_SELECTOR,
  type FocusTrapOptions,
  type FocusRestoreOptions,
  type FocusTrapReturn,
  type FocusRestoreReturn,
  type RovingTabindexOptions,
} from "./useFocusManagement";

export {
  useLeaderboard,
  type LeaderboardParams,
  type FullLeaderboardResponse,
  type LeaderboardEntry,
} from "./useLeaderboard";

export {
  useScreenReaderAnnouncement,
  useRouteAnnouncements,
  useLoadingAnnouncements,
  useErrorAnnouncements,
  useSuccessAnnouncements,
  useContentChangeAnnouncements,
} from "./useScreenReaderAnnouncement";

export { useGestureDetection } from "./useGestureDetection";
export { useReducedMotion } from "./useReducedMotion";
export { useHighContrast } from "./useHighContrast";

export {
  useScreenReaderAnnouncement as useA11yAnnouncement,
  useFocusTrap as useA11yFocusTrap,
  useSkipLink as useA11ySkipLink,
  useKeyboardShortcut,
  useAccessibleId,
  useReducedMotion as useA11yReducedMotion,
} from "./useAccessibility";

export {
  useOfflineReadingSync,
  type UseOfflineReadingSyncOptions,
  type UseOfflineReadingSyncReturn,
} from "./useOfflineReadingSync";

export {
  useOfflineAnnotationSync,
  type UseOfflineAnnotationSyncOptions,
  type UseOfflineAnnotationSyncReturn,
} from "./useOfflineAnnotationSync";

export {
  useCurriculumProgress,
  type CurriculumProgress,
  type UpdateProgressInput,
  type UseCurriculumProgressResult,
} from "./useCurriculumProgress";

export {
  useStudyBuddy,
  type StudyBuddyRequest,
  type StudyBuddyResponse,
  type ReadingPosition,
  type RecentAnnotation,
} from "./useStudyBuddy";

export {
  useDiscussionQuestions,
  type DiscussionQuestionsRequest,
  type DiscussionQuestionsResponse,
  type Section,
  type Progress,
} from "./useDiscussionQuestions";

export {
  useSummarizeNotes,
  type SummarizeNotesRequest,
  type SummarizeNotesResponse,
  type AnnotationForSummary,
} from "./useSummarizeNotes";

export {
  useAssessDifficulty,
  type AssessDifficultyRequest,
  type AssessDifficultyResponse,
  type ReadingLevel,
} from "./useAssessDifficulty";

export {
  usePersonalizedRecommendations,
  type PersonalizedRecommendationsRequest,
  type PersonalizedRecommendationsResponse,
  type UserPreferences,
  type ReadingGoals,
} from "./usePersonalizedRecommendations";

export {
  useForumCategories,
  useForumPosts,
  useForumPost,
  useForumReplies,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useCreateReply,
  useVotePost,
  useVoteReply,
  useMarkBestAnswer,
  useReportContent,
  type ForumCategory,
  type ForumPost,
  type ForumReply,
  type CreatePostInput,
  type UpdatePostInput,
  type CreateReplyInput,
  type ReportInput,
  type ForumListFilters,
} from "./useForum";
export * from "./useStudyGuide";
export * from "./useNewLeaderboard";
export * from "./useGroupBooks";
export * from "./useEmailPreferences";
export * from "./useSessionRealtime";
export * from "./useSubscription";

export {
  useVoiceCommands,
  isVoiceCommandsSupported,
  getVoiceCommandVocabulary,
  type NavigationCommand,
  type ReadingCommand,
  type ActionCommand,
  type VoiceCommand,
  type VoiceCommandResult,
  type VoiceCommandError,
  type UseVoiceCommandsOptions,
  type UseVoiceCommandsReturn,
  type VoiceCommandVocabulary,
} from "./useVoiceCommands";

export {
  usePodcasts,
  usePodcast,
  useSubscribeToPodcast,
  useUpdatePodcast,
  useUnsubscribePodcast,
  useEpisodes,
  useUpdateEpisodeProgress,
  useMarkEpisodeCompleted,
  useRefreshPodcast,
  usePrefetchPodcast,
  type Podcast,
  type PodcastEpisode,
  type PodcastWithEpisodes,
  type PodcastListFilters,
  type EpisodeListFilters,
  type SubscribeToPodcastInput,
  type UpdatePodcastInput,
  type UpdateEpisodeProgressInput,
  type EpisodeStatus,
} from "./usePodcasts";

export {
  useVideos,
  useVideo,
  useImportVideo,
  useUpdateVideo,
  useDeleteVideo,
  useUpdateVideoProgress,
  useMarkVideoCompleted,
  useCreateVideoAnnotation,
  useDeleteVideoAnnotation,
  usePrefetchVideo,
  type Video,
  type VideoWithDetails,
  type VideoAnnotation,
  type VideoTranscript,
  type TranscriptCue,
  type VideoSettings,
  type VideoListFilters,
  type ImportVideoInput,
  type UpdateVideoInput,
  type UpdateVideoProgressInput as VideoProgressInput,
  type CreateAnnotationInput,
  type VideoSource,
  type VideoStatus,
  type VideoQuality,
} from "./useVideos";
