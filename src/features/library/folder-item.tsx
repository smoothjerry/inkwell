import { ChevronRight, FilePlus, Folder, FolderPlus, Pencil, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Folder as FolderRecord } from "@/lib/db";
import { cn } from "@/lib/utils";
import { DocumentItem } from "./document-item";
import { InlineRenameInput } from "./inline-rename-input";
import { useLibraryStore } from "./library-store";
import { moveTargets } from "./move-targets";
import { MoveToSubmenu } from "./move-to-submenu";

type FolderItemProps = {
  folder: FolderRecord;
  depth: number;
};

/** A folder row and, when expanded, its subfolders and documents. */
export function FolderItem({ folder, depth }: FolderItemProps) {
  const folders = useLibraryStore((state) => state.folders);
  const documents = useLibraryStore((state) => state.documents);
  const isCollapsed = useLibraryStore((state) => state.collapsedFolderIds.includes(folder.id));
  const isRenaming = useLibraryStore((state) => state.renamingId === folder.id);
  const actions = useLibraryStore.getState();

  const childFolders = folders.filter((child) => child.parentId === folder.id);
  const childDocuments = documents.filter((doc) => doc.folderId === folder.id);
  const indent = { paddingLeft: 8 + depth * 14 };

  const icons = (
    <>
      <ChevronRight
        className={cn(
          "size-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
          !isCollapsed && "rotate-90",
        )}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <Folder
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
        aria-hidden="true"
      />
    </>
  );

  return (
    <div>
      {isRenaming ? (
        <div className="flex h-7 items-center gap-1.5 pr-2" style={indent}>
          {icons}
          <InlineRenameInput
            initialValue={folder.name}
            label="Folder name"
            onSubmit={(name) => actions.renameFolder(folder.id, name)}
            onDone={actions.stopRenaming}
          />
        </div>
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              className="flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left outline-none hover:bg-border/60 focus-visible:ring-2 focus-visible:ring-ring"
              style={indent}
              aria-expanded={!isCollapsed}
              onClick={() => actions.toggleFolder(folder.id)}
              onDoubleClick={() => actions.startRenaming(folder.id)}
              onKeyDown={(event) => {
                if (event.key === "F2") {
                  actions.startRenaming(folder.id);
                }
              }}
            >
              {icons}
              <span className="truncate">{folder.name}</span>
            </button>
          </ContextMenuTrigger>
          <ContextMenuContent onCloseAutoFocus={(event) => event.preventDefault()}>
            <ContextMenuItem onSelect={() => actions.createDocument(folder.id)}>
              <FilePlus strokeWidth={1.5} aria-hidden="true" />
              New Document
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => actions.createFolder(folder.id)}>
              <FolderPlus strokeWidth={1.5} aria-hidden="true" />
              New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => actions.startRenaming(folder.id)}>
              <Pencil strokeWidth={1.5} aria-hidden="true" />
              Rename
            </ContextMenuItem>
            <MoveToSubmenu
              targets={moveTargets(folders, folder.id)}
              currentId={folder.parentId}
              onMove={(parentId) => actions.moveFolder(folder.id, parentId)}
            />
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onSelect={() => actions.trashFolder(folder.id)}>
              <Trash2 strokeWidth={1.5} aria-hidden="true" />
              Move to Trash
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}

      {!isCollapsed && (
        <div>
          {childFolders.map((child) => (
            <FolderItem key={child.id} folder={child} depth={depth + 1} />
          ))}
          {childDocuments.map((doc) => (
            <DocumentItem key={doc.id} doc={doc} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
