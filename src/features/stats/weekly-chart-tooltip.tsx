type WeeklyChartTooltipProps = {
  active?: boolean;
  payload?: readonly { payload?: { label: string; words: number; goal: number; met: boolean } }[];
};

/** Tooltip for a bar in the weekly chart. Recharts supplies the props. */
export function WeeklyChartTooltip({ active, payload }: WeeklyChartTooltipProps) {
  const week = payload?.[0]?.payload;
  if (!active || !week) {
    return null;
  }

  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-[12px] shadow-overlay">
      <p className="text-muted-foreground">Week of {week.label}</p>
      <p className="font-mono tabular-nums">
        {week.words.toLocaleString()} / {week.goal.toLocaleString()} words
        {week.met && " · met"}
      </p>
    </div>
  );
}
