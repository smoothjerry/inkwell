import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toFtsQuery } from "@/domain/search-query";
import { type SearchResult, searchDocuments } from "@/lib/db";
import { filterCommands } from "./commands";
import { useLibraryStore } from "./library-store";
import { usePaletteStore } from "./palette-store";
import { SearchSnippet } from "./search-snippet";

const SEARCH_DELAY_MS = 120;
const MAX_RESULTS = 20;
const RECENT_DOCUMENTS = 6;

/** The ⌘K palette: full-text document search plus commands (DESIGN_SPEC §7.2). */
export function CommandPalette() {
  const isOpen = usePaletteStore((state) => state.isOpen);
  const setOpen = usePaletteStore((state) => state.setOpen);
  const documents = useLibraryStore((state) => state.documents);
  const [query, setQuery] = useState("");
  // null = nothing typed yet, so recent documents are shown instead.
  const [results, setResults] = useState<SearchResult[] | null>(null);

  // Start empty each time the palette opens.
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const ftsQuery = toFtsQuery(query);
    if (ftsQuery === null) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchDocuments(ftsQuery, MAX_RESULTS)
        .then((found) => {
          if (!cancelled) {
            setResults(found);
          }
        })
        .catch((error: unknown) => {
          console.error(error);
          toast.error("Search failed.");
        });
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const shownDocuments: SearchResult[] =
    results ??
    [...documents]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, RECENT_DOCUMENTS)
      .map((doc) => ({ id: doc.id, title: doc.title, snippet: "" }));
  const commands = filterCommands(query);

  /** Closes the palette first, so focus is back in the app when the action runs. */
  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent
        className="top-[18%] translate-y-0 overflow-hidden p-0 text-[13px]"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Search your documents or run a command.</DialogDescription>
        </DialogHeader>
        {/* Filtering is done here (documents by the database), not by cmdk. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search documents and commands…"
          />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>

            {shownDocuments.length > 0 && (
              <CommandGroup heading={results === null ? "Recent documents" : "Documents"}>
                {shownDocuments.map((doc) => (
                  <CommandItem
                    key={doc.id}
                    value={`document-${doc.id}`}
                    onSelect={() => choose(() => useLibraryStore.getState().selectDocument(doc.id))}
                  >
                    <FileText strokeWidth={1.5} aria-hidden="true" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{doc.title}</span>
                      {doc.snippet !== "" && <SearchSnippet snippet={doc.snippet} />}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {commands.length > 0 && (
              <CommandGroup heading="Commands">
                {commands.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={`command-${command.id}`}
                    onSelect={() => choose(command.run)}
                  >
                    <command.Icon strokeWidth={1.5} aria-hidden="true" />
                    {command.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
