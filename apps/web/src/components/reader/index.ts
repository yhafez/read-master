/**
 * Reader components exports
 */

// EPUB Reader
export { EpubReader } from "./EpubReader";
export type {
  EpubReaderProps,
  EpubReaderState,
  EpubLocation,
  TocItem,
  TextSelection,
  ReaderErrorType,
} from "./types";
export {
  INITIAL_READER_STATE,
  DEFAULT_EPUB_STYLES,
  createReaderError,
  getErrorMessage,
  validateEpubUrl,
} from "./types";

// PDF Reader
export { PdfReader } from "./PdfReader";
export type {
  PdfReaderProps,
  PdfReaderState,
  PdfLocation,
  PdfTextSelection,
  PdfErrorType,
} from "./pdfTypes";
export {
  INITIAL_PDF_READER_STATE,
  ZOOM_PRESETS,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  createPdfError,
  getPdfErrorMessage,
  validatePdfUrl,
  clampZoom,
  calculateFitWidthZoom,
  calculateFitPageZoom,
  formatZoomPercent,
} from "./pdfTypes";

// Text Reader
export { TextReader } from "./TextReader";
export type {
  TextReaderProps,
  TextReaderState,
  TextLocation,
  TextReaderSelection,
  TextHighlight,
  TextHighlightColor,
  TextContentType,
  TextReaderErrorType,
} from "./textTypes";
export {
  INITIAL_TEXT_READER_STATE,
  CHARS_PER_PAGE,
  SCROLL_AMOUNT,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  FONT_SIZE_STEP,
  HIGHLIGHT_COLORS,
  createTextReaderError,
  getTextReaderErrorMessage,
  validateContent,
  calculateLocation,
  parseIntoParagraphs,
  clampFontSize,
  formatPercent,
  getOffsetAtScrollPosition,
  getScrollPositionFromOffset,
  rangesOverlap,
  getOverlappingHighlights,
  mergeOverlappingHighlights,
} from "./textTypes";

// Progress Tracker
export { ProgressTracker } from "./ProgressTracker";
export type {
  ProgressTrackerProps,
  ProgressData,
  ProgressDisplayMode,
  ProgressBarSegment,
  ReadingSession,
  TimeDisplayFormat,
} from "./progressTypes";
export {
  DEFAULT_WPM,
  MIN_WPM_THRESHOLD,
  MAX_WPM_THRESHOLD,
  MIN_TIME_FOR_WPM,
  READING_PAUSE_THRESHOLD,
  TIME_UNITS,
  DISPLAY_MODE_DEFAULTS,
  calculatePercentage,
  calculateWpm,
  estimateTimeRemaining,
  formatDuration,
  formatPercentage,
  formatWpm,
  calculateWordsRead,
  calculateProgressData,
  isReadingActive,
  createReadingSession,
  updateReadingSession,
  getDisplaySettings,
  createProgressSegments,
  validateProgressProps,
} from "./progressTypes";

// Annotation Types and Utilities
export type {
  AnnotationType,
  HighlightColor,
  AnnotationBase,
  HighlightAnnotation,
  NoteAnnotation,
  BookmarkAnnotation,
  Annotation,
  SelectionPosition,
  TextSelectionInfo,
  AnnotationAction,
  CreateAnnotationInput,
  UpdateAnnotationInput,
  AnnotationFilters,
  AnnotationSortField,
  AnnotationSortDirection,
  AnnotationSort,
  AnnotationViewMode,
} from "./annotationTypes";
export {
  HIGHLIGHT_COLOR_VALUES,
  DEFAULT_HIGHLIGHT_COLOR,
  colorToHex,
  hexToColor,
  isHighlight,
  isNote,
  isBookmark,
  getAnnotationIcon,
  getAnnotationLabel,
  sortAnnotations,
  filterAnnotations,
  groupAnnotationsByType,
  getAnnotationsInRange,
  getAnnotationAtPosition,
  validateSelection,
  createHighlightInput,
  createNoteInput,
  createBookmarkInput,
  getExcerptText,
  formatAnnotationDate,
  countAnnotationsByType,
} from "./annotationTypes";

// Annotation UI Components
export { AnnotationToolbar, useSelectionAnchor } from "./AnnotationToolbar";
export type { AnnotationToolbarProps } from "./AnnotationToolbar";
export { NoteEditorDialog } from "./NoteEditorDialog";
export type { NoteEditorDialogProps } from "./NoteEditorDialog";
export { AnnotationSidebar } from "./AnnotationSidebar";
export type { AnnotationSidebarProps } from "./AnnotationSidebar";

