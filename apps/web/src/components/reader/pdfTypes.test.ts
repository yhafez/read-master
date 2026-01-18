/**
 * Tests for PDF reader types and utilities
 */

import { describe, it, expect } from "vitest";
import {
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
import type {
  PdfLocation,
  PdfTextSelection,
  PdfReaderState,
  PdfReaderProps,
  PdfErrorType,
} from "./pdfTypes";

describe("INITIAL_PDF_READER_STATE", () => {
  it("should have correct default values", () => {
    expect(INITIAL_PDF_READER_STATE.isLoaded).toBe(false);
    expect(INITIAL_PDF_READER_STATE.hasError).toBe(false);
    expect(INITIAL_PDF_READER_STATE.errorMessage).toBeNull();
    expect(INITIAL_PDF_READER_STATE.location).toBeNull();
    expect(INITIAL_PDF_READER_STATE.selection).toBeNull();
    expect(INITIAL_PDF_READER_STATE.scale).toBe(1.0);
    expect(INITIAL_PDF_READER_STATE.canGoNext).toBe(false);
    expect(INITIAL_PDF_READER_STATE.canGoPrev).toBe(false);
  });

  it("should be immutable by default when used", () => {
    const state = { ...INITIAL_PDF_READER_STATE };
    state.isLoaded = true;
    expect(INITIAL_PDF_READER_STATE.isLoaded).toBe(false);
  });
});

describe("ZOOM_PRESETS", () => {
  it("should have expected zoom values", () => {
    expect(ZOOM_PRESETS.ZOOM_50).toBe(0.5);
    expect(ZOOM_PRESETS.ZOOM_75).toBe(0.75);
    expect(ZOOM_PRESETS.ZOOM_100).toBe(1.0);
    expect(ZOOM_PRESETS.ZOOM_125).toBe(1.25);
    expect(ZOOM_PRESETS.ZOOM_150).toBe(1.5);
    expect(ZOOM_PRESETS.ZOOM_200).toBe(2.0);
  });

  it("should have special fit modes", () => {
    expect(ZOOM_PRESETS.FIT_PAGE).toBe("fit-page");
    expect(ZOOM_PRESETS.FIT_WIDTH).toBe("fit-width");
  });

  it("should have ACTUAL_SIZE equal to 1.0", () => {
    expect(ZOOM_PRESETS.ACTUAL_SIZE).toBe(1.0);
  });
});

describe("zoom constants", () => {
  it("should have valid MIN_ZOOM", () => {
    expect(MIN_ZOOM).toBe(0.25);
    expect(MIN_ZOOM).toBeGreaterThan(0);
  });

  it("should have valid MAX_ZOOM", () => {
    expect(MAX_ZOOM).toBe(4.0);
    expect(MAX_ZOOM).toBeGreaterThan(MIN_ZOOM);
  });

  it("should have valid ZOOM_STEP", () => {
    expect(ZOOM_STEP).toBe(0.25);
    expect(ZOOM_STEP).toBeGreaterThan(0);
  });
});

describe("createPdfError", () => {
  it("should create error with correct name and message", () => {
    const error = createPdfError("load_failed", "Test message");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("load_failed");
    expect(error.message).toBe("Test message");
  });

  it("should create errors for all error types", () => {
    const errorTypes: PdfErrorType[] = [
      "load_failed",
      "render_failed",
      "navigation_failed",
      "invalid_url",
      "password_required",
      "corrupted_file",
    ];

    errorTypes.forEach((type) => {
      const error = createPdfError(type, `${type} message`);
      expect(error.name).toBe(type);
      expect(error.message).toBe(`${type} message`);
    });
  });
});

describe("getPdfErrorMessage", () => {
  it("should return correct message for load_failed", () => {
    const error = createPdfError("load_failed", "original");
    expect(getPdfErrorMessage(error)).toBe(
      "Failed to load the PDF. Please try again."
    );
  });

  it("should return correct message for render_failed", () => {
    const error = createPdfError("render_failed", "original");
    expect(getPdfErrorMessage(error)).toBe("Failed to render the PDF page.");
  });

  it("should return correct message for navigation_failed", () => {
    const error = createPdfError("navigation_failed", "original");
    expect(getPdfErrorMessage(error)).toBe(
      "Failed to navigate to the requested page."
    );
  });

  it("should return correct message for invalid_url", () => {
    const error = createPdfError("invalid_url", "original");
    expect(getPdfErrorMessage(error)).toBe("Invalid PDF URL provided.");
  });

  it("should return correct message for password_required", () => {
    const error = createPdfError("password_required", "original");
    expect(getPdfErrorMessage(error)).toBe("This PDF is password protected.");
  });

  it("should return correct message for corrupted_file", () => {
    const error = createPdfError("corrupted_file", "original");
    expect(getPdfErrorMessage(error)).toBe(
      "The PDF file appears to be corrupted."
    );
  });

  it("should handle password-related errors in message", () => {
    const error = new Error("The PDF requires a password");
    expect(getPdfErrorMessage(error)).toBe("This PDF is password protected.");
  });

  it("should handle invalid PDF errors in message", () => {
    const error = new Error("Invalid PDF structure");
    expect(getPdfErrorMessage(error)).toBe(
      "The PDF file appears to be invalid or corrupted."
    );
  });

  it("should return original message for unknown errors", () => {
    const error = new Error("Custom error message");
    expect(getPdfErrorMessage(error)).toBe("Custom error message");
  });

  it("should return default message for errors without message", () => {
    const error = new Error("");
    expect(getPdfErrorMessage(error)).toBe("An unknown error occurred.");
  });

  it("should return default message for non-Error values", () => {
    expect(getPdfErrorMessage("string error")).toBe(
      "An unknown error occurred."
    );
    expect(getPdfErrorMessage(null)).toBe("An unknown error occurred.");
    expect(getPdfErrorMessage(undefined)).toBe("An unknown error occurred.");
    expect(getPdfErrorMessage(123)).toBe("An unknown error occurred.");
  });
});

describe("validatePdfUrl", () => {
  it("should accept valid http URLs", () => {
    expect(validatePdfUrl("http://example.com/file.pdf")).toBe(true);
    expect(validatePdfUrl("http://localhost:3000/api/books/123/content")).toBe(
      true
    );
  });

  it("should accept valid https URLs", () => {
    expect(validatePdfUrl("https://example.com/file.pdf")).toBe(true);
    expect(validatePdfUrl("https://api.example.com/documents/abc.pdf")).toBe(
      true
    );
  });

  it("should accept blob URLs", () => {
    expect(validatePdfUrl("blob:https://example.com/12345")).toBe(true);
    expect(validatePdfUrl("blob:http://localhost/abcdef")).toBe(true);
  });

  it("should accept relative URLs (resolved against base)", () => {
    expect(validatePdfUrl("/api/books/123/content")).toBe(true);
    expect(validatePdfUrl("./documents/file.pdf")).toBe(true);
    expect(validatePdfUrl("files/book.pdf")).toBe(true);
  });

  it("should reject empty strings", () => {
    expect(validatePdfUrl("")).toBe(false);
  });

  it("should reject null and undefined", () => {
    expect(validatePdfUrl(null as unknown as string)).toBe(false);
    expect(validatePdfUrl(undefined as unknown as string)).toBe(false);
  });

  it("should reject non-string values", () => {
    expect(validatePdfUrl(123 as unknown as string)).toBe(false);
    expect(validatePdfUrl({} as unknown as string)).toBe(false);
    expect(validatePdfUrl([] as unknown as string)).toBe(false);
  });

  it("should reject file:// URLs", () => {
    expect(validatePdfUrl("file:///path/to/file.pdf")).toBe(false);
  });

  it("should reject javascript: URLs", () => {
    expect(validatePdfUrl("javascript:alert(1)")).toBe(false);
  });

  it("should reject data: URLs", () => {
    expect(validatePdfUrl("data:application/pdf;base64,JVBERi0")).toBe(false);
  });
});

describe("clampZoom", () => {
  it("should return value within range unchanged", () => {
    expect(clampZoom(1.0)).toBe(1.0);
    expect(clampZoom(0.5)).toBe(0.5);
    expect(clampZoom(2.0)).toBe(2.0);
  });

  it("should clamp values below MIN_ZOOM", () => {
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(-1)).toBe(MIN_ZOOM);
  });

  it("should clamp values above MAX_ZOOM", () => {
    expect(clampZoom(5.0)).toBe(MAX_ZOOM);
    expect(clampZoom(10.0)).toBe(MAX_ZOOM);
    expect(clampZoom(100)).toBe(MAX_ZOOM);
  });

  it("should handle edge cases at boundaries", () => {
    expect(clampZoom(MIN_ZOOM)).toBe(MIN_ZOOM);
    expect(clampZoom(MAX_ZOOM)).toBe(MAX_ZOOM);
  });
});

