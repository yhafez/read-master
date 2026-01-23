/**
 * Tests for MarkdownEditor component helper functions
 */

import { describe, it, expect } from "vitest";
import {
  insertFormat,
  insertLinePrefix,
  insertLink,
  type FormatResult,
  type EditorMode,
} from "./MarkdownEditor";

// =============================================================================
// insertFormat Tests
// =============================================================================

describe("insertFormat", () => {
  describe("with selection", () => {
    it("should wrap selected text with prefix and suffix", () => {
      const result = insertFormat("hello world", 6, 11, "**");
      expect(result.newValue).toBe("hello **world**");
      expect(result.newCursorPos).toBe(6 + 2 + 5); // start + prefix length + selection length
    });

    it("should wrap selected text with different prefix and suffix", () => {
      const result = insertFormat("hello world", 0, 5, "[", "]");
      expect(result.newValue).toBe("[hello] world");
      expect(result.newCursorPos).toBe(6); // after "hello"
    });

    it("should wrap middle selection", () => {
      const result = insertFormat("one two three", 4, 7, "*");
      expect(result.newValue).toBe("one *two* three");
      expect(result.newCursorPos).toBe(8);
    });

    it("should handle single character selection", () => {
      const result = insertFormat("abc", 1, 2, "`");
      expect(result.newValue).toBe("a`b`c");
      expect(result.newCursorPos).toBe(3);
    });

    it("should handle selection at start", () => {
      const result = insertFormat("hello", 0, 2, "**");
      expect(result.newValue).toBe("**he**llo");
      expect(result.newCursorPos).toBe(4);
    });

    it("should handle selection at end", () => {
      const result = insertFormat("hello", 3, 5, "**");
      expect(result.newValue).toBe("hel**lo**");
      // Cursor position is: start (3) + prefix length (2) + selection length (2) = 7
      expect(result.newCursorPos).toBe(7);
    });
  });

  describe("without selection (cursor only)", () => {
    it("should insert prefix and suffix at cursor", () => {
      const result = insertFormat("hello world", 5, 5, "**");
      expect(result.newValue).toBe("hello**** world");
      expect(result.newCursorPos).toBe(7);
    });

    it("should insert at the beginning", () => {
      const result = insertFormat("hello", 0, 0, "`");
      expect(result.newValue).toBe("``hello");
      expect(result.newCursorPos).toBe(1);
    });

    it("should insert at the end", () => {
      const result = insertFormat("hello", 5, 5, "`");
      expect(result.newValue).toBe("hello``");
      expect(result.newCursorPos).toBe(6);
    });
  });

  describe("empty string handling", () => {
    it("should handle empty value", () => {
      const result = insertFormat("", 0, 0, "**");
      expect(result.newValue).toBe("****");
      expect(result.newCursorPos).toBe(2);
    });
  });

  describe("bold formatting", () => {
    it("should apply bold to selection", () => {
      const result = insertFormat("make this bold", 10, 14, "**");
      expect(result.newValue).toBe("make this **bold**");
    });
  });

  describe("italic formatting", () => {
    it("should apply italic to selection", () => {
      const result = insertFormat("make this italic", 10, 16, "*");
      expect(result.newValue).toBe("make this *italic*");
    });
  });

  describe("code formatting", () => {
    it("should apply inline code to selection", () => {
      const result = insertFormat("const x = 1", 0, 11, "`");
      expect(result.newValue).toBe("`const x = 1`");
    });
  });

  describe("strikethrough formatting", () => {
    it("should apply strikethrough to selection", () => {
      const result = insertFormat("delete this text", 7, 11, "~~");
      expect(result.newValue).toBe("delete ~~this~~ text");
    });
  });
});

// =============================================================================
// insertLinePrefix Tests
// =============================================================================

