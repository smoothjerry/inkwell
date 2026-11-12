import {
  CalendarCheck,
  Flame,
  type LucideIcon,
  PenLine,
  Rocket,
  Sparkles,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProgressStore } from "./progress-store";

function iconFor(id: string): LucideIcon {
  if (id.startsWith("words_")) {
    return PenLine;
  }
  if (id.startsWith("streak_")) {
    return Flame;
  }
  const icons: Record<string, LucideIcon> = {
    first_session: Sparkles,
    goal_crusher: Rocket,
    perfect_week: CalendarCheck,
    marathon: Timer,
  };
  return icons[id] ?? Sparkles;
}

/** Every achievement: unlocked ones in full color with their date, locked ones outlined with progress. */
export function AchievementsGrid() {
  const achievements = useProgressStore((state) => state.achievements);

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
      {achievements.map((achievement) => {
        const Icon = iconFor(achievement.id);
        const isUnlocked = achievement.unlockedAt !== null;
        const { progress } = achievement;

        return (
          <li
            key={achievement.id}
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-3",
              !isUnlocked && "border-dashed text-muted-foreground",
            )}
          >
            <div className="flex items-center gap-2">
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isUnlocked &&
                    (achievement.id.startsWith("streak_") ? "text-streak" : "text-success"),
                )}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className={cn("font-medium", isUnlocked && "text-foreground")}>
                {achievement.title}
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground">{achievement.description}</p>

            {isUnlocked ? (
              <p className="mt-auto pt-1 text-[12px] text-muted-foreground">
                Unlocked{" "}
                {new Date(achievement.unlockedAt ?? 0).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            ) : (
              <div className="mt-auto pt-1">
                {progress ? (
                  <>
                    <p className="font-mono text-[12px] tabular-nums">
                      {progress.current.toLocaleString()} / {progress.target.toLocaleString()}{" "}
                      {progress.unit}
                    </p>
                    <div
                      className="mt-1.5 h-1 overflow-hidden rounded-full bg-border"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(progress.current / progress.target) * 100}%`,
                          background: "var(--fg-muted)",
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-[12px]">Locked</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
