/**
 * AI Components exports
 */

// Pre-Reading Guide
export { PreReadingGuide } from "./PreReadingGuide";
export type {
  PreReadingGuideProps,
  PreReadingGuideData,
  PreReadingGuideError,
  PreReadingGuideErrorType,
  VocabularyItem,
  KeyConcept,
  GuideOverview,
  GuideContext,
  GuideSectionId,
  ExpandedSections,
  GuideLoadingState,
  GenerateGuideResponse,
} from "./preReadingGuideTypes";
export {
  DEFAULT_EXPANDED_SECTIONS,
  createGuideError,
  getGuideErrorMessage,
  parseApiError,
  hasContent,
  countGuideItems,
  getSectionLabel,
  toggleSection,
  expandAllSections,
  collapseAllSections,
} from "./preReadingGuideTypes";

// Explain This Feature
export { ExplainPopover } from "./ExplainPopover";
export type {
  ExplanationData,
  ExplainError,
  ExplainErrorType,
  ExplainContext,
  ExplainPopoverProps,
  FollowUpItem,
  FollowUpState,
  ExplainLoadingState,
  ExplainApiRequest,
  FollowUpApiRequest,
  ExplainApiResponse,
} from "./explainTypes";
export {
  MIN_TEXT_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_CONTEXT_LENGTH,
  MAX_FOLLOW_UPS,
  INITIAL_FOLLOW_UP_STATE,
  createExplainError,
  getExplainErrorMessage,
  parseExplainApiError,
  validateSelectedText,
  truncateContext,
  buildExplainRequest,
  buildFollowUpRequest,
  canAddFollowUp,
  addFollowUp,
  setFollowUpLoading,
  updateFollowUpInput,
  clearFollowUps,
  generateExplanationId,
  createExplanationData,
  hasAdditionalContent,
  getReadingLevelLabel,
  countContextChars,
} from "./explainTypes";
