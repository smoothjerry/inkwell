import { cn } from "@/lib/utils";
import { NumberField } from "./number-field";
import { SettingRow } from "./setting-row";

export type GoalValues = {
  weeklyGoal: number;
  dailyTarget: number | null;
  weekStartsOn: number;
};

type GoalFieldsProps = {
  values: GoalValues;
  onChange: (values: GoalValues) => void;
};

const PRESETS = [1000, 2500, 5000, 10000];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** A sensible first daily target: a seventh of the weekly goal, to the nearest 50. */
function suggestedDailyTarget(weeklyGoal: number): number {
  return Math.max(50, Math.round(weeklyGoal / 7 / 50) * 50);
}

/** Weekly goal, optional daily target, and week start. Used in Settings and onboarding. */
export function GoalFields({ values, onChange }: GoalFieldsProps) {
  const { weeklyGoal, dailyTarget, weekStartsOn } = values;

  return (
    <>
      <SettingRow title="Weekly goal" description="Words per week. Meeting it keeps your streak.">
        <NumberField
          label="weekly goal"
          value={weeklyGoal}
          min={100}
          max={1_000_000}
          step={250}
          onChange={(next) => onChange({ ...values, weeklyGoal: next })}
        />
        <div className="flex gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={preset === weeklyGoal}
              className={cn(
                "h-6 rounded-md border px-2 font-mono text-[12px] text-muted-foreground tabular-nums outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                preset === weeklyGoal && "border-border-strong bg-subtle text-foreground",
              )}
              onClick={() => onChange({ ...values, weeklyGoal: preset })}
            >
              {preset.toLocaleString()}
            </button>
          ))}
        </div>
      </SettingRow>

      <SettingRow
        title="Daily target"
        description="Optional. Shown as a ring for today; it does not affect the streak."
      >
        <label className="flex items-center gap-2 text-muted-foreground">
          <input
            type="checkbox"
            className="size-3.5 accent-foreground"
            checked={dailyTarget !== null}
            onChange={(event) =>
              onChange({
                ...values,
                dailyTarget: event.currentTarget.checked ? suggestedDailyTarget(weeklyGoal) : null,
              })
            }
          />
          Set a daily target
        </label>
        {dailyTarget !== null && (
          <NumberField
            label="daily target"
            value={dailyTarget}
            min={50}
            max={100_000}
            step={50}
            onChange={(next) => onChange({ ...values, dailyTarget: next })}
          />
        )}
      </SettingRow>

      <SettingRow
        title="Week starts on"
        description="A change applies from the next week; this week runs on until then."
      >
        <select
          aria-label="Week starts on"
          className="h-7 rounded-md border bg-background px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={weekStartsOn}
          onChange={(event) =>
            onChange({ ...values, weekStartsOn: Number(event.currentTarget.value) })
          }
        >
          {WEEKDAYS.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
      </SettingRow>
    </>
  );
}
