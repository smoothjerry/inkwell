/**
 * Weeks and weekly goals (DESIGN_SPEC §6.3). Pure functions.
 *
 * Dates are local calendar dates as 'YYYY-MM-DD' strings. All arithmetic is
 * on calendar days, never on clock time, so daylight-saving changes cannot
 * shift a week boundary.
 */

/** A stored week: the goal snapshot taken when the week was first touched. */
export type WeekRow = {
  /** Local date of the week's first day. */
  weekStart: string;
  /** 0 = Sunday … 6 = Saturday, as set when the week was created. */
  weekStartsOn: number;
  /** The weekly goal for a normal 7-day week. */
  goalWords: number;
  dailyTarget: number | null;
};

/** A stored week with its extent worked out. */
export type Week = {
  weekStart: string;
  /** Last day of the week, inclusive. */
  weekEnd: string;
  /** 7, or 8–13 for the one week in which the start day was changed. */
  days: number;
  /** The goal for this week: pro-rated when the week is longer than 7 days. */
  goalWords: number;
  dailyTarget: number | null;
};

export type GoalSettings = {
  weekStartsOn: number;
  weeklyGoal: number;
  dailyTarget: number | null;
};

const DAY_MS = 86_400_000;

function toDayNumber(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

function fromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(toDayNumber(date) + days);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: string): number {
  return new Date(toDayNumber(date) * DAY_MS).getUTCDay();
}

/** The most recent `weekStartsOn` day on or before `date`. */
export function weekStartFor(date: string, weekStartsOn: number): string {
  return addDays(date, -((dayOfWeek(date) - weekStartsOn + 7) % 7));
}

/** The first `weekStartsOn` day on or after `date`. */
function nextStartOnOrAfter(date: string, weekStartsOn: number): string {
  return addDays(date, (weekStartsOn - dayOfWeek(date) + 7) % 7);
}

/**
 * Works out each stored week's extent and goal. `weekStartsOn` is the
 * current setting.
 *
 * A change of start day never re-buckets history. It takes effect at the next
 * week boundary: the week in which it was changed runs on until the day
 * before the first new-start day after its normal end. That one transitional
 * week is 8–13 days long, with its goal pro-rated to `round(goal × days / 7)`.
 * The change is detected from the next stored week (or, for the latest week,
 * the current setting) having a different start day.
 */
export function resolveWeeks(rows: WeekRow[], weekStartsOn: number): Week[] {
  const sorted = [...rows].sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return sorted.map((row, index) => {
    const nextStartsOn = sorted[index + 1]?.weekStartsOn ?? weekStartsOn;
    const nextWeekStart = nextStartOnOrAfter(addDays(row.weekStart, 7), nextStartsOn);
    const days = toDayNumber(nextWeekStart) - toDayNumber(row.weekStart);

    return {
      weekStart: row.weekStart,
      weekEnd: addDays(nextWeekStart, -1),
      days,
      goalWords: Math.round((row.goalWords * days) / 7),
      dailyTarget: row.dailyTarget,
    };
  });
}

/** The week that contains `date`, if one is stored. */
export function weekContaining(weeks: Week[], date: string): Week | undefined {
  return weeks.find((week) => week.weekStart <= date && date <= week.weekEnd);
}

/**
 * Makes sure the week containing `today` has a row, snapshotting the current
 * goal settings if it has to be created. Returns the new row in `created`.
 */
export function ensureCurrentWeek(
  rows: WeekRow[],
  today: string,
  settings: GoalSettings,
): { rows: WeekRow[]; created: WeekRow | null } {
  if (weekContaining(resolveWeeks(rows, settings.weekStartsOn), today)) {
    return { rows, created: null };
  }
  const created: WeekRow = {
    weekStart: weekStartFor(today, settings.weekStartsOn),
    weekStartsOn: settings.weekStartsOn,
    goalWords: settings.weeklyGoal,
    dailyTarget: settings.dailyTarget,
  };
  return { rows: [...rows, created], created };
}

/**
 * Applies a goal change: the current week takes the new goal and daily
 * target; past weeks keep the goals they had. Returns the changed row, or
 * null if the current week has no row yet.
 */
export function applyGoalChange(
  rows: WeekRow[],
  today: string,
  settings: GoalSettings,
): { rows: WeekRow[]; changed: WeekRow | null } {
  const current = weekContaining(resolveWeeks(rows, settings.weekStartsOn), today);
  if (!current) {
    return { rows, changed: null };
  }
  let changed: WeekRow | null = null;
  const next = rows.map((row) => {
    if (row.weekStart !== current.weekStart) {
      return row;
    }
    changed = { ...row, goalWords: settings.weeklyGoal, dailyTarget: settings.dailyTarget };
    return changed;
  });
  return { rows: next, changed };
}

/** Sums the words written on the days of a week. */
export function wordsInWeek(week: Week, wordsByDate: ReadonlyMap<string, number>): number {
  let total = 0;
  for (let offset = 0; offset < week.days; offset += 1) {
    total += wordsByDate.get(addDays(week.weekStart, offset)) ?? 0;
  }
  return total;
}

export function isWeekMet(words: number, goalWords: number): boolean {
  return words >= goalWords;
}
