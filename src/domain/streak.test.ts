import { describe, expect, it } from "vitest";
import { computeStreak, type WeekResult } from "./streak";
import { addDays } from "./weeks";

// Thursday in the week that starts Monday 9 November 2026.
const TODAY = "2026-11-12";

/** A 7-day week starting on `weekStart`. */
function week(weekStart: string, met: boolean): WeekResult {
  return { weekStart, weekEnd: addDays(weekStart, 6), met };
}

describe("in-progress week", () => {
  const completed = [week("2026-10-19", true), week("2026-10-26", true), week("2026-11-02", true)];

  it("adds 1 when the week in progress is already met", () => {
    expect(computeStreak([...completed, week("2026-11-09", true)], TODAY).current).toBe(4);
  });

  it("does not break the streak while the week in progress is unmet", () => {
    expect(computeStreak([...completed, week("2026-11-09", false)], TODAY).current).toBe(3);
  });
});

describe("gaps", () => {
  it("stops at an unmet week", () => {
    const weeks = [
      week("2026-10-12", true),
      week("2026-10-19", true),
      week("2026-10-26", false),
      week("2026-11-02", true),
      week("2026-11-09", true),
    ];

    expect(computeStreak(weeks, TODAY).current).toBe(2);
  });

  it("is zero when the last completed week was unmet", () => {
    const weeks = [week("2026-10-26", true), week("2026-11-02", false), week("2026-11-09", false)];

    expect(computeStreak(weeks, TODAY).current).toBe(0);
  });
});

describe("skipped weeks with no data", () => {
  it("treats a week with no row as unmet", () => {
    // No row for the week of 26 October: the app was not opened.
    const weeks = [
      week("2026-10-12", true),
      week("2026-10-19", true),
      week("2026-11-02", true),
      week("2026-11-09", false),
    ];

    expect(computeStreak(weeks, TODAY)).toEqual({ current: 1, longest: 2 });
  });

  it("is zero when the week before the current one has no row", () => {
    const weeks = [week("2026-10-19", true), week("2026-10-26", true), week("2026-11-09", false)];

    expect(computeStreak(weeks, TODAY).current).toBe(0);
  });
});

describe("longest streak", () => {
  it("is the longest run in history, even when the current streak is shorter", () => {
    const weeks = [
      week("2026-09-28", true),
      week("2026-10-05", true),
      week("2026-10-12", true),
      week("2026-10-19", false),
      week("2026-10-26", true),
      week("2026-11-02", true),
      week("2026-11-09", false),
    ];

    expect(computeStreak(weeks, TODAY)).toEqual({ current: 2, longest: 3 });
  });

  it("includes the week in progress when it is met", () => {
    const weeks = [week("2026-11-02", true), week("2026-11-09", true)];

    expect(computeStreak(weeks, TODAY)).toEqual({ current: 2, longest: 2 });
  });
});
