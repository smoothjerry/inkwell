import { describe, expect, it } from "vitest";
import {
  applyGoalChange,
  ensureCurrentWeek,
  resolveWeeks,
  type WeekRow,
  weekStartFor,
  wordsInWeek,
} from "./weeks";

const SUNDAY = 0;
const MONDAY = 1;

function row(weekStart: string, weekStartsOn: number, goalWords = 2500): WeekRow {
  return { weekStart, weekStartsOn, goalWords, dailyTarget: null };
}

describe("Monday vs Sunday start", () => {
  // 12 November 2026 is a Thursday.
  it.each([
    ["Monday start, mid-week", "2026-11-12", MONDAY, "2026-11-09"],
    ["Sunday start, mid-week", "2026-11-12", SUNDAY, "2026-11-08"],
    ["Monday start, on a Monday", "2026-11-09", MONDAY, "2026-11-09"],
    ["Monday start, on a Sunday", "2026-11-15", MONDAY, "2026-11-09"],
    ["Sunday start, on a Sunday", "2026-11-15", SUNDAY, "2026-11-15"],
  ])("%s", (_name, date, weekStartsOn, expected) => {
    expect(weekStartFor(date, weekStartsOn)).toBe(expected);
  });

  it("gives a Monday week Monday to Sunday and a Sunday week Sunday to Saturday", () => {
    expect(resolveWeeks([row("2026-11-09", MONDAY)], MONDAY)).toMatchObject([
      { weekStart: "2026-11-09", weekEnd: "2026-11-15", days: 7, goalWords: 2500 },
    ]);
    expect(resolveWeeks([row("2026-11-08", SUNDAY)], SUNDAY)).toMatchObject([
      { weekStart: "2026-11-08", weekEnd: "2026-11-14", days: 7, goalWords: 2500 },
    ]);
  });
});

describe("DST transitions", () => {
  // In the US, clocks go forward on 8 March 2026 and back on 1 November 2026.
  it.each([
    ["spring forward", "2026-03-08", "2026-03-02", "2026-03-08"],
    ["fall back", "2026-11-01", "2026-10-26", "2026-11-01"],
  ])("keeps a 7-day week across %s", (_name, transitionDate, weekStart, weekEnd) => {
    expect(weekStartFor(transitionDate, MONDAY)).toBe(weekStart);

    const [week] = resolveWeeks([row(weekStart, MONDAY)], MONDAY);
    expect(week).toMatchObject({ weekStart, weekEnd, days: 7 });

    // Each of the seven days is counted exactly once.
    const oneWordPerDay = new Map(
      ["-1", "0", "1", "2", "3", "4", "5", "6", "7"].map((offset) => {
        const date = new Date(`${weekStart}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() + Number(offset));
        return [date.toISOString().slice(0, 10), 1];
      }),
    );
    expect(week && wordsInWeek(week, oneWordPerDay)).toBe(7);
  });
});

describe("week-start change mid-history", () => {
  const history = [row("2026-10-26", MONDAY), row("2026-11-02", MONDAY), row("2026-11-09", MONDAY)];

  it("extends the week in which Monday changes to Sunday, with a pro-rated goal", () => {
    const weeks = resolveWeeks(history, SUNDAY);

    // Past weeks are not re-bucketed.
    expect(weeks.slice(0, 2)).toMatchObject([
      { weekStart: "2026-10-26", weekEnd: "2026-11-01", days: 7, goalWords: 2500 },
      { weekStart: "2026-11-02", weekEnd: "2026-11-08", days: 7, goalWords: 2500 },
    ]);
    // The current week runs to the day before the first Sunday after its
    // normal end: 13 days, goal round(2500 × 13 / 7).
    expect(weeks[2]).toMatchObject({
      weekStart: "2026-11-09",
      weekEnd: "2026-11-21",
      days: 13,
      goalWords: 4643,
    });
  });

  it("starts the following week on the new start day", () => {
    const settings = { weekStartsOn: SUNDAY, weeklyGoal: 2500, dailyTarget: null };
    const { rows, created } = ensureCurrentWeek(history, "2026-11-24", settings);

    expect(created).toMatchObject({ weekStart: "2026-11-22", weekStartsOn: SUNDAY });
    expect(resolveWeeks(rows, SUNDAY).slice(2)).toMatchObject([
      { weekStart: "2026-11-09", weekEnd: "2026-11-21", days: 13, goalWords: 4643 },
      { weekStart: "2026-11-22", weekEnd: "2026-11-28", days: 7, goalWords: 2500 },
    ]);
  });

  it("extends by one day when Sunday changes to Monday", () => {
    const [week] = resolveWeeks([row("2026-11-08", SUNDAY)], MONDAY);

    expect(week).toMatchObject({ weekEnd: "2026-11-15", days: 8, goalWords: 2857 });
  });

  it("does not create a new row while today is inside the transitional week", () => {
    const settings = { weekStartsOn: SUNDAY, weeklyGoal: 2500, dailyTarget: null };

    expect(ensureCurrentWeek(history, "2026-11-18", settings).created).toBeNull();
  });
});

describe("goal change mid-week", () => {
  it("changes the current week's goal and leaves past weeks alone", () => {
    const history = [row("2026-11-02", MONDAY, 2500), row("2026-11-09", MONDAY, 2500)];
    const settings = { weekStartsOn: MONDAY, weeklyGoal: 5000, dailyTarget: 700 };
    const { rows, changed } = applyGoalChange(history, "2026-11-12", settings);

    expect(changed).toEqual({
      weekStart: "2026-11-09",
      weekStartsOn: MONDAY,
      goalWords: 5000,
      dailyTarget: 700,
    });
    expect(resolveWeeks(rows, MONDAY)).toMatchObject([
      { weekStart: "2026-11-02", goalWords: 2500, dailyTarget: null },
      { weekStart: "2026-11-09", goalWords: 5000, dailyTarget: 700 },
    ]);
  });
});
