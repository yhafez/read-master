/**
 * Zod schemas for Assessment operations
 *
 * These schemas validate assessment-related API requests for:
 * - Creating assessments (chapter checks, book assessments, custom)
 * - Submitting assessment answers
 * - Grading and feedback
 * - Querying assessment history
 *
 * Validation rules follow the database schema and Bloom's taxonomy requirements.
 *
 * @example
 * ```typescript
 * import { generateAssessmentSchema, submitAnswerSchema } from '@read-master/shared/schemas';
 *
 * // Validate assessment generation request
 * const result = generateAssessmentSchema.safeParse(requestBody);
 * if (!result.success) {
 *   return res.status(400).json({ errors: result.error.flatten() });
 * }
 * ```
 */

import { z } from "zod";

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

/**
 * Assessment type enum - types of assessments available
 */
export const assessmentTypeSchema = z.enum([
  "CHAPTER_CHECK", // Quick check after reading a chapter
  "BOOK_ASSESSMENT", // Full book comprehension assessment
  "CUSTOM", // User-created or teacher-created assessment
]);
export type AssessmentTypeSchema = z.infer<typeof assessmentTypeSchema>;

/**
 * Bloom's taxonomy levels for question classification
 */
export const bloomsLevelSchema = z.enum([
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
  "ANALYZE",
  "EVALUATE",
  "CREATE",
]);
export type BloomsLevelSchema = z.infer<typeof bloomsLevelSchema>;

/**
 * Question type enum - supported question formats
 */
export const questionTypeSchema = z.enum([
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "ESSAY",
  "FILL_IN_BLANK",
]);
export type QuestionTypeSchema = z.infer<typeof questionTypeSchema>;

// =============================================================================
// COMMON FIELD SCHEMAS
// =============================================================================

/**
 * Assessment ID validation (CUID format)
 */
export const assessmentIdSchema = z
  .string()
  .min(1, "Assessment ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid assessment ID format");
export type AssessmentIdInput = z.infer<typeof assessmentIdSchema>;

/**
 * Book ID validation for assessments
 */
export const assessmentBookIdSchema = z
  .string()
  .min(1, "Book ID is required")
  .regex(/^c[a-z0-9]+$/, "Invalid book ID format");

/**
 * Chapter IDs validation (optional array of CUIDs)
 */
export const chapterIdsSchema = z
  .array(z.string().regex(/^c[a-z0-9]+$/, "Invalid chapter ID format"))
  .default([]);

/**
 * Question ID validation (for answer submission)
 */
export const questionIdSchema = z
  .string()
  .min(1, "Question ID is required")
  .regex(/^q[a-z0-9]+$|^c[a-z0-9]+$/, "Invalid question ID format");

/**
 * Score validation (0-100 percentage)
 */
export const scoreSchema = z
  .number()
  .min(0, "Score must be at least 0")
  .max(100, "Score must be at most 100");

/**
 * Number of questions to generate
 */
export const questionCountSchema = z
  .number()
  .int("Question count must be an integer")
  .positive("Question count must be positive")
  .max(50, "Maximum 50 questions allowed")
  .default(10);

// =============================================================================
// QUESTION SCHEMAS
// =============================================================================

/**
 * Multiple choice option schema
 */
export const multipleChoiceOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(1000),
  isCorrect: z.boolean().optional(), // Only used in server-side data
});
export type MultipleChoiceOption = z.infer<typeof multipleChoiceOptionSchema>;

/**
 * Question schema (for API response)
 */
export const questionSchema = z.object({
  id: questionIdSchema,
  type: questionTypeSchema,
  question: z.string().min(1).max(5000),
  options: z.array(multipleChoiceOptionSchema).optional(), // For multiple choice
  bloomsLevel: bloomsLevelSchema,
  difficulty: z.number().min(1).max(5).optional(), // 1-5 difficulty scale
  points: z.number().int().positive().default(1),
});
export type QuestionInput = z.infer<typeof questionSchema>;

