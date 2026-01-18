/**
 * Tests for reader store
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
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
      });
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
