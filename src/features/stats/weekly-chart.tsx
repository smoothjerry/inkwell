import { Bar, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatLocalDate } from "./format";
import { useProgressStore } from "./progress-store";
import { WeeklyChartTooltip } from "./weekly-chart-tooltip";

const WEEKS_SHOWN = 12;

/** Words per week for the last 12 stored weeks, with each week's goal as a dashed line. */
export function WeeklyChart() {
  const weeks = useProgressStore((state) => state.weeks);

  const data = weeks.slice(-WEEKS_SHOWN).map((week) => ({
    label: formatLocalDate(week.weekStart),
    words: week.words,
    goal: week.goalWords,
    met: week.met,
  }));

  if (data.length === 0) {
    return <p className="text-muted-foreground">No weeks recorded yet.</p>;
  }

  const metCount = data.filter((week) => week.met).length;

  return (
    <div
      role="img"
      aria-label={`Words per week for the last ${data.length} weeks. Goal met in ${metCount}.`}
      className="h-52 rounded-lg border p-4"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--fg-muted)", fontSize: 11 }}
          />
          <Tooltip
            content={<WeeklyChartTooltip />}
            cursor={{ fill: "var(--bg-subtle)" }}
            isAnimationActive={false}
          />
          <Bar dataKey="words" radius={[3, 3, 0, 0]} maxBarSize={36} animationDuration={200}>
            {data.map((week) => (
              // Met weeks in the foreground color, unmet weeks in muted gray.
              <Cell key={week.label} fill={week.met ? "var(--fg)" : "var(--border-strong)"} />
            ))}
          </Bar>
          <Line
            dataKey="goal"
            type="step"
            stroke="var(--fg-muted)"
            strokeWidth={1}
            strokeDasharray="4 3"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
