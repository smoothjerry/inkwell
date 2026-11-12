import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProgressStore } from "./progress-store";

/** Status-bar streak: a flame and the number of consecutive met weeks. */
export function StreakBadge() {
  const currentStreak = useProgressStore((state) => state.currentStreak);
  const isLoaded = useProgressStore((state) => state.isLoaded);

  if (!isLoaded) {
    return null;
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled group; <fieldset> is for form controls.
    <div
      role="group"
      aria-label={`Current streak: ${currentStreak} ${currentStreak === 1 ? "week" : "weeks"}`}
      className="flex items-center gap-1 px-1.5 font-mono text-[12px] text-muted-foreground tabular-nums"
    >
      <Flame
        className={cn("size-3.5", currentStreak > 0 && "text-streak")}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className={cn(currentStreak > 0 && "text-foreground")}>{currentStreak}</span>
    </div>
  );
}