// Annotation Export Types and Utilities
export type {
  ExportFormat,
  ExportFilters,
  ExportOptions,
  AnnotationWithContext,
  ExportResult,
  ExportStats,
  PdfGenerationOptions,
  PdfAnnotationBlock,
} from "./annotationExportTypes";
export {
  DEFAULT_EXPORT_OPTIONS,
  DATE_FORMATS,
  PDF_PAGE,
  formatExportDate,
  generateExportFilename,
  calculateExportStats,
  filterAnnotationsForExport,
  sortAnnotationsForExport,
  getExportTypeLabel,
  getColorDisplayName,
  truncateText,
  escapeMarkdown,
  wrapTextForPdf,
  generateMarkdownHeader,
  generateMarkdownStats,
  generateMarkdownToc,
  formatAnnotationAsMarkdown,
  generateMarkdownExport,
  getPdfContentWidth,
  getCharsPerLine,
  getPdfGenerationOptions,
  formatAnnotationForPdf,
  prepareAnnotationsForPdf,
  downloadMarkdown,
  downloadBlob,
  validateExportOptions,
} from "./annotationExportTypes";

// Annotation Export Dialog
export { AnnotationExportDialog } from "./AnnotationExportDialog";
export type { AnnotationExportDialogProps } from "./AnnotationExportDialog";

// Dictionary and Wikipedia Lookup Types and Utilities
export type {
  LookupSource,
  LookupState,
  DictionaryPhonetic,
  DictionaryDefinition,
  DictionaryMeaning,
  DictionaryEntry,
  DictionaryResult,
  DictionaryErrorType,
  WikipediaSummary,
  WikipediaThumbnail,
  WikipediaImage,
  WikipediaResult,
  WikipediaErrorType,
  LookupResult,
  LookupPosition,
  LookupCacheEntry,
  LookupSettings,
} from "./dictionaryTypes";
export {
  DICTIONARY_API_URL,
  WIKIPEDIA_API_URL,
  WIKIPEDIA_LANGUAGES,
  CACHE_TTL,
  MAX_CACHE_ENTRIES,
  MIN_WORD_LENGTH,
  MAX_WORD_LENGTH,
  DICTIONARY_CACHE_KEY,
  WIKIPEDIA_CACHE_KEY,
  LOOKUP_SETTINGS_KEY,
  DEFAULT_LOOKUP_SETTINGS,
  normalizeWord,
  isValidLookupWord,
  extractFirstWord,
  isPhrase,
  createCacheEntry,
  isCacheValid,
  getCache,
  setCache,
  addToCache,
  getFromCache,
  clearCache,
  getCacheSize,
  createDictionaryError,
  parseDictionaryResponse,
  parseDictionaryPhonetics,
  parseDictionaryMeanings,
  parseDictionaryDefinitions,
  getPhoneticText,
  getPhoneticAudio,
  getAllSynonyms,
  getAllAntonyms,
  countDefinitions,
  createWikipediaError,
  buildWikipediaUrl,
  parseWikipediaResponse,
  truncateExtract,
  loadLookupSettings,
  saveLookupSettings,
  updateLookupSetting,
  getDictionaryErrorMessage,
  getWikipediaErrorMessage,
  getPartOfSpeechAbbrev,
  formatPartOfSpeech,
  getWikipediaUrlForLanguage,
} from "./dictionaryTypes";

// Dictionary Popover Component
export { DictionaryPopover } from "./DictionaryPopover";
export type { DictionaryPopoverProps } from "./DictionaryPopover";

// Translation Types and Utilities
export type {
  TranslationState,
  TranslationErrorType,
  TranslationResult,
  LanguageOption,
  TranslationSettings,
  TranslationCacheEntry,
} from "./translationTypes";
export {
  MYMEMORY_API_URL,
  MAX_TRANSLATION_LENGTH,
  MIN_TRANSLATION_LENGTH,
  TRANSLATION_CACHE_TTL,
  MAX_TRANSLATION_CACHE_ENTRIES,
  TRANSLATION_CACHE_KEY,
  TRANSLATION_SETTINGS_KEY,
  SUPPORTED_LANGUAGES,
  RTL_LANGUAGES,
  DEFAULT_TRANSLATION_SETTINGS,
  isValidTranslationText,
  isSupportedLanguage,
  isRtlLanguage,
  getLanguageByCode,
  getLanguageDisplayName,
  prepareTextForTranslation,
  getTranslationCacheKey,
  createTranslationCacheEntry,
  isTranslationCacheValid,
  getTranslationCache,
  setTranslationCache,
  addTranslationToCache,
  getTranslationFromCache,
  clearTranslationCache,
  getTranslationCacheSize,
  loadTranslationSettings,
  saveTranslationSettings,
  updateTranslationSetting,
  createTranslationError,
  createTranslationSuccess,
  buildMyMemoryUrl,
  parseMyMemoryResponse,
  getTranslationErrorMessage,
  getLanguagePairDisplay,
  swapLanguages,
  getPopularLanguages,
  getSortedLanguages,
} from "./translationTypes";

// Translation Popover Component
export { TranslationPopover } from "./TranslationPopover";
export type { TranslationPopoverProps } from "./TranslationPopover";

