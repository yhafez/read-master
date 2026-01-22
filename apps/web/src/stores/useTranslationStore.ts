/**
 * Translation Store
 *
 * Manages state for comparing translations side-by-side.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================================
// Types
// ============================================================================

export type TranslationAlignment = "paragraph" | "sentence" | "manual";

export type SegmentPair = {
  id: string;
  originalText: string;
  translatedText: string;
  originalStart: number;
  originalEnd: number;
  translatedStart: number;
  translatedEnd: number;
  confidence: number; // 0-1
};

type TranslationState = {
  // Mode
  isEnabled: boolean;
  alignment: TranslationAlignment;

  // Book IDs
  originalBookId: string | null;
  translationBookId: string | null;

  // Detected languages
  originalLanguage: string | null;
  translationLanguage: string | null;

  // Segment matching
  segments: SegmentPair[];
  activeSegmentId: string | null;

  // UI settings
  showMatchHighlights: boolean;
  highlightColor: string;
  syncScroll: boolean;
  showConfidenceScores: boolean;

  // Actions
  setEnabled: (enabled: boolean) => void;
  setAlignment: (alignment: TranslationAlignment) => void;
  setOriginalBook: (bookId: string, language?: string) => void;
  setTranslationBook: (bookId: string, language?: string) => void;
  setSegments: (segments: SegmentPair[]) => void;
  setActiveSegment: (segmentId: string | null) => void;
  addSegment: (segment: SegmentPair) => void;
  removeSegment: (segmentId: string) => void;
  updateSegment: (segmentId: string, updates: Partial<SegmentPair>) => void;
  clearSegments: () => void;
  setShowMatchHighlights: (show: boolean) => void;
  setHighlightColor: (color: string) => void;
  setSyncScroll: (sync: boolean) => void;
  setShowConfidenceScores: (show: boolean) => void;
  reset: () => void;
};

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  isEnabled: false,
  alignment: "paragraph" as TranslationAlignment,
  originalBookId: null,
  translationBookId: null,
  originalLanguage: null,
  translationLanguage: null,
  segments: [],
  activeSegmentId: null,
  showMatchHighlights: true,
  highlightColor: "#ffeb3b",
  syncScroll: true,
  showConfidenceScores: false,
};

// ============================================================================
// Store
// ============================================================================

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set) => ({
      ...initialState,

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      setAlignment: (alignment) => set({ alignment }),

      setOriginalBook: (bookId, language) =>
        set({
          originalBookId: bookId,
          ...(language !== undefined && { originalLanguage: language }),
        }),

      setTranslationBook: (bookId, language) =>
        set({
          translationBookId: bookId,
          ...(language !== undefined && { translationLanguage: language }),
        }),

      setSegments: (segments) => set({ segments }),

      setActiveSegment: (segmentId) => set({ activeSegmentId: segmentId }),

      addSegment: (segment) =>
        set((state) => ({
          segments: [...state.segments, segment],
        })),

      removeSegment: (segmentId) =>
        set((state) => ({
          segments: state.segments.filter((s) => s.id !== segmentId),
        })),

      updateSegment: (segmentId, updates) =>
        set((state) => ({
          segments: state.segments.map((s) =>
            s.id === segmentId ? { ...s, ...updates } : s
          ),
        })),

      clearSegments: () => set({ segments: [], activeSegmentId: null }),

      setShowMatchHighlights: (show) => set({ showMatchHighlights: show }),

      setHighlightColor: (color) => set({ highlightColor: color }),

      setSyncScroll: (sync) => set({ syncScroll: sync }),

      setShowConfidenceScores: (show) => set({ showConfidenceScores: show }),

      reset: () => set(initialState),
    }),
    {
      name: "translation-settings",
      partialize: (state) => ({
        alignment: state.alignment,
        showMatchHighlights: state.showMatchHighlights,
        highlightColor: state.highlightColor,
        syncScroll: state.syncScroll,
        showConfidenceScores: state.showConfidenceScores,
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsTranslationEnabled = (state: TranslationState): boolean =>
  state.isEnabled;

export const selectHasTranslationPair = (state: TranslationState): boolean =>
  state.originalBookId !== null && state.translationBookId !== null;

export const selectCanCompare = (state: TranslationState): boolean =>
  state.isEnabled &&
  state.originalBookId !== null &&
  state.translationBookId !== null;

export const selectActiveSegment = (
  state: TranslationState
): SegmentPair | null => {
  if (!state.activeSegmentId) return null;
  return state.segments.find((s) => s.id === state.activeSegmentId) || null;
};

export const selectSegmentsByConfidence = (state: TranslationState) => {
  return [...state.segments].sort((a, b) => b.confidence - a.confidence);
};