describe("calculateFitWidthZoom", () => {
  it("should calculate correct zoom for normal dimensions", () => {
    // Page is 600px wide, container is 800px, padding is 40
    // Available width = 800 - 40 = 760
    // Zoom = 760 / 600 = 1.266...
    const zoom = calculateFitWidthZoom(600, 800, 40);
    expect(zoom).toBeCloseTo(1.266, 2);
  });

  it("should use default padding when not provided", () => {
    const zoom = calculateFitWidthZoom(600, 800);
    expect(zoom).toBeCloseTo(1.266, 2);
  });

  it("should clamp to MAX_ZOOM for small pages", () => {
    // Page is 100px, container is 2000px
    // Would be 19.6x but should clamp to MAX_ZOOM
    const zoom = calculateFitWidthZoom(100, 2000, 40);
    expect(zoom).toBe(MAX_ZOOM);
  });

  it("should clamp to MIN_ZOOM for large pages", () => {
    // Page is 10000px, container is 500px
    // Would be 0.046x but should clamp to MIN_ZOOM
    const zoom = calculateFitWidthZoom(10000, 500, 40);
    expect(zoom).toBe(MIN_ZOOM);
  });

  it("should return 1.0 for zero or negative container width", () => {
    expect(calculateFitWidthZoom(600, 0, 40)).toBe(1.0);
    expect(calculateFitWidthZoom(600, -100, 40)).toBe(1.0);
  });

  it("should return 1.0 for zero or negative page width", () => {
    expect(calculateFitWidthZoom(0, 800, 40)).toBe(1.0);
    expect(calculateFitWidthZoom(-100, 800, 40)).toBe(1.0);
  });

  it("should return 1.0 when padding exceeds container", () => {
    expect(calculateFitWidthZoom(600, 30, 40)).toBe(1.0);
  });
});

