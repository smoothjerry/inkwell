/**
 * Achievements (DESIGN_SPEC §6.6). Pure functions.
 *
 * An achievement, once unlocked, stays unlocked: callers store the unlock and
 * pass the stored ids back in, so a condition that later stops holding (a
 * streak that ends) never takes an achievement away.
 */

export type AchievementWeek = {
  words: number;
  goalWords: number;
  /** null = the week had no daily target. */
  dailyTarget: number | null;
  /** Words written on each day of the week, in order. */
  dailyWords: number[];
};

export type AchievementInput = {
  /** Net words over all sessions. */
  lifetimeWords: number;
  /** Number of sessions with at least one word. */
  sessionsWithWords: number;
  /** The most words written in a single session. */
  longestSessionWords: number;
  currentStreak: number;
  weeks: AchievementWeek[];
};

export type AchievementProgress = {
  current: number;
  target: number;
  unit: "words" | "weeks";
};

type Definition = {
  id: string;
  title: string;
  description: string;
  isMet: (input: AchievementInput) => boolean;
  /** How far along a locked achievement is, where that can be measured. */
  progress?: (input: AchievementInput) => AchievementProgress;
};

function lifetimeWords(target: number, title: string): Definition {
  const label = target >= 1000 ? `${target / 1000}k` : String(target);
  return {
    id: `words_${label}`,
    title,
    description: `Write ${target.toLocaleString("en-US")} words in total.`,
    isMet: (input) => input.lifetimeWords >= target,
    progress: (input) => ({ current: input.lifetimeWords, target, unit: "words" }),
  };
}

function streak(target: number, title: string): Definition {
  return {
    id: `streak_${target}`,
    title,
    description: `Reach a ${target}-week streak.`,
    isMet: (input) => input.currentStreak >= target,
    progress: (input) => ({ current: input.currentStreak, target, unit: "weeks" }),
  };
}

const MARATHON_WORDS = 2000;

const DEFINITIONS: Definition[] = [
  {
    id: "first_session",
    title: "First words",
    description: "Finish a writing session with at least one word.",
    isMet: (input) => input.sessionsWithWords >= 1,
  },
  lifetimeWords(1_000, "One thousand"),
  lifetimeWords(10_000, "Ten thousand"),
  lifetimeWords(50_000, "Novella"),
  lifetimeWords(100_000, "Novel"),
  lifetimeWords(250_000, "Epic"),
  streak(4, "One month"),
  streak(10, "Ten weeks"),
  streak(26, "Half a year"),
  streak(52, "A full year"),
  {
    id: "goal_crusher",
    title: "Goal crusher",
    description: "Write at least twice your goal in one week.",
    isMet: (input) =>
      input.weeks.some((week) => week.goalWords > 0 && week.words >= 2 * week.goalWords),
  },
  {
    id: "perfect_week",
    title: "Perfect week",
    description: "Meet your daily target on every day of a week.",
    isMet: (input) =>
      input.weeks.some(
        (week) =>
          week.dailyTarget !== null &&
          week.dailyWords.length >= 7 &&
          week.dailyWords.every((words) => words >= (week.dailyTarget ?? 0)),
      ),
  },
  {
    id: "marathon",
    title: "Marathon",
    description: `Write ${MARATHON_WORDS.toLocaleString("en-US")} words in a single session.`,
    isMet: (input) => input.longestSessionWords >= MARATHON_WORDS,
    progress: (input) => ({
      current: input.longestSessionWords,
      target: MARATHON_WORDS,
      unit: "words",
    }),
  },
];

export type AchievementStatus = {
  id: string;
  title: string;
  description: string;
  /** Whether its condition holds right now. */
  isMet: boolean;
  /** Progress toward it, capped at the target; null when it cannot be measured. */
  progress: AchievementProgress | null;
};

/** Every achievement, in display order, with its current state. */
export function evaluateAchievements(input: AchievementInput): AchievementStatus[] {
  return DEFINITIONS.map((definition) => {
    const progress = definition.progress?.(input) ?? null;
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      isMet: definition.isMet(input),
      progress: progress && { ...progress, current: Math.min(progress.current, progress.target) },
    };
  });
}

/**
 * The achievements to unlock now: those whose condition holds and that are
 * not already unlocked. Calling it again with the result added to
 * `unlockedIds` returns nothing, so unlocking is idempotent.
 */
export function newlyUnlocked(input: AchievementInput, unlockedIds: ReadonlySet<string>): string[] {
  return DEFINITIONS.filter(
    (definition) => !unlockedIds.has(definition.id) && definition.isMet(input),
  ).map((definition) => definition.id);
}
