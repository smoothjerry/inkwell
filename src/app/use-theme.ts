import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Keeps `data-theme` on <html> in sync with the theme setting and the OS. */
export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme !== "system") {
      root.dataset.theme = theme;
      return;
    }

    const media = window.matchMedia(DARK_QUERY);
    const apply = () => {
      root.dataset.theme = media.matches ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}
