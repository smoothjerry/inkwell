import { toast } from "sonner";
import { create } from "zustand";
import { getSettings, setSetting } from "@/lib/db";

export const EDITOR_FONTS = ["sans", "serif", "mono"] as const;
export const EDITOR_WIDTHS = ["narrow", "medium", "wide"] as const;

export type EditorFont = (typeof EDITOR_FONTS)[number];
export type EditorWidth = (typeof EDITOR_WIDTHS)[number];

type SettingsState = {
  editorFont: EditorFont;
  editorWidth: EditorWidth;
  load: () => Promise<void>;
  setEditorFont: (font: EditorFont) => void;
  setEditorWidth: (width: EditorWidth) => void;
};

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
  return options.includes(value as T);
}

function persist(key: string, value: unknown) {
  setSetting(key, value).catch((error: unknown) => {
    console.error(error);
    toast.error("Could not save the setting.");
  });
}

/** Settings stored in the SQLite `settings` table (DESIGN_SPEC §5). */
export const useSettingsStore = create<SettingsState>((set) => ({
  editorFont: "sans",
  editorWidth: "medium",

  load: async () => {
    try {
      const stored = await getSettings();
      if (isOneOf(EDITOR_FONTS, stored.editorFont)) {
        set({ editorFont: stored.editorFont });
      }
      if (isOneOf(EDITOR_WIDTHS, stored.editorWidth)) {
        set({ editorWidth: stored.editorWidth });
      }
    } catch (error) {
      // Defaults stay in place.
      console.error(error);
    }
  },

  setEditorFont: (editorFont) => {
    set({ editorFont });
    persist("editorFont", editorFont);
  },

  setEditorWidth: (editorWidth) => {
    set({ editorWidth });
    persist("editorWidth", editorWidth);
  },
}));
