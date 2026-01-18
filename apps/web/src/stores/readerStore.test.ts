/**
 * Tests for reader store
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTO_SCROLL_WPM_RANGE,
  clampValue,
  createReadingPosition,
  DEFAULT_READER_SETTINGS,
  DEFAULT_TYPOGRAPHY_SETTINGS,
  FONT_FAMILIES,
  FONT_SIZE_RANGE,
  LETTER_SPACING_RANGE,
  LINE_HEIGHT_RANGE,
  MARGINS_RANGE,
  MAX_WIDTH_RANGE,
  PARAGRAPH_SPACING_RANGE,
  READER_STORAGE_KEY,
  sanitizeReaderSettings,
  sanitizeTypographySettings,
  useReaderStore,
  validateBookFormat,
  validateFontFamily,
  validateReadingMode,
  validateTextAlign,
  VALID_TEXT_ALIGNMENTS,
  WORD_SPACING_RANGE,
} from "./readerStore";

// Mock Date.now for consistent tests
const NOW = 1705600000000;

// Reset store between tests
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  useReaderStore.setState({
    currentBook: null,
    currentPosition: null,
    settings: DEFAULT_READER_SETTINGS,
    isFullscreen: false,
    isTTSPlaying: false,
    selectedText: null,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("readerStore", () => {
  describe("constants", () => {
    it("should export READER_STORAGE_KEY", () => {
      expect(READER_STORAGE_KEY).toBe("read-master-reader");
    });

    it("should export DEFAULT_READER_SETTINGS", () => {
      expect(DEFAULT_READER_SETTINGS).toEqual({
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
      });
    });

    it("should export DEFAULT_TYPOGRAPHY_SETTINGS", () => {
      expect(DEFAULT_TYPOGRAPHY_SETTINGS).toEqual({
        fontFamily: "system",
        fontSize: 18,
        lineHeight: 1.6,
        letterSpacing: 0,
        wordSpacing: 0,
        paragraphSpacing: 1.5,
        textAlign: "left",
      });
    });

    it("should export FONT_FAMILIES with all font options", () => {
      expect(FONT_FAMILIES).toHaveProperty("system");
      expect(FONT_FAMILIES).toHaveProperty("serif");
      expect(FONT_FAMILIES).toHaveProperty("sans-serif");
      expect(FONT_FAMILIES).toHaveProperty("monospace");
      expect(FONT_FAMILIES).toHaveProperty("openDyslexic");
      expect(FONT_FAMILIES.system.name).toBe("System Default");
      expect(FONT_FAMILIES.openDyslexic.name).toBe("OpenDyslexic");
    });

    it("should export typography range constants", () => {
      expect(FONT_SIZE_RANGE).toEqual({ min: 12, max: 32, step: 1 });
      expect(LINE_HEIGHT_RANGE).toEqual({ min: 1.0, max: 3.0, step: 0.1 });
      expect(LETTER_SPACING_RANGE).toEqual({
        min: -0.05,
        max: 0.2,
        step: 0.01,
      });
      expect(WORD_SPACING_RANGE).toEqual({ min: 0, max: 0.5, step: 0.05 });
      expect(PARAGRAPH_SPACING_RANGE).toEqual({
        min: 0.5,
        max: 3.0,
        step: 0.1,
      });
    });

    it("should export VALID_TEXT_ALIGNMENTS", () => {
      expect(VALID_TEXT_ALIGNMENTS).toEqual(["left", "justify", "center"]);
    });

    it("should export AUTO_SCROLL_WPM_RANGE", () => {
      expect(AUTO_SCROLL_WPM_RANGE).toEqual({
        min: 0,
        max: 1000,
        step: 50,
      });
    });

    it("should export MARGINS_RANGE", () => {
      expect(MARGINS_RANGE).toEqual({
        min: 0,
        max: 20,
        step: 1,
      });
    });

    it("should export MAX_WIDTH_RANGE", () => {
      expect(MAX_WIDTH_RANGE).toEqual({
        min: 0,
        max: 1200,
        step: 50,
      });
    });
  });

  describe("clampValue", () => {
    it("should return value when within range", () => {
      expect(clampValue(50, 0, 100)).toBe(50);
    });

    it("should return min when value is below range", () => {
      expect(clampValue(-10, 0, 100)).toBe(0);
    });

    it("should return max when value is above range", () => {
      expect(clampValue(150, 0, 100)).toBe(100);
    });

    it("should handle equal min and max", () => {
      expect(clampValue(50, 50, 50)).toBe(50);
    });

    it("should handle decimal values", () => {
      expect(clampValue(0.5, 0, 1)).toBe(0.5);
    });
  });

  describe("validateReadingMode", () => {
    it("should accept valid reading modes", () => {
      expect(validateReadingMode("paginated")).toBe("paginated");
      expect(validateReadingMode("scroll")).toBe("scroll");
      expect(validateReadingMode("spread")).toBe("spread");
    });

    it("should default to paginated for invalid mode", () => {
      expect(validateReadingMode("invalid")).toBe("paginated");
      expect(validateReadingMode("")).toBe("paginated");
    });
  });

  describe("validateBookFormat", () => {
    it("should accept valid book formats", () => {
      expect(validateBookFormat("epub")).toBe("epub");
      expect(validateBookFormat("pdf")).toBe("pdf");
      expect(validateBookFormat("txt")).toBe("txt");
      expect(validateBookFormat("doc")).toBe("doc");
      expect(validateBookFormat("docx")).toBe("docx");
      expect(validateBookFormat("html")).toBe("html");
    });

    it("should default to txt for invalid format", () => {
      expect(validateBookFormat("invalid")).toBe("txt");
      expect(validateBookFormat("")).toBe("txt");
      expect(validateBookFormat("mobi")).toBe("txt");
    });
  });

  describe("validateFontFamily", () => {
    it("should accept valid font families", () => {
      expect(validateFontFamily("system")).toBe("system");
      expect(validateFontFamily("serif")).toBe("serif");
      expect(validateFontFamily("sans-serif")).toBe("sans-serif");
      expect(validateFontFamily("monospace")).toBe("monospace");
      expect(validateFontFamily("openDyslexic")).toBe("openDyslexic");
    });

    it("should default to system for invalid font family", () => {
      expect(validateFontFamily("invalid")).toBe("system");
      expect(validateFontFamily("")).toBe("system");
      expect(validateFontFamily("Arial")).toBe("system");
    });
  });

  describe("validateTextAlign", () => {
    it("should accept valid text alignments", () => {
      expect(validateTextAlign("left")).toBe("left");
      expect(validateTextAlign("justify")).toBe("justify");
      expect(validateTextAlign("center")).toBe("center");
    });

    it("should default to left for invalid alignment", () => {
      expect(validateTextAlign("invalid")).toBe("left");
      expect(validateTextAlign("")).toBe("left");
      expect(validateTextAlign("right")).toBe("left");
    });
  });

  describe("sanitizeTypographySettings", () => {
    describe("fontFamily validation", () => {
      it("should accept valid font families", () => {
        expect(sanitizeTypographySettings({ fontFamily: "serif" })).toEqual({
          fontFamily: "serif",
        });
        expect(
          sanitizeTypographySettings({ fontFamily: "openDyslexic" })
        ).toEqual({
          fontFamily: "openDyslexic",
        });
      });

      it("should default invalid font family to system", () => {
        expect(
          sanitizeTypographySettings({ fontFamily: "invalid" as never })
        ).toEqual({
          fontFamily: "system",
        });
      });
    });

    describe("fontSize validation", () => {
      it("should accept valid font sizes", () => {
        expect(sanitizeTypographySettings({ fontSize: 16 })).toEqual({
          fontSize: 16,
        });
        expect(sanitizeTypographySettings({ fontSize: 12 })).toEqual({
          fontSize: 12,
        });
        expect(sanitizeTypographySettings({ fontSize: 32 })).toEqual({
          fontSize: 32,
        });
      });

      it("should clamp font size to valid range", () => {
        expect(sanitizeTypographySettings({ fontSize: 8 })).toEqual({
          fontSize: 12,
        });
        expect(sanitizeTypographySettings({ fontSize: 50 })).toEqual({
          fontSize: 32,
        });
      });
    });

    describe("lineHeight validation", () => {
      it("should accept valid line heights", () => {
        expect(sanitizeTypographySettings({ lineHeight: 1.5 })).toEqual({
          lineHeight: 1.5,
        });
        expect(sanitizeTypographySettings({ lineHeight: 1.0 })).toEqual({
          lineHeight: 1.0,
        });
        expect(sanitizeTypographySettings({ lineHeight: 3.0 })).toEqual({
          lineHeight: 3.0,
        });
      });

      it("should clamp line height to valid range", () => {
        expect(sanitizeTypographySettings({ lineHeight: 0.5 })).toEqual({
          lineHeight: 1.0,
        });
        expect(sanitizeTypographySettings({ lineHeight: 5.0 })).toEqual({
          lineHeight: 3.0,
        });
      });
    });

    describe("letterSpacing validation", () => {
      it("should accept valid letter spacing", () => {
        expect(sanitizeTypographySettings({ letterSpacing: 0 })).toEqual({
          letterSpacing: 0,
        });
        expect(sanitizeTypographySettings({ letterSpacing: -0.05 })).toEqual({
          letterSpacing: -0.05,
        });
        expect(sanitizeTypographySettings({ letterSpacing: 0.2 })).toEqual({
          letterSpacing: 0.2,
        });
      });

      it("should clamp letter spacing to valid range", () => {
        expect(sanitizeTypographySettings({ letterSpacing: -0.1 })).toEqual({
          letterSpacing: -0.05,
        });
        expect(sanitizeTypographySettings({ letterSpacing: 0.5 })).toEqual({
          letterSpacing: 0.2,
        });
      });
    });

    describe("wordSpacing validation", () => {
      it("should accept valid word spacing", () => {
        expect(sanitizeTypographySettings({ wordSpacing: 0 })).toEqual({
          wordSpacing: 0,
        });
        expect(sanitizeTypographySettings({ wordSpacing: 0.25 })).toEqual({
          wordSpacing: 0.25,
        });
        expect(sanitizeTypographySettings({ wordSpacing: 0.5 })).toEqual({
          wordSpacing: 0.5,
        });
      });

      it("should clamp word spacing to valid range", () => {
        expect(sanitizeTypographySettings({ wordSpacing: -0.1 })).toEqual({
          wordSpacing: 0,
        });
        expect(sanitizeTypographySettings({ wordSpacing: 1.0 })).toEqual({
          wordSpacing: 0.5,
        });
      });
    });

    describe("paragraphSpacing validation", () => {
      it("should accept valid paragraph spacing", () => {
        expect(sanitizeTypographySettings({ paragraphSpacing: 1.5 })).toEqual({
          paragraphSpacing: 1.5,
        });
        expect(sanitizeTypographySettings({ paragraphSpacing: 0.5 })).toEqual({
          paragraphSpacing: 0.5,
        });
        expect(sanitizeTypographySettings({ paragraphSpacing: 3.0 })).toEqual({
          paragraphSpacing: 3.0,
        });
      });

      it("should clamp paragraph spacing to valid range", () => {
        expect(sanitizeTypographySettings({ paragraphSpacing: 0.1 })).toEqual({
          paragraphSpacing: 0.5,
        });
        expect(sanitizeTypographySettings({ paragraphSpacing: 5.0 })).toEqual({
          paragraphSpacing: 3.0,
        });
      });
    });

    describe("textAlign validation", () => {
      it("should accept valid text alignments", () => {
        expect(sanitizeTypographySettings({ textAlign: "left" })).toEqual({
          textAlign: "left",
        });
        expect(sanitizeTypographySettings({ textAlign: "justify" })).toEqual({
          textAlign: "justify",
        });
        expect(sanitizeTypographySettings({ textAlign: "center" })).toEqual({
          textAlign: "center",
        });
      });

      it("should default invalid text align to left", () => {
        expect(
          sanitizeTypographySettings({ textAlign: "right" as never })
        ).toEqual({
          textAlign: "left",
        });
      });
    });

    describe("multiple settings", () => {
      it("should handle empty object", () => {
        expect(sanitizeTypographySettings({})).toEqual({});
      });

      it("should handle multiple settings at once", () => {
        const result = sanitizeTypographySettings({
          fontFamily: "serif",
          fontSize: 20,
          lineHeight: 2.0,
          textAlign: "justify",
        });
        expect(result).toEqual({
          fontFamily: "serif",
          fontSize: 20,
          lineHeight: 2.0,
          textAlign: "justify",
        });
      });
    });
  });

  describe("sanitizeReaderSettings", () => {
    describe("readingMode validation", () => {
      it("should accept valid reading modes", () => {
        expect(sanitizeReaderSettings({ readingMode: "paginated" })).toEqual({
          readingMode: "paginated",
        });
        expect(sanitizeReaderSettings({ readingMode: "scroll" })).toEqual({
          readingMode: "scroll",
        });
        expect(sanitizeReaderSettings({ readingMode: "spread" })).toEqual({
          readingMode: "spread",
        });
      });

      it("should default invalid reading mode to paginated", () => {
        expect(
          sanitizeReaderSettings({ readingMode: "invalid" as never })
        ).toEqual({
          readingMode: "paginated",
        });
      });
    });

    describe("boolean settings validation", () => {
      it("should accept valid boolean values", () => {
        expect(sanitizeReaderSettings({ showPageNumbers: false })).toEqual({
          showPageNumbers: false,
        });
        expect(sanitizeReaderSettings({ showProgressBar: false })).toEqual({
          showProgressBar: false,
        });
        expect(sanitizeReaderSettings({ showEstimatedTime: false })).toEqual({
          showEstimatedTime: false,
        });
        expect(sanitizeReaderSettings({ bionicReadingEnabled: true })).toEqual({
          bionicReadingEnabled: true,
        });
        expect(
          sanitizeReaderSettings({ highlightCurrentParagraph: true })
        ).toEqual({
          highlightCurrentParagraph: true,
        });
      });

      it("should ignore non-boolean values", () => {
        expect(
          sanitizeReaderSettings({ showPageNumbers: "true" as never })
        ).toEqual({});
        expect(sanitizeReaderSettings({ showProgressBar: 1 as never })).toEqual(
          {}
        );
      });
    });

    describe("autoScrollWpm validation", () => {
      it("should accept valid WPM values", () => {
        expect(sanitizeReaderSettings({ autoScrollWpm: 200 })).toEqual({
          autoScrollWpm: 200,
        });
        expect(sanitizeReaderSettings({ autoScrollWpm: 0 })).toEqual({
          autoScrollWpm: 0,
        });
        expect(sanitizeReaderSettings({ autoScrollWpm: 1000 })).toEqual({
          autoScrollWpm: 1000,
        });
      });

      it("should clamp WPM to valid range", () => {
        expect(sanitizeReaderSettings({ autoScrollWpm: -50 })).toEqual({
          autoScrollWpm: 0,
        });
        expect(sanitizeReaderSettings({ autoScrollWpm: 1500 })).toEqual({
          autoScrollWpm: 1000,
        });
      });
    });

    describe("margins validation", () => {
      it("should accept valid margin values", () => {
        expect(sanitizeReaderSettings({ margins: 10 })).toEqual({
          margins: 10,
        });
        expect(sanitizeReaderSettings({ margins: 0 })).toEqual({
          margins: 0,
        });
      });

      it("should clamp margins to valid range", () => {
        expect(sanitizeReaderSettings({ margins: -5 })).toEqual({
          margins: 0,
        });
        expect(sanitizeReaderSettings({ margins: 30 })).toEqual({
          margins: 20,
        });
      });
    });

    describe("maxWidth validation", () => {
      it("should accept valid maxWidth values", () => {
        expect(sanitizeReaderSettings({ maxWidth: 800 })).toEqual({
          maxWidth: 800,
        });
        expect(sanitizeReaderSettings({ maxWidth: 0 })).toEqual({
          maxWidth: 0,
        });
      });

      it("should clamp maxWidth to valid range", () => {
        expect(sanitizeReaderSettings({ maxWidth: -100 })).toEqual({
          maxWidth: 0,
        });
        expect(sanitizeReaderSettings({ maxWidth: 2000 })).toEqual({
          maxWidth: 1200,
        });
      });
    });

    describe("typography validation", () => {
      it("should sanitize typography settings when provided", () => {
        const result = sanitizeReaderSettings({
          typography: {
            fontFamily: "serif",
            fontSize: 20,
            lineHeight: 2.0,
            letterSpacing: 0.05,
            wordSpacing: 0.1,
            paragraphSpacing: 2.0,
            textAlign: "justify",
          },
        });
        expect(result.typography).toEqual({
          ...DEFAULT_TYPOGRAPHY_SETTINGS,
          fontFamily: "serif",
          fontSize: 20,
          lineHeight: 2.0,
          letterSpacing: 0.05,
          wordSpacing: 0.1,
          paragraphSpacing: 2.0,
          textAlign: "justify",
        });
      });

      it("should fill missing typography settings with defaults", () => {
        const result = sanitizeReaderSettings({
          typography: {
            fontSize: 22,
          } as never,
        });
        expect(result.typography?.fontFamily).toBe("system");
        expect(result.typography?.fontSize).toBe(22);
        expect(result.typography?.lineHeight).toBe(1.6);
      });

      it("should clamp invalid typography values", () => {
        const result = sanitizeReaderSettings({
          typography: {
            fontFamily: "system",
            fontSize: 100, // Over max
            lineHeight: 10, // Over max
            letterSpacing: 1, // Over max
            wordSpacing: 2, // Over max
            paragraphSpacing: 10, // Over max
            textAlign: "left",
          },
        });
        expect(result.typography?.fontSize).toBe(32);
        expect(result.typography?.lineHeight).toBe(3.0);
        expect(result.typography?.letterSpacing).toBe(0.2);
        expect(result.typography?.wordSpacing).toBe(0.5);
        expect(result.typography?.paragraphSpacing).toBe(3.0);
      });
    });

    describe("multiple settings", () => {
      it("should handle empty object", () => {
        expect(sanitizeReaderSettings({})).toEqual({});
      });

      it("should handle multiple settings at once", () => {
        const result = sanitizeReaderSettings({
          readingMode: "scroll",
          showPageNumbers: false,
          margins: 10,
        });
        expect(result).toEqual({
          readingMode: "scroll",
          showPageNumbers: false,
          margins: 10,
        });
      });
    });
  });

  describe("createReadingPosition", () => {
    it("should create position at start of book", () => {
      const position = createReadingPosition(0, 100);
      expect(position.position).toBe(0);
      expect(position.percentage).toBe(0);
      expect(position.lastUpdated).toBe(NOW);
    });

    it("should create position in middle of book", () => {
      const position = createReadingPosition(50, 100);
      expect(position.position).toBe(50);
      expect(position.percentage).toBe(50);
    });

    it("should create position at end of book", () => {
      const position = createReadingPosition(99, 100);
      expect(position.position).toBe(99);
      expect(position.percentage).toBe(99);
    });

    it("should include CFI when provided", () => {
      const cfi = "epubcfi(/6/2[chapter1]!/4/2/1:0)";
      const position = createReadingPosition(10, 100, cfi);
      expect(position.cfi).toBe(cfi);
    });

    it("should clamp position to valid range", () => {
      const position = createReadingPosition(150, 100);
      expect(position.position).toBe(99);
      expect(position.percentage).toBe(99);
    });

    it("should clamp negative position to 0", () => {
      const position = createReadingPosition(-10, 100);
      expect(position.position).toBe(0);
      expect(position.percentage).toBe(0);
    });

    it("should handle single page book", () => {
      const position = createReadingPosition(0, 1);
      expect(position.position).toBe(0);
      expect(position.percentage).toBe(0);
    });

    it("should handle zero total positions", () => {
      const position = createReadingPosition(0, 0);
      expect(position.position).toBe(0);
      expect(position.percentage).toBe(0);
    });
  });

  describe("useReaderStore", () => {
    describe("initial state", () => {
      it("should have no current book initially", () => {
        expect(useReaderStore.getState().currentBook).toBeNull();
      });

      it("should have no current position initially", () => {
        expect(useReaderStore.getState().currentPosition).toBeNull();
      });

      it("should have default settings", () => {
        expect(useReaderStore.getState().settings).toEqual(
          DEFAULT_READER_SETTINGS
        );
      });

      it("should not be in fullscreen initially", () => {
        expect(useReaderStore.getState().isFullscreen).toBe(false);
      });

      it("should not be playing TTS initially", () => {
        expect(useReaderStore.getState().isTTSPlaying).toBe(false);
      });

      it("should have no selected text initially", () => {
        expect(useReaderStore.getState().selectedText).toBeNull();
      });
    });

    describe("openBook", () => {
      const testBook = {
        id: "book-1",
        title: "Test Book",
        format: "epub" as const,
        totalPositions: 100,
        contentUrl: "https://example.com/book.epub",
      };

      it("should set current book", () => {
        useReaderStore.getState().openBook(testBook);
        const state = useReaderStore.getState();
        expect(state.currentBook).toEqual(testBook);
      });

      it("should initialize position at start", () => {
        useReaderStore.getState().openBook(testBook);
        const position = useReaderStore.getState().currentPosition;
        expect(position?.position).toBe(0);
        expect(position?.percentage).toBe(0);
      });

      it("should reset fullscreen state", () => {
        useReaderStore.setState({ isFullscreen: true });
        useReaderStore.getState().openBook(testBook);
        expect(useReaderStore.getState().isFullscreen).toBe(false);
      });

      it("should reset TTS state", () => {
        useReaderStore.setState({ isTTSPlaying: true });
        useReaderStore.getState().openBook(testBook);
        expect(useReaderStore.getState().isTTSPlaying).toBe(false);
      });

      it("should clear selected text", () => {
        useReaderStore.setState({ selectedText: "some text" });
        useReaderStore.getState().openBook(testBook);
        expect(useReaderStore.getState().selectedText).toBeNull();
      });

      it("should validate book format", () => {
        useReaderStore.getState().openBook({
          ...testBook,
          format: "invalid" as never,
        });
        expect(useReaderStore.getState().currentBook?.format).toBe("txt");
      });
    });

    describe("closeBook", () => {
      beforeEach(() => {
        useReaderStore.setState({
          currentBook: {
            id: "book-1",
            title: "Test Book",
            format: "epub",
            totalPositions: 100,
          },
          currentPosition: createReadingPosition(50, 100),
          isFullscreen: true,
          isTTSPlaying: true,
          selectedText: "some text",
        });
      });

      it("should clear current book", () => {
        useReaderStore.getState().closeBook();
        expect(useReaderStore.getState().currentBook).toBeNull();
      });

      it("should clear current position", () => {
        useReaderStore.getState().closeBook();
        expect(useReaderStore.getState().currentPosition).toBeNull();
      });

      it("should reset fullscreen", () => {
        useReaderStore.getState().closeBook();
        expect(useReaderStore.getState().isFullscreen).toBe(false);
      });

      it("should stop TTS", () => {
        useReaderStore.getState().closeBook();
        expect(useReaderStore.getState().isTTSPlaying).toBe(false);
      });

      it("should clear selected text", () => {
        useReaderStore.getState().closeBook();
        expect(useReaderStore.getState().selectedText).toBeNull();
      });
    });

    describe("updatePosition", () => {
      beforeEach(() => {
        useReaderStore.setState({
          currentBook: {
            id: "book-1",
            title: "Test Book",
            format: "epub",
            totalPositions: 100,
          },
          currentPosition: createReadingPosition(0, 100),
        });
      });

      it("should update position", () => {
        useReaderStore.getState().updatePosition(50);
        expect(useReaderStore.getState().currentPosition?.position).toBe(50);
      });

      it("should update percentage", () => {
        useReaderStore.getState().updatePosition(50);
        expect(useReaderStore.getState().currentPosition?.percentage).toBe(50);
      });

      it("should include CFI when provided", () => {
        const cfi = "epubcfi(/6/2[chapter1]!/4/2/1:0)";
        useReaderStore.getState().updatePosition(50, cfi);
        expect(useReaderStore.getState().currentPosition?.cfi).toBe(cfi);
      });

      it("should do nothing when no book is open", () => {
        useReaderStore.setState({ currentBook: null });
        useReaderStore.getState().updatePosition(50);
        expect(useReaderStore.getState().currentPosition?.position).toBe(0);
      });

      it("should clamp position to valid range", () => {
        useReaderStore.getState().updatePosition(150);
        expect(useReaderStore.getState().currentPosition?.position).toBe(99);
      });
    });

    describe("setPosition", () => {
      it("should set position directly", () => {
        const position = {
          position: 50,
          percentage: 50,
          cfi: "test-cfi",
          lastUpdated: 12345,
        };
        useReaderStore.getState().setPosition(position);
        const state = useReaderStore.getState();
        expect(state.currentPosition?.position).toBe(50);
        expect(state.currentPosition?.cfi).toBe("test-cfi");
        // lastUpdated should be updated to current time
        expect(state.currentPosition?.lastUpdated).toBe(NOW);
      });
    });

    describe("nextPage", () => {
      beforeEach(() => {
        useReaderStore.setState({
          currentBook: {
            id: "book-1",
            title: "Test Book",
            format: "epub",
            totalPositions: 100,
          },
          currentPosition: createReadingPosition(50, 100),
        });
      });

      it("should increment position", () => {
        useReaderStore.getState().nextPage();
        expect(useReaderStore.getState().currentPosition?.position).toBe(51);
      });

      it("should not exceed total positions", () => {
        useReaderStore.setState({
          currentPosition: createReadingPosition(99, 100),
        });
        useReaderStore.getState().nextPage();
        expect(useReaderStore.getState().currentPosition?.position).toBe(99);
      });

      it("should do nothing when no book is open", () => {
        useReaderStore.setState({ currentBook: null });
        useReaderStore.getState().nextPage();
        expect(useReaderStore.getState().currentPosition?.position).toBe(50);
      });
    });

    describe("previousPage", () => {
      beforeEach(() => {
        useReaderStore.setState({
          currentBook: {
            id: "book-1",
            title: "Test Book",
            format: "epub",
            totalPositions: 100,
          },
          currentPosition: createReadingPosition(50, 100),
        });
      });

      it("should decrement position", () => {
        useReaderStore.getState().previousPage();
        expect(useReaderStore.getState().currentPosition?.position).toBe(49);
      });

      it("should not go below zero", () => {
        useReaderStore.setState({
          currentPosition: createReadingPosition(0, 100),
        });
        useReaderStore.getState().previousPage();
        expect(useReaderStore.getState().currentPosition?.position).toBe(0);
      });

      it("should do nothing when no book is open", () => {
        useReaderStore.setState({ currentBook: null });
        useReaderStore.getState().previousPage();
        expect(useReaderStore.getState().currentPosition?.position).toBe(50);
      });
    });

    describe("goToPercentage", () => {
      beforeEach(() => {
        useReaderStore.setState({
          currentBook: {
            id: "book-1",
            title: "Test Book",
            format: "epub",
            totalPositions: 100,
          },
          currentPosition: createReadingPosition(0, 100),
        });
      });

      it("should go to specified percentage", () => {
        useReaderStore.getState().goToPercentage(50);
        expect(useReaderStore.getState().currentPosition?.position).toBe(50);
      });

      it("should handle 0%", () => {
        useReaderStore.getState().goToPercentage(0);
        expect(useReaderStore.getState().currentPosition?.position).toBe(0);
      });

      it("should handle 100%", () => {
        useReaderStore.getState().goToPercentage(100);
        // 100% of 100 positions = position 100, but clamped to max valid position (99)
        expect(useReaderStore.getState().currentPosition?.position).toBe(99);
      });

      it("should clamp negative percentage", () => {
        useReaderStore.getState().goToPercentage(-10);
        expect(useReaderStore.getState().currentPosition?.position).toBe(0);
      });

      it("should clamp percentage over 100", () => {
        useReaderStore.getState().goToPercentage(150);
        // Position is clamped to max valid position (99)
        expect(useReaderStore.getState().currentPosition?.position).toBe(99);
      });

      it("should do nothing when no book is open", () => {
        useReaderStore.setState({ currentBook: null });
        useReaderStore.getState().goToPercentage(50);
        expect(useReaderStore.getState().currentPosition?.position).toBe(0);
      });
    });

    describe("updateSettings", () => {
      it("should update single setting", () => {
        useReaderStore.getState().updateSettings({ readingMode: "scroll" });
        expect(useReaderStore.getState().settings.readingMode).toBe("scroll");
      });

      it("should update multiple settings", () => {
        useReaderStore.getState().updateSettings({
          readingMode: "scroll",
          showPageNumbers: false,
          margins: 10,
        });
        const settings = useReaderStore.getState().settings;
        expect(settings.readingMode).toBe("scroll");
        expect(settings.showPageNumbers).toBe(false);
        expect(settings.margins).toBe(10);
      });

      it("should preserve other settings", () => {
        useReaderStore.getState().updateSettings({ readingMode: "scroll" });
        const settings = useReaderStore.getState().settings;
        expect(settings.readingMode).toBe("scroll");
        expect(settings.showProgressBar).toBe(true); // Default preserved
      });

      it("should validate settings", () => {
        useReaderStore.getState().updateSettings({
          margins: 50, // Over max
          autoScrollWpm: -100, // Under min
        });
        const settings = useReaderStore.getState().settings;
        expect(settings.margins).toBe(20); // Clamped to max
        expect(settings.autoScrollWpm).toBe(0); // Clamped to min
      });
    });

    describe("resetSettings", () => {
      it("should reset all settings to defaults", () => {
        useReaderStore.getState().updateSettings({
          readingMode: "scroll",
          showPageNumbers: false,
          bionicReadingEnabled: true,
          margins: 15,
        });
        useReaderStore.getState().resetSettings();
        expect(useReaderStore.getState().settings).toEqual(
          DEFAULT_READER_SETTINGS
        );
      });
    });

    describe("updateTypography", () => {
      it("should update single typography setting", () => {
        useReaderStore.getState().updateTypography({ fontFamily: "serif" });
        expect(useReaderStore.getState().settings.typography.fontFamily).toBe(
          "serif"
        );
      });

      it("should update multiple typography settings", () => {
        useReaderStore.getState().updateTypography({
          fontFamily: "serif",
          fontSize: 24,
          lineHeight: 2.0,
        });
        const typography = useReaderStore.getState().settings.typography;
        expect(typography.fontFamily).toBe("serif");
        expect(typography.fontSize).toBe(24);
        expect(typography.lineHeight).toBe(2.0);
      });

      it("should preserve other typography settings", () => {
        useReaderStore.getState().updateTypography({ fontFamily: "serif" });
        const typography = useReaderStore.getState().settings.typography;
        expect(typography.fontFamily).toBe("serif");
        expect(typography.fontSize).toBe(18); // Default preserved
        expect(typography.lineHeight).toBe(1.6); // Default preserved
      });

      it("should validate typography settings", () => {
        useReaderStore.getState().updateTypography({
          fontSize: 100, // Over max
          lineHeight: 10, // Over max
          letterSpacing: 1, // Over max
        });
        const typography = useReaderStore.getState().settings.typography;
        expect(typography.fontSize).toBe(32); // Clamped to max
        expect(typography.lineHeight).toBe(3.0); // Clamped to max
        expect(typography.letterSpacing).toBe(0.2); // Clamped to max
      });

      it("should not affect other reader settings", () => {
        useReaderStore.getState().updateSettings({
          readingMode: "scroll",
          margins: 10,
        });
        useReaderStore.getState().updateTypography({ fontFamily: "serif" });
        const settings = useReaderStore.getState().settings;
        expect(settings.readingMode).toBe("scroll");
        expect(settings.margins).toBe(10);
        expect(settings.typography.fontFamily).toBe("serif");
      });
    });

    describe("resetTypography", () => {
      it("should reset only typography settings to defaults", () => {
        // Modify both reader and typography settings
        useReaderStore.getState().updateSettings({
          readingMode: "scroll",
          margins: 15,
        });
        useReaderStore.getState().updateTypography({
          fontFamily: "serif",
          fontSize: 24,
          lineHeight: 2.0,
        });

        // Reset only typography
        useReaderStore.getState().resetTypography();

        // Verify typography is reset
        expect(useReaderStore.getState().settings.typography).toEqual(
          DEFAULT_TYPOGRAPHY_SETTINGS
        );

        // Verify other settings are preserved
        expect(useReaderStore.getState().settings.readingMode).toBe("scroll");
        expect(useReaderStore.getState().settings.margins).toBe(15);
      });
    });

    describe("fullscreen actions", () => {
      it("should toggle fullscreen", () => {
        useReaderStore.getState().toggleFullscreen();
        expect(useReaderStore.getState().isFullscreen).toBe(true);
        useReaderStore.getState().toggleFullscreen();
        expect(useReaderStore.getState().isFullscreen).toBe(false);
      });

      it("should set fullscreen directly", () => {
        useReaderStore.getState().setFullscreen(true);
        expect(useReaderStore.getState().isFullscreen).toBe(true);
        useReaderStore.getState().setFullscreen(false);
        expect(useReaderStore.getState().isFullscreen).toBe(false);
      });
    });

    describe("TTS actions", () => {
      it("should set TTS playing state", () => {
        useReaderStore.getState().setTTSPlaying(true);
        expect(useReaderStore.getState().isTTSPlaying).toBe(true);
        useReaderStore.getState().setTTSPlaying(false);
        expect(useReaderStore.getState().isTTSPlaying).toBe(false);
      });
    });

    describe("selected text actions", () => {
      it("should set selected text", () => {
        useReaderStore.getState().setSelectedText("Hello world");
        expect(useReaderStore.getState().selectedText).toBe("Hello world");
      });

      it("should set selected text to null", () => {
        useReaderStore.setState({ selectedText: "some text" });
        useReaderStore.getState().setSelectedText(null);
        expect(useReaderStore.getState().selectedText).toBeNull();
      });

      it("should clear selected text", () => {
        useReaderStore.setState({ selectedText: "some text" });
        useReaderStore.getState().clearSelectedText();
        expect(useReaderStore.getState().selectedText).toBeNull();
      });
    });
  });

  describe("real-world scenarios", () => {
    it("should handle complete reading session", () => {
      const store = useReaderStore.getState();

      // User opens a book
      store.openBook({
        id: "book-1",
        title: "Great Gatsby",
        format: "epub",
        totalPositions: 200,
        contentUrl: "https://example.com/gatsby.epub",
      });

      expect(useReaderStore.getState().currentBook?.title).toBe("Great Gatsby");
      expect(useReaderStore.getState().currentPosition?.position).toBe(0);

      // User reads and progresses through the book
      store.updatePosition(50, "epubcfi(/6/2[chapter1]!/4/2/1:0)");
      expect(useReaderStore.getState().currentPosition?.position).toBe(50);
      expect(useReaderStore.getState().currentPosition?.percentage).toBe(25);

      // User enters fullscreen for focused reading
      store.toggleFullscreen();
      expect(useReaderStore.getState().isFullscreen).toBe(true);

      // User selects text for annotation
      store.setSelectedText("In my younger and more vulnerable years");
      expect(useReaderStore.getState().selectedText).toBe(
        "In my younger and more vulnerable years"
      );

      // User clears selection after annotating
      store.clearSelectedText();
      expect(useReaderStore.getState().selectedText).toBeNull();

      // User finishes and closes the book
      store.closeBook();
      expect(useReaderStore.getState().currentBook).toBeNull();
    });

    it("should handle reader settings customization", () => {
      const store = useReaderStore.getState();

      // User prefers scroll mode
      store.updateSettings({ readingMode: "scroll" });

      // User enables bionic reading for better focus
      store.updateSettings({ bionicReadingEnabled: true });

      // User increases margins for comfortable reading
      store.updateSettings({ margins: 10 });

      // User sets custom width
      store.updateSettings({ maxWidth: 700 });

      const settings = useReaderStore.getState().settings;
      expect(settings.readingMode).toBe("scroll");
      expect(settings.bionicReadingEnabled).toBe(true);
      expect(settings.margins).toBe(10);
      expect(settings.maxWidth).toBe(700);
    });

    it("should handle TTS reading session", () => {
      const store = useReaderStore.getState();

      // Open book
      store.openBook({
        id: "book-1",
        title: "Audiobook Test",
        format: "epub",
        totalPositions: 100,
      });

      // Start TTS
      store.setTTSPlaying(true);
      expect(useReaderStore.getState().isTTSPlaying).toBe(true);

      // Position updates as TTS reads
      store.updatePosition(10);
      store.updatePosition(20);
      store.updatePosition(30);

      expect(useReaderStore.getState().currentPosition?.position).toBe(30);

      // Stop TTS
      store.setTTSPlaying(false);
      expect(useReaderStore.getState().isTTSPlaying).toBe(false);
    });

    it("should handle PDF book with different formats", () => {
      const store = useReaderStore.getState();

      // Open PDF
      store.openBook({
        id: "pdf-1",
        title: "Research Paper",
        format: "pdf",
        totalPositions: 50,
      });

      expect(useReaderStore.getState().currentBook?.format).toBe("pdf");

      // Navigate through pages
      store.nextPage();
      store.nextPage();
      expect(useReaderStore.getState().currentPosition?.position).toBe(2);

      // Jump to specific percentage
      store.goToPercentage(50);
      expect(useReaderStore.getState().currentPosition?.position).toBe(25);
    });
  });
});
