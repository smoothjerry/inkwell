import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FONT_GROUPS, FONTS, type FontId, fontById, fontFamilyCss } from "@/domain/fonts";

type FontPickerProps = {
  label: string;
  /** Null shows a blank, for a selection that mixes fonts. */
  value: FontId | null;
  onChange: (value: FontId) => void;
  /** The formatting toolbar's smaller, borderless look. */
  compact?: boolean;
  /** Where focus goes when the menu closes; by default, back to the button. */
  onCloseAutoFocus?: (event: Event) => void;
};

/** A menu of the font library, grouped, with each name in its own face (DESIGN_SPEC §7.11). */
export function FontPicker({ label, value, onChange, compact, onCloseAutoFocus }: FontPickerProps) {
  const current = value === null ? null : fontById(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size="sm"
          aria-label={`${label}: ${current?.name ?? "mixed"}`}
          className={
            compact
              ? "h-7 w-36 justify-between px-2 font-normal"
              : "w-48 justify-between font-normal"
          }
        >
          <span
            className="truncate"
            style={current ? { fontFamily: fontFamilyCss(current) } : undefined}
          >
            {current?.name ?? ""}
          </span>
          <ChevronDown strokeWidth={1.5} aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={compact ? "start" : "end"}
        className="w-56"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DropdownMenuRadioGroup
          value={value ?? ""}
          onValueChange={(next) => onChange(next as FontId)}
        >
          {FONT_GROUPS.map((group) => (
            <DropdownMenuGroup key={group} aria-label={group}>
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                {group}
              </DropdownMenuLabel>
              {FONTS.filter((font) => font.group === group).map((font) => (
                <DropdownMenuRadioItem
                  key={font.id}
                  value={font.id}
                  style={{ fontFamily: fontFamilyCss(font) }}
                  className="text-[15px]"
                >
                  {font.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
