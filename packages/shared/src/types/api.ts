/**
 * API Request/Response types
 *
 * Common types used for API communication between frontend and backend.
 * These types define the structure of API requests and responses.
 */

/**
 * Standard API response wrapper
 */
export type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ApiError;
    };

/**
 * Standard API error structure
 */
export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

/**
 * Paginated response wrapper
 */
export type PaginatedResponse<T> = {
  items: T[];
  pagination: PaginationMeta;
};

/**
 * Pagination metadata
 */
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

/**
 * Pagination query parameters
 */
export type PaginationParams = {
  page?: number;
  limit?: number;
};

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Sort query parameters
 */
export type SortParams<T extends string = string> = {
  sortBy?: T;
  sortDirection?: SortDirection;
};

/**
 * Common filter for soft-deleted items
 */
export type SoftDeleteFilter = {
  includeDeleted?: boolean;
};

// =============================================================================
// USER API TYPES
// =============================================================================

/**
 * User profile response (public view)
 */
export type UserProfileResponse = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  tier: "FREE" | "PRO" | "SCHOLAR";
  createdAt: string;
  stats?: UserStatsResponse;
  achievements?: UserAchievementResponse[];
  recentActivity?: UserActivityItem[];
};

/**
 * User stats response
 */
export type UserStatsResponse = {
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  booksCompleted: number;
  totalReadingTime: number;
  totalWordsRead: number;
  totalCardsReviewed: number;
  averageRetention: number;
  assessmentsCompleted: number;
  averageScore: number;
  followersCount: number;
  followingCount: number;
};

/**
 * User achievement response
 */
export type UserAchievementResponse = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  badgeIcon: string | null;
  badgeColor: string | null;
  earnedAt: string;
};

/**
 * User activity item (for feed/profile)
 */
export type UserActivityItem = {
  type:
    | "book_completed"
    | "achievement_earned"
    | "highlight_shared"
    | "review_completed"
    | "streak_milestone";
  timestamp: string;
  data: Record<string, unknown>;
};

/**
 * User preferences update request
 */
export type UpdateUserPreferencesRequest = {
  preferredLang?: string;
  readingLevel?: string;
  aiEnabled?: boolean;
  profilePublic?: boolean;
  showStats?: boolean;
  showActivity?: boolean;
  timezone?: string;
  preferences?: Record<string, unknown>;
};

// =============================================================================
// BOOK API TYPES
// =============================================================================

/**
 * Book list query parameters
 */
export type BookListParams = PaginationParams &
  SortParams<"title" | "author" | "createdAt" | "lastReadAt" | "progress"> & {
    status?: "WANT_TO_READ" | "READING" | "COMPLETED" | "ABANDONED";
    genre?: string;
    tags?: string[];
    search?: string;
  };

/**
 * Book summary response (for lists)
 */
export type BookSummaryResponse = {
  id: string;
  title: string;
  author: string | null;
  coverImage: string | null;
  status: "WANT_TO_READ" | "READING" | "COMPLETED" | "ABANDONED";
  source: "UPLOAD" | "URL" | "PASTE" | "GOOGLE_BOOKS" | "OPEN_LIBRARY";
  wordCount: number | null;
  progress: number;
  lastReadAt: string | null;
  createdAt: string;
};

/**
 * Book detail response
 */
export type BookDetailResponse = BookSummaryResponse & {
  description: string | null;
  language: string | null;
  genre: string | null;
  tags: string[];
  estimatedReadTime: number | null;
  lexileScore: string | null;
  chapters: ChapterResponse[];
  readingProgress: ReadingProgressResponse | null;
  preReadingGuide: PreReadingGuideResponse | null;
};

/**
 * Chapter response
 */
export type ChapterResponse = {
  id: string;
  title: string;
  orderIndex: number;
  wordCount: number | null;
  startPosition: number;
  endPosition: number;
};

/**
 * Reading progress response
 */
