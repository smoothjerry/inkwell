import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PARAGRAPH_STYLE_LABELS, PARAGRAPH_STYLES, type ParagraphStyle } from "./rich-formatting";

type ParagraphStylePickerProps = {
  value: ParagraphStyle;
  onChange: (value: ParagraphStyle) => void;
  onCloseAutoFocus: (event: Event) => void;
};

/** The toolbar's paragraph style menu: Body, Heading 1–3, Quote, Code. */
export function ParagraphStylePicker({
  value,
  onChange,
  onCloseAutoFocus,
}: ParagraphStylePickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Paragraph style: ${PARAGRAPH_STYLE_LABELS[value]}`}
          className="h-7 w-28 justify-between px-2 font-normal"
        >
          <span className="truncate">{PARAGRAPH_STYLE_LABELS[value]}</span>
          <ChevronDown strokeWidth={1.5} aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44" onCloseAutoFocus={onCloseAutoFocus}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as ParagraphStyle)}
        >
          {PARAGRAPH_STYLES.map((style) => (
            <DropdownMenuRadioItem key={style} value={style}>
              {PARAGRAPH_STYLE_LABELS[style]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
