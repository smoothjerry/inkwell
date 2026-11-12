import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import { GoalConfetti } from "./goal-confetti";
import { useProgressStore } from "./progress-store";

/** Status-bar weekly goal: "1,240 / 2,500 this week" and a progress bar. */
export function WeekProgress() {
  const weekWords = useProgressStore((state) => state.weekWords);
  const goalWords = useProgressStore((state) => state.goalWords);
  const isLoaded = useProgressStore((state) => state.isLoaded);
  const celebrationCount = useProgressStore((state) => state.celebrationCount);
  const celebrations = useSettingsStore((state) => state.celebrations);

  if (!isLoaded || goalWords <= 0) {
    return null;
  }

  const isMet = weekWords >= goalWords;
  const percent = Math.min(100, (weekWords / goalWords) * 100);
  const summary = `${weekWords.toLocaleString()} of ${goalWords.toLocaleString()} words this week`;

  return (
    <div className="relative flex items-center gap-2 px-1.5">
      <p className="font-mono text-[12px] text-muted-foreground tabular-nums" aria-hidden="true">
        <span className="text-foreground">{weekWords.toLocaleString()}</span> /{" "}
        {goalWords.toLocaleString()} this week
      </p>
      <div
        role="progressbar"
        aria-label="Weekly goal"
        aria-valuemin={0}
        aria-valuemax={goalWords}
        aria-valuenow={Math.min(weekWords, goalWords)}
        aria-valuetext={summary}
        className="h-1 w-28 overflow-hidden rounded-full bg-border"
      >
        <div
          className={cn(
            "relative h-full rounded-full transition-[width,background-color] duration-200 ease-out",
            isMet ? "bg-success" : "bg-foreground",
          )}
          style={{ width: `${percent}%` }}
        >
          {celebrations && celebrationCount > 0 && (
            <div key={celebrationCount} className="goal-shimmer" />
          )}
        </div>
      </div>
      <GoalConfetti />
    </div>
  );
}