export type ReadingProgressResponse = {
  currentPosition: number;
  percentage: number;
  totalReadTime: number;
  averageWpm: number | null;
  lastReadAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

/**
 * Pre-reading guide response
 */
export type PreReadingGuideResponse = {
  id: string;
  vocabulary: VocabularyItem[];
  keyArguments: KeyArgumentItem[];
  chapterSummaries: ChapterSummaryItem[];
  keyThemes: string[];
  readingTips: string[];
  discussionTopics: string[];
  historicalContext: string | null;
  authorContext: string | null;
  intellectualContext: string | null;
  generatedAt: string | null;
};

/**
 * Vocabulary item in pre-reading guide
 */
export type VocabularyItem = {
  term: string;
  definition: string;
  examples?: string[];
};

/**
 * Key argument item in pre-reading guide
 */
export type KeyArgumentItem = {
  argument: string;
  explanation: string;
};

/**
 * Chapter summary item in pre-reading guide
 */
export type ChapterSummaryItem = {
  chapterIndex: number;
  summary: string;
};

/**
 * Book upload request
 */
export type BookUploadRequest = {
  file: File;
  title?: string;
  author?: string;
  tags?: string[];
};

/**
 * Book import from URL request
 */
export type BookImportUrlRequest = {
  url: string;
  title?: string;
  author?: string;
  tags?: string[];
};

/**
 * Book paste request
 */
export type BookPasteRequest = {
  content: string;
  title: string;
  author?: string;
  tags?: string[];
};

/**
 * Book update request
 */
export type BookUpdateRequest = {
  title?: string;
  author?: string;
  description?: string;
  status?: "WANT_TO_READ" | "READING" | "COMPLETED" | "ABANDONED";
  genre?: string;
  tags?: string[];
  isPublic?: boolean;
};

// =============================================================================
// ANNOTATION API TYPES
// =============================================================================

/**
 * Annotation response
 */
export type AnnotationResponse = {
  id: string;
  type: "HIGHLIGHT" | "NOTE" | "BOOKMARK";
  startOffset: number;
  endOffset: number;
  selectedText: string | null;
  note: string | null;
  color: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Create annotation request
 */
export type CreateAnnotationRequest = {
  bookId: string;
  type: "HIGHLIGHT" | "NOTE" | "BOOKMARK";
  startOffset: number;
  endOffset: number;
  selectedText?: string;
  note?: string;
  color?: string;
  isPublic?: boolean;
};

/**
 * Update annotation request
 */
export type UpdateAnnotationRequest = {
  note?: string;
  color?: string;
  isPublic?: boolean;
};

// =============================================================================
// FLASHCARD API TYPES
// =============================================================================

/**
 * Flashcard response
 */
export type FlashcardResponse = {
  id: string;
  bookId: string | null;
  front: string;
  back: string;
  type: "VOCABULARY" | "CONCEPT" | "COMPREHENSION" | "QUOTE" | "CUSTOM";
  status: "NEW" | "LEARNING" | "REVIEW" | "SUSPENDED";
  tags: string[];
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  totalReviews: number;
  correctReviews: number;
  createdAt: string;
};

/**
 * Create flashcard request
 */
export type CreateFlashcardRequest = {
  bookId?: string;
  front: string;
  back: string;
  type?: "VOCABULARY" | "CONCEPT" | "COMPREHENSION" | "QUOTE" | "CUSTOM";
  tags?: string[];
};

/**
 * Update flashcard request
 */
export type UpdateFlashcardRequest = {
  front?: string;
  back?: string;
  tags?: string[];
  status?: "NEW" | "LEARNING" | "REVIEW" | "SUSPENDED";
};

/**
 * Review flashcard request
 */
export type ReviewFlashcardRequest = {
  rating: 1 | 2 | 3 | 4; // Again, Hard, Good, Easy
  responseTimeMs?: number;
};

/**
 * Review flashcard response
 */
export type ReviewFlashcardResponse = {
  flashcard: FlashcardResponse;
  xpEarned: number;
  newAchievements: UserAchievementResponse[];
};

/**
 * Flashcard stats response
 */
export type FlashcardStatsResponse = {
  total: number;
  new: number;
  learning: number;
  review: number;
  suspended: number;
  dueToday: number;
  retentionRate: number;
  reviewsToday: number;
  streakDays: number;
};

// =============================================================================
// ASSESSMENT API TYPES
// =============================================================================

/**
 * Assessment question
 */
export type AssessmentQuestion = {
  id: string;
  type: "multiple_choice" | "short_answer" | "essay";
  question: string;
  options?: string[];
  correctAnswer?: string;
  bloomsLevel:
    | "remember"
    | "understand"
    | "apply"
    | "analyze"
    | "evaluate"
    | "create";
};

/**
 * Assessment answer
 */
export type AssessmentAnswer = {
  questionId: string;
  userAnswer: string;
  isCorrect?: boolean;
  feedback?: string;
  score?: number;
};

/**
 * Assessment response
 */
export type AssessmentResponse = {
  id: string;
  bookId: string;
  type: "CHAPTER_CHECK" | "BOOK_ASSESSMENT" | "CUSTOM";
  questions: AssessmentQuestion[];
  answers: AssessmentAnswer[];
  score: number | null;
  totalQuestions: number;
  correctAnswers: number;
  bloomsBreakdown: BloomsBreakdown | null;
  startedAt: string | null;
  completedAt: string | null;
  timeSpent: number | null;
  createdAt: string;
};

/**
 * Bloom's taxonomy breakdown
 */
export type BloomsBreakdown = {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
};

/**
 * Generate assessment request
 */
export type GenerateAssessmentRequest = {
  bookId: string;
  type: "CHAPTER_CHECK" | "BOOK_ASSESSMENT" | "CUSTOM";
  chapterIds?: string[];
  questionCount?: number;
};

/**
 * Submit assessment answers request
 */
export type SubmitAssessmentRequest = {
  answers: AssessmentAnswer[];
};

// =============================================================================
// AI API TYPES
// =============================================================================

/**
 * AI explain request
 */
export type AiExplainRequest = {
  bookId: string;
  selectedText: string;
  context?: string;
};

/**
 * AI ask request
 */
export type AiAskRequest = {
  bookId: string;
  question: string;
  selectedText?: string;
  context?: string;
};

/**
 * AI comprehension check request
 */
export type AiComprehensionCheckRequest = {
  bookId: string;
  recentContent: string;
};

/**
 * AI generate flashcards request
 */
export type AiGenerateFlashcardsRequest = {
  bookId: string;
  selectedText: string;
  types?: ("VOCABULARY" | "CONCEPT" | "COMPREHENSION")[];
  count?: number;
};

/**
 * AI grade answer request
 */
export type AiGradeAnswerRequest = {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  context?: string;
};

/**
 * AI grade answer response
 */
export type AiGradeAnswerResponse = {
  score: number;
  isCorrect: boolean;
  feedback: string;
  suggestions?: string[];
};

// =============================================================================
// SOCIAL API TYPES
// =============================================================================

/**
 * Follow user request
 */
export type FollowUserRequest = {
  userId: string;
};

/**
 * User follow response
 */
export type UserFollowResponse = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followedAt: string;
};

/**
 * Activity feed item
 */
export type ActivityFeedItem = {
  id: string;
  type: UserActivityItem["type"];
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  timestamp: string;
  data: Record<string, unknown>;
};

// =============================================================================
// READING GROUP API TYPES
// =============================================================================

/**
 * Reading group response
 */
export type ReadingGroupResponse = {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  membersCount: number;
  discussionsCount: number;
  currentBook: BookSummaryResponse | null;
  owner: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  userRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  createdAt: string;
};

/**
 * Create reading group request
 */
export type CreateReadingGroupRequest = {
  name: string;
  description?: string;
  isPublic?: boolean;
  maxMembers?: number;
  currentBookId?: string;
};

/**
 * Group discussion response
 */
export type GroupDiscussionResponse = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  repliesCount: number;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  book: BookSummaryResponse | null;
  lastReplyAt: string | null;
  createdAt: string;
};

