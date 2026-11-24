import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BOOK_FORMATS, type BookFormatId, bookFormatById } from "@/domain/book-formats";

type BookFormatPickerProps = {
  label: string;
  value: BookFormatId;
  onChange: (value: BookFormatId) => void;
};

/** A menu of the print formats (DESIGN_SPEC §7.9). */
export function BookFormatPicker({ label, value, onChange }: BookFormatPickerProps) {
  const current = bookFormatById(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`${label}: ${current.name}`}
          className="w-56 justify-between font-normal"
        >
          <span className="truncate">{current.name}</span>
          <ChevronDown strokeWidth={1.5} aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as BookFormatId)}
        >
          {BOOK_FORMATS.map((format) => (
            <DropdownMenuRadioItem key={format.id} value={format.id}>
              {format.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
