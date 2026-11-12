import { MoveHorizontal, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EDITOR_FONTS, EDITOR_WIDTHS, useSettingsStore } from "@/stores/settings-store";

function next<T>(options: readonly T[], current: T): T {
  return options[(options.indexOf(current) + 1) % options.length] as T;
}

const BUTTON = "h-5 gap-1.5 px-1.5 text-[12px] text-muted-foreground capitalize";

/** Status-bar switches for the editor font and line width. */
export function EditorPreferences() {
  const editorFont = useSettingsStore((state) => state.editorFont);
  const editorWidth = useSettingsStore((state) => state.editorWidth);
  const { update } = useSettingsStore.getState();

  const nextFont = next(EDITOR_FONTS, editorFont);
  const nextWidth = next(EDITOR_WIDTHS, editorWidth);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={BUTTON}
        aria-label={`Editor font: ${editorFont}. Switch to ${nextFont}.`}
        onClick={() => update({ editorFont: nextFont })}
      >
        <Type className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
        {editorFont}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={BUTTON}
        aria-label={`Editor width: ${editorWidth}. Switch to ${nextWidth}.`}
        onClick={() => update({ editorWidth: nextWidth })}
      >
        <MoveHorizontal className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
        {editorWidth}
      </Button>
    </>
  );
}
