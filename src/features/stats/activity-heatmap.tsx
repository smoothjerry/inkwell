import { type KeyboardEvent, useState } from "react";
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
  // The day picked with the arrow keys while the chart has focus.
  const [focused, setFocused] = useState<string | null>(null);

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
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const from = focused ?? today;
    const next = {
      ArrowLeft: addDays(from, -7),
      ArrowRight: addDays(from, 7),
      ArrowUp: addDays(from, -1),
      ArrowDown: addDays(from, 1),
      Home: firstDay,
      End: today,
    }[event.key];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    // Dates are 'YYYY-MM-DD', so they compare as strings; stay within the chart.
    if (next < firstDay) {
      setFocused(firstDay);
    } else if (next > today) {
      setFocused(today);
    } else {
      setFocused(next);
    }
  }

  const shown = hovered ?? focused;

  const allDays = columns.flatMap((column) => column.days);
  const activeDays = allDays.filter((date) => (wordsByDate[date] ?? 0) > 0).length;
  const current = focused ?? today;

  return (
    <div className="rounded-lg border p-4">
      {/* A slider over the days: one tab stop, the arrow keys move between
          days, and each day's words are its spoken value (DESIGN_SPEC §8). */}
      <div
        className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        role="slider"
        aria-label={`Writing activity for the last ${WEEKS} weeks: ${activeDays} active ${activeDays === 1 ? "day" : "days"}. Arrow keys move by day and week.`}
        aria-valuemin={0}
        aria-valuemax={allDays.length - 1}
        aria-valuenow={allDays.indexOf(current)}
        aria-valuetext={describe(current, wordsByDate[current] ?? 0)}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(today)}
        onBlur={() => setFocused(null)}
      >
        <svg
          viewBox={`0 0 ${LEFT + WEEKS * STEP} ${TOP + 7 * STEP}`}
          className="w-full"
          aria-hidden="true"
        >
          {[1, 3, 5].map((row) => (
            <text
              key={row}
              x={0}
              y={TOP + row * STEP + CELL - 2}
              fontSize="9"
              fill="var(--fg-muted)"
            >
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
                    // biome-ignore lint/a11y/noStaticElementInteractions: hover only updates the caption; the keyboard reaches the same caption through the chart's arrow keys.
                    <rect
                      key={date}
                      x={LEFT + column * STEP}
                      y={TOP + row * STEP}
                      width={CELL}
                      height={CELL}
                      rx={2}
                      fill={level === 0 ? "var(--border)" : "var(--fg)"}
                      fillOpacity={level === 0 ? 1 : BAND_OPACITY[level]}
                      stroke={date === focused ? "var(--fg)" : undefined}
                      strokeWidth={date === focused ? 1.5 : undefined}
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
      </div>

      <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
        {/* The slider's value already speaks the day, so this caption is visual only. */}
        <p className="font-mono tabular-nums" aria-hidden="true">
          {shown ? describe(shown, wordsByDate[shown] ?? 0) : "Hover a day for details"}
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
