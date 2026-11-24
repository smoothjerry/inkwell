import { toast } from "sonner";
import { create } from "zustand";
import { type BookFormatId, DEFAULT_BOOK_FORMAT_ID, isBookFormatId } from "@/domain/book-formats";
import { DEFAULT_FONT_ID, type FontId, toFontId } from "@/domain/fonts";
import { LIBRARY_SORTS, type LibrarySort } from "@/domain/library-sort";
import { getSettings, setSetting } from "@/lib/db";

export const THEMES = ["system", "light", "dark"] as const;
export const EDITOR_WIDTHS = ["narrow", "medium", "wide"] as const;
export const DIM_MODES = ["off", "sentence", "paragraph"] as const;

/** Sidebar width limits in px (DESIGN_SPEC §7.1). */
export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 400;
export const SIDEBAR_WIDTH_DEFAULT = 260;

export type Theme = (typeof THEMES)[number];
export type EditorWidth = (typeof EDITOR_WIDTHS)[number];
export type DimMode = (typeof DIM_MODES)[number];

/** Settings stored in the SQLite `settings` table (DESIGN_SPEC §5). */
export type Settings = {
  theme: Theme;
  weeklyGoal: number;
  /** null = no daily target. */
  dailyTarget: number | null;
  /** 0 = Sunday … 6 = Saturday. */
  weekStartsOn: number;
  /** The font of documents that have not chosen one (DESIGN_SPEC §7.11). */
  editorFont: FontId;
  editorWidth: EditorWidth;
  /** The print format of page counts for documents outside any book (DESIGN_SPEC §7.9). */
  defaultBookFormat: BookFormatId;
  /** Whether the formatting toolbar is shown above the document (⌘⌥T). */
  showToolbar: boolean;
  /** Keep the caret line near the middle of the window while writing. */
  typewriterMode: boolean;
  /** Fade everything except the current sentence or paragraph. */
  dimMode: DimMode;
  celebrations: boolean;
  /** Whether the library sidebar is hidden (⌘\). */
  sidebarCollapsed: boolean;
  /** Sidebar width in px, from SIDEBAR_WIDTH_MIN to SIDEBAR_WIDTH_MAX. */
  sidebarWidth: number;
  /** How the library sidebar orders folders and documents. */
  librarySort: LibrarySort;
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
  editorFont: DEFAULT_FONT_ID,
  editorWidth: "medium",
  defaultBookFormat: DEFAULT_BOOK_FORMAT_ID,
  showToolbar: true,
  typewriterMode: false,
  dimMode: "off",
  celebrations: true,
  sidebarCollapsed: false,
  sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
  librarySort: "manual",
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
  editorFont: (value) => toFontId(value) !== null,
  editorWidth: (value) => EDITOR_WIDTHS.includes(value as EditorWidth),
  defaultBookFormat: isBookFormatId,
  showToolbar: (value) => typeof value === "boolean",
  typewriterMode: (value) => typeof value === "boolean",
  dimMode: (value) => DIM_MODES.includes(value as DimMode),
  celebrations: (value) => typeof value === "boolean",
  sidebarCollapsed: (value) => typeof value === "boolean",
  sidebarWidth: (value) =>
    Number.isInteger(value) &&
    (value as number) >= SIDEBAR_WIDTH_MIN &&
    (value as number) <= SIDEBAR_WIDTH_MAX,
  librarySort: (value) => LIBRARY_SORTS.includes(value as LibrarySort),
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
      // Before the font library, `editorFont` was `sans`, `serif`, or `mono`.
      if ("editorFont" in valid) {
        valid.editorFont = toFontId(valid.editorFont);
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
