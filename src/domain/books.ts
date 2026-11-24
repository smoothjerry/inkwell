/**
 * Books in the library (DESIGN_SPEC §7.9). A folder is a book when it has a
 * print format. Pure functions over the library's folders and documents.
 */

import { sortLibraryItems } from "./library-sort";

/** A folder as these rules see it. */
export type BookFolder = {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  updatedAt: number;
  /** A print format id when the folder is a book, else null. */
  bookFormat: string | null;
};

/** What the nesting rules need of a folder. */
type FolderLink = Pick<BookFolder, "id" | "parentId" | "bookFormat">;

/** A document as reading order sees it. */
export type BookDocument = {
  id: string;
  folderId: string | null;
  title: string;
  sortOrder: number;
  updatedAt: number;
  deletedAt?: number | null;
};

/** The folder's ancestors, nearest first, without the folder itself. */
function ancestorIds(folderId: string, folders: readonly FolderLink[]): string[] {
  const parentOf = new Map(folders.map((folder) => [folder.id, folder.parentId]));
  const chain: string[] = [];
  let current = parentOf.get(folderId) ?? null;
  while (current !== null && !chain.includes(current) && current !== folderId) {
    chain.push(current);
    current = parentOf.get(current) ?? null;
  }
  return chain;
}

/** The folder's descendants, at any depth, without the folder itself. */
function descendantIds(folderId: string, folders: readonly FolderLink[]): string[] {
  const found: string[] = [];
  const queue = [folderId];
  while (queue.length > 0) {
    const parent = queue.shift();
    for (const folder of folders) {
      if (folder.parentId === parent && folder.id !== folderId && !found.includes(folder.id)) {
        found.push(folder.id);
        queue.push(folder.id);
      }
    }
  }
  return found;
}

function isBookId(id: string, folders: readonly FolderLink[]): boolean {
  return folders.some((folder) => folder.id === id && folder.bookFormat !== null);
}

/** The book a folder belongs to: the folder itself or its nearest book ancestor, else null. */
export function containingBook(
  folderId: string | null,
  folders: readonly FolderLink[],
): string | null {
  if (folderId === null) {
    return null;
  }
  return [folderId, ...ancestorIds(folderId, folders)].find((id) => isBookId(id, folders)) ?? null;
}

/**
 * Whether a folder may be made a book. A book cannot contain another, so not
 * when a folder above or below it is already one. A book itself may change
 * its format.
 */
export function canMarkAsBook(folderId: string, folders: readonly FolderLink[]): boolean {
  return ![...ancestorIds(folderId, folders), ...descendantIds(folderId, folders)].some((id) =>
    isBookId(id, folders),
  );
}

/** Whether moving a folder into `newParentId` would put one book inside another. */
export function wouldNestBooks(
  folderId: string,
  newParentId: string | null,
  folders: readonly FolderLink[],
): boolean {
  if (containingBook(newParentId, folders) === null) {
    return false;
  }
  return [folderId, ...descendantIds(folderId, folders)].some((id) => isBookId(id, folders));
}

/**
 * Books that sit inside another book, inner ones only. Only a restore from
 * the trash can bring this about; the caller turns these back into folders.
 */
export function nestedBooks(folders: readonly FolderLink[]): string[] {
  return folders
    .filter(
      (folder) =>
        folder.bookFormat !== null &&
        ancestorIds(folder.id, folders).some((id) => isBookId(id, folders)),
    )
    .map((folder) => folder.id);
}

/**
 * A book's chapters: its documents in reading order, as ids. The walk is
 * depth-first in manual order, as the sidebar lists a folder in manual sort:
 * its subfolders (the book's parts) first, then its own documents. The
 * sidebar's current sort mode does not change it. Trashed documents are left out.
 */
export function readingOrder(
  bookId: string,
  folders: readonly BookFolder[],
  documents: readonly BookDocument[],
): string[] {
  const visited = new Set<string>();

  function walk(folderId: string): string[] {
    if (visited.has(folderId)) {
      return [];
    }
    visited.add(folderId);
    const parts = sortLibraryItems(
      folders.filter((folder) => folder.parentId === folderId),
      "manual",
      (folder) => folder.name,
    );
    const chapters = sortLibraryItems(
      documents.filter((doc) => doc.folderId === folderId && doc.deletedAt == null),
      "manual",
      (doc) => doc.title,
    );
    return [...parts.flatMap((part) => walk(part.id)), ...chapters.map((doc) => doc.id)];
  }

  return walk(bookId);
}
