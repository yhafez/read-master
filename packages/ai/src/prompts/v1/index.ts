/**
 * AI Prompt Templates v1
 *
 * All prompt templates for Read Master AI features.
 */

// Pre-Reading Guide
export {
  preReadingGuidePrompt,
  generatePreReadingGuidePrompt,
  parsePreReadingGuideResponse,
  validatePreReadingGuideInput,
  type PreReadingGuideInput,
  type PreReadingGuideOutput,
} from "./preReadingGuide.js";

// Explain Text
export {
  explainPrompt,
  generateExplainPrompt,
  parseExplainResponse,
  validateExplainInput,
  type ExplainInput,
  type ExplainOutput,
} from "./explain.js";

// Ask Question
export {
  askPrompt,
  generateAskPrompt,
  parseAskResponse,
  validateAskInput,
  type AskInput,
  type AskOutput,
} from "./ask.js";

// Comprehension Check
export {
  comprehensionCheckPrompt,
  generateComprehensionCheckPrompt,
  parseComprehensionCheckResponse,
  validateComprehensionCheckInput,
  type ComprehensionCheckInput,
  type ComprehensionCheckOutput,
} from "./comprehensionCheck.js";

// Assessment
export {
  assessmentPrompt,
  generateAssessmentPrompt,
  parseAssessmentResponse,
  validateAssessmentInput,
  getBloomLevelDescription,
  type AssessmentInput,
  type AssessmentOutput,
  type AssessmentQuestion,
} from "./assessment.js";

// Grade Answer
export {
  gradeAnswerPrompt,
  generateGradeAnswerPrompt,
  parseGradeAnswerResponse,
  validateGradeAnswerInput,
  percentageToLetterGrade,
  type GradeAnswerInput,
  type GradeAnswerOutput,
} from "./gradeAnswer.js";

// Generate Flashcards
export {
  generateFlashcardsPrompt,
  generateFlashcardsPromptStrings,
  parseFlashcardsResponse,
  validateFlashcardsInput,
  getFlashcardTypeDescription,
  FLASHCARD_TYPE_DESCRIPTIONS,
  type GenerateFlashcardsInput,
  type GenerateFlashcardsOutput,
  type GeneratedFlashcard,
} from "./generateFlashcards.js";

// Study Buddy
export {
  studyBuddyPrompt,
  generateStudyBuddyPrompt,
  parseStudyBuddyResponse,
  validateStudyBuddyInput,
  type StudyBuddyInput,
  type StudyBuddyOutput,
} from "./studyBuddy.js";

// Discussion Questions
export {
  discussionQuestionsPrompt,
  generateDiscussionQuestionsPrompt,
  parseDiscussionQuestionsResponse,
  validateDiscussionQuestionsInput,
  type DiscussionQuestionsInput,
  type DiscussionQuestionsOutput,
  type DiscussionQuestion,
} from "./discussionQuestions.js";

// Summarize Notes
export {
  summarizeNotesPrompt,
  generateSummarizeNotesPrompt,
  parseSummarizeNotesResponse,
  validateSummarizeNotesInput,
  type SummarizeNotesInput,
  type SummarizeNotesOutput,
  type Annotation as NoteInput,
  type NoteSummary,
} from "./summarizeNotes.js";

// Assess Difficulty
export {
  assessDifficultyPrompt,
  generateAssessDifficultyPrompt,
  parseAssessDifficultyResponse,
  validateAssessDifficultyInput,
  type AssessDifficultyInput,
  type AssessDifficultyOutput,
  type DifficultyMetrics,
  type ReaderMatch,
} from "./assessDifficulty.js";

// Personalized Recommendations
export {
  personalizedRecommendationsPrompt,
  generatePersonalizedRecommendationsPrompt,
  parsePersonalizedRecommendationsResponse,
  validatePersonalizedRecommendationsInput,
  type PersonalizedRecommendationsInput,
  type PersonalizedRecommendationsOutput,
  type ReadingHistoryItem,
  type BookRecommendation,
} from "./personalizedRecommendations.js";