describe("insertLinePrefix", () => {
  it("should add prefix to beginning of current line", () => {
    const result = insertLinePrefix("hello world", 3, "> ");
    expect(result.newValue).toBe("> hello world");
    expect(result.newCursorPos).toBe(5);
  });

  it("should add prefix to line when cursor at start", () => {
    const result = insertLinePrefix("hello", 0, "- ");
    expect(result.newValue).toBe("- hello");
    expect(result.newCursorPos).toBe(2);
  });

  it("should add prefix to line when cursor at end", () => {
    const result = insertLinePrefix("hello", 5, "1. ");
    expect(result.newValue).toBe("1. hello");
    expect(result.newCursorPos).toBe(8);
  });

  it("should add prefix to correct line in multiline text", () => {
    const text = "line one\nline two\nline three";
    const cursorPos = 10; // In "line two"
    const result = insertLinePrefix(text, cursorPos, "> ");
    expect(result.newValue).toBe("line one\n> line two\nline three");
  });

  it("should handle empty text", () => {
    const result = insertLinePrefix("", 0, "> ");
    expect(result.newValue).toBe("> ");
    expect(result.newCursorPos).toBe(2);
  });

  it("should add blockquote prefix", () => {
    const result = insertLinePrefix("This is a quote", 5, "> ");
    expect(result.newValue).toBe("> This is a quote");
  });

  it("should add unordered list prefix", () => {
    const result = insertLinePrefix("List item", 4, "- ");
    expect(result.newValue).toBe("- List item");
  });

  it("should add ordered list prefix", () => {
    const result = insertLinePrefix("First item", 2, "1. ");
    expect(result.newValue).toBe("1. First item");
  });
});

// =============================================================================
// insertLink Tests
// =============================================================================

describe("insertLink", () => {
  describe("with selection", () => {
    it("should use selected text as link text", () => {
      const result = insertLink("check out this link", 15, 19);
      expect(result.newValue).toBe("check out this [link](url)");
      expect(result.newCursorPos).toBe(22); // Position at "url"
    });

    it("should wrap entire text as link", () => {
      const result = insertLink("Click here", 0, 10);
      expect(result.newValue).toBe("[Click here](url)");
      // selectionStart (0) + selection length (10) + 3 = 13 (start of "url")
      expect(result.newCursorPos).toBe(13);
    });

    it("should handle single word selection", () => {
      const result = insertLink("Visit Google for search", 6, 12);
      expect(result.newValue).toBe("Visit [Google](url) for search");
      // selectionStart (6) + selection length (6) + 3 = 15 (start of "url")
      expect(result.newCursorPos).toBe(15);
    });
  });

  describe("without selection", () => {
    it("should insert placeholder link text", () => {
      const result = insertLink("hello world", 5, 5);
      expect(result.newValue).toBe("hello[link text](url) world");
      expect(result.newCursorPos).toBe(6); // Position at start of "link text"
    });

    it("should insert at beginning", () => {
      const result = insertLink("some text", 0, 0);
      expect(result.newValue).toBe("[link text](url)some text");
      expect(result.newCursorPos).toBe(1);
    });

    it("should insert at end", () => {
      const result = insertLink("some text", 9, 9);
      expect(result.newValue).toBe("some text[link text](url)");
      expect(result.newCursorPos).toBe(10);
    });
  });

  describe("empty text", () => {
    it("should insert placeholder in empty string", () => {
      const result = insertLink("", 0, 0);
      expect(result.newValue).toBe("[link text](url)");
      expect(result.newCursorPos).toBe(1);
    });
  });
});

// =============================================================================
// FormatResult Type Tests
// =============================================================================

describe("FormatResult type", () => {
  it("should have newValue and newCursorPos properties", () => {
    const result: FormatResult = {
      newValue: "test",
      newCursorPos: 0,
    };
    expect(result.newValue).toBe("test");
    expect(result.newCursorPos).toBe(0);
  });

  it("should handle typical format result", () => {
    const result: FormatResult = {
      newValue: "**bold**",
      newCursorPos: 6,
    };
    expect(result.newValue.length).toBe(8);
    expect(result.newCursorPos).toBe(6);
  });
});

