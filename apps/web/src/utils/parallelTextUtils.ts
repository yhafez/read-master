/**
 * Parallel Text Utilities
 *
 * Precise line-by-line alignment for parallel text comparison.
 */

// ============================================================================
// Types
// ============================================================================

export type AlignmentStrategy = "line" | "paragraph" | "sentence" | "auto";

export type ParallelLine = {
  id: string;
  leftText: string;
  rightText: string;
  leftLineNumber: number;
  rightLineNumber: number;
  confidence: number;
  type: "aligned" | "leftOnly" | "rightOnly";
};

export type ParallelAlignment = {
  lines: ParallelLine[];
  strategy: AlignmentStrategy;
  totalLines: {
    left: number;
    right: number;
  };
};

// ============================================================================
// Text Normalization
// ============================================================================

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/**
 * Calculate text similarity (0-1)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0;

  // Use length ratio as a simple similarity metric
  const lengthRatio =
    Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);

  // Use word overlap for additional confidence
  const words1 = new Set(norm1.split(" "));
  const words2 = new Set(norm2.split(" "));
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const wordOverlap = intersection.size / Math.max(words1.size, words2.size);

  // Combine metrics
  return lengthRatio * 0.4 + wordOverlap * 0.6;
}

// ============================================================================
// Line Splitting
// ============================================================================

/**
 * Split text into lines, preserving empty lines
 */
export function splitIntoLines(text: string): string[] {
  return text.split("\n");
}

/**
 * Smart line splitting that groups short lines
 */
export function splitIntoSmartLines(
  text: string,
  minLineLength = 50
): string[] {
  const lines = text.split("\n");
  const smartLines: string[] = [];
  let currentLine = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      // Empty line - push accumulated and add separator
      if (currentLine) {
        smartLines.push(currentLine.trim());
        currentLine = "";
      }
      smartLines.push("");
      continue;
    }

    currentLine += (currentLine ? " " : "") + trimmed;

    // Push if we've reached minimum length or hit a sentence end
    if (currentLine.length >= minLineLength || /[.!?]$/.test(trimmed)) {
      smartLines.push(currentLine.trim());
      currentLine = "";
    }
  }

  // Push any remaining text
  if (currentLine) {
    smartLines.push(currentLine.trim());
  }

  return smartLines;
}

// ============================================================================
// Line Alignment
// ============================================================================

/**
 * Align two texts line by line
 */