// =============================================================================
// FORUM API TYPES
// =============================================================================

/**
 * Forum category response
 */
export type ForumCategoryResponse = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  postsCount: number;
  lastPostAt: string | null;
};

/**
 * Forum post response
 */
export type ForumPostResponse = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  isFeatured: boolean;
  isAnswered: boolean;
  upvotes: number;
  downvotes: number;
  voteScore: number;
  viewCount: number;
  repliesCount: number;
  userVote: 1 | -1 | null;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    tier: "FREE" | "PRO" | "SCHOLAR";
  };
  category: ForumCategoryResponse;
  book: BookSummaryResponse | null;
  lastReplyAt: string | null;
  createdAt: string;
};

/**
 * Forum reply response
 */
export type ForumReplyResponse = {
  id: string;
  content: string;
  isBestAnswer: boolean;
  isEdited: boolean;
  upvotes: number;
  downvotes: number;
  voteScore: number;
  userVote: 1 | -1 | null;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    tier: "FREE" | "PRO" | "SCHOLAR";
  };
  childReplies?: ForumReplyResponse[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Create forum post request
 */
export type CreateForumPostRequest = {
  categoryId: string;
  title: string;
  content: string;
  bookId?: string;
};

/**
 * Create forum reply request
 */
export type CreateForumReplyRequest = {
  postId: string;
  content: string;
  parentReplyId?: string;
};

/**
 * Forum vote request
 */
export type ForumVoteRequest = {
  value: 1 | -1;
};

// =============================================================================
// CURRICULUM API TYPES
// =============================================================================

/**
 * Curriculum response
 */
export type CurriculumResponse = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  category: string | null;
  difficulty: string | null;
  tags: string[];
  visibility: "PRIVATE" | "UNLISTED" | "PUBLIC";
  totalItems: number;
  followersCount: number;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  isFollowing: boolean;
  userProgress: CurriculumProgressResponse | null;
  createdAt: string;
};