// Keyboard Shortcuts and Gestures Types and Utilities
export type {
  ShortcutCategory,
  ModifierKey,
  GestureType,
  ShortcutDefinition,
  GestureDefinition,
  ShortcutPreferences,
  TouchPosition,
  TouchState,
  DetectedGesture,
  ShortcutsHelpDialogProps,
  UseKeyboardShortcutsOptions,
  UseTouchGesturesOptions,
  ShortcutHandlers,
  GestureHandlers,
} from "./keyboardShortcutTypes";
export {
  SHORTCUT_PREFERENCES_KEY,
  SHORTCUT_CATEGORIES,
  MODIFIER_KEYS,
  SPECIAL_KEYS,
  GESTURE_TYPES,
  MIN_SWIPE_DISTANCE,
  MIN_SWIPE_VELOCITY,
  LONG_PRESS_DURATION,
  DOUBLE_TAP_INTERVAL,
  PINCH_THRESHOLD,
  DEFAULT_SHORTCUTS,
  DEFAULT_GESTURES,
  DEFAULT_SHORTCUT_PREFERENCES,
  getKeyDisplayString,
  getModifierDisplayString,
  formatShortcutDisplay,
  isMacPlatform,
  eventMatchesShortcut,
  getShortcutsByCategory,
  getGesturesByCategory,
  getGroupedShortcuts,
  findShortcutById,
  findGestureById,
  loadShortcutPreferences,
  saveShortcutPreferences,
  updateShortcutPreference,
  toggleShortcutEnabled,
  toggleGestureEnabled,
  setCustomBinding,
  clearCustomBinding,
  resetShortcutPreferences,
  createInitialTouchState,
  calculateDistance,
  calculateVelocity,
  detectSwipeGesture,
  detectPinchGesture,
  shouldPreventGesture,
  isShortcutEnabled,
  isGestureEnabled,
  getEffectiveBinding,
  validateCustomBinding,
  getCategoryLabelKey,
  getGestureIconName,
} from "./keyboardShortcutTypes";

// Shortcuts Help Dialog
export { ShortcutsHelpDialog } from "./ShortcutsHelpDialog";

// TTS (Text-to-Speech) Types and Utilities
export type {
  TTSProvider,
  TTSPlaybackState,
  TTSVoice,
  WebSpeechVoiceInfo,
  TTSSettings,
  TTSPosition,
  TTSErrorType,
  TTSError,
  TTSState,
  TTSControlsProps,
} from "./ttsTypes";
export {
  TTS_SETTINGS_KEY,
  DEFAULT_TTS_SETTINGS,
  RATE_RANGE,
  PITCH_RANGE,
  VOLUME_RANGE,
  RATE_PRESETS,
  OPENAI_VOICES,
  ELEVENLABS_VOICES,
  INITIAL_TTS_STATE,
  isWebSpeechSupported,
  getWebSpeechVoices,
  convertWebSpeechVoice,
  getAllWebSpeechVoices,
  findVoiceByLanguage,
  findWebSpeechVoiceById,
  getVoicesForTier,
  getDefaultVoiceForTier,
  findVoiceById,
  groupVoicesByProvider,
  filterVoicesByLanguage,
  loadTTSSettings,
  saveTTSSettings,
  updateTTSSetting,
  resetTTSSettings,
  clampValue as clampTTSValue,
  formatRate,
  formatVolume,
  getClosestRatePreset,
  createTTSError,
  getTTSErrorMessage,
  isRecoverableError,
  prepareTextForTTS,
  splitIntoSentences,
  estimateSpeechDuration,
  getWordCount,
  createPositionFromBoundary,
  getHighlightRange,
  getTextContext,
  getProviderDisplayName,
  getProviderFromVoiceId,
  voiceRequiresAPI,
  getTierForVoice,
  canUseVoice,
} from "./ttsTypes";

// TTS Controls Component
export { TTSControls } from "./TTSControls";

// Notes Panel Types and Utilities
export type {
  PanelPosition,
  PanelConstraints,
  NotesPanelState,
  NoteFilterPreset,
  NotesPanelSettings,
} from "./notesPanelUtils";
export {
  DEFAULT_PANEL_CONSTRAINTS,
  NOTES_PANEL_STORAGE_KEY,
  getDefaultPanelSettings,
  clampPanelSize,
  clampWidth,
  clampHeight,
  presetToFilters,
  getFilteredAnnotations,
  getAnnotationEditText,
  getAnnotationContext,
  isAnnotationEditable,
  getAnnotationListExcerpt,
  calculatePanelLayout,
  getFilterPresetLabelKey,
  getSortFieldLabelKey,
  getFilterPresets,
  getSortFields,
  validatePanelSettings,
  savePanelSettings,
  loadPanelSettings,
  countByPreset,
} from "./notesPanelUtils";

// Notes Panel Component
export { NotesPanel } from "./NotesPanel";
export type { NotesPanelProps } from "./NotesPanel";

// Mobile Reader Toolbar
export { MobileReaderToolbar } from "./MobileReaderToolbar";
export type { MobileReaderToolbarProps } from "./MobileReaderToolbar";

// Search In Book
export { SearchInBook } from "./SearchInBook";
export type { SearchInBookProps, SearchMatch } from "./SearchInBook";
