import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Theme, useThemeStore } from "@/stores/theme-store";

const NEXT_THEME: Record<Theme, Theme> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} satisfies Record<Theme, typeof Sun>;

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const Icon = ICONS[theme];

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-5 gap-1.5 px-1.5 text-[12px] text-muted-foreground capitalize"
      aria-label={`Theme: ${theme}. Switch to ${NEXT_THEME[theme]}.`}
      onClick={() => setTheme(NEXT_THEME[theme])}
    >
      <Icon className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
      {theme}
    </Button>
  );
}
