import { toast } from "sonner";
import { create } from "zustand";
import { getSettings, setSetting } from "@/lib/db";

export const THEMES = ["system", "light", "dark"] as const;
export const EDITOR_FONTS = ["sans", "serif", "mono"] as const;
export const EDITOR_WIDTHS = ["narrow", "medium", "wide"] as const;

export type Theme = (typeof THEMES)[number];
export type EditorFont = (typeof EDITOR_FONTS)[number];
export type EditorWidth = (typeof EDITOR_WIDTHS)[number];

/** Settings stored in the SQLite `settings` table (DESIGN_SPEC §5). */
export type Settings = {
  theme: Theme;
  weeklyGoal: number;
  /** null = no daily target. */
  dailyTarget: number | null;
  /** 0 = Sunday … 6 = Saturday. */
  weekStartsOn: number;
  editorFont: EditorFont;
  editorWidth: EditorWidth;
  celebrations: boolean;
  sessionIdleMinutes: number;
  /** Whether the first-launch setup has been completed. */
  onboarded: boolean;
  /** Start date of the last week whose goal was celebrated, so it happens once. */
  lastCelebratedWeek: string | null;
};

const DEFAULTS: Settings = {
  theme: "system",
  weeklyGoal: 2500,
  dailyTarget: null,
  weekStartsOn: 1,
  editorFont: "sans",
  editorWidth: "medium",
  celebrations: true,
  sessionIdleMinutes: 10,
  onboarded: false,
  lastCelebratedWeek: null,
};

const isPositiveInteger = (value: unknown) => Number.isInteger(value) && (value as number) > 0;

// A stored value that fails its check is ignored and the default applies.
const VALIDATORS: { [Key in keyof Settings]: (value: unknown) => boolean } = {
  theme: (value) => THEMES.includes(value as Theme),
  weeklyGoal: isPositiveInteger,
  dailyTarget: (value) => value === null || isPositiveInteger(value),
  weekStartsOn: (value) =>
    Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6,
  editorFont: (value) => EDITOR_FONTS.includes(value as EditorFont),
  editorWidth: (value) => EDITOR_WIDTHS.includes(value as EditorWidth),
  celebrations: (value) => typeof value === "boolean",
  sessionIdleMinutes: isPositiveInteger,
  onboarded: (value) => typeof value === "boolean",
  lastCelebratedWeek: (value) => value === null || typeof value === "string",
};

type SettingsState = Settings & {
  /** False until the stored settings have been read. */
  isLoaded: boolean;
  load: () => Promise<void>;
  /** Changes settings now and saves them in the background. */
  update: (changes: Partial<Settings>) => void;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULTS,
  isLoaded: false,

  load: async () => {
    try {
      const stored = await getSettings();
      const valid: Record<string, unknown> = {};
      for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
        if (key in stored && VALIDATORS[key](stored[key])) {
          valid[key] = stored[key];
        }
      }
      set({ ...(valid as Partial<Settings>), isLoaded: true });
    } catch (error) {
      // Defaults stay in place.
      console.error(error);
      set({ isLoaded: true });
    }
  },

  update: (changes) => {
    set(changes);
    for (const [key, value] of Object.entries(changes)) {
      setSetting(key, value).catch((error: unknown) => {
        console.error(error);
        toast.error("Could not save the setting.");
      });
    }
  },
}));
