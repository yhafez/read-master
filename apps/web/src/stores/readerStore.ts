/**
 * Reader store for Read Master
 *
 * Manages reading session state (current book, position, reader settings)
 * with localStorage persistence for reader preferences.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const READER_STORAGE_KEY = "read-master-reader";

/**
 * Book format types
 */
export type BookFormat = "epub" | "pdf" | "txt" | "doc" | "docx" | "html";

/**
 * Reading mode types
 */
export type ReadingMode = "paginated" | "scroll" | "spread";

/**
 * Available font families for reading
 */
export type FontFamily =
  | "system"
  | "serif"
  | "sans-serif"
  | "monospace"
  | "openDyslexic";

/**
 * Font family display names and CSS values
 */
export const FONT_FAMILIES: Record<FontFamily, { name: string; css: string }> =
  {
    system: {
      name: "System Default",
      css: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    serif: {
      name: "Serif (Georgia)",
      css: 'Georgia, "Times New Roman", Times, serif',
    },
    "sans-serif": {
      name: "Sans-Serif (Arial)",
      css: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    },
    monospace: {
      name: "Monospace (Courier)",
      css: '"Courier New", Courier, monospace',
    },
    openDyslexic: {
      name: "OpenDyslexic",
      css: '"OpenDyslexic", sans-serif',
    },
  } as const;

/**
 * Current book info for reader
 */
export interface CurrentBook {
  /** Book ID */
  id: string;
  /** Book title */
  title: string;
  /** Book format */
  format: BookFormat;
  /** Total number of pages/positions (format-dependent) */
  totalPositions: number;
  /** Book content URL */
  contentUrl?: string;
}

/**
 * Reading position tracking
 */
export interface ReadingPosition {
  /** Current position/page number */
  position: number;
  /** CFI location for EPUB (Chapter Fragment Identifier) */
  cfi?: string;
  /** Percentage progress (0-100) */
  percentage: number;
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * Typography settings for reading
 */
export interface TypographySettings {
  /** Font family for reading content */
  fontFamily: FontFamily;
  /** Font size in pixels (12-32) */
  fontSize: number;
  /** Line height multiplier (1.0-3.0) */
  lineHeight: number;
  /** Letter spacing in em units (-0.05 to 0.2) */
  letterSpacing: number;
  /** Word spacing in em units (0 to 0.5) */
  wordSpacing: number;
  /** Paragraph spacing multiplier (0.5-3.0) */
  paragraphSpacing: number;
  /** Text alignment */
  textAlign: "left" | "justify" | "center";
}

/**
 * Reader display settings
 */
export interface ReaderSettings {
  /** Reading mode (paginated, scroll, spread) */
  readingMode: ReadingMode;
  /** Whether to show page numbers */
  showPageNumbers: boolean;
  /** Whether to show reading progress bar */
  showProgressBar: boolean;
  /** Whether to show estimated read time */
  showEstimatedTime: boolean;
  /** Auto-scroll speed in words per minute (0 = disabled) */
  autoScrollWpm: number;
  /** Whether bionic reading is enabled */
  bionicReadingEnabled: boolean;
  /** Whether to highlight current paragraph */
  highlightCurrentParagraph: boolean;
  /** Margins in percentage (0-20) */
  margins: number;
  /** Maximum content width in pixels (0 = full width) */
  maxWidth: number;
  /** Typography settings */
  typography: TypographySettings;
}

/**
 * Default typography settings
 */
export const DEFAULT_TYPOGRAPHY_SETTINGS: TypographySettings = {
  fontFamily: "system",
  fontSize: 18,
  lineHeight: 1.6,
  letterSpacing: 0,
  wordSpacing: 0,
  paragraphSpacing: 1.5,
  textAlign: "left",
};

/**
 * Default reader settings
 */
export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  readingMode: "paginated",
  showPageNumbers: true,
  showProgressBar: true,
  showEstimatedTime: true,
  autoScrollWpm: 0,
  bionicReadingEnabled: false,
  highlightCurrentParagraph: false,
  margins: 5,
  maxWidth: 800,
  typography: DEFAULT_TYPOGRAPHY_SETTINGS,
};

/**
 * Reading speed/WPM range
 */
export const AUTO_SCROLL_WPM_RANGE = {
  min: 0,
  max: 1000,
  step: 50,
} as const;

/**
 * Margins range
 */
export const MARGINS_RANGE = {
  min: 0,
  max: 20,
  step: 1,
} as const;

/**
 * Max width range
 */
export const MAX_WIDTH_RANGE = {
  min: 0, // 0 means full width
  max: 1200,
  step: 50,
} as const;

/**
 * Font size range (in pixels)
 */
export const FONT_SIZE_RANGE = {
  min: 12,
  max: 32,
  step: 1,
} as const;

/**
 * Line height range (multiplier)
 */
export const LINE_HEIGHT_RANGE = {
  min: 1.0,
  max: 3.0,
  step: 0.1,
} as const;

/**
 * Letter spacing range (in em)
 */
export const LETTER_SPACING_RANGE = {
  min: -0.05,
  max: 0.2,
  step: 0.01,
} as const;

/**
 * Word spacing range (in em)
 */
export const WORD_SPACING_RANGE = {
  min: 0,
  max: 0.5,
  step: 0.05,
} as const;

/**
 * Paragraph spacing range (multiplier)
 */
export const PARAGRAPH_SPACING_RANGE = {
  min: 0.5,
  max: 3.0,
  step: 0.1,
} as const;

/**
 * Valid text alignment values
 */
export const VALID_TEXT_ALIGNMENTS = ["left", "justify", "center"] as const;

/**
 * Clamp a value between min and max
 */
export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Validate reading mode
 */
export function validateReadingMode(mode: string): ReadingMode {
  const validModes: ReadingMode[] = ["paginated", "scroll", "spread"];
  return validModes.includes(mode as ReadingMode)
    ? (mode as ReadingMode)
    : "paginated";
}

/**
 * Validate book format
 */
export function validateBookFormat(format: string): BookFormat {
  const validFormats: BookFormat[] = [
    "epub",
    "pdf",
    "txt",
    "doc",
    "docx",
    "html",
  ];
  return validFormats.includes(format as BookFormat)
    ? (format as BookFormat)
    : "txt";
}

/**
 * Validate font family
 */
export function validateFontFamily(fontFamily: string): FontFamily {
  const validFonts: FontFamily[] = [
    "system",
    "serif",
    "sans-serif",
    "monospace",
    "openDyslexic",
  ];
  return validFonts.includes(fontFamily as FontFamily)
    ? (fontFamily as FontFamily)
    : "system";
}

/**
 * Validate text alignment
 */
export function validateTextAlign(
  textAlign: string
): "left" | "justify" | "center" {
  return VALID_TEXT_ALIGNMENTS.includes(
    textAlign as "left" | "justify" | "center"
  )
    ? (textAlign as "left" | "justify" | "center")
    : "left";
}

/**
 * Sanitize typography settings
 */
export function sanitizeTypographySettings(
  settings: Partial<TypographySettings>
): Partial<TypographySettings> {
  const sanitized: Partial<TypographySettings> = {};

  if (settings.fontFamily !== undefined) {
    sanitized.fontFamily = validateFontFamily(settings.fontFamily);
  }

  if (typeof settings.fontSize === "number") {
    sanitized.fontSize = clampValue(
      settings.fontSize,
      FONT_SIZE_RANGE.min,
      FONT_SIZE_RANGE.max
    );
  }

  if (typeof settings.lineHeight === "number") {
    sanitized.lineHeight = clampValue(
      settings.lineHeight,
      LINE_HEIGHT_RANGE.min,
      LINE_HEIGHT_RANGE.max
    );
  }

  if (typeof settings.letterSpacing === "number") {
    sanitized.letterSpacing = clampValue(
      settings.letterSpacing,
      LETTER_SPACING_RANGE.min,
      LETTER_SPACING_RANGE.max
    );
  }

  if (typeof settings.wordSpacing === "number") {
    sanitized.wordSpacing = clampValue(
      settings.wordSpacing,
      WORD_SPACING_RANGE.min,
      WORD_SPACING_RANGE.max
    );
  }

  if (typeof settings.paragraphSpacing === "number") {
    sanitized.paragraphSpacing = clampValue(
      settings.paragraphSpacing,
      PARAGRAPH_SPACING_RANGE.min,
      PARAGRAPH_SPACING_RANGE.max
    );
  }

  if (settings.textAlign !== undefined) {
    sanitized.textAlign = validateTextAlign(settings.textAlign);
  }

  return sanitized;
}

/**
 * Sanitize reader settings
 */
export function sanitizeReaderSettings(
  settings: Partial<ReaderSettings>
): Partial<ReaderSettings> {
  const sanitized: Partial<ReaderSettings> = {};

  if (settings.readingMode !== undefined) {
    sanitized.readingMode = validateReadingMode(settings.readingMode);
  }

  if (typeof settings.showPageNumbers === "boolean") {
    sanitized.showPageNumbers = settings.showPageNumbers;
  }

  if (typeof settings.showProgressBar === "boolean") {
    sanitized.showProgressBar = settings.showProgressBar;
  }

  if (typeof settings.showEstimatedTime === "boolean") {
    sanitized.showEstimatedTime = settings.showEstimatedTime;
  }

  if (typeof settings.autoScrollWpm === "number") {
    sanitized.autoScrollWpm = clampValue(
      settings.autoScrollWpm,
      AUTO_SCROLL_WPM_RANGE.min,
      AUTO_SCROLL_WPM_RANGE.max
    );
  }

  if (typeof settings.bionicReadingEnabled === "boolean") {
    sanitized.bionicReadingEnabled = settings.bionicReadingEnabled;
  }

  if (typeof settings.highlightCurrentParagraph === "boolean") {
    sanitized.highlightCurrentParagraph = settings.highlightCurrentParagraph;
  }

  if (typeof settings.margins === "number") {
    sanitized.margins = clampValue(
      settings.margins,
      MARGINS_RANGE.min,
      MARGINS_RANGE.max
    );
  }

  if (typeof settings.maxWidth === "number") {
    sanitized.maxWidth = clampValue(
      settings.maxWidth,
      MAX_WIDTH_RANGE.min,
      MAX_WIDTH_RANGE.max
    );
  }

  if (settings.typography !== undefined) {
    sanitized.typography = {
      ...DEFAULT_TYPOGRAPHY_SETTINGS,
      ...sanitizeTypographySettings(settings.typography),
    };
  }

  return sanitized;
}

/**
 * Create a valid reading position
 */
export function createReadingPosition(
  position: number,
  totalPositions: number,
  cfi?: string
): ReadingPosition {
  const clampedPosition = clampValue(
    position,
    0,
    Math.max(totalPositions - 1, 0)
  );
  const percentage =
    totalPositions > 0 ? (clampedPosition / totalPositions) * 100 : 0;

  const result: ReadingPosition = {
    position: clampedPosition,
    percentage: Math.min(percentage, 100),
    lastUpdated: Date.now(),
  };

  // Only include cfi if it's defined (for exactOptionalPropertyTypes)
  if (cfi !== undefined) {
    result.cfi = cfi;
  }

  return result;
}

interface ReaderState {
  /** Currently open book (null if no book is open) */
  currentBook: CurrentBook | null;
  /** Current reading position */
  currentPosition: ReadingPosition | null;
  /** Reader display settings */
  settings: ReaderSettings;
  /** Whether reader is in fullscreen mode */
  isFullscreen: boolean;
  /** Whether TTS is currently playing */
  isTTSPlaying: boolean;
  /** Selected text (for annotations, lookup, etc.) */
  selectedText: string | null;
}

interface ReaderActions {
  /** Open a book for reading */
  openBook: (book: CurrentBook) => void;
  /** Close the current book */
  closeBook: () => void;
  /** Update reading position */
  updatePosition: (position: number, cfi?: string) => void;
  /** Set position directly with full position object */
  setPosition: (position: ReadingPosition) => void;
  /** Navigate to next page/position */
  nextPage: () => void;
  /** Navigate to previous page/position */
  previousPage: () => void;
  /** Go to specific percentage */
  goToPercentage: (percentage: number) => void;
  /** Update reader settings */
  updateSettings: (settings: Partial<ReaderSettings>) => void;
  /** Update typography settings */
  updateTypography: (typography: Partial<TypographySettings>) => void;
  /** Reset reader settings to defaults */
  resetSettings: () => void;
  /** Reset typography settings to defaults */
  resetTypography: () => void;
  /** Toggle fullscreen mode */
  toggleFullscreen: () => void;
  /** Set fullscreen mode */
  setFullscreen: (fullscreen: boolean) => void;
  /** Set TTS playing state */
  setTTSPlaying: (playing: boolean) => void;
  /** Set selected text */
  setSelectedText: (text: string | null) => void;
  /** Clear selected text */
  clearSelectedText: () => void;
}

type ReaderStore = ReaderState & ReaderActions;

export const useReaderStore = create<ReaderStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentBook: null,
      currentPosition: null,
      settings: DEFAULT_READER_SETTINGS,
      isFullscreen: false,
      isTTSPlaying: false,
      selectedText: null,

      // Actions
      openBook: (book) =>
        set(() => ({
          currentBook: {
            ...book,
            format: validateBookFormat(book.format),
          },
          currentPosition: createReadingPosition(0, book.totalPositions),
          isFullscreen: false,
          isTTSPlaying: false,
          selectedText: null,
        })),

      closeBook: () =>
        set(() => ({
          currentBook: null,
          currentPosition: null,
          isFullscreen: false,
          isTTSPlaying: false,
          selectedText: null,
        })),

      updatePosition: (position, cfi) => {
        const { currentBook } = get();
        if (!currentBook) return;

        set(() => ({
          currentPosition: createReadingPosition(
            position,
            currentBook.totalPositions,
            cfi
          ),
        }));
      },

      setPosition: (position) =>
        set(() => ({
          currentPosition: {
            ...position,
            lastUpdated: Date.now(),
          },
        })),

      nextPage: () => {
        const { currentBook, currentPosition } = get();
        if (!currentBook || !currentPosition) return;

        const newPosition = Math.min(
          currentPosition.position + 1,
          currentBook.totalPositions - 1
        );
        set(() => ({
          currentPosition: createReadingPosition(
            newPosition,
            currentBook.totalPositions
          ),
        }));
      },

      previousPage: () => {
        const { currentBook, currentPosition } = get();
        if (!currentBook || !currentPosition) return;

        const newPosition = Math.max(currentPosition.position - 1, 0);
        set(() => ({
          currentPosition: createReadingPosition(
            newPosition,
            currentBook.totalPositions
          ),
        }));
      },

      goToPercentage: (percentage) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const clampedPercentage = clampValue(percentage, 0, 100);
        const position = Math.floor(
          (clampedPercentage / 100) * currentBook.totalPositions
        );
        set(() => ({
          currentPosition: createReadingPosition(
            position,
            currentBook.totalPositions
          ),
        }));
      },

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...sanitizeReaderSettings(newSettings),
          },
        })),

      updateTypography: (newTypography) =>
        set((state) => ({
          settings: {
            ...state.settings,
            typography: {
              ...state.settings.typography,
              ...sanitizeTypographySettings(newTypography),
            },
          },
        })),

      resetSettings: () =>
        set(() => ({
          settings: DEFAULT_READER_SETTINGS,
        })),

      resetTypography: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            typography: DEFAULT_TYPOGRAPHY_SETTINGS,
          },
        })),

      toggleFullscreen: () =>
        set((state) => ({
          isFullscreen: !state.isFullscreen,
        })),

      setFullscreen: (fullscreen) =>
        set(() => ({
          isFullscreen: fullscreen,
        })),

      setTTSPlaying: (playing) =>
        set(() => ({
          isTTSPlaying: playing,
        })),

      setSelectedText: (text) =>
        set(() => ({
          selectedText: text,
        })),

      clearSelectedText: () =>
        set(() => ({
          selectedText: null,
        })),
    }),
    {
      name: READER_STORAGE_KEY,
      partialize: (state) => ({
        settings: state.settings,
        // Note: currentBook, currentPosition, and session state are NOT persisted
        // They should come from the server and be set on navigation
      }),
    }
  )
);
