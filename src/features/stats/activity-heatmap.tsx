import { useState } from "react";
import { localDateOf } from "@/domain/sessions";
import { addDays, weekStartFor } from "@/domain/weeks";
import { useSettingsStore } from "@/stores/settings-store";
import { formatLocalDate } from "./format";
import { useProgressStore } from "./progress-store";

const WEEKS = 52;
const CELL = 11;
const STEP = CELL + 3;
const LEFT = 30;
const TOP = 16;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Monochrome scale: empty, then the foreground at 12 / 30 / 60 / 100 % (§8).
const BAND_OPACITY = [0, 0.12, 0.3, 0.6, 1];

/** 0 = nothing written; 1–3 = under a third, two thirds, all of the reference; 4 = met. */
function band(words: number, reference: number): number {
  if (words <= 0) {
    return 0;
  }
  const ratio = words / reference;
  if (ratio >= 1) {
    return 4;
  }
  return ratio >= 2 / 3 ? 3 : ratio >= 1 / 3 ? 2 : 1;
}

function describe(date: string, words: number): string {
  return `${formatLocalDate(date, true)} · ${words.toLocaleString()} ${words === 1 ? "word" : "words"}`;
}

/**
 * The last 52 weeks, one square per day, GitHub-style. Intensity is relative
 * to the daily target if one is set, otherwise to a seventh of the weekly goal.
 */
export function ActivityHeatmap() {
  const wordsByDate = useProgressStore((state) => state.wordsByDate);
  const weekStartsOn = useSettingsStore((state) => state.weekStartsOn);
  const dailyTarget = useSettingsStore((state) => state.dailyTarget);
  const weeklyGoal = useSettingsStore((state) => state.weeklyGoal);
  const [hovered, setHovered] = useState<string | null>(null);

  const today = localDateOf(Date.now());
  const firstDay = addDays(weekStartFor(today, weekStartsOn), -7 * (WEEKS - 1));
  const reference = dailyTarget ?? weeklyGoal / 7;

  const columns = Array.from({ length: WEEKS }, (_, column) => {
    const columnStart = addDays(firstDay, column * 7);
    const days = Array.from({ length: 7 }, (_, row) => addDays(columnStart, row)).filter(
      (date) => date <= today,
    );
    return { columnStart, days };
  });
  const activeDays = columns
    .flatMap((column) => column.days)
    .filter((date) => (wordsByDate[date] ?? 0) > 0).length;

  return (
    <div className="rounded-lg border p-4">
      <svg
        viewBox={`0 0 ${LEFT + WEEKS * STEP} ${TOP + 7 * STEP}`}
        className="w-full"
        role="img"
        aria-label={`Writing activity for the last ${WEEKS} weeks: ${activeDays} active ${activeDays === 1 ? "day" : "days"}.`}
      >
        {[1, 3, 5].map((row) => (
          <text key={row} x={0} y={TOP + row * STEP + CELL - 2} fontSize="9" fill="var(--fg-muted)">
            {WEEKDAYS[(weekStartsOn + row) % 7]}
          </text>
        ))}

        {columns.map(({ columnStart, days }, column) => {
          const month = columnStart.slice(5, 7);
          const previousMonth = column > 0 ? addDays(columnStart, -7).slice(5, 7) : null;
          return (
            <g key={columnStart}>
              {month !== previousMonth && (
                <text x={LEFT + column * STEP} y={10} fontSize="9" fill="var(--fg-muted)">
                  {new Date(`${columnStart}T00:00:00`).toLocaleDateString(undefined, {
                    month: "short",
                  })}
                </text>
              )}
              {days.map((date, row) => {
                const words = wordsByDate[date] ?? 0;
                const level = band(words, reference);
                return (
                  // biome-ignore lint/a11y/noStaticElementInteractions: hover only updates the caption; the chart has a text summary.
                  <rect
                    key={date}
                    x={LEFT + column * STEP}
                    y={TOP + row * STEP}
                    width={CELL}
                    height={CELL}
                    rx={2}
                    fill={level === 0 ? "var(--border)" : "var(--fg)"}
                    fillOpacity={level === 0 ? 1 : BAND_OPACITY[level]}
                    onMouseEnter={() => setHovered(date)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <title>{describe(date, words)}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
        <p className="font-mono tabular-nums" aria-live="off">
          {hovered ? describe(hovered, wordsByDate[hovered] ?? 0) : "Hover a day for details"}
        </p>
        <div className="flex items-center gap-1" aria-hidden="true">
          Less
          {BAND_OPACITY.map((opacity, level) => (
            <span
              key={opacity}
              className="size-2.5 rounded-[2px]"
              style={{
                background: level === 0 ? "var(--border)" : "var(--fg)",
                opacity: level === 0 ? 1 : opacity,
              }}
            />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