/**
 * Curriculum item response
 */
export type CurriculumItemResponse = {
  id: string;
  orderIndex: number;
  book: BookSummaryResponse | null;
  externalTitle: string | null;
  externalAuthor: string | null;
  externalUrl: string | null;
  externalIsbn: string | null;
  notes: string | null;
  estimatedTime: number | null;
  isOptional: boolean;
  isCompleted: boolean;
};

/**
 * Curriculum progress response
 */
export type CurriculumProgressResponse = {
  currentItemIndex: number;
  completedItems: number;
  startedAt: string;
  completedAt: string | null;
  lastProgressAt: string | null;
};

/**
 * Create curriculum request
 */
export type CreateCurriculumRequest = {
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  visibility?: "PRIVATE" | "UNLISTED" | "PUBLIC";
};

/**
 * Add curriculum item request
 */
export type AddCurriculumItemRequest = {
  bookId?: string;
  externalTitle?: string;
  externalAuthor?: string;
  externalUrl?: string;
  externalIsbn?: string;
  notes?: string;
  estimatedTime?: number;
  isOptional?: boolean;
};

// =============================================================================
// LEADERBOARD API TYPES
// =============================================================================

/**
 * Leaderboard entry
 */
export type LeaderboardEntry = {
  rank: number;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  value: number;
  isCurrentUser: boolean;
};

/**
 * Leaderboard response
 */
export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
  timeframe: "weekly" | "monthly" | "all_time";
  metric: "xp" | "books" | "streak" | "reading_time";
};

/**
 * Leaderboard query parameters
 */
export type LeaderboardParams = {
  timeframe?: "weekly" | "monthly" | "all_time";
  metric?: "xp" | "books" | "streak" | "reading_time";
  friendsOnly?: boolean;
  limit?: number;
};

// =============================================================================
// TTS API TYPES
// =============================================================================

/**
 * TTS speak request
 */
export type TtsSpeakRequest = {
  text: string;
  voice?: string;
  speed?: number;
};

/**
 * TTS voices response
 */
export type TtsVoicesResponse = {
  tier: "FREE" | "PRO" | "SCHOLAR";
  provider: "browser" | "openai" | "elevenlabs";
  voices: TtsVoice[];
};

/**
 * TTS voice
 */
export type TtsVoice = {
  id: string;
  name: string;
  language: string;
  gender?: "male" | "female" | "neutral";
  preview_url?: string;
};

/**
 * TTS download request
 */
export type TtsDownloadRequest = {
  bookId: string;
  voice?: string;
};

/**
 * TTS download status response
 */
export type TtsDownloadStatusResponse = {
  id: string;
  bookId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
};
