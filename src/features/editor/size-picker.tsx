import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FONT_SIZE_STEPS } from "@/domain/rich-formatting";

type SizePickerProps = {
  /** In points; null shows a blank, for a selection that mixes sizes. */
  value: number | null;
  onChange: (value: number) => void;
  onCloseAutoFocus: (event: Event) => void;
};

/** The toolbar's font size menu, in points. */
export function SizePicker({ value, onChange, onCloseAutoFocus }: SizePickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Font size: ${value === null ? "mixed" : `${value} pt`}`}
          className="h-7 w-14 justify-between px-2 font-normal tabular-nums"
        >
          <span>{value ?? ""}</span>
          <ChevronDown strokeWidth={1.5} aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-80 w-24 overflow-y-auto"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DropdownMenuRadioGroup
          value={value === null ? "" : String(value)}
          onValueChange={(next) => onChange(Number(next))}
        >
          {FONT_SIZE_STEPS.map((size) => (
            <DropdownMenuRadioItem key={size} value={String(size)} className="tabular-nums">
              {size}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
