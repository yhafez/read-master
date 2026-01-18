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
