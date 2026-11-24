import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { containingBook } from "@/domain/books";
import { type Command, useLibraryStore } from "@/features/library";
import { useViewStore } from "@/stores/view-store";

/** Opens the Page Counts dialog for the open document's book, or the document alone. */
export function requestPageCounts() {
  const { selectedDocumentId, folders, documents } = useLibraryStore.getState();
  const doc = documents.find((candidate) => candidate.id === selectedDocumentId);
  if (!doc) {
    toast("Open a document to count its pages.");
    return;
  }
  const bookId = containingBook(doc.folderId, folders);
  useViewStore
    .getState()
    .setPageCountsTarget(bookId === null ? { documentId: doc.id } : { bookId });
}

/** The command palette's Page Counts entry. */
export const PAGE_COUNT_COMMANDS: Command[] = [
  {
    id: "page-counts",
    title: "Page Counts…",
    keywords: "book print format pages length estimate",
    Icon: BookOpen,
    run: requestPageCounts,
  },
];
