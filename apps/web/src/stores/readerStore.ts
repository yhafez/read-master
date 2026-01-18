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
}

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
  /** Reset reader settings to defaults */
  resetSettings: () => void;
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

      resetSettings: () =>
        set(() => ({
          settings: DEFAULT_READER_SETTINGS,
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
