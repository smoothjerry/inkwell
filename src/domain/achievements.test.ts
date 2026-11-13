import { describe, expect, it } from "vitest";
import { type AchievementInput, type AchievementWeek, newlyUnlocked } from "./achievements";

const NOTHING: AchievementInput = {
  lifetimeWords: 0,
  sessionsWithWords: 0,
  longestSessionWords: 0,
  currentStreak: 0,
  weeks: [],
};

function week(overrides: Partial<AchievementWeek>): AchievementWeek {
  return { words: 0, goalWords: 2500, dailyTarget: null, dailyWords: [], ...overrides };
}

/** Whether `id` would unlock for `input`, starting with nothing unlocked. */
function unlocks(id: string, input: Partial<AchievementInput>): boolean {
  return newlyUnlocked({ ...NOTHING, ...input }, new Set()).includes(id);
}

describe("idempotent unlocks", () => {
  const input: AchievementInput = {
    ...NOTHING,
    lifetimeWords: 12_000,
    sessionsWithWords: 8,
    longestSessionWords: 2_400,
    currentStreak: 4,
  };

  it("returns each met achievement once", () => {
    expect(newlyUnlocked(input, new Set())).toEqual([
      "first_session",
      "words_1k",
      "words_10k",
      "streak_4",
      "marathon",
    ]);
  });

  it("returns nothing when the same achievements are already unlocked", () => {
    const first = newlyUnlocked(input, new Set());

    expect(newlyUnlocked(input, new Set(first))).toEqual([]);
  });

  it("returns only what is new when some are already unlocked", () => {
    const unlocked = new Set(["first_session", "words_1k", "streak_4"]);

    expect(newlyUnlocked(input, unlocked)).toEqual(["words_10k", "marathon"]);
  });
});

describe("threshold boundaries", () => {
  it.each([
    ["first_session", { sessionsWithWords: 0 }, { sessionsWithWords: 1 }],
    ["words_1k", { lifetimeWords: 999 }, { lifetimeWords: 1_000 }],
    ["words_10k", { lifetimeWords: 9_999 }, { lifetimeWords: 10_000 }],
    ["words_50k", { lifetimeWords: 49_999 }, { lifetimeWords: 50_000 }],
    ["words_100k", { lifetimeWords: 99_999 }, { lifetimeWords: 100_000 }],
    ["words_250k", { lifetimeWords: 249_999 }, { lifetimeWords: 250_000 }],
    ["streak_4", { currentStreak: 3 }, { currentStreak: 4 }],
    ["streak_10", { currentStreak: 9 }, { currentStreak: 10 }],
    ["streak_26", { currentStreak: 25 }, { currentStreak: 26 }],
    ["streak_52", { currentStreak: 51 }, { currentStreak: 52 }],
    ["marathon", { longestSessionWords: 1_999 }, { longestSessionWords: 2_000 }],
    [
      "goal_crusher",
      { weeks: [week({ words: 4_999, goalWords: 2500 })] },
      { weeks: [week({ words: 5_000, goalWords: 2500 })] },
    ],
    [
      "perfect_week",
      { weeks: [week({ dailyTarget: 300, dailyWords: [300, 300, 300, 299, 300, 300, 300] })] },
      { weeks: [week({ dailyTarget: 300, dailyWords: [300, 300, 300, 300, 300, 300, 300] })] },
    ],
  ] satisfies [string, Partial<AchievementInput>, Partial<AchievementInput>][])(
    "%s stays locked just below its threshold and unlocks at it",
    (id, below, at) => {
      expect(unlocks(id, below)).toBe(false);
      expect(unlocks(id, at)).toBe(true);
    },
  );

  it("does not give a perfect week when no daily target was set", () => {
    const weeks = [week({ dailyTarget: null, dailyWords: [500, 500, 500, 500, 500, 500, 500] })];

    expect(unlocks("perfect_week", { weeks })).toBe(false);
  });
});
