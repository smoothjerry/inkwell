/**
 * The weekly streak (DESIGN_SPEC §6.4). Pure functions. The streak is always
 * derived from week results and never stored.
 */

import { addDays } from "./weeks";

export type WeekResult = {
  weekStart: string;
  /** Last day of the week, inclusive. */
  weekEnd: string;
  met: boolean;
};

export type Streak = {
  current: number;
  longest: number;
};

/**
 * Computes the current and longest streak from the stored weeks.
 *
 * - Current streak: consecutive met weeks ending at the most recent completed
 *   week, plus 1 if the week in progress is already met.
 * - A week in progress that is not yet met does not break the streak.
 * - A week with no stored row (the app was not opened) counts as unmet, so a
 *   gap between stored weeks breaks the streak.
 */
export function computeStreak(weeks: WeekResult[], today: string): Streak {
  const sorted = [...weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  // Lengths of runs of met weeks with no gap between them.
  let longest = 0;
  let run = 0;
  let previous: WeekResult | undefined;
  for (const week of sorted) {
    const follows = previous !== undefined && addDays(previous.weekEnd, 1) === week.weekStart;
    run = week.met ? (follows ? run : 0) + 1 : 0;
    longest = Math.max(longest, run);
    previous = week;
  }

  const inProgress = sorted.find((week) => week.weekStart <= today && today <= week.weekEnd);
  const completed = sorted.filter((week) => week.weekEnd < today);

  // The completed week that the streak must end at: the one right before the
  // week in progress, or (when that has no row yet) one that ended within the
  // last 7 days. Anything older means a skipped week.
  const boundary = inProgress ? inProgress.weekStart : addDays(today, -6);
  let current = 0;
  let expectedEnd: string | undefined;
  for (const week of completed.reverse()) {
    const isAdjacent =
      expectedEnd === undefined
        ? inProgress
          ? addDays(week.weekEnd, 1) === boundary
          : week.weekEnd >= addDays(boundary, -1)
        : week.weekEnd === expectedEnd;
    if (!isAdjacent || !week.met) {
      break;
    }
    current += 1;
    expectedEnd = addDays(week.weekStart, -1);
  }

  if (inProgress?.met) {
    current += 1;
  }

  return { current, longest: Math.max(longest, current) };
}
