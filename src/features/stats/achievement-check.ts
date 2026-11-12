import { toast } from "sonner";
import { type AchievementStatus, evaluateAchievements, newlyUnlocked } from "@/domain/achievements";
import { addDays, type Week, wordsInWeek } from "@/domain/weeks";
import { getSessionTotals, listAchievements, unlockAchievement } from "@/lib/db";

export type AchievementView = AchievementStatus & {
  /** When it was unlocked (UTC ms), or null while locked. */
  unlockedAt: number | null;
};

/**
 * Evaluates the achievements against current data, stores and announces any
 * new unlocks (DESIGN_SPEC §6.6), and returns the state for display.
 */
export async function checkAchievements(
  weeks: Week[],
  wordsByDate: ReadonlyMap<string, number>,
  currentStreak: number,
): Promise<{ achievements: AchievementView[]; lifetimeWords: number }> {
  const [totals, stored] = await Promise.all([getSessionTotals(), listAchievements()]);
  const unlockedAt = new Map(stored.map((row) => [row.id, row.unlockedAt]));

  const input = {
    ...totals,
    currentStreak,
    weeks: weeks.map((week) => ({
      words: wordsInWeek(week, wordsByDate),
      goalWords: week.goalWords,
      dailyTarget: week.dailyTarget,
      dailyWords: Array.from(
        { length: week.days },
        (_, offset) => wordsByDate.get(addDays(week.weekStart, offset)) ?? 0,
      ),
    })),
  };

  const statuses = evaluateAchievements(input);
  const now = Date.now();
  for (const id of newlyUnlocked(input, new Set(unlockedAt.keys()))) {
    await unlockAchievement(id, now);
    unlockedAt.set(id, now);
    const title = statuses.find((status) => status.id === id)?.title ?? id;
    toast(`Achievement unlocked: ${title}`, { icon: "🏆" });
  }

  return {
    lifetimeWords: totals.lifetimeWords,
    achievements: statuses.map((status) => ({
      ...status,
      unlockedAt: unlockedAt.get(status.id) ?? null,
    })),
  };
}
