/**
 * Split Screen Store
 *
 * Manages split-screen reading state for side-by-side book comparison.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================================
// Types
// ============================================================================

export type SplitScreenMode = "single" | "vertical" | "horizontal";

export type SplitScreenPane = {
  bookId: string | null;
  position: number; // Current reading position
  zoom: number; // Zoom level for this pane
};

type SplitScreenState = {
  // Mode
  mode: SplitScreenMode;

  // Pane states
  leftPane: SplitScreenPane;
  rightPane: SplitScreenPane;

  // Synchronization
  syncScroll: boolean; // Sync scrolling between panes
  syncPage: boolean; // Sync page turns between panes

  // Layout
  splitRatio: number; // 0-100, percentage for left/top pane
};

type SplitScreenActions = {
  // Mode
  setMode: (mode: SplitScreenMode) => void;
  toggleSplitScreen: () => void;

  // Panes
  setLeftBook: (bookId: string | null) => void;
  setRightBook: (bookId: string | null) => void;
  setLeftPosition: (position: number) => void;
  setRightPosition: (position: number) => void;
  setLeftZoom: (zoom: number) => void;
  setRightZoom: (zoom: number) => void;
  swapPanes: () => void;

  // Synchronization
  setSyncScroll: (sync: boolean) => void;
  setSyncPage: (sync: boolean) => void;
  toggleSyncScroll: () => void;
  toggleSyncPage: () => void;

  // Layout
  setSplitRatio: (ratio: number) => void;
  resetSplitRatio: () => void;

  // Reset
  reset: () => void;
};

type SplitScreenStore = SplitScreenState & SplitScreenActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: SplitScreenState = {
  mode: "single",
  leftPane: {
    bookId: null,
    position: 0,
    zoom: 100,
  },
  rightPane: {
    bookId: null,
    position: 0,
    zoom: 100,
  },
  syncScroll: false,
  syncPage: false,
  splitRatio: 50, // 50/50 split by default
};

// ============================================================================
// Store
// ============================================================================

export const useSplitScreenStore = create<SplitScreenStore>()(
  persist(
    (set) => ({
      ...initialState,

      // Mode
      setMode: (mode) => set({ mode }),

      toggleSplitScreen: () =>
        set((state) => ({
          mode: state.mode === "single" ? "vertical" : "single",
        })),

      // Panes
      setLeftBook: (bookId) =>
        set((state) => ({
          leftPane: { ...state.leftPane, bookId, position: 0 },
        })),

      setRightBook: (bookId) =>
        set((state) => ({
          rightPane: { ...state.rightPane, bookId, position: 0 },
        })),

      setLeftPosition: (position) =>
        set((state) => ({
          leftPane: { ...state.leftPane, position },
        })),

      setRightPosition: (position) =>
        set((state) => ({
          rightPane: { ...state.rightPane, position },
        })),

      setLeftZoom: (zoom) =>
        set((state) => ({
          leftPane: { ...state.leftPane, zoom },
        })),

      setRightZoom: (zoom) =>
        set((state) => ({
          rightPane: { ...state.rightPane, zoom },
        })),

      swapPanes: () =>
        set((state) => ({
          leftPane: state.rightPane,
          rightPane: state.leftPane,
        })),

      // Synchronization
      setSyncScroll: (syncScroll) => set({ syncScroll }),
      setSyncPage: (syncPage) => set({ syncPage }),

      toggleSyncScroll: () =>
        set((state) => ({ syncScroll: !state.syncScroll })),

      toggleSyncPage: () => set((state) => ({ syncPage: !state.syncPage })),

      // Layout
      setSplitRatio: (splitRatio) =>
        set({ splitRatio: Math.max(20, Math.min(80, splitRatio)) }),

      resetSplitRatio: () => set({ splitRatio: 50 }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: "split-screen-storage",
      partialize: (state) => ({
        mode: state.mode,
        syncScroll: state.syncScroll,
        syncPage: state.syncPage,
        splitRatio: state.splitRatio,
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsSplitScreen = (state: SplitScreenStore): boolean =>
  state.mode !== "single";

export const selectIsVerticalSplit = (state: SplitScreenStore): boolean =>
  state.mode === "vertical";

export const selectIsHorizontalSplit = (state: SplitScreenStore): boolean =>
  state.mode === "horizontal";

export const selectHasBothBooks = (state: SplitScreenStore): boolean =>
  state.leftPane.bookId !== null && state.rightPane.bookId !== null;

export const selectCanSync = (state: SplitScreenStore): boolean =>
  selectIsSplitScreen(state) && selectHasBothBooks(state);
