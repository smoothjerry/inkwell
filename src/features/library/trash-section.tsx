import { ChevronRight, FileText, Folder, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLibraryStore } from "./library-store";

/** Collapsible trash list at the bottom of the sidebar, with restore and empty. */
export function TrashSection() {
  const [isOpen, setIsOpen] = useState(false);
  const trashedFolders = useLibraryStore((state) => state.trashedFolders);
  const trashedDocuments = useLibraryStore((state) => state.trashedDocuments);
  const actions = useLibraryStore.getState();

  const count = trashedFolders.length + trashedDocuments.length;
  const items = [
    ...trashedFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      Icon: Folder,
      restore: () => actions.restoreFolder(folder.id),
    })),
    ...trashedDocuments.map((doc) => ({
      id: doc.id,
      name: doc.title,
      Icon: FileText,
      restore: () => actions.restoreDocument(doc.id),
    })),
  ];

  return (
    <section className="shrink-0 border-t px-2 py-1.5" aria-label="Trash">
      <button
        type="button"
        className="flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-left text-muted-foreground outline-none hover:bg-border/60 focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 transition-transform duration-150",
            isOpen && "rotate-90",
          )}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <Trash2 className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        <span className="flex-1">Trash</span>
        {count > 0 && <span className="font-mono text-[11px] tabular-nums">{count}</span>}
      </button>

      {isOpen && (
        <div className="max-h-48 overflow-y-auto">
          {count === 0 && <p className="px-2 py-1 text-muted-foreground">Trash is empty.</p>}

          {items.map(({ id, name, Icon, restore }) => (
            <div key={id} className="flex h-7 items-center gap-1.5 pr-1 pl-7">
              <Icon
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-muted-foreground">{name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={`Restore ${name}`}
                onClick={restore}
              >
                <Undo2 className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
              </Button>
            </div>
          ))}

          {count > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-1 ml-5 h-6 px-2 text-[12px]">
                  Empty Trash
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Empty the trash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Everything in the trash will be permanently deleted. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={actions.emptyTrash}>
                    Empty Trash
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </section>
  );
}
