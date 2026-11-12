import { useProgressStore } from "./progress-store";

const RADIUS = 5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Status-bar ring for the optional daily target. Hidden when no target is set. */
export function TodayRing() {
  const todayWords = useProgressStore((state) => state.todayWords);
  const dailyTarget = useProgressStore((state) => state.dailyTarget);

  if (dailyTarget === null || dailyTarget <= 0) {
    return null;
  }

  const fraction = Math.min(1, todayWords / dailyTarget);
  const isMet = todayWords >= dailyTarget;

  return (
    <div
      role="img"
      aria-label={`Today: ${todayWords.toLocaleString()} of ${dailyTarget.toLocaleString()} words`}
      className="flex items-center gap-1.5 px-1.5 text-[12px] text-muted-foreground"
    >
      <svg viewBox="0 0 14 14" className="size-3.5 -rotate-90" aria-hidden="true">
        <circle cx="7" cy="7" r={RADIUS} fill="none" strokeWidth="2" className="stroke-border" />
        <circle
          cx="7"
          cy="7"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
          className={isMet ? "stroke-success" : "stroke-foreground"}
        />
      </svg>
      today
    </div>
  );
}
