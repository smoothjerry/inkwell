import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LIBRARY_SORTS, type LibrarySort } from "@/domain/library-sort";
import { useSettingsStore } from "@/stores/settings-store";

const LABELS: Record<LibrarySort, string> = {
  manual: "Manual",
  updated: "Last updated",
  title: "Title",
};

/** The button next to the Library heading that picks the sort mode (DESIGN_SPEC §7.2). */
export function SortMenu() {
  const sort = useSettingsStore((state) => state.librarySort);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Sort library: ${LABELS[sort]}`}
          className="text-muted-foreground"
        >
          <ArrowUpDown strokeWidth={1.5} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={(event) => event.preventDefault()}>
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sort}
          onValueChange={(value) =>
            useSettingsStore.getState().update({ librarySort: value as LibrarySort })
          }
        >
          {LIBRARY_SORTS.map((mode) => (
            <DropdownMenuRadioItem key={mode} value={mode}>
              {LABELS[mode]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
