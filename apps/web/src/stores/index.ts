/**
 * Stores module exports
 */

export {
  clamp,
  sanitizeSettings,
  THEME_STORAGE_KEY,
  useThemeStore,
} from "./themeStore";

export {
  DEFAULT_UI_PREFERENCES,
  sanitizePreferences,
  supportedLanguages,
  UI_STORAGE_KEY,
  useUIStore,
  validateLanguage,
  validateReaderNavPanel,
  validateSidebarState,
} from "./uiStore";
export type {
  ReaderNavPanel,
  SidebarState,
  SupportedLanguage,
  UIPreferences,
} from "./uiStore";

export {
  AUTO_SCROLL_WPM_RANGE,
  clampValue,
  createReadingPosition,
  DEFAULT_READER_SETTINGS,
  MARGINS_RANGE,
  MAX_WIDTH_RANGE,
  READER_STORAGE_KEY,
  sanitizeReaderSettings,
  useReaderStore,
  validateBookFormat,
  validateReadingMode,
} from "./readerStore";
export type {
  BookFormat,
  CurrentBook,
  ReaderSettings,
  ReadingMode,
  ReadingPosition,
} from "./readerStore";