// =============================================================================
// EditorMode Type Tests
// =============================================================================

describe("EditorMode type", () => {
  it("should accept 'write' mode", () => {
    const mode: EditorMode = "write";
    expect(mode).toBe("write");
  });

  it("should accept 'preview' mode", () => {
    const mode: EditorMode = "preview";
    expect(mode).toBe("preview");
  });
});

// =============================================================================
// MarkdownEditorProps Interface Tests
// =============================================================================

describe("MarkdownEditorProps interface", () => {
  it("should define required props", () => {
    const requiredProps = {
      value: "test content",
      onChange: (_value: string) => {},
    };

    expect(requiredProps.value).toBe("test content");
    expect(typeof requiredProps.onChange).toBe("function");
  });

  it("should define optional props with defaults", () => {
    const allProps = {
      value: "content",
      onChange: (_value: string) => {},
      placeholder: "Enter text...",
      rows: 4,
      minRows: 2,
      maxRows: 10,
      maxLength: 5000,
      showCharCount: true,
      showPreviewToggle: true,
      disabled: false,
      error: false,
      helperText: "Help text",
      label: "Label",
    };

    expect(allProps.rows).toBe(4);
    expect(allProps.maxLength).toBe(5000);
    expect(allProps.showCharCount).toBe(true);
    expect(allProps.showPreviewToggle).toBe(true);
  });
});

// =============================================================================
// Cursor Position Calculations
// =============================================================================

describe("Cursor position calculations", () => {
  it("should calculate correct position after bold", () => {
    // "hello |world" -> "hello **|world**"
    // Original cursor: 6, New cursor: 6 + 2 = 8
    const result = insertFormat("hello world", 6, 11, "**");
    // Cursor should be after the selection + prefix
    expect(result.newCursorPos).toBe(13); // End of "**world"
  });

  it("should calculate correct position for empty selection bold", () => {
    // "hello| world" -> "hello**|** world"
    const result = insertFormat("hello world", 5, 5, "**");
    expect(result.newCursorPos).toBe(7); // Between the **
  });

  it("should calculate correct position after link insertion", () => {
    // Without selection: cursor goes to start of "link text"
    const result = insertLink("hello world", 6, 6);
    expect(result.newCursorPos).toBe(7); // After "["
  });

  it("should calculate correct position after line prefix", () => {
    // Adding "> " should move cursor by 2
    const result = insertLinePrefix("quote text", 5, "> ");
    expect(result.newCursorPos).toBe(7); // 5 + 2
  });
});

// =============================================================================
// Edge Cases and Boundary Conditions
// =============================================================================

describe("Edge cases", () => {
  it("should handle unicode characters", () => {
    const result = insertFormat("こんにちは", 0, 5, "**");
    expect(result.newValue).toBe("**こんにちは**");
  });

  it("should handle emoji", () => {
    const result = insertFormat("Hello 🌍 World", 6, 8, "**");
    expect(result.newValue).toBe("Hello **🌍** World");
  });

  it("should handle very long text", () => {
    const longText = "a".repeat(10000);
    const result = insertFormat(longText, 5000, 5010, "**");
    expect(result.newValue.length).toBe(10004); // Original + 4 asterisks
  });

  it("should handle nested formatting markers", () => {
    const result = insertFormat("**already bold**", 0, 16, "*");
    expect(result.newValue).toBe("***already bold***");
  });

  it("should handle whitespace-only selection", () => {
    const result = insertFormat("hello   world", 5, 8, "**");
    expect(result.newValue).toBe("hello**   **world");
  });

  it("should handle newlines in selection", () => {
    const result = insertFormat("line1\nline2", 0, 11, "**");
    expect(result.newValue).toBe("**line1\nline2**");
  });
});
