import { useProgressStore } from "@/features/stats";
import { EDITOR_FONTS, EDITOR_WIDTHS, THEMES, useSettingsStore } from "@/stores/settings-store";
import { GoalFields } from "./goal-fields";
import { NumberField } from "./number-field";
import { SegmentedControl } from "./segmented-control";
import { SettingRow } from "./setting-row";

const SECTION_HEADING =
  "border-b pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide";

/** The Settings view. Every change applies and saves immediately. */
export function SettingsView() {
  const settings = useSettingsStore();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-8 pt-2 pb-16">
        <h1 className="mb-8 text-2xl font-semibold tracking-tight">Settings</h1>

        <section aria-labelledby="settings-goals" className="mb-10">
          <h2 id="settings-goals" className={SECTION_HEADING}>
            Goals
          </h2>
          <GoalFields
            values={{
              weeklyGoal: settings.weeklyGoal,
              dailyTarget: settings.dailyTarget,
              weekStartsOn: settings.weekStartsOn,
            }}
            onChange={(goals) => void useProgressStore.getState().changeGoal(goals)}
          />
        </section>

        <section aria-labelledby="settings-appearance" className="mb-10">
          <h2 id="settings-appearance" className={SECTION_HEADING}>
            Appearance
          </h2>
          <SettingRow title="Theme" description="System follows your computer's setting.">
            <SegmentedControl
              label="Theme"
              options={THEMES}
              value={settings.theme}
              onChange={(theme) => settings.update({ theme })}
            />
          </SettingRow>
          <SettingRow title="Editor font">
            <SegmentedControl
              label="Editor font"
              options={EDITOR_FONTS}
              value={settings.editorFont}
              onChange={(editorFont) => settings.update({ editorFont })}
            />
          </SettingRow>
          <SettingRow title="Editor width">
            <SegmentedControl
              label="Editor width"
              options={EDITOR_WIDTHS}
              value={settings.editorWidth}
              onChange={(editorWidth) => settings.update({ editorWidth })}
            />
          </SettingRow>
        </section>

        <section aria-labelledby="settings-writing">
          <h2 id="settings-writing" className={SECTION_HEADING}>
            Writing
          </h2>
          <SettingRow
            title="Celebrations"
            description="A short animation when you reach your weekly goal."
          >
            <input
              type="checkbox"
              aria-label="Celebrations"
              className="mt-1 size-3.5 accent-foreground"
              checked={settings.celebrations}
              onChange={(event) => settings.update({ celebrations: event.currentTarget.checked })}
            />
          </SettingRow>
          <SettingRow
            title="Session idle time"
            description="Minutes without typing before a writing session ends."
          >
            <NumberField
              label="session idle minutes"
              value={settings.sessionIdleMinutes}
              min={1}
              max={120}
              step={1}
              onChange={(sessionIdleMinutes) => settings.update({ sessionIdleMinutes })}
            />
          </SettingRow>
        </section>
      </div>
    </div>
  );
}