/**
 * Question with answer schema (for grading/storage)
 */
export const questionWithAnswerSchema = questionSchema.extend({
  correctAnswer: z.string().min(1), // The correct answer text
  explanation: z.string().max(2000).optional(), // Explanation of the answer
});
export type QuestionWithAnswer = z.infer<typeof questionWithAnswerSchema>;

// =============================================================================
// ANSWER SCHEMAS
// =============================================================================

/**
 * Single answer submission schema
 */
export const answerSubmissionSchema = z.object({
  questionId: questionIdSchema,
  answer: z.string().min(1, "Answer is required").max(10000),
  timeSpentMs: z.number().int().nonnegative().optional(), // Time spent on this question
});
export type AnswerSubmission = z.infer<typeof answerSubmissionSchema>;

/**
 * Graded answer schema (for response)
 */
export const gradedAnswerSchema = z.object({
  questionId: questionIdSchema,
  userAnswer: z.string(),
  isCorrect: z.boolean(),
  score: z.number().min(0).max(100), // Partial credit possible for essays
  feedback: z.string().max(2000).optional(),
  correctAnswer: z.string().optional(), // Revealed after grading
});
export type GradedAnswer = z.infer<typeof gradedAnswerSchema>;

// =============================================================================
// BLOOM'S TAXONOMY SCHEMAS
// =============================================================================

/**
 * Bloom's breakdown schema (percentages for each level)
 */
export const bloomsBreakdownSchema = z.object({
  remember: z.number().min(0).max(100).default(0),
  understand: z.number().min(0).max(100).default(0),
  apply: z.number().min(0).max(100).default(0),
  analyze: z.number().min(0).max(100).default(0),
  evaluate: z.number().min(0).max(100).default(0),
  create: z.number().min(0).max(100).default(0),
});
export type BloomsBreakdown = z.infer<typeof bloomsBreakdownSchema>;

/**
 * Bloom's distribution request (for generating balanced assessments)
 */
export const bloomsDistributionSchema = z
  .object({
    remember: z.number().int().min(0).max(20).optional(),
    understand: z.number().int().min(0).max(20).optional(),
    apply: z.number().int().min(0).max(20).optional(),
    analyze: z.number().int().min(0).max(20).optional(),
    evaluate: z.number().int().min(0).max(20).optional(),
    create: z.number().int().min(0).max(20).optional(),
  })
  .optional();
export type BloomsDistribution = z.infer<typeof bloomsDistributionSchema>;

// =============================================================================
// GENERATE ASSESSMENT SCHEMA
// =============================================================================

/**
 * Generate assessment request schema
 */
export const generateAssessmentSchema = z.object({
  bookId: assessmentBookIdSchema,
  type: assessmentTypeSchema.default("BOOK_ASSESSMENT"),
  // Optional chapter scope (empty = whole book)
  chapterIds: chapterIdsSchema,
  // Question configuration
  questionCount: questionCountSchema,
  questionTypes: z
    .array(questionTypeSchema)
    .min(1)
    .default(["MULTIPLE_CHOICE", "SHORT_ANSWER"]),
  // Bloom's taxonomy distribution (optional)
  bloomsDistribution: bloomsDistributionSchema,
  // Difficulty level (1-5, affects question complexity)
  difficulty: z.number().min(1).max(5).default(3),
  // Focus areas (optional topics to emphasize)
  focusAreas: z.array(z.string().max(200)).max(10).optional(),
});
export type GenerateAssessmentInput = z.infer<typeof generateAssessmentSchema>;

// =============================================================================
// SUBMIT ASSESSMENT SCHEMA
// =============================================================================

/**
 * Submit assessment answers schema
 */
export const submitAssessmentSchema = z.object({
  assessmentId: assessmentIdSchema,
  answers: z
    .array(answerSubmissionSchema)
    .min(1, "At least one answer is required")
    .max(100, "Maximum 100 answers allowed"),
  // Total time spent (in seconds)
  timeSpent: z.number().int().nonnegative().optional(),
});
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;

