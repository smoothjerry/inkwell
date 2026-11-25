import { Ellipsis } from "lucide-react";
import { Fragment } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FONT_GROUPS, FONTS, type FontId, fontFamilyCss } from "@/domain/fonts";
import { FONT_SIZE_STEPS, HIGHLIGHTS, TEXT_COLORS } from "@/domain/rich-formatting";
import { colorLabel } from "./color-picker";
import { PARAGRAPH_STYLE_LABELS, PARAGRAPH_STYLES } from "./rich-formatting";
import type { ToolbarGroup, ToolbarState } from "./toolbar-state";

const NONE = "none";

type ToolbarOverflowMenuProps = {
  /** The groups that do not fit in the toolbar, in toolbar order. */
  groups: readonly ToolbarGroup[];
  state: ToolbarState;
  apply: (action: string) => void;
  onFont: (fontId: FontId) => void;
  onSize: (size: number) => void;
  /** In paged view the book format sets the font and size, so their menus are disabled. */
  isPaged: boolean;
  onCloseAutoFocus: (event: Event) => void;
};

/** The ⋯ menu: the toolbar groups that do not fit, as menu items. */
export function ToolbarOverflowMenu({
  groups,
  state,
  apply,
  onFont,
  onSize,
  isPaged,
  onCloseAutoFocus,
}: ToolbarOverflowMenuProps) {
  function group(id: ToolbarGroup) {
    switch (id) {
      case "history":
        return (
          <>
            <DropdownMenuItem disabled={!state.canUndo} onSelect={() => apply("undo")}>
              Undo
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!state.canRedo} onSelect={() => apply("redo")}>
              Redo
            </DropdownMenuItem>
          </>
        );
      case "style":
        return (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Paragraph Style</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={state.paragraphStyle}
                onValueChange={(style) => apply(`style-${style}`)}
              >
                {PARAGRAPH_STYLES.map((style) => (
                  <DropdownMenuRadioItem key={style} value={style}>
                    {PARAGRAPH_STYLE_LABELS[style]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      case "font":
        return (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isPaged}>Font</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-96 w-56 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={state.fontId ?? ""}
                onValueChange={(fontId) => onFont(fontId as FontId)}
              >
                {FONT_GROUPS.map((fontGroup) => (
                  <DropdownMenuGroup key={fontGroup} aria-label={fontGroup}>
                    <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                      {fontGroup}
                    </DropdownMenuLabel>
                    {FONTS.filter((font) => font.group === fontGroup).map((font) => (
                      <DropdownMenuRadioItem
                        key={font.id}
                        value={font.id}
                        style={{ fontFamily: fontFamilyCss(font) }}
                      >
                        {font.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuGroup>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      case "size":
        return (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={isPaged}>Size</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={state.fontSize === null ? "" : String(state.fontSize)}
                onValueChange={(size) => onSize(Number(size))}
              >
                {FONT_SIZE_STEPS.map((size) => (
                  <DropdownMenuRadioItem key={size} value={String(size)}>
                    {size}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      case "marks":
        return (
          <>
            <DropdownMenuCheckboxItem checked={state.bold} onSelect={() => apply("bold")}>
              Bold
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={state.italic} onSelect={() => apply("italic")}>
              Italic
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={state.underline} onSelect={() => apply("underline")}>
              Underline
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={state.strike} onSelect={() => apply("strike")}>
              Strikethrough
            </DropdownMenuCheckboxItem>
          </>
        );
      case "colors":
        return (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Text Colour</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={state.textColor ?? NONE}
                  onValueChange={(name) => apply(name === NONE ? "color-default" : `color-${name}`)}
                >
                  <DropdownMenuRadioItem value={NONE}>Default</DropdownMenuRadioItem>
                  {TEXT_COLORS.map((name) => (
                    <DropdownMenuRadioItem key={name} value={name}>
                      {colorLabel(name)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Highlight</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={state.highlight ?? NONE}
                  onValueChange={(name) =>
                    apply(name === NONE ? "highlight-none" : `highlight-${name}`)
                  }
                >
                  <DropdownMenuRadioItem value={NONE}>None</DropdownMenuRadioItem>
                  {HIGHLIGHTS.map((name) => (
                    <DropdownMenuRadioItem key={name} value={name}>
                      {colorLabel(name)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        );
      case "link":
        return <DropdownMenuItem onSelect={() => apply("link")}>Link…</DropdownMenuItem>;
      case "align":
        return (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Align</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={state.alignment}
                onValueChange={(alignment) => apply(`align-${alignment}`)}
              >
                <DropdownMenuRadioItem value="left">Left</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="center">Centre</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="justify">Justify</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      case "lists":
        return (
          <>
            <DropdownMenuCheckboxItem
              checked={state.list === "bullet"}
              onSelect={() => apply("list-bullet")}
            >
              Bulleted List
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={state.list === "numbered"}
              onSelect={() => apply("list-numbered")}
            >
              Numbered List
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={state.list === "task"}
              onSelect={() => apply("list-task")}
            >
              Task List
            </DropdownMenuCheckboxItem>
          </>
        );
      case "indent":
        return (
          <>
            <DropdownMenuItem onSelect={() => apply("outdent")}>Outdent</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => apply("indent")}>Indent</DropdownMenuItem>
          </>
        );
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More formatting"
          title="More formatting"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent"
        >
          <Ellipsis className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onCloseAutoFocus={onCloseAutoFocus}>
        {groups.map((id, index) => (
          <Fragment key={id}>
            {index > 0 && <DropdownMenuSeparator />}
            {group(id)}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