describe("calculateFitPageZoom", () => {
  it("should fit by width when height ratio is larger", () => {
    // Page: 600x800, Container: 800x1200 (after padding: 760x1160)
    // Width ratio: 760/600 = 1.266
    // Height ratio: 1160/800 = 1.45
    // Should use width ratio (smaller)
    const zoom = calculateFitPageZoom(600, 800, 800, 1200, 40);
    expect(zoom).toBeCloseTo(1.266, 2);
  });

  it("should fit by height when width ratio is larger", () => {
    // Page: 600x400, Container: 1200x500 (after padding: 1160x460)
    // Width ratio: 1160/600 = 1.933
    // Height ratio: 460/400 = 1.15
    // Should use height ratio (smaller)
    const zoom = calculateFitPageZoom(600, 400, 1200, 500, 40);
    expect(zoom).toBeCloseTo(1.15, 2);
  });

  it("should use default padding when not provided", () => {
    const zoom = calculateFitPageZoom(600, 800, 800, 1200);
    expect(zoom).toBeCloseTo(1.266, 2);
  });

  it("should clamp to valid range", () => {
    // Very small page
    const zoomSmall = calculateFitPageZoom(10, 10, 1000, 1000, 40);
    expect(zoomSmall).toBe(MAX_ZOOM);

    // Very large page
    const zoomLarge = calculateFitPageZoom(10000, 10000, 500, 500, 40);
    expect(zoomLarge).toBe(MIN_ZOOM);
  });

  it("should return 1.0 for invalid dimensions", () => {
    expect(calculateFitPageZoom(0, 800, 800, 1200)).toBe(1.0);
    expect(calculateFitPageZoom(600, 0, 800, 1200)).toBe(1.0);
    expect(calculateFitPageZoom(600, 800, 0, 1200)).toBe(1.0);
    expect(calculateFitPageZoom(600, 800, 800, 0)).toBe(1.0);
    expect(calculateFitPageZoom(-1, 800, 800, 1200)).toBe(1.0);
  });
});

