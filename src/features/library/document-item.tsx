import { Download, FileText, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { DocumentSummary } from "@/lib/db";
import { cn } from "@/lib/utils";
import { useViewStore } from "@/stores/view-store";
import { InlineRenameInput } from "./inline-rename-input";
import { useLibraryStore } from "./library-store";
import { moveTargets } from "./move-targets";
import { MoveToSubmenu } from "./move-to-submenu";
import { openRowMenuFromKeyboard } from "./open-row-menu";
import { useTreeRowDnd } from "./use-tree-row-dnd";

type DocumentItemProps = {
  doc: DocumentSummary;
  depth: number;
  /** A pinned document is listed twice; this keeps the two rows' rename state apart. */
  section?: "tree" | "pinned";
};

export function DocumentItem({ doc, depth, section = "tree" }: DocumentItemProps) {
  const renameKey = section === "pinned" ? `pinned:${doc.id}` : doc.id;
  const isSelected = useLibraryStore((state) => state.selectedDocumentId === doc.id);
  const isRenaming = useLibraryStore((state) => state.renamingId === renameKey);
  const folders = useLibraryStore((state) => state.folders);
  const actions = useLibraryStore.getState();
  // Rows in the Pinned section are shortcuts, not places in the tree.
  const dnd = useTreeRowDnd(
    {
      kind: "document",
      id: doc.id,
      parentId: doc.folderId,
      sortOrder: doc.sortOrder,
      label: doc.title,
    },
    section === "tree",
  );

  const indent = { paddingLeft: 8 + depth * 14 };

  if (isRenaming) {
    return (
      <div className="flex h-7 items-center gap-1.5 pr-2" style={indent}>
        <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <InlineRenameInput
          initialValue={doc.title}
          label="Document title"
          onSubmit={(title) => actions.renameDocument(doc.id, title)}
          onDone={actions.stopRenaming}
        />
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          ref={dnd.ref}
          {...dnd.listeners}
          type="button"
          className={cn(
            "relative flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left outline-none hover:bg-border/60 focus-visible:ring-2 focus-visible:ring-ring",
            isSelected && "bg-border text-foreground hover:bg-border",
            dnd.isDragging && "opacity-40",
          )}
          style={indent}
          aria-current={isSelected ? "page" : undefined}
          onClick={() => actions.selectDocument(doc.id)}
          onDoubleClick={() => actions.startRenaming(renameKey)}
          onKeyDown={(event) => {
            if (event.key === "F2") {
              actions.startRenaming(renameKey);
            } else {
              openRowMenuFromKeyboard(event);
            }
          }}
        >
          <FileText
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="truncate">{doc.title}</span>
          {(dnd.zone === "before" || dnd.zone === "after") && (
            <span
              className={cn(
                "pointer-events-none absolute right-1 h-0.5 rounded-full bg-ring",
                dnd.zone === "before" ? "-top-px" : "-bottom-px",
              )}
              style={{ left: indent.paddingLeft }}
              aria-hidden="true"
            />
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent onCloseAutoFocus={(event) => event.preventDefault()}>
        <ContextMenuItem onSelect={() => actions.startRenaming(renameKey)}>
          <Pencil strokeWidth={1.5} aria-hidden="true" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.setDocumentPinned(doc.id, !doc.pinned)}>
          {doc.pinned ? (
            <PinOff strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Pin strokeWidth={1.5} aria-hidden="true" />
          )}
          {doc.pinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
        <MoveToSubmenu
          targets={moveTargets(folders)}
          currentId={doc.folderId}
          onMove={(folderId) => actions.moveDocument(doc.id, folderId)}
        />
        <ContextMenuItem onSelect={() => useViewStore.getState().setExportDocumentId(doc.id)}>
          <Download strokeWidth={1.5} aria-hidden="true" />
          Export…
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => actions.trashDocument(doc.id)}>
          <Trash2 strokeWidth={1.5} aria-hidden="true" />
          Move to Trash
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
