import { BookOpen } from "lucide-react";
import {
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { BOOK_FORMATS } from "@/domain/book-formats";

/** The radio value of "Not a Book". */
const NOT_A_BOOK = "none";

type BookFormatSubmenuProps = {
  /** The folder's format, or null when it is not a book. */
  value: string | null;
  /** False when a folder above or below is already a book. */
  canBeBook: boolean;
  onChange: (bookFormat: string | null) => void;
};

/**
 * Folder context menu ▸ Book Format (DESIGN_SPEC §7.9): giving a folder a
 * print format makes it a book; Not a Book makes it an ordinary folder again.
 */
export function BookFormatSubmenu({ value, canBeBook, onChange }: BookFormatSubmenuProps) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <BookOpen strokeWidth={1.5} aria-hidden="true" />
        Book Format
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-60">
        {!canBeBook && (
          <>
            <ContextMenuLabel className="text-[12px] font-normal text-muted-foreground">
              A book can't contain another book, and this folder is inside one or holds one.
            </ContextMenuLabel>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuRadioGroup
          value={value ?? NOT_A_BOOK}
          onValueChange={(next) => onChange(next === NOT_A_BOOK ? null : next)}
        >
          <ContextMenuRadioItem value={NOT_A_BOOK}>Not a Book</ContextMenuRadioItem>
          <ContextMenuSeparator />
          {BOOK_FORMATS.map((format) => (
            <ContextMenuRadioItem key={format.id} value={format.id} disabled={!canBeBook}>
              {format.name}
            </ContextMenuRadioItem>
          ))}
        </ContextMenuRadioGroup>
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