describe("formatZoomPercent", () => {
  it("should format 1.0 as 100%", () => {
    expect(formatZoomPercent(1.0)).toBe("100%");
  });

  it("should format 0.5 as 50%", () => {
    expect(formatZoomPercent(0.5)).toBe("50%");
  });

  it("should format 2.0 as 200%", () => {
    expect(formatZoomPercent(2.0)).toBe("200%");
  });

  it("should round to nearest integer", () => {
    expect(formatZoomPercent(0.333)).toBe("33%");
    expect(formatZoomPercent(0.666)).toBe("67%");
    // 1.255 * 100 = 125.5, Math.round(125.5) = 126 in theory
    // But floating point: 1.255 * 100 = 125.49999... so rounds to 125
    expect(formatZoomPercent(1.255)).toBe("125%");
  });

  it("should handle edge values", () => {
    expect(formatZoomPercent(MIN_ZOOM)).toBe("25%");
    expect(formatZoomPercent(MAX_ZOOM)).toBe("400%");
  });
});

describe("Type definitions", () => {
  it("PdfLocation should have required fields", () => {
    const location: PdfLocation = {
      pageNumber: 1,
      totalPages: 100,
      percentage: 0.5,
    };
    expect(location.pageNumber).toBe(1);
    expect(location.totalPages).toBe(100);
    expect(location.percentage).toBe(0.5);
  });

  it("PdfTextSelection should have required fields", () => {
    const selection: PdfTextSelection = {
      text: "Selected text",
      pageNumber: 5,
      position: { x: 100, y: 200 },
    };
    expect(selection.text).toBe("Selected text");
    expect(selection.pageNumber).toBe(5);
    expect(selection.position.x).toBe(100);
    expect(selection.position.y).toBe(200);
  });

  it("PdfReaderState should match INITIAL_PDF_READER_STATE structure", () => {
    const state: PdfReaderState = {
      isLoaded: true,
      hasError: false,
      errorMessage: null,
      location: { pageNumber: 1, totalPages: 10, percentage: 0 },
      selection: null,
      scale: 1.0,
      canGoNext: true,
      canGoPrev: false,
    };
    expect(Object.keys(state)).toEqual(Object.keys(INITIAL_PDF_READER_STATE));
  });

  it("PdfReaderProps should support optional callbacks", () => {
    const minimalProps: PdfReaderProps = {
      url: "https://example.com/test.pdf",
    };
    expect(minimalProps.url).toBe("https://example.com/test.pdf");
    expect(minimalProps.initialPage).toBeUndefined();
    expect(minimalProps.onLocationChange).toBeUndefined();

    const fullProps: PdfReaderProps = {
      url: "https://example.com/test.pdf",
      initialPage: 5,
      initialScale: 1.5,
      onLocationChange: () => {},
      onTextSelect: () => {},
      onError: () => {},
      onLoad: () => {},
    };
    expect(fullProps.initialPage).toBe(5);
    expect(fullProps.initialScale).toBe(1.5);
  });
});

describe("Edge cases", () => {
  it("should handle very small zoom values in clampZoom", () => {
    expect(clampZoom(0.0001)).toBe(MIN_ZOOM);
    expect(clampZoom(Number.MIN_VALUE)).toBe(MIN_ZOOM);
  });

  it("should handle very large zoom values in clampZoom", () => {
    expect(clampZoom(1000000)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.MAX_VALUE)).toBe(MAX_ZOOM);
  });

  it("should handle NaN in clampZoom", () => {
    // NaN propagates through Math.max/min operations
    const result = clampZoom(NaN);
    expect(Number.isNaN(result)).toBe(true);
  });

  it("should handle Infinity in clampZoom", () => {
    expect(clampZoom(Infinity)).toBe(MAX_ZOOM);
    expect(clampZoom(-Infinity)).toBe(MIN_ZOOM);
  });

  it("should handle URL with special characters", () => {
    expect(validatePdfUrl("https://example.com/file%20name.pdf")).toBe(true);
    expect(validatePdfUrl("https://example.com/file?id=123&type=pdf")).toBe(
      true
    );
  });

  it("should handle zoom formatting with 0", () => {
    expect(formatZoomPercent(0)).toBe("0%");
  });

  it("should handle zoom formatting with very small numbers", () => {
    expect(formatZoomPercent(0.001)).toBe("0%");
    expect(formatZoomPercent(0.004)).toBe("0%");
    expect(formatZoomPercent(0.005)).toBe("1%");
  });
});
