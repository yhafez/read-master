import { describe, it, expect } from "vitest";
import { truncate, toTitleCase, slugify, stripHtml } from "./string";

describe("truncate", () => {
  it("should return the original string if it is shorter than maxLength", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("should truncate the string and add ellipsis when longer than maxLength", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("should use custom suffix when provided", () => {
    expect(truncate("hello world", 9, "…")).toBe("hello wo…");
  });

  it("should handle empty string", () => {
    expect(truncate("", 10)).toBe("");
  });

  it("should handle string equal to maxLength", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("toTitleCase", () => {
  it("should convert lowercase string to title case", () => {
    expect(toTitleCase("hello world")).toBe("Hello World");
  });

  it("should convert uppercase string to title case", () => {
    expect(toTitleCase("HELLO WORLD")).toBe("Hello World");
  });

  it("should handle single word", () => {
    expect(toTitleCase("hello")).toBe("Hello");
  });

  it("should handle empty string", () => {
    expect(toTitleCase("")).toBe("");
  });
});

describe("slugify", () => {
  it("should convert string to URL-friendly slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("should remove special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("should handle multiple spaces and hyphens", () => {
    expect(slugify("Hello   World--Test")).toBe("hello-world-test");
  });

  it("should trim leading and trailing hyphens", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  it("should handle empty string", () => {
    expect(slugify("")).toBe("");
  });
});

describe("stripHtml", () => {
  it("should remove HTML tags from string", () => {
    expect(stripHtml("<p>Hello</p>")).toBe("Hello");
  });

  it("should handle multiple tags", () => {
    expect(stripHtml("<div><p>Hello</p><span>World</span></div>")).toBe(
      "HelloWorld"
    );
  });

  it("should handle self-closing tags", () => {
    expect(stripHtml("Hello<br/>World")).toBe("HelloWorld");
  });

  it("should handle empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("should handle string without HTML", () => {
    expect(stripHtml("Hello World")).toBe("Hello World");
  });
});