/**
 * Grade single answer schema (for AI grading of short answers/essays)
 */
export const gradeAnswerSchema = z.object({
  assessmentId: assessmentIdSchema,
  questionId: questionIdSchema,
  question: z.string().min(1).max(5000),
  correctAnswer: z.string().min(1).max(5000),
  userAnswer: z.string().min(1).max(10000),
  questionType: questionTypeSchema,
  bloomsLevel: bloomsLevelSchema.optional(),
});
export type GradeAnswerInput = z.infer<typeof gradeAnswerSchema>;

// =============================================================================
// ASSESSMENT QUERY SCHEMA
// =============================================================================

/**
 * Sort fields for assessments
 */
export const assessmentSortFieldSchema = z.enum([
  "createdAt",
  "completedAt",
  "score",
  "type",
]);
export type AssessmentSortField = z.infer<typeof assessmentSortFieldSchema>;

/**
 * Sort direction
 */
export const assessmentSortDirectionSchema = z.enum(["asc", "desc"]);
export type AssessmentSortDirection = z.infer<
  typeof assessmentSortDirectionSchema
>;

/**
 * Assessment list query parameters
 */
export const assessmentQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: assessmentSortFieldSchema.default("createdAt"),
  sortDirection: assessmentSortDirectionSchema.default("desc"),

  // Filters
  bookId: z
    .string()
    .regex(/^c[a-z0-9]+$/)
    .optional(),
  type: assessmentTypeSchema.optional(),
  completed: z.coerce.boolean().optional(), // Filter by completion status
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),

  // Date range
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});
export type AssessmentQueryInput = z.infer<typeof assessmentQuerySchema>;

// =============================================================================
// ASSESSMENT ID PARAMS SCHEMA
// =============================================================================

/**
 * Assessment ID params schema (for route params)
 */
export const assessmentIdParamsSchema = z.object({
  id: assessmentIdSchema,
});
export type AssessmentIdParamsInput = z.infer<typeof assessmentIdParamsSchema>;

/**
 * Book and assessment ID params schema (for nested routes)
 */
export const bookAssessmentIdParamsSchema = z.object({
  bookId: z.string().regex(/^c[a-z0-9]+$/, "Invalid book ID format"),
  assessmentId: assessmentIdSchema,
});
export type BookAssessmentIdParamsInput = z.infer<
  typeof bookAssessmentIdParamsSchema
>;

// =============================================================================
// ASSESSMENT RESPONSE SCHEMAS
// =============================================================================

/**
 * Assessment summary response schema
 */
export const assessmentSummarySchema = z.object({
  id: assessmentIdSchema,
  bookId: z.string(),
  type: assessmentTypeSchema,
  score: scoreSchema.nullable(),
  totalQuestions: z.number().int().nonnegative(),
  correctAnswers: z.number().int().nonnegative(),
  bloomsBreakdown: bloomsBreakdownSchema.optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  timeSpent: z.number().int().nonnegative().nullable(),
});
export type AssessmentSummary = z.infer<typeof assessmentSummarySchema>;

/**
 * Full assessment response schema (with questions)
 */
export const assessmentResponseSchema = assessmentSummarySchema.extend({
  questions: z.array(questionSchema),
  answers: z.array(gradedAnswerSchema).optional(), // Only after completion
});
export type AssessmentResponse = z.infer<typeof assessmentResponseSchema>;

// =============================================================================
// STATISTICS SCHEMAS
// =============================================================================

/**
 * Assessment statistics response schema
 */
export const assessmentStatsSchema = z.object({
  totalAssessments: z.number().int().nonnegative(),
  completedAssessments: z.number().int().nonnegative(),
  averageScore: z.number().min(0).max(100).nullable(),
  bestScore: z.number().min(0).max(100).nullable(),
  worstScore: z.number().min(0).max(100).nullable(),
  totalTimeSpent: z.number().int().nonnegative(), // seconds
  bloomsPerformance: bloomsBreakdownSchema.optional(),
  // By type breakdown
  byType: z
    .object({
      chapterCheck: z.number().int().nonnegative(),
      bookAssessment: z.number().int().nonnegative(),
      custom: z.number().int().nonnegative(),
    })
    .optional(),
});
export type AssessmentStats = z.infer<typeof assessmentStatsSchema>;

