import type { ReactNode } from "react";
import { useProgressStore } from "@/features/stats";
import { DIM_MODES, EDITOR_WIDTHS, THEMES, useSettingsStore } from "@/stores/settings-store";
import { FontPicker } from "./font-picker";
import { GoalFields } from "./goal-fields";
import { NumberField } from "./number-field";
import { SegmentedControl } from "./segmented-control";
import { SettingRow } from "./setting-row";

const SECTION_HEADING =
  "border-b pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide";

type SettingsViewProps = {
  /** The Updates section's rows, owned by the app shell (DESIGN_SPEC §7.12). */
  updates?: ReactNode;
};

/** The Settings view. Every change applies and saves immediately. */
export function SettingsView({ updates }: SettingsViewProps) {
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
          <SettingRow title="Editor font" description="Used by documents that have not chosen one.">
            <FontPicker
              label="Editor font"
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

        <section aria-labelledby="settings-writing" className="mb-10">
          <h2 id="settings-writing" className={SECTION_HEADING}>
            Writing
          </h2>
          <SettingRow
            title="Typewriter scrolling"
            description="Keeps the line you are writing near the middle of the window."
          >
            <input
              type="checkbox"
              aria-label="Typewriter scrolling"
              className="mt-1 size-3.5 accent-foreground"
              checked={settings.typewriterMode}
              onChange={(event) => settings.update({ typewriterMode: event.currentTarget.checked })}
            />
          </SettingRow>
          <SettingRow
            title="Dimming"
            description="Fades everything except the sentence or paragraph you are writing."
          >
            <SegmentedControl
              label="Dimming"
              options={DIM_MODES}
              value={settings.dimMode}
              onChange={(dimMode) => settings.update({ dimMode })}
            />
          </SettingRow>
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

        {updates && (
          <section aria-labelledby="settings-updates">
            <h2 id="settings-updates" className={SECTION_HEADING}>
              Updates
            </h2>
            {updates}
          </section>
        )}
      </div>
    </div>
  );
}
