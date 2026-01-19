/**
 * Gesture Detection Hook
 *
 * Provides touch gesture detection for mobile devices including swipes, taps,
 * long presses, and pinch gestures.
 */

import { useEffect, useRef, useCallback } from "react";

import type {
  TouchState,
  DetectedGesture,
  GestureHandlers,
} from "@/components/reader/keyboardShortcutTypes";
import { MIN_SWIPE_DISTANCE } from "@/components/reader/keyboardShortcutTypes";

const LONG_PRESS_DURATION = 500; // ms
const DOUBLE_TAP_DELAY = 300; // ms
const PINCH_THRESHOLD = 10; // px

/**
 * Calculate distance between two points
 */
function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Detect gesture from touch state
 */
function detectGesture(state: TouchState): DetectedGesture | null {
  if (
    state.startPositions.length === 0 ||
    state.currentPositions.length === 0
  ) {
    return null;
  }

  // Single touch gestures
  if (state.startPositions.length === 1) {
    const start = state.startPositions[0];
    const current = state.currentPositions[0];

    if (!start || !current) {
      return null;
    }

    const deltaX = current.x - start.x;
    const deltaY = current.y - start.y;
    const distance = getDistance(start.x, start.y, current.x, current.y);

    // Check for swipe
    if (distance >= MIN_SWIPE_DISTANCE) {
      const timeDelta = (current.timestamp - start.timestamp) / 1000; // seconds
      const velocity = timeDelta > 0 ? distance / timeDelta : 0;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0) {
          return {
            type: "swipeRight",
            velocity,
            delta: { x: deltaX, y: deltaY },
          };
        } else {
          return {
            type: "swipeLeft",
            velocity,
            delta: { x: deltaX, y: deltaY },
          };
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          return {
            type: "swipeDown",
            velocity,
            delta: { x: deltaX, y: deltaY },
          };
        } else {
          return {
            type: "swipeUp",
            velocity,
            delta: { x: deltaX, y: deltaY },
          };
        }
      }
    }

    // If no significant movement, could be tap (handled in touchend)
    return null;
  }

  // Two-finger gestures (pinch)
  if (
    state.startPositions.length === 2 &&
    state.initialPinchDistance !== null
  ) {
    const current1 = state.currentPositions[0];
    const current2 = state.currentPositions[1];
    const startPos = state.startPositions[0];

    if (!current1 || !current2 || !startPos) {
      return null;
    }

    const currentDistance = getDistance(
      current1.x,
      current1.y,
      current2.x,
      current2.y
    );
    const scale = currentDistance / state.initialPinchDistance;

    if (
      Math.abs(currentDistance - state.initialPinchDistance) > PINCH_THRESHOLD
    ) {
      if (scale < 1) {
        return {
          type: "pinchIn",
          scale,
        };
      } else {
        return {
          type: "pinchOut",
          scale,
        };
      }
    }
  }

  return null;
}

/**
 * useGestureDetection hook
 *
 * Detects touch gestures on a target element and calls appropriate handlers.
 *
 * @example
 * const gestureRef = useGestureDetection({
 *   onSwipeLeft: () => nextPage(),
 *   onSwipeRight: () => previousPage(),
 *   onDoubleTap: (pos) => toggleZoom(pos),
 * });
 * return <div ref={gestureRef}>Content</div>;
 */
export function useGestureDetection(handlers: GestureHandlers) {
  const elementRef = useRef<HTMLElement>(null);
  const touchStateRef = useRef<TouchState>({
    startPositions: [],
    currentPositions: [],
    isActive: false,
    longPressTimer: null,
    lastTapTime: 0,
    initialPinchDistance: null,
  });

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      const state = touchStateRef.current;
      const touches = Array.from(event.touches);

      // Reset state
      state.startPositions = touches.map((touch) => ({
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      }));
      state.currentPositions = [...state.startPositions];
      state.isActive = true;

      // Calculate initial pinch distance for two-finger gestures
      if (touches.length === 2 && touches[0] && touches[1]) {
        state.initialPinchDistance = getDistance(
          touches[0].clientX,
          touches[0].clientY,
          touches[1].clientX,
          touches[1].clientY
        );
      } else {
        state.initialPinchDistance = null;
      }

      // Start long press timer for single touch
      if (touches.length === 1 && touches[0] && handlers.onLongPress) {
        const firstTouch = touches[0];
        state.longPressTimer = setTimeout(() => {
          if (state.isActive) {
            handlers.onLongPress?.({
              x: firstTouch.clientX,
              y: firstTouch.clientY,
            });
            state.isActive = false; // Prevent other gestures
          }
        }, LONG_PRESS_DURATION);
      }
    },
    [handlers]
  );

  const handleTouchMove = useCallback((event: TouchEvent) => {
    const state = touchStateRef.current;
    if (!state.isActive) return;

    const touches = Array.from(event.touches);
    state.currentPositions = touches.map((touch) => ({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now(),
    }));

    // Cancel long press if finger moves too much
    if (state.longPressTimer) {
      const start = state.startPositions[0];
      const current = state.currentPositions[0];
      if (start && current) {
        const distance = getDistance(start.x, start.y, current.x, current.y);
        if (distance > 10) {
          clearTimeout(state.longPressTimer);
          state.longPressTimer = null;
        }
      }
    }
  }, []);

  const handleTouchEnd = useCallback(
    (_event: TouchEvent) => {
      const state = touchStateRef.current;
      if (!state.isActive) return;

      // Clear long press timer
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
        state.longPressTimer = null;
      }

      // Detect gesture
      const gesture = detectGesture(state);

      if (gesture) {
        // Handle detected gesture
        switch (gesture.type) {
          case "swipeLeft":
            handlers.onSwipeLeft?.();
            break;
          case "swipeRight":
            handlers.onSwipeRight?.();
            break;
          case "swipeUp":
            handlers.onSwipeUp?.();
            break;
          case "swipeDown":
            handlers.onSwipeDown?.();
            break;
          case "pinchIn":
            handlers.onPinchIn?.(0.5); // Scale down
            break;
          case "pinchOut":
            handlers.onPinchOut?.(1.5); // Scale up
            break;
        }
      } else if (state.startPositions.length === 1) {
        // No significant movement - could be tap or double-tap
        const start = state.startPositions[0];
        const current = state.currentPositions[0] || start;

        if (start && current) {
          const distance = getDistance(start.x, start.y, current.x, current.y);

          if (distance < 10) {
            // Minimal movement - it's a tap
            const now = Date.now();
            const timeSinceLastTap = now - state.lastTapTime;

            if (timeSinceLastTap < DOUBLE_TAP_DELAY && handlers.onDoubleTap) {
              // Double tap
              handlers.onDoubleTap({ x: current.x, y: current.y });
              state.lastTapTime = 0; // Reset to prevent triple tap
            } else if (handlers.onTap) {
              // Single tap
              handlers.onTap({ x: current.x, y: current.y });
              state.lastTapTime = now;
            }
          }
        }
      }

      // Reset state
      state.isActive = false;
      state.startPositions = [];
      state.currentPositions = [];
      state.initialPinchDistance = null;
    },
    [handlers]
  );

  const handleTouchCancel = useCallback(() => {
    const state = touchStateRef.current;
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    state.isActive = false;
    state.startPositions = [];
    state.currentPositions = [];
    state.initialPinchDistance = null;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add event listeners
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });
    element.addEventListener("touchcancel", handleTouchCancel, {
      passive: true,
    });

    // Cleanup
    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchCancel);

      // Clean up any pending timers
      const state = touchStateRef.current;
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  return elementRef;
}