/**
 * Stats query schema - for filtering stats
 */
export const assessmentStatsQuerySchema = z.object({
  bookId: z
    .string()
    .regex(/^c[a-z0-9]+$/)
    .optional(),
  type: assessmentTypeSchema.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});
export type AssessmentStatsQueryInput = z.infer<
  typeof assessmentStatsQuerySchema
>;

// =============================================================================
// COMPREHENSION CHECK SCHEMA (Quick inline checks)
// =============================================================================

/**
 * Comprehension check request schema (for during-reading checks)
 */
export const comprehensionCheckSchema = z.object({
  bookId: assessmentBookIdSchema,
  chapterId: z
    .string()
    .regex(/^c[a-z0-9]+$/)
    .optional(),
  // Recent text the user was reading
  recentText: z.string().min(50).max(10000),
  // Position in the text (for context)
  position: z.number().int().nonnegative().optional(),
});
export type ComprehensionCheckInput = z.infer<typeof comprehensionCheckSchema>;

/**
 * Comprehension check response schema
 */
export const comprehensionCheckResponseSchema = z.object({
  question: questionSchema,
  // Hints available (for progressive disclosure)
  hints: z.array(z.string().max(500)).max(3).optional(),
});
export type ComprehensionCheckResponse = z.infer<
  typeof comprehensionCheckResponseSchema
>;

/**
 * Answer comprehension check schema
 */
export const answerComprehensionCheckSchema = z.object({
  questionId: questionIdSchema,
  answer: z.string().min(1).max(5000),
  // Optional: time taken to answer
  responseTimeMs: z.number().int().positive().optional(),
});
export type AnswerComprehensionCheckInput = z.infer<
  typeof answerComprehensionCheckSchema
>;

// =============================================================================
// SCHEMA INDEX (convenient re-exports)
// =============================================================================

/**
 * All assessment-related schemas for convenient importing
 */
export const assessmentSchemas = {
  // Enums
  assessmentType: assessmentTypeSchema,
  bloomsLevel: bloomsLevelSchema,
  questionType: questionTypeSchema,

  // Field schemas
  assessmentId: assessmentIdSchema,
  bookId: assessmentBookIdSchema,
  chapterIds: chapterIdsSchema,
  questionId: questionIdSchema,
  score: scoreSchema,
  questionCount: questionCountSchema,

  // Question schemas
  question: questionSchema,
  questionWithAnswer: questionWithAnswerSchema,
  multipleChoiceOption: multipleChoiceOptionSchema,

  // Answer schemas
  answerSubmission: answerSubmissionSchema,
  gradedAnswer: gradedAnswerSchema,

  // Bloom's schemas
  bloomsBreakdown: bloomsBreakdownSchema,
  bloomsDistribution: bloomsDistributionSchema,

  // Create/submit schemas
  generate: generateAssessmentSchema,
  submit: submitAssessmentSchema,
  gradeAnswer: gradeAnswerSchema,

  // Query schemas
  query: assessmentQuerySchema,
  sortField: assessmentSortFieldSchema,
  sortDirection: assessmentSortDirectionSchema,

  // ID params
  idParams: assessmentIdParamsSchema,
  bookAssessmentIdParams: bookAssessmentIdParamsSchema,

  // Response schemas
  summary: assessmentSummarySchema,
  response: assessmentResponseSchema,

  // Statistics
  stats: assessmentStatsSchema,
  statsQuery: assessmentStatsQuerySchema,

  // Comprehension check
  comprehensionCheck: comprehensionCheckSchema,
  comprehensionCheckResponse: comprehensionCheckResponseSchema,
  answerComprehensionCheck: answerComprehensionCheckSchema,
} as const;
