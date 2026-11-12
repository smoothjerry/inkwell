import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Theme, useSettingsStore } from "@/stores/settings-store";

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
  const theme = useSettingsStore((state) => state.theme);
  const update = useSettingsStore((state) => state.update);
  const Icon = ICONS[theme];

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-5 gap-1.5 px-1.5 text-[12px] text-muted-foreground capitalize"
      aria-label={`Theme: ${theme}. Switch to ${NEXT_THEME[theme]}.`}
      onClick={() => update({ theme: NEXT_THEME[theme] })}
    >
      <Icon className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
      {theme}
    </Button>
  );
}
