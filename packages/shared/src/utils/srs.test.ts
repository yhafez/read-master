import { describe, it, expect, beforeEach } from "vitest";
import {
  // Types
  type SrsRating,
  type SrsCardState,
  type SrsReviewResult,
  // Constants
  SM2_CONSTANTS,
  SRS_RATING_LABELS,
  // Functions
  isValidRating,
  clampEaseFactor,
  calculateNewEaseFactor,
  calculateNewInterval,
  calculateNewRepetitions,
  calculateNextDueDate,
  calculateNextReview,
  createDefaultSrsState,
  isCardDue,
  daysUntilDue,
  calculateRetentionRate,
  predictNextIntervals,
  formatInterval,
} from "./srs";

describe("SRS Module - SM-2 Algorithm", () => {
  describe("Constants", () => {
    it("should have correct minimum ease factor", () => {
      expect(SM2_CONSTANTS.MIN_EASE_FACTOR).toBe(1.3);
    });

    it("should have correct default ease factor", () => {
      expect(SM2_CONSTANTS.DEFAULT_EASE_FACTOR).toBe(2.5);
    });

    it("should have correct maximum ease factor", () => {
      expect(SM2_CONSTANTS.MAX_EASE_FACTOR).toBe(3.0);
    });

    it("should have correct initial interval", () => {
      expect(SM2_CONSTANTS.INITIAL_INTERVAL).toBe(1);
    });

    it("should have correct second interval", () => {
      expect(SM2_CONSTANTS.SECOND_INTERVAL).toBe(6);
    });

    it("should have rating labels for all ratings", () => {
      expect(SRS_RATING_LABELS[1]).toBe("Again");
      expect(SRS_RATING_LABELS[2]).toBe("Hard");
      expect(SRS_RATING_LABELS[3]).toBe("Good");
      expect(SRS_RATING_LABELS[4]).toBe("Easy");
    });
  });

  describe("isValidRating", () => {
    it("should return true for valid ratings 1-4", () => {
      expect(isValidRating(1)).toBe(true);
      expect(isValidRating(2)).toBe(true);
      expect(isValidRating(3)).toBe(true);
      expect(isValidRating(4)).toBe(true);
    });

    it("should return false for ratings outside 1-4 range", () => {
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(5)).toBe(false);
      expect(isValidRating(-1)).toBe(false);
      expect(isValidRating(100)).toBe(false);
    });

    it("should return false for non-integer values", () => {
      expect(isValidRating(1.5)).toBe(false);
      expect(isValidRating(2.7)).toBe(false);
      expect(isValidRating(3.14)).toBe(false);
    });

    it("should return false for NaN and Infinity", () => {
      expect(isValidRating(NaN)).toBe(false);
      expect(isValidRating(Infinity)).toBe(false);
      expect(isValidRating(-Infinity)).toBe(false);
    });
  });

  describe("clampEaseFactor", () => {
    it("should return value unchanged if within valid range", () => {
      expect(clampEaseFactor(1.5)).toBe(1.5);
      expect(clampEaseFactor(2.0)).toBe(2.0);
      expect(clampEaseFactor(2.5)).toBe(2.5);
      expect(clampEaseFactor(2.9)).toBe(2.9);
    });

    it("should clamp to minimum if below 1.3", () => {
      expect(clampEaseFactor(1.0)).toBe(1.3);
      expect(clampEaseFactor(1.2)).toBe(1.3);
      expect(clampEaseFactor(0)).toBe(1.3);
      expect(clampEaseFactor(-1)).toBe(1.3);
    });

    it("should clamp to maximum if above 3.0", () => {
      expect(clampEaseFactor(3.1)).toBe(3.0);
      expect(clampEaseFactor(4.0)).toBe(3.0);
      expect(clampEaseFactor(100)).toBe(3.0);
    });

    it("should handle boundary values exactly", () => {
      expect(clampEaseFactor(1.3)).toBe(1.3);
      expect(clampEaseFactor(3.0)).toBe(3.0);
    });
  });

  describe("calculateNewEaseFactor", () => {
    const defaultEF = 2.5;

    it("should decrease ease factor for rating 1 (Again)", () => {
      const newEF = calculateNewEaseFactor(defaultEF, 1);
      expect(newEF).toBeLessThan(defaultEF);
      expect(newEF).toBeGreaterThanOrEqual(SM2_CONSTANTS.MIN_EASE_FACTOR);
    });

    it("should decrease ease factor for rating 2 (Hard)", () => {
      const newEF = calculateNewEaseFactor(defaultEF, 2);
      expect(newEF).toBeLessThan(defaultEF);
      expect(newEF).toBeGreaterThanOrEqual(SM2_CONSTANTS.MIN_EASE_FACTOR);
    });

    it("should slightly decrease or maintain ease factor for rating 3 (Good)", () => {
      const newEF = calculateNewEaseFactor(defaultEF, 3);
      // Rating 3 (mapped to q=4) should result in slight decrease
      expect(newEF).toBeLessThanOrEqual(defaultEF);
      expect(newEF).toBeGreaterThanOrEqual(SM2_CONSTANTS.MIN_EASE_FACTOR);
    });

    it("should increase ease factor for rating 4 (Easy)", () => {
      const newEF = calculateNewEaseFactor(defaultEF, 4);
      expect(newEF).toBeGreaterThan(defaultEF);
      expect(newEF).toBeLessThanOrEqual(SM2_CONSTANTS.MAX_EASE_FACTOR);
    });

    it("should not go below minimum ease factor after many Again ratings", () => {
      let ef = defaultEF;
      for (let i = 0; i < 20; i++) {
        ef = calculateNewEaseFactor(ef, 1);
      }
      expect(ef).toBe(SM2_CONSTANTS.MIN_EASE_FACTOR);
    });

    it("should not exceed maximum ease factor after many Easy ratings", () => {
      let ef = defaultEF;
      for (let i = 0; i < 20; i++) {
        ef = calculateNewEaseFactor(ef, 4);
      }
      expect(ef).toBe(SM2_CONSTANTS.MAX_EASE_FACTOR);
    });

    it("should show correct relative ordering of ratings", () => {
      const efAgain = calculateNewEaseFactor(defaultEF, 1);
      const efHard = calculateNewEaseFactor(defaultEF, 2);
      const efGood = calculateNewEaseFactor(defaultEF, 3);
      const efEasy = calculateNewEaseFactor(defaultEF, 4);

      expect(efAgain).toBeLessThan(efHard);
      expect(efHard).toBeLessThan(efGood);
      expect(efGood).toBeLessThan(efEasy);
    });
  });

  describe("calculateNewInterval", () => {
    const defaultEF = 2.5;

    describe("Rating 1 (Again)", () => {
      it("should reset to initial interval", () => {
        expect(calculateNewInterval(10, defaultEF, 1, 5)).toBe(1);
        expect(calculateNewInterval(30, defaultEF, 1, 10)).toBe(1);
        expect(calculateNewInterval(1, defaultEF, 1, 0)).toBe(1);
      });
    });

    describe("Rating 2 (Hard)", () => {
      it("should return initial interval for early reviews", () => {
        expect(calculateNewInterval(1, defaultEF, 2, 0)).toBe(1);
        expect(calculateNewInterval(6, defaultEF, 2, 1)).toBe(1);
      });

      it("should reduce interval for later reviews", () => {
        const currentInterval = 10;
        const result = calculateNewInterval(currentInterval, defaultEF, 2, 3);
        // Should be 60% of normal interval
        const normalInterval = Math.round(currentInterval * defaultEF);
        const expectedHardInterval = Math.round(
          normalInterval * SM2_CONSTANTS.HARD_INTERVAL_MODIFIER
        );
        expect(result).toBe(expectedHardInterval);
      });
    });

    describe("Rating 3 (Good)", () => {
      it("should return 1 day for first successful review (repetitions = 0)", () => {
        expect(calculateNewInterval(0, defaultEF, 3, 0)).toBe(1);
      });

      it("should return 6 days for second successful review (repetitions = 1)", () => {
        expect(calculateNewInterval(1, defaultEF, 3, 1)).toBe(6);
      });

      it("should multiply by ease factor for subsequent reviews", () => {
        const currentInterval = 6;
        const expectedInterval = Math.round(currentInterval * defaultEF);
        expect(calculateNewInterval(currentInterval, defaultEF, 3, 2)).toBe(
          expectedInterval
        );
      });

      it("should calculate correctly for longer intervals", () => {
        const currentInterval = 15;
        const ef = 2.2;
        const expected = Math.round(currentInterval * ef);
        expect(calculateNewInterval(currentInterval, ef, 3, 5)).toBe(expected);
      });
    });

    describe("Rating 4 (Easy)", () => {
      it("should return initial interval with bonus for first review", () => {
        const result = calculateNewInterval(0, defaultEF, 4, 0);
        expect(result).toBe(
          Math.round(1 * SM2_CONSTANTS.EASY_INTERVAL_MODIFIER)
        );
      });

      it("should return second interval with bonus for second review", () => {
        const result = calculateNewInterval(1, defaultEF, 4, 1);
        expect(result).toBe(
          Math.round(6 * SM2_CONSTANTS.EASY_INTERVAL_MODIFIER)
        );
      });

      it("should add 30% bonus to calculated interval", () => {
        const currentInterval = 10;
        const baseInterval = Math.round(currentInterval * defaultEF);
        const expected = Math.round(
          baseInterval * SM2_CONSTANTS.EASY_INTERVAL_MODIFIER
        );
        expect(calculateNewInterval(currentInterval, defaultEF, 4, 3)).toBe(
          expected
        );
      });
    });

    it("should never return interval less than 1", () => {
      expect(calculateNewInterval(0, 1.3, 3, 0)).toBeGreaterThanOrEqual(1);
      expect(calculateNewInterval(1, 1.3, 2, 0)).toBeGreaterThanOrEqual(1);
    });
  });

  describe("calculateNewRepetitions", () => {
    it("should reset to 0 for rating 1 (Again)", () => {
      expect(calculateNewRepetitions(5, 1)).toBe(0);
      expect(calculateNewRepetitions(10, 1)).toBe(0);
      expect(calculateNewRepetitions(0, 1)).toBe(0);
    });

    it("should reset to 0 for rating 2 (Hard)", () => {
      expect(calculateNewRepetitions(5, 2)).toBe(0);
      expect(calculateNewRepetitions(10, 2)).toBe(0);
      expect(calculateNewRepetitions(0, 2)).toBe(0);
    });

    it("should increment by 1 for rating 3 (Good)", () => {
      expect(calculateNewRepetitions(0, 3)).toBe(1);
      expect(calculateNewRepetitions(1, 3)).toBe(2);
      expect(calculateNewRepetitions(5, 3)).toBe(6);
    });

    it("should increment by 1 for rating 4 (Easy)", () => {
      expect(calculateNewRepetitions(0, 4)).toBe(1);
      expect(calculateNewRepetitions(1, 4)).toBe(2);
      expect(calculateNewRepetitions(5, 4)).toBe(6);
    });
  });

  describe("calculateNextDueDate", () => {
    const baseDate = new Date("2024-01-15T12:00:00Z");

    it("should add correct number of days to date", () => {
      const result = calculateNextDueDate(7, baseDate);
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(0); // January
      expect(result.getUTCDate()).toBe(22);
    });

    it("should set time to start of day in UTC", () => {
      const result = calculateNextDueDate(1, baseDate);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });

    it("should handle month boundaries correctly", () => {
      const endOfMonth = new Date("2024-01-30T12:00:00Z");
      const result = calculateNextDueDate(5, endOfMonth);
      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(4);
    });

    it("should handle year boundaries correctly", () => {
      const endOfYear = new Date("2024-12-28T12:00:00Z");
      const result = calculateNextDueDate(7, endOfYear);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(0); // January
    });

    it("should handle 1 day interval", () => {
      const result = calculateNextDueDate(1, baseDate);
      expect(result.getUTCDate()).toBe(16);
    });

    it("should handle large intervals", () => {
      const result = calculateNextDueDate(365, baseDate);
      expect(result.getUTCFullYear()).toBe(2025);
      expect(result.getUTCMonth()).toBe(0); // January
      // 2024 is a leap year, so 365 days from Jan 15, 2024 = Jan 14, 2025
      expect(result.getUTCDate()).toBe(14);
    });
  });

  describe("calculateNextReview", () => {
    let defaultState: SrsCardState;
    const reviewDate = new Date("2024-01-15T12:00:00Z");

    beforeEach(() => {
      defaultState = createDefaultSrsState();
    });

    describe("New card (first review)", () => {
      it("should handle rating 1 (Again) on new card", () => {
        const result = calculateNextReview(defaultState, 1, reviewDate);

        expect(result.newRepetitions).toBe(0);
        expect(result.newInterval).toBe(1);
        expect(result.isLapse).toBe(false); // Not a lapse for new cards
        expect(result.newEaseFactor).toBeLessThan(defaultState.easeFactor);
      });

      it("should handle rating 3 (Good) on new card", () => {
        const result = calculateNextReview(defaultState, 3, reviewDate);

        expect(result.newRepetitions).toBe(1);
        expect(result.newInterval).toBe(1);
        expect(result.isLapse).toBe(false);
      });

      it("should handle rating 4 (Easy) on new card", () => {
        const result = calculateNextReview(defaultState, 4, reviewDate);

        expect(result.newRepetitions).toBe(1);
        expect(result.newInterval).toBe(
          Math.round(1 * SM2_CONSTANTS.EASY_INTERVAL_MODIFIER)
        );
        expect(result.isLapse).toBe(false);
        expect(result.newEaseFactor).toBeGreaterThan(defaultState.easeFactor);
      });
    });

    describe("Learning card (second review)", () => {
      it("should give 6-day interval for Good on second review", () => {
        const state: SrsCardState = {
          easeFactor: 2.5,
          interval: 1,
          repetitions: 1,
        };
        const result = calculateNextReview(state, 3, reviewDate);

        expect(result.newInterval).toBe(6);
        expect(result.newRepetitions).toBe(2);
      });
    });

    describe("Review card (graduated)", () => {
      it("should multiply interval by ease factor for Good", () => {
        const state: SrsCardState = {
          easeFactor: 2.5,
          interval: 6,
          repetitions: 2,
        };
        const result = calculateNextReview(state, 3, reviewDate);

        expect(result.newInterval).toBe(15); // 6 * 2.5 = 15
        expect(result.newRepetitions).toBe(3);
      });

      it("should detect lapse when rating is Again on graduated card", () => {
        const state: SrsCardState = {
          easeFactor: 2.5,
          interval: 30,
          repetitions: 5,
        };
        const result = calculateNextReview(state, 1, reviewDate);

        expect(result.isLapse).toBe(true);
        expect(result.newRepetitions).toBe(0);
        expect(result.newInterval).toBe(1);
      });

      it("should detect lapse when rating is Hard on graduated card", () => {
        const state: SrsCardState = {
          easeFactor: 2.5,
          interval: 30,
          repetitions: 5,
        };
        const result = calculateNextReview(state, 2, reviewDate);

        expect(result.isLapse).toBe(true);
        expect(result.newRepetitions).toBe(0);
      });
    });

    describe("Due date calculation", () => {
      it("should calculate correct due date for interval", () => {
        const result = calculateNextReview(defaultState, 3, reviewDate);
        const expectedDate = new Date("2024-01-16T00:00:00Z");

        expect(result.nextDueDate.getTime()).toBe(expectedDate.getTime());
      });
    });

    describe("Error handling", () => {
      it("should throw error for invalid rating 0", () => {
        expect(() =>
          calculateNextReview(defaultState, 0 as SrsRating)
        ).toThrow();
      });

      it("should throw error for invalid rating 5", () => {
        expect(() =>
          calculateNextReview(defaultState, 5 as SrsRating)
        ).toThrow();
      });
    });

    describe("Long-term progression", () => {
      it("should show exponential growth with consistent Good ratings", () => {
        let state = createDefaultSrsState();
        const intervals: number[] = [];

        for (let i = 0; i < 10; i++) {
          const result = calculateNextReview(state, 3, reviewDate);
          intervals.push(result.newInterval);
          state = {
            easeFactor: result.newEaseFactor,
            interval: result.newInterval,
            repetitions: result.newRepetitions,
          };
        }

        // Verify exponential-like growth
        expect(intervals[0]).toBe(1); // First
        expect(intervals[1]).toBe(6); // Second
        // After that, should be multiplying by ~2.5
        for (let i = 3; i < intervals.length; i++) {
          const current = intervals[i] ?? 0;
          const previous = intervals[i - 1] ?? 0;
          expect(current).toBeGreaterThan(0);
          expect(previous).toBeGreaterThan(0);
          expect(current).toBeGreaterThan(previous);
        }
      });

      it("should reach very long intervals after many Easy ratings", () => {
        let state = createDefaultSrsState();

        for (let i = 0; i < 15; i++) {
          const result = calculateNextReview(state, 4, reviewDate);
          state = {
            easeFactor: result.newEaseFactor,
            interval: result.newInterval,
            repetitions: result.newRepetitions,
          };
        }

        // After 15 Easy reviews, interval should be very long (months/years)
        expect(state.interval).toBeGreaterThan(365);
      });
    });
  });

  describe("createDefaultSrsState", () => {
    it("should return correct default values", () => {
      const state = createDefaultSrsState();

      expect(state.easeFactor).toBe(SM2_CONSTANTS.DEFAULT_EASE_FACTOR);
      expect(state.interval).toBe(0);
      expect(state.repetitions).toBe(0);
    });

    it("should return a new object each time", () => {
      const state1 = createDefaultSrsState();
      const state2 = createDefaultSrsState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe("isCardDue", () => {
    const now = new Date("2024-01-15T12:00:00Z");

    it("should return true for past due dates", () => {
      const pastDue = new Date("2024-01-10T00:00:00Z");
      expect(isCardDue(pastDue, now)).toBe(true);
    });

    it("should return true for current date", () => {
      const currentDue = new Date("2024-01-15T00:00:00Z");
      expect(isCardDue(currentDue, now)).toBe(true);
    });

    it("should return true for same moment", () => {
      expect(isCardDue(now, now)).toBe(true);
    });

    it("should return false for future dates", () => {
      const futureDue = new Date("2024-01-20T00:00:00Z");
      expect(isCardDue(futureDue, now)).toBe(false);
    });
  });

  describe("daysUntilDue", () => {
    const now = new Date("2024-01-15T12:00:00Z");

    it("should return negative number for overdue cards", () => {
      const overdueDate = new Date("2024-01-10T00:00:00Z");
      expect(daysUntilDue(overdueDate, now)).toBeLessThan(0);
    });

    it("should return 0 for due today", () => {
      const todayDue = new Date("2024-01-15T14:00:00Z");
      expect(daysUntilDue(todayDue, now)).toBe(0);
    });

    it("should return positive number for future dates", () => {
      const futureDue = new Date("2024-01-20T00:00:00Z");
      expect(daysUntilDue(futureDue, now)).toBeGreaterThan(0);
    });

    it("should calculate correct number of days", () => {
      const sevenDaysOut = new Date("2024-01-22T12:00:00Z");
      expect(daysUntilDue(sevenDaysOut, now)).toBe(7);
    });
  });

  describe("calculateRetentionRate", () => {
    it("should return 0 for empty reviews", () => {
      expect(calculateRetentionRate([])).toBe(0);
    });

    it("should return 100 for all successful reviews (rating >= 3)", () => {
      expect(calculateRetentionRate([3, 3, 3, 3, 3])).toBe(100);
      expect(calculateRetentionRate([4, 4, 4, 4, 4])).toBe(100);
      expect(calculateRetentionRate([3, 4, 3, 4, 3])).toBe(100);
    });

    it("should return 0 for all failed reviews", () => {
      expect(calculateRetentionRate([1, 1, 1, 1, 1])).toBe(0);
      expect(calculateRetentionRate([2, 2, 2, 2, 2])).toBe(0);
      expect(calculateRetentionRate([1, 2, 1, 2, 1])).toBe(0);
    });

    it("should calculate correct percentage for mixed reviews", () => {
      // 3 out of 5 successful = 60%
      expect(calculateRetentionRate([1, 3, 2, 3, 3])).toBe(60);

      // 4 out of 10 successful = 40%
      expect(calculateRetentionRate([1, 2, 3, 1, 2, 3, 4, 1, 2, 1])).toBe(30);

      // 7 out of 10 successful = 70%
      expect(calculateRetentionRate([3, 4, 3, 4, 3, 1, 2, 3, 4, 3])).toBe(80);
    });

    it("should round to whole numbers", () => {
      // 1 out of 3 = 33.33...
      expect(calculateRetentionRate([3, 1, 2])).toBe(33);

      // 2 out of 3 = 66.66...
      expect(calculateRetentionRate([3, 4, 2])).toBe(67);
    });
  });

  describe("predictNextIntervals", () => {
    it("should return intervals for all four ratings", () => {
      const state = createDefaultSrsState();
      const predictions = predictNextIntervals(state);

      expect(predictions).toHaveProperty("1");
      expect(predictions).toHaveProperty("2");
      expect(predictions).toHaveProperty("3");
      expect(predictions).toHaveProperty("4");
    });

    it("should show increasing intervals from Again to Easy", () => {
      const state: SrsCardState = {
        easeFactor: 2.5,
        interval: 10,
        repetitions: 3,
      };
      const predictions = predictNextIntervals(state);

      expect(predictions[1]).toBeLessThanOrEqual(predictions[2]);
      expect(predictions[3]).toBeLessThanOrEqual(predictions[4]);
    });

    it("should match actual calculateNextReview results", () => {
      const state = createDefaultSrsState();
      const predictions = predictNextIntervals(state);

      for (const rating of [1, 2, 3, 4] as SrsRating[]) {
        const result = calculateNextReview(state, rating);
        expect(predictions[rating]).toBe(result.newInterval);
      }
    });
  });

  describe("formatInterval", () => {
    it("should format less than 1 day", () => {
      expect(formatInterval(0)).toBe("< 1 day");
      expect(formatInterval(0.5)).toBe("< 1 day");
    });

    it("should format 1 day correctly", () => {
      expect(formatInterval(1)).toBe("1 day");
    });

    it("should format days correctly", () => {
      expect(formatInterval(2)).toBe("2 days");
      expect(formatInterval(5)).toBe("5 days");
      expect(formatInterval(6)).toBe("6 days");
    });

    it("should format weeks correctly", () => {
      expect(formatInterval(7)).toBe("1 week");
      expect(formatInterval(10)).toBe("1 week");
      expect(formatInterval(14)).toBe("2 weeks");
      expect(formatInterval(21)).toBe("3 weeks");
      expect(formatInterval(28)).toBe("4 weeks");
    });

    it("should format months correctly", () => {
      expect(formatInterval(30)).toBe("1 month");
      expect(formatInterval(45)).toBe("1 month");
      expect(formatInterval(60)).toBe("2 months");
      expect(formatInterval(90)).toBe("3 months");
      expect(formatInterval(180)).toBe("6 months");
    });

    it("should format years correctly", () => {
      expect(formatInterval(365)).toBe("1 year");
      expect(formatInterval(500)).toBe("1 year");
      expect(formatInterval(730)).toBe("2 years");
      expect(formatInterval(1095)).toBe("3 years");
    });
  });

  describe("Integration: Real-world scenarios", () => {
    const reviewDate = new Date("2024-01-15T12:00:00Z");

    it("should handle typical learning progression", () => {
      // Day 1: New card, answer Good
      let state = createDefaultSrsState();
      let result = calculateNextReview(state, 3, reviewDate);
      expect(result.newInterval).toBe(1);
      expect(result.newRepetitions).toBe(1);

      // Day 2: Answer Good again
      state = {
        easeFactor: result.newEaseFactor,
        interval: result.newInterval,
        repetitions: result.newRepetitions,
      };
      result = calculateNextReview(state, 3, reviewDate);
      expect(result.newInterval).toBe(6);
      expect(result.newRepetitions).toBe(2);

      // Day 8: Answer Good
      state = {
        easeFactor: result.newEaseFactor,
        interval: result.newInterval,
        repetitions: result.newRepetitions,
      };
      result = calculateNextReview(state, 3, reviewDate);
      expect(result.newInterval).toBeGreaterThan(10);
      expect(result.newRepetitions).toBe(3);
    });

    it("should handle recovery from a lapse", () => {
      // Start with a well-learned card
      let state: SrsCardState = {
        easeFactor: 2.5,
        interval: 30,
        repetitions: 5,
      };

      // Forget the card
      let result = calculateNextReview(state, 1, reviewDate);
      expect(result.isLapse).toBe(true);
      expect(result.newRepetitions).toBe(0);
      expect(result.newInterval).toBe(1);

      // Relearn
      state = {
        easeFactor: result.newEaseFactor,
        interval: result.newInterval,
        repetitions: result.newRepetitions,
      };
      result = calculateNextReview(state, 3, reviewDate);
      expect(result.newInterval).toBe(1); // First review again

      // Continue relearning
      state = {
        easeFactor: result.newEaseFactor,
        interval: result.newInterval,
        repetitions: result.newRepetitions,
      };
      result = calculateNextReview(state, 3, reviewDate);
      expect(result.newInterval).toBe(6); // Second review
    });

    it("should handle Easy button for accelerated learning", () => {
      let state = createDefaultSrsState();
      const intervals: number[] = [];

      // 5 Easy reviews in a row
      for (let i = 0; i < 5; i++) {
        const result = calculateNextReview(state, 4, reviewDate);
        intervals.push(result.newInterval);
        state = {
          easeFactor: result.newEaseFactor,
          interval: result.newInterval,
          repetitions: result.newRepetitions,
        };
      }

      // Should grow much faster than Good ratings
      expect(intervals[4]).toBeGreaterThan(20);
      // Ease factor should be at or near maximum
      expect(state.easeFactor).toBe(SM2_CONSTANTS.MAX_EASE_FACTOR);
    });

    it("should handle difficulty card (many Hard ratings)", () => {
      let state = createDefaultSrsState();

      // Keep answering Hard
      for (let i = 0; i < 5; i++) {
        const result = calculateNextReview(state, 2, reviewDate);
        state = {
          easeFactor: result.newEaseFactor,
          interval: result.newInterval,
          repetitions: result.newRepetitions,
        };
      }

      // Card should stay in relearning
      expect(state.repetitions).toBe(0);
      // Ease factor should be at minimum
      expect(state.easeFactor).toBe(SM2_CONSTANTS.MIN_EASE_FACTOR);
    });
  });

  describe("Type safety", () => {
    it("should export SrsRating type correctly", () => {
      const rating: SrsRating = 3;
      expect(isValidRating(rating)).toBe(true);
    });

    it("should export SrsCardState type correctly", () => {
      const state: SrsCardState = {
        easeFactor: 2.5,
        interval: 10,
        repetitions: 3,
      };
      expect(state.easeFactor).toBe(2.5);
    });

    it("should export SrsReviewResult type correctly", () => {
      const result: SrsReviewResult = {
        newEaseFactor: 2.6,
        newInterval: 15,
        newRepetitions: 4,
        nextDueDate: new Date(),
        isLapse: false,
      };
      expect(result.newEaseFactor).toBe(2.6);
    });
  });
});
