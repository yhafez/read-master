/**
 * Translation Utilities
 *
 * Language detection and segment matching for translation comparison.
 */

import type {
  SegmentPair,
  TranslationAlignment,
} from "@/stores/useTranslationStore";

// ============================================================================
// Language Detection
// ============================================================================

/**
 * Detect the language of a text using character patterns and common words
 */
export function detectLanguage(text: string): string {
  const sample = text.slice(0, 1000).toLowerCase();

  // Arabic detection
  if (/[\u0600-\u06FF]/.test(sample)) {
    return "ar";
  }

  // Chinese detection
  if (/[\u4E00-\u9FFF]/.test(sample)) {
    return "zh";
  }

  // Japanese detection
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(sample)) {
    return "ja";
  }

  // Korean detection
  if (/[\uAC00-\uD7AF]/.test(sample)) {
    return "ko";
  }

  // Russian detection
  if (/[\u0400-\u04FF]/.test(sample)) {
    return "ru";
  }

  // Greek detection
  if (/[\u0370-\u03FF]/.test(sample)) {
    return "el";
  }

  // Hebrew detection
  if (/[\u0590-\u05FF]/.test(sample)) {
    return "he";
  }

  // French detection (common French words)
  const frenchWords = [
    "le",
    "la",
    "les",
    "de",
    "et",
    "un",
    "une",
    "dans",
    "pour",
  ];
  if (frenchWords.some((word) => sample.includes(` ${word} `))) {
    return "fr";
  }

  // Spanish detection
  const spanishWords = ["el", "la", "los", "las", "de", "y", "en", "que"];
  if (spanishWords.some((word) => sample.includes(` ${word} `))) {
    return "es";
  }

  // German detection
  const germanWords = ["der", "die", "das", "und", "ist", "für", "von"];
  if (germanWords.some((word) => sample.includes(` ${word} `))) {
    return "de";
  }

  // Italian detection
  const italianWords = ["il", "la", "lo", "gli", "di", "e", "che", "per"];
  if (italianWords.some((word) => sample.includes(` ${word} `))) {
    return "it";
  }

  // Default to English
  return "en";
}

/**
 * Get language name from code
 */
export function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    ar: "Arabic",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ru: "Russian",
    el: "Greek",
    he: "Hebrew",
    fr: "French",
    es: "Spanish",
    de: "German",
    it: "Italian",
    en: "English",
  };
  return names[code] || code.toUpperCase();
}

// ============================================================================
// Text Segmentation
// ============================================================================

/**
 * Split text into paragraphs
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Split text into sentences
 */
export function splitIntoSentences(text: string): string[] {
  // Simple sentence splitting (can be improved)
  return text
    .split(/[.!?]+\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ============================================================================
// Segment Matching
// ============================================================================

/**
 * Calculate similarity based on length ratio
 */
function calculateLengthSimilarity(len1: number, len2: number): number {
  const ratio = Math.min(len1, len2) / Math.max(len1, len2);
  return ratio;
}

/**
 * Match segments between original and translation
 */
export function matchSegments(
  originalSegments: string[],
  translatedSegments: string[],
  alignment: TranslationAlignment
): SegmentPair[] {
  const pairs: SegmentPair[] = [];

  if (alignment === "paragraph" || alignment === "sentence") {
    // Try to match segments by position and length similarity
    const minLength = Math.min(
      originalSegments.length,
      translatedSegments.length
    );

    for (let i = 0; i < minLength; i++) {
      const originalText = originalSegments[i] || "";
      const translatedText = translatedSegments[i] || "";

      // Calculate confidence based on length similarity
      const lengthSimilarity = calculateLengthSimilarity(
        originalText.length,
        translatedText.length
      );

      pairs.push({
        id: `segment-${i}`,
        originalText,
        translatedText,
        originalStart: i,
        originalEnd: i + 1,
        translatedStart: i,
        translatedEnd: i + 1,
        confidence: lengthSimilarity,
      });
    }

    // If there are more segments in one text, try to match remaining ones
    if (originalSegments.length > minLength) {
      for (let i = minLength; i < originalSegments.length; i++) {
        pairs.push({
          id: `segment-${i}`,
          originalText: originalSegments[i] || "",
          translatedText: "",
          originalStart: i,
          originalEnd: i + 1,
          translatedStart: -1,
          translatedEnd: -1,
          confidence: 0,
        });
      }
    } else if (translatedSegments.length > minLength) {
      for (let i = minLength; i < translatedSegments.length; i++) {
        pairs.push({
          id: `segment-${i}`,
          originalText: "",
          translatedText: translatedSegments[i] || "",
          originalStart: -1,
          originalEnd: -1,
          translatedStart: i,
          translatedEnd: i + 1,
          confidence: 0,
        });
      }
    }
  }

  return pairs;
}

/**
 * Find the best matching segment in translation for a given original segment
 */
export function findBestMatch(
  originalSegment: string,
  translatedSegments: string[],
  startIndex = 0,
  windowSize = 5
): { index: number; confidence: number } {
  let bestIndex = startIndex;
  let bestConfidence = 0;

  const endIndex = Math.min(startIndex + windowSize, translatedSegments.length);

  for (let i = startIndex; i < endIndex; i++) {
    const segment = translatedSegments[i];
    if (!segment) continue;

    const lengthSimilarity = calculateLengthSimilarity(
      originalSegment.length,
      segment.length
    );

    if (lengthSimilarity > bestConfidence) {
      bestConfidence = lengthSimilarity;
      bestIndex = i;
    }
  }

  return { index: bestIndex, confidence: bestConfidence };
}

// ============================================================================
// Highlighting
// ============================================================================

/**
 * Get highlight style for a segment based on confidence
 */
export function getHighlightStyle(
  confidence: number,
  baseColor: string
): Record<string, string> {
  const opacity = Math.max(0.2, Math.min(0.8, confidence));

  return {
    backgroundColor: `${baseColor}${Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0")}`,
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  };
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "High";
  if (confidence >= 0.7) return "Medium";
  if (confidence >= 0.5) return "Low";
  return "Very Low";
}

/**
 * Get confidence color
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "#4caf50";
  if (confidence >= 0.7) return "#ff9800";
  if (confidence >= 0.5) return "#f44336";
  return "#9e9e9e";
}
