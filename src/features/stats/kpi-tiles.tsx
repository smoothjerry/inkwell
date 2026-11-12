import type { ReactNode } from "react";
import type { RecentSession } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useProgressStore } from "./progress-store";

const AVERAGE_OVER = 10;

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground">{label}</p>
      <div className="mt-2 font-mono text-2xl tabular-nums tracking-tight">{children}</div>
    </div>
  );
}

function weeks(count: number): string {
  return count === 1 ? "week" : "weeks";
}

type KpiTilesProps = {
  /** Newest first; the average uses the first ten. */
  recentSessions: RecentSession[];
};

/** The top row of the Stats view: five headline numbers. */
export function KpiTiles({ recentSessions }: KpiTilesProps) {
  const weekWords = useProgressStore((state) => state.weekWords);
  const goalWords = useProgressStore((state) => state.goalWords);
  const currentStreak = useProgressStore((state) => state.currentStreak);
  const longestStreak = useProgressStore((state) => state.longestStreak);
  const lifetimeWords = useProgressStore((state) => state.lifetimeWords);

  const lastSessions = recentSessions.slice(0, AVERAGE_OVER);
  const average =
    lastSessions.length === 0
      ? null
      : Math.round(
          lastSessions.reduce((sum, session) => sum + session.words, 0) / lastSessions.length,
        );
  const percent = goalWords > 0 ? Math.min(100, (weekWords / goalWords) * 100) : 0;
  const unit = "ml-1.5 font-sans text-[13px] text-muted-foreground tracking-normal";

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
      <Tile label="This week">
        {weekWords.toLocaleString()}
        <span className={unit}>/ {goalWords.toLocaleString()}</span>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
          <div
            className={cn(
              "h-full rounded-full",
              weekWords >= goalWords ? "bg-success" : "bg-foreground",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </Tile>
      <Tile label="Current streak">
        {currentStreak}
        <span className={unit}>{weeks(currentStreak)}</span>
      </Tile>
      <Tile label="Longest streak">
        {longestStreak}
        <span className={unit}>{weeks(longestStreak)}</span>
      </Tile>
      <Tile label="Avg words / session">
        {average === null ? "—" : average.toLocaleString()}
        {lastSessions.length > 0 && <span className={unit}>last {lastSessions.length}</span>}
      </Tile>
      <Tile label="Lifetime words">{lifetimeWords.toLocaleString()}</Tile>
    </div>
  );
}
