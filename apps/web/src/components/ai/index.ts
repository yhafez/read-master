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

// AI Chat Sidebar
export { ChatSidebar } from "./ChatSidebar";
export type {
  ChatMessage,
  ChatContext,
  ChatSession,
  ChatSidebarProps,
  ChatInputState,
  ChatApiRequest,
  ChatApiResponse,
  ChatError,
  ChatErrorType,
  MessageRole,
  MessageStatus,
} from "./chatTypes";
export {
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_CONTEXT_LENGTH as CHAT_MAX_CONTEXT_LENGTH,
  SESSION_STORAGE_KEY_PREFIX,
  INITIAL_INPUT_STATE,
  SUGGESTED_QUESTIONS,
  generateMessageId,
  generateSessionId,
  createUserMessage,
  createAssistantMessage,
  createChatSession,
  addMessageToSession,
  updateLastMessage,
  clearSessionMessages,
  getHistoryForApi,
  validateMessage,
  createChatError,
  parseChatApiError,
  truncateText as truncateChatText,
  buildChatApiRequest,
  getSessionStorageKey,
  saveSessionToStorage,
  loadSessionFromStorage,
  clearSessionFromStorage,
  formatMessageTime,
  isSessionEmpty,
  getMessageCount,
  getUserMessageCount,
  isWaitingForResponse,
  getLastError,
} from "./chatTypes";
