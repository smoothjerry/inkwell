import { toast } from "sonner";
import { create } from "zustand";
import { localDateOf } from "@/domain/sessions";
import { computeStreak } from "@/domain/streak";
import {
  applyGoalChange,
  ensureCurrentWeek,
  type GoalSettings,
  isWeekMet,
  resolveWeeks,
  weekContaining,
  wordsInWeek,
} from "@/domain/weeks";
import { listDailyWords, listWeeks, saveWeek } from "@/lib/db";
import { useSettingsStore } from "@/stores/settings-store";
import { type AchievementView, checkAchievements } from "./achievement-check";

/** A stored week with its words, for the chart and the streak. */
export type WeekSummary = {
  weekStart: string;
  weekEnd: string;
  words: number;
  goalWords: number;
  met: boolean;
};

type ProgressState = {
  /** False until progress has been read from the database once. */
  isLoaded: boolean;
  /** Start date of the current week. */
  weekStart: string | null;
  weekWords: number;
  /** This week's goal (pro-rated if the week is longer than 7 days). */
  goalWords: number;
  todayWords: number;
  dailyTarget: number | null;
  currentStreak: number;
  longestStreak: number;
  /** Goes up by one each time the weekly goal is newly reached; drives the animation. */
  celebrationCount: number;
  /** Every stored week, oldest first. */
  weeks: WeekSummary[];
  /** Net words per local date ('YYYY-MM-DD'). */
  wordsByDate: Record<string, number>;
  lifetimeWords: number;
  /** Achievements with their current state and, if unlocked, when. */
  achievements: AchievementView[];

  /** Recomputes everything from the stored sessions and weeks. */
  refresh: () => Promise<void>;
  /**
   * Saves the goal settings. The weekly goal and daily target apply to this
   * week and future weeks; a new week start applies from the next week.
   */
  changeGoal: (goals: GoalSettings) => Promise<void>;
};

function goalSettings() {
  const { weekStartsOn, weeklyGoal, dailyTarget } = useSettingsStore.getState();
  return { weekStartsOn, weeklyGoal, dailyTarget };
}

/**
 * Weekly progress and the streak, shown in the status bar. Both are derived
 * on demand from `sessions` and `weeks`; the streak is never stored (§6.4).
 */
export const useProgressStore = create<ProgressState>((set, get) => ({
  isLoaded: false,
  weekStart: null,
  weekWords: 0,
  goalWords: 0,
  todayWords: 0,
  dailyTarget: null,
  currentStreak: 0,
  longestStreak: 0,
  celebrationCount: 0,
  weeks: [],
  wordsByDate: {},
  lifetimeWords: 0,
  achievements: [],

  refresh: async () => {
    try {
      const settings = goalSettings();
      const today = localDateOf(Date.now());

      // The first time a week is touched, it gets a row with the goal snapshot.
      const ensured = ensureCurrentWeek(await listWeeks(), today, settings);
      if (ensured.created) {
        await saveWeek(ensured.created);
      }

      const dailyWords = await listDailyWords();
      const wordsByDate = new Map(dailyWords.map((day) => [day.localDate, day.words]));
      const weeks = resolveWeeks(ensured.rows, settings.weekStartsOn);
      const results: WeekSummary[] = weeks.map((week) => {
        const words = wordsInWeek(week, wordsByDate);
        return {
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          words,
          goalWords: week.goalWords,
          met: isWeekMet(words, week.goalWords),
        };
      });
      const streak = computeStreak(results, today);
      const current = weekContaining(weeks, today);
      const weekWords = results.find((week) => week.weekStart === current?.weekStart)?.words ?? 0;

      // Celebrate the first time this week's goal is reached (§6.7). A goal
      // that was already met when the app opened is noted but not celebrated.
      let { celebrationCount } = get();
      const { lastCelebratedWeek, update } = useSettingsStore.getState();
      if (
        current &&
        isWeekMet(weekWords, current.goalWords) &&
        current.weekStart !== lastCelebratedWeek
      ) {
        update({ lastCelebratedWeek: current.weekStart });
        if (get().isLoaded) {
          celebrationCount += 1;
          toast.success(`Weekly goal reached — 🔥 ${streak.current}-week streak`);
        }
      }

      const { achievements, lifetimeWords } = await checkAchievements(
        weeks,
        wordsByDate,
        streak.current,
      );

      set({
        isLoaded: true,
        celebrationCount,
        weeks: results,
        wordsByDate: Object.fromEntries(wordsByDate),
        lifetimeWords,
        achievements,
        weekStart: current?.weekStart ?? null,
        weekWords,
        goalWords: current?.goalWords ?? settings.weeklyGoal,
        todayWords: wordsByDate.get(today) ?? 0,
        dailyTarget: current?.dailyTarget ?? null,
        currentStreak: streak.current,
        longestStreak: streak.longest,
      });
    } catch (error) {
      // Progress is not critical to writing; keep the last known values.
      console.error(error);
    }
  },

  changeGoal: async (goals) => {
    useSettingsStore.getState().update(goals);
    try {
      const today = localDateOf(Date.now());
      const { changed } = applyGoalChange(await listWeeks(), today, goalSettings());
      if (changed) {
        await saveWeek(changed);
      }
    } catch (error) {
      console.error(error);
    }
    await get().refresh();
  },
}));
