import { toast } from "sonner";
import { create } from "zustand";
import type { DocumentSummary, Folder } from "@/lib/db";
import * as db from "@/lib/db";

type LibraryState = {
  status: "loading" | "ready" | "error";
  folders: Folder[];
  documents: DocumentSummary[];
  trashedFolders: Folder[];
  trashedDocuments: DocumentSummary[];
  selectedDocumentId: string | null;
  collapsedFolderIds: string[];
  /** Id of the folder or document whose name is being edited inline. */
  renamingId: string | null;

  load: () => Promise<void>;
  selectDocument: (id: string) => void;
  toggleFolder: (id: string) => void;
  startRenaming: (id: string) => void;
  stopRenaming: () => void;

  createDocument: (folderId: string | null) => Promise<void>;
  createFolder: (parentId: string | null) => Promise<void>;
  renameDocument: (id: string, title: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  moveDocument: (id: string, folderId: string | null) => Promise<void>;
  moveFolder: (id: string, parentId: string | null) => Promise<void>;
  setDocumentPinned: (id: string, pinned: boolean) => Promise<void>;
  trashDocument: (id: string) => Promise<void>;
  trashFolder: (id: string) => Promise<void>;
  restoreDocument: (id: string) => Promise<void>;
  restoreFolder: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
};

export const useLibraryStore = create<LibraryState>((set, get) => {
  /** Re-reads the library from the database. */
  async function refresh() {
    const [folders, documents, trashedFolders, trashedDocuments] = await Promise.all([
      db.listFolders(),
      db.listDocuments(),
      db.listTrashedFolders(),
      db.listTrashedDocuments(),
    ]);
    set((state) => ({
      status: "ready",
      folders,
      documents,
      trashedFolders,
      trashedDocuments,
      // Drop the selection if that document is no longer in the library.
      selectedDocumentId: documents.some((doc) => doc.id === state.selectedDocumentId)
        ? state.selectedDocumentId
        : null,
    }));
  }

  /** Runs a database change, then refreshes. Failures become a toast. */
  async function mutate(failureMessage: string, change: () => Promise<void>) {
    try {
      await change();
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error(failureMessage);
    }
  }

  function expand(folderId: string | null) {
    set((state) => ({
      collapsedFolderIds: state.collapsedFolderIds.filter((id) => id !== folderId),
    }));
  }

  return {
    status: "loading",
    folders: [],
    documents: [],
    trashedFolders: [],
    trashedDocuments: [],
    selectedDocumentId: null,
    collapsedFolderIds: [],
    renamingId: null,

    load: async () => {
      try {
        await db.purgeExpiredTrash();
        await refresh();
      } catch (error) {
        console.error(error);
        set({ status: "error" });
        toast.error("Could not open the library.");
      }
    },

    selectDocument: (id) => set({ selectedDocumentId: id }),

    toggleFolder: (id) =>
      set((state) => ({
        collapsedFolderIds: state.collapsedFolderIds.includes(id)
          ? state.collapsedFolderIds.filter((other) => other !== id)
          : [...state.collapsedFolderIds, id],
      })),

    startRenaming: (id) => set({ renamingId: id }),
    stopRenaming: () => set({ renamingId: null }),

    createDocument: (folderId) =>
      mutate("Could not create the document.", async () => {
        const id = await db.createDocument(folderId);
        expand(folderId);
        set({ selectedDocumentId: id, renamingId: id });
      }),

    createFolder: (parentId) =>
      mutate("Could not create the folder.", async () => {
        const id = await db.createFolder("New Folder", parentId);
        expand(parentId);
        set({ renamingId: id });
      }),

    renameDocument: (id, title) =>
      mutate("Could not rename the document.", () => db.renameDocument(id, title)),

    renameFolder: (id, name) =>
      mutate("Could not rename the folder.", () => db.renameFolder(id, name)),

    moveDocument: (id, folderId) =>
      mutate("Could not move the document.", async () => {
        await db.moveDocument(id, folderId);
        expand(folderId);
      }),

    moveFolder: (id, parentId) =>
      mutate("Could not move the folder.", async () => {
        await db.moveFolder(id, parentId);
        expand(parentId);
      }),

    setDocumentPinned: (id, pinned) =>
      mutate("Could not update the pin.", () => db.setDocumentPinned(id, pinned)),

    trashDocument: (id) =>
      mutate("Could not move the document to the trash.", () => db.trashDocument(id)),

    trashFolder: (id) =>
      mutate("Could not move the folder to the trash.", () => db.trashFolder(id)),

    restoreDocument: (id) =>
      mutate("Could not restore the document.", () => db.restoreDocument(id)),

    restoreFolder: (id) => mutate("Could not restore the folder.", () => db.restoreFolder(id)),

    emptyTrash: async () => {
      await mutate("Could not empty the trash.", () => db.emptyTrash());
      if (get().trashedFolders.length === 0 && get().trashedDocuments.length === 0) {
        toast.success("Trash emptied.");
      }
    },
  };
});
