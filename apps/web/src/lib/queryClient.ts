import {
  QueryClient,
  QueryCache,
  MutationCache,
  type QueryClientConfig,
} from "@tanstack/react-query";

/**
 * Default stale time for queries (5 minutes)
 * Data is considered fresh for this duration and won't be refetched
 */
export const DEFAULT_STALE_TIME = 1000 * 60 * 5;

/**
 * Default garbage collection time (30 minutes)
 * Inactive queries are removed from cache after this duration
 */
export const DEFAULT_GC_TIME = 1000 * 60 * 30;

/**
 * Default retry count for failed queries
 */
export const DEFAULT_RETRY_COUNT = 1;

/**
 * Query key factory for consistent key generation
 * Use these factories to generate query keys throughout the app
 */
export const queryKeys = {
  /** Books related queries */
  books: {
    all: ["books"] as const,
    lists: () => [...queryKeys.books.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.books.lists(), filters] as const,
    details: () => [...queryKeys.books.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.books.details(), id] as const,
    content: (id: string) =>
      [...queryKeys.books.detail(id), "content"] as const,
    search: (query: string) =>
      [...queryKeys.books.all, "search", query] as const,
  },

  /** Reading progress queries */
  readingProgress: {
    all: ["readingProgress"] as const,
    byBook: (bookId: string) =>
      [...queryKeys.readingProgress.all, bookId] as const,
  },

  /** Annotations queries */
  annotations: {
    all: ["annotations"] as const,
    byBook: (bookId: string) =>
      [...queryKeys.annotations.all, "book", bookId] as const,
  },

  /** Flashcards queries */
  flashcards: {
    all: ["flashcards"] as const,
    lists: () => [...queryKeys.flashcards.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.flashcards.lists(), filters] as const,
    due: () => [...queryKeys.flashcards.all, "due"] as const,
    stats: () => [...queryKeys.flashcards.all, "stats"] as const,
  },

  /** User related queries */
  user: {
    all: ["user"] as const,
    profile: () => [...queryKeys.user.all, "profile"] as const,
    stats: () => [...queryKeys.user.all, "stats"] as const,
    settings: () => [...queryKeys.user.all, "settings"] as const,
    achievements: () => [...queryKeys.user.all, "achievements"] as const,
  },

  /** AI related queries */
  ai: {
    all: ["ai"] as const,
    preReadingGuide: (bookId: string) =>
      [...queryKeys.ai.all, "preReadingGuide", bookId] as const,
    usage: () => [...queryKeys.ai.all, "usage"] as const,
  },

  /** Leaderboard queries */
  leaderboard: {
    all: ["leaderboard"] as const,
    global: (timeframe?: string) =>
      [...queryKeys.leaderboard.all, "global", timeframe] as const,
    friends: (timeframe?: string) =>
      [...queryKeys.leaderboard.all, "friends", timeframe] as const,
  },

  /** Social queries */
  social: {
    all: ["social"] as const,
    feed: () => [...queryKeys.social.all, "feed"] as const,
    followers: (userId: string) =>
      [...queryKeys.social.all, "followers", userId] as const,
    following: (userId: string) =>
      [...queryKeys.social.all, "following", userId] as const,
  },

  /** Groups queries */
  groups: {
    all: ["groups"] as const,
    lists: () => [...queryKeys.groups.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.groups.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.groups.all, "detail", id] as const,
    discussions: (groupId: string) =>
      [...queryKeys.groups.detail(groupId), "discussions"] as const,
  },

  /** Curriculums queries */
  curriculums: {
    all: ["curriculums"] as const,
    lists: () => [...queryKeys.curriculums.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.curriculums.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.curriculums.all, "detail", id] as const,
    browse: (filters?: Record<string, unknown>) =>
      [...queryKeys.curriculums.all, "browse", filters] as const,
  },

  /** Forum queries */
  forum: {
    all: ["forum"] as const,
    categories: () => [...queryKeys.forum.all, "categories"] as const,
    posts: (filters?: Record<string, unknown>) =>
      [...queryKeys.forum.all, "posts", filters] as const,
    post: (id: string) => [...queryKeys.forum.all, "post", id] as const,
  },

  /** Assessments queries */
  assessments: {
    all: ["assessments"] as const,
    lists: () => [...queryKeys.assessments.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.assessments.lists(), filters] as const,
    detail: (id: string) =>
      [...queryKeys.assessments.all, "detail", id] as const,
    byBook: (bookId: string) =>
      [...queryKeys.assessments.all, "book", bookId] as const,
  },

  /** TTS queries */
  tts: {
    all: ["tts"] as const,
    voices: () => [...queryKeys.tts.all, "voices"] as const,
    downloads: () => [...queryKeys.tts.all, "downloads"] as const,
  },

  /** Podcasts queries */
  podcasts: {
    all: ["podcasts"] as const,
    lists: () => [...queryKeys.podcasts.all, "list"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.podcasts.lists(), filters] as const,
    details: () => [...queryKeys.podcasts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.podcasts.details(), id] as const,
    episodes: (podcastId: string) =>
      [...queryKeys.podcasts.detail(podcastId), "episodes"] as const,
    episodeDetail: (podcastId: string, episodeId: string) =>
      [...queryKeys.podcasts.episodes(podcastId), episodeId] as const,
  },
} as const;

/**
 * Error handler for query cache errors
 * Override this in tests or provide custom implementation
 */
export type QueryErrorHandler = (error: unknown) => void;

// Default error handler is a no-op
// Set a custom handler with setGlobalErrorHandler for logging
let globalErrorHandler: QueryErrorHandler = () => {
  // No-op by default - set a custom handler for error logging
};

/**
 * Set a custom global error handler
 */
export function setGlobalErrorHandler(handler: QueryErrorHandler): void {
  globalErrorHandler = handler;
}

/**
 * Create a configured QueryClient instance
 * @param config - Optional configuration overrides
 */
export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Only call global error handler for queries without their own onError
        if (query.options.meta?.skipGlobalErrorHandler !== true) {
          globalErrorHandler(error);
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        // Only call global error handler for mutations without their own onError
        if (mutation.options.meta?.skipGlobalErrorHandler !== true) {
          globalErrorHandler(error);
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,
        retry: DEFAULT_RETRY_COUNT,
        refetchOnWindowFocus: false,
        // Disable background refetching for better UX during reading
        refetchOnMount: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
      ...config?.defaultOptions,
    },
    ...config,
  });
}

/**
 * Default query client instance for the application
 */
export const queryClient = createQueryClient();
