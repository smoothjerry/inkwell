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
  value: FontId;
  onChange: (value: FontId) => void;
};

/** A menu of the font library, grouped, with each name in its own face (DESIGN_SPEC §7.11). */
export function FontPicker({ label, value, onChange }: FontPickerProps) {
  const current = fontById(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`${label}: ${current.name}`}
          className="w-48 justify-between font-normal"
        >
          <span style={{ fontFamily: fontFamilyCss(current) }}>{current.name}</span>
          <ChevronDown strokeWidth={1.5} aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as FontId)}>
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
