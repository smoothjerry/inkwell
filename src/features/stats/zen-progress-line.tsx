import { useProgressStore } from "./progress-store";

/** The 2 px weekly-progress line shown along the bottom edge in zen mode. */
export function ZenProgressLine() {
  const weekWords = useProgressStore((state) => state.weekWords);
  const goalWords = useProgressStore((state) => state.goalWords);

  if (goalWords <= 0) {
    return null;
  }

  return (
    <div className="zen-progress" aria-hidden="true">
      <div
        data-met={weekWords >= goalWords}
        style={{ width: `${Math.min(100, (weekWords / goalWords) * 100)}%` }}
      />
    </div>
  );
}
