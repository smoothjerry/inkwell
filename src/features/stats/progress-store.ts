import { toast } from "sonner";
import { create } from "zustand";
import { localDateOf } from "@/domain/sessions";
import { computeStreak } from "@/domain/streak";
import {
  applyGoalChange,
  ensureCurrentWeek,
  isWeekMet,
  resolveWeeks,
  weekContaining,
  wordsInWeek,
} from "@/domain/weeks";
import { listDailyWords, listWeeks, saveWeek } from "@/lib/db";
import { useSettingsStore } from "@/stores/settings-store";

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

  /** Recomputes everything from the stored sessions and weeks. */
  refresh: () => Promise<void>;
  /** Changes the weekly goal and daily target for this week and future weeks. */
  changeGoal: (weeklyGoal: number, dailyTarget: number | null) => Promise<void>;
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
      const results = weeks.map((week) => ({
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        words: wordsInWeek(week, wordsByDate),
        met: isWeekMet(wordsInWeek(week, wordsByDate), week.goalWords),
      }));
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

      set({
        isLoaded: true,
        celebrationCount,
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

  changeGoal: async (weeklyGoal, dailyTarget) => {
    useSettingsStore.getState().update({ weeklyGoal, dailyTarget });
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
