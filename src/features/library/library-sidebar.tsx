import { FilePlus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentItem } from "./document-item";
import { FolderItem } from "./folder-item";
import { useLibraryStore } from "./library-store";
import { TrashSection } from "./trash-section";

const HEADING =
  "px-2 pt-3 pb-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide";

/** The sidebar: pinned documents, the folder tree, and the trash. */
export function LibrarySidebar() {
  const status = useLibraryStore((state) => state.status);
  const folders = useLibraryStore((state) => state.folders);
  const documents = useLibraryStore((state) => state.documents);
  const actions = useLibraryStore.getState();

  const pinned = documents.filter((doc) => doc.pinned);
  const rootFolders = folders.filter((folder) => folder.parentId === null);
  const rootDocuments = documents.filter((doc) => doc.folderId === null);
  const isEmpty = status === "ready" && folders.length === 0 && documents.length === 0;

  return (
    <aside className="flex min-h-0 flex-col border-r bg-subtle" aria-label="Library">
      {/* Clears the macOS traffic lights and lets the window be dragged. */}
      <div
        className="flex h-10 shrink-0 items-center justify-end gap-0.5 px-2"
        data-tauri-drag-region
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground"
          aria-label="New document"
          onClick={() => actions.createDocument(null)}
        >
          <FilePlus className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground"
          aria-label="New folder"
          onClick={() => actions.createFolder(null)}
        >
          <FolderPlus className="size-4" strokeWidth={1.5} aria-hidden="true" />
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {pinned.length > 0 && (
          <section aria-label="Pinned">
            <h2 className={HEADING}>Pinned</h2>
            {pinned.map((doc) => (
              <DocumentItem key={doc.id} doc={doc} depth={0} section="pinned" />
            ))}
          </section>
        )}

        <section aria-label="Documents">
          <h2 className={HEADING}>Library</h2>
          {rootFolders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} depth={0} />
          ))}
          {rootDocuments.map((doc) => (
            <DocumentItem key={doc.id} doc={doc} depth={0} />
          ))}
          {isEmpty && <p className="px-2 py-1 text-muted-foreground">No documents yet.</p>}
        </section>
      </nav>

      <TrashSection />
    </aside>
  );
}