export function alignLineByLine(
  leftText: string,
  rightText: string,
  strategy: AlignmentStrategy = "auto"
): ParallelAlignment {
  // Determine actual strategy
  let actualStrategy = strategy;
  if (strategy === "auto") {
    // Use smart lines for auto mode
    actualStrategy = "line";
  }

  // Split texts based on strategy
  let leftLines: string[];
  let rightLines: string[];

  switch (actualStrategy) {
    case "line":
      leftLines = splitIntoSmartLines(leftText);
      rightLines = splitIntoSmartLines(rightText);
      break;
    case "paragraph":
      leftLines = leftText
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      rightLines = rightText
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      break;
    case "sentence":
      leftLines = leftText
        .split(/[.!?]+\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      rightLines = rightText
        .split(/[.!?]+\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      break;
    default:
      leftLines = splitIntoSmartLines(leftText);
      rightLines = splitIntoSmartLines(rightText);
  }

  const lines: ParallelLine[] = [];
  const maxLines = Math.max(leftLines.length, rightLines.length);

  // Simple 1:1 alignment with confidence scoring
  for (let i = 0; i < maxLines; i++) {
    const leftLine = leftLines[i] || "";
    const rightLine = rightLines[i] || "";

    let type: ParallelLine["type"];
    let confidence: number;

    if (leftLine && rightLine) {
      type = "aligned";
      confidence = calculateTextSimilarity(leftLine, rightLine);
    } else if (leftLine) {
      type = "leftOnly";
      confidence = 0;
    } else {
      type = "rightOnly";
      confidence = 0;
    }

    lines.push({
      id: `line-${i}`,
      leftText: leftLine,
      rightText: rightLine,
      leftLineNumber: i,
      rightLineNumber: i,
      confidence,
      type,
    });
  }

  return {
    lines,
    strategy: actualStrategy,
    totalLines: {
      left: leftLines.length,
      right: rightLines.length,
    },
  };
}

/**
 * Align with dynamic programming for better matching
 */
export function alignWithDP(
  leftText: string,
  rightText: string
): ParallelAlignment {
  const leftLines = splitIntoSmartLines(leftText);
  const rightLines = splitIntoSmartLines(rightText);

  // Simple alignment for now (can be enhanced with DP algorithm)
  const lines: ParallelLine[] = [];
  const minLength = Math.min(leftLines.length, rightLines.length);

  // Align common lines
  for (let i = 0; i < minLength; i++) {
    const leftLine = leftLines[i] || "";
    const rightLine = rightLines[i] || "";

    lines.push({
      id: `line-${i}`,
      leftText: leftLine,
      rightText: rightLine,
      leftLineNumber: i,
      rightLineNumber: i,
      confidence: calculateTextSimilarity(leftLine, rightLine),
      type: "aligned",
    });
  }

  // Add remaining lines
  if (leftLines.length > minLength) {
    for (let i = minLength; i < leftLines.length; i++) {
      lines.push({
        id: `line-${i}`,
        leftText: leftLines[i] || "",
        rightText: "",
        leftLineNumber: i,
        rightLineNumber: -1,
        confidence: 0,
        type: "leftOnly",
      });
    }
  } else if (rightLines.length > minLength) {
    for (let i = minLength; i < rightLines.length; i++) {
      lines.push({
        id: `line-${i}`,
        leftText: "",
        rightText: rightLines[i] || "",
        leftLineNumber: -1,
        rightLineNumber: i,
        confidence: 0,
        type: "rightOnly",
      });
    }
  }

  return {
    lines,
    strategy: "auto",
    totalLines: {
      left: leftLines.length,
      right: rightLines.length,
    },
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get alignment quality statistics
 */
export function getAlignmentStats(alignment: ParallelAlignment): {
  totalLines: number;
  alignedLines: number;
  leftOnlyLines: number;
  rightOnlyLines: number;
  averageConfidence: number;
  alignmentQuality: "excellent" | "good" | "fair" | "poor";
} {
  const totalLines = alignment.lines.length;
  const alignedLines = alignment.lines.filter(
    (l) => l.type === "aligned"
  ).length;
  const leftOnlyLines = alignment.lines.filter(
    (l) => l.type === "leftOnly"
  ).length;
  const rightOnlyLines = alignment.lines.filter(
    (l) => l.type === "rightOnly"
  ).length;

  const totalConfidence = alignment.lines
    .filter((l) => l.type === "aligned")
    .reduce((sum, l) => sum + l.confidence, 0);
  const averageConfidence =
    alignedLines > 0 ? totalConfidence / alignedLines : 0;

  let alignmentQuality: "excellent" | "good" | "fair" | "poor";
  if (averageConfidence >= 0.8) alignmentQuality = "excellent";
  else if (averageConfidence >= 0.6) alignmentQuality = "good";
  else if (averageConfidence >= 0.4) alignmentQuality = "fair";
  else alignmentQuality = "poor";

  return {
    totalLines,
    alignedLines,
    leftOnlyLines,
    rightOnlyLines,
    averageConfidence,
    alignmentQuality,
  };
}

/**
 * Find the line index for a given scroll position
 */
export function findLineAtScrollPosition(
  scrollPosition: number,
  lineHeights: number[]
): number {
  let cumulativeHeight = 0;

  for (let i = 0; i < lineHeights.length; i++) {
    const height = lineHeights[i];
    if (height === undefined) continue;

    cumulativeHeight += height;
    if (cumulativeHeight > scrollPosition) {
      return i;
    }
  }

  return lineHeights.length - 1;
}

/**
 * Get corresponding line in other pane
 */
export function getCorrespondingLine(
  lineIndex: number,
  alignment: ParallelAlignment,
  fromLeft: boolean
): number {
  const line = alignment.lines[lineIndex];
  if (!line) return lineIndex;

  if (fromLeft) {
    return line.rightLineNumber >= 0 ? line.rightLineNumber : lineIndex;
  } else {
    return line.leftLineNumber >= 0 ? line.leftLineNumber : lineIndex;
  }
}
