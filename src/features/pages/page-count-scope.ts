import { type BookFormatId, isBookFormatId } from "@/domain/book-formats";
import { containingBook, readingOrder } from "@/domain/books";
import type { DocumentSummary, Folder } from "@/lib/db";

/** What a page count covers: a book's chapters, or one document outside any book. */
export type PageCountScope = {
  /** The book's name, or the document's title. */
  title: string;
  isBook: boolean;
  /** Document ids in reading order; one for a document outside any book. */
  chapterIds: string[];
  /** The scope's own format: the book's, or the `defaultBookFormat` setting. */
  formatId: BookFormatId;
};

/**
 * The scope of a book's count, or of a document's: the book it is in, if
 * any (DESIGN_SPEC §7.9). Null when the book or document no longer exists.
 */
export function pageCountScope(
  target: { bookId: string } | { documentId: string },
  folders: readonly Folder[],
  documents: readonly DocumentSummary[],
  defaultFormat: BookFormatId,
): PageCountScope | null {
  let bookId: string | null;
  if ("bookId" in target) {
    bookId = target.bookId;
  } else {
    const doc = documents.find((candidate) => candidate.id === target.documentId);
    if (!doc) {
      return null;
    }
    bookId = containingBook(doc.folderId, folders);
    if (bookId === null) {
      return { title: doc.title, isBook: false, chapterIds: [doc.id], formatId: defaultFormat };
    }
  }

  const book = folders.find((folder) => folder.id === bookId);
  if (!book) {
    return null;
  }
  return {
    title: book.name,
    isBook: true,
    chapterIds: readingOrder(book.id, folders, documents),
    formatId: isBookFormatId(book.bookFormat) ? book.bookFormat : defaultFormat,
  };
}
