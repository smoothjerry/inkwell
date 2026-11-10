import { create } from "zustand";

export type Theme = "system" | "light" | "dark";

type ThemeState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

// In-memory for now. The `theme` setting moves to SQLite with the rest of
// the settings (DESIGN_SPEC §5).
export const useThemeStore = create<ThemeState>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
}));
