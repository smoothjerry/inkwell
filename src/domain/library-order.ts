/**
 * Drag-and-drop rules for the library tree (DESIGN_SPEC §7.2). Pure functions.
 *
 * Within a parent, folders are listed first and then documents, each by
 * `sortOrder`. `sortOrder` is fractional, so placing an item between two
 * others gives it a number between theirs and no other row changes.
 */

export type ItemKind = "folder" | "document";

/** A folder or document as the tree sees it. */
export type TreeItem = {
  kind: ItemKind;
  id: string;
  parentId: string | null;
  sortOrder: number;
};

/** Where on a row an item is dropped. */
export type DropZone = "before" | "after" | "inside";

/** A drop on a row, or on the library background (the top level). */
export type DropTarget = { kind: "root" } | { kind: ItemKind; id: string; zone: DropZone };

/** Where a dropped item goes. A null `sortOrder` means the end of `parentId`. */
export type DropPlan = { parentId: string | null; sortOrder: number | null };

/**
 * The zone of a row the pointer is over, from how far down the row it is
 * (0 = top edge, 1 = bottom edge). Documents only go inside folders; a folder
 * row keeps its top and bottom quarters for placing folders next to it.
 */
export function dropZone(draggedKind: ItemKind, targetKind: ItemKind, ratio: number): DropZone {
  if (targetKind === "document") {
    return ratio < 0.5 ? "before" : "after";
  }
  if (draggedKind === "document") {
    return "inside";
  }
  return ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
}

/** A sort order between two neighbours; null means there is no neighbour on that side. */
export function sortOrderBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) {
    return 1;
  }
  if (before === null) {
    return (after as number) - 1;
  }
  if (after === null) {
    return before + 1;
  }
  return (before + after) / 2;
}

/** Whether `candidateId` is `folderId` itself or a folder somewhere inside it. */
export function isSameOrDescendant(
  folders: readonly TreeItem[],
  folderId: string,
  candidateId: string | null,
): boolean {
  const parentOf = new Map(folders.map((folder) => [folder.id, folder.parentId]));
  const seen = new Set<string>();
  let current = candidateId;
  while (current !== null && !seen.has(current)) {
    if (current === folderId) {
      return true;
    }
    seen.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}

/**
 * Where `dragged` goes when dropped on `target`, or null when the drop is not
 * allowed: onto itself, a folder into itself or a descendant, or a folder
 * next to a document (folders and documents are ordered separately).
 */
export function planDrop(
  dragged: TreeItem,
  target: DropTarget,
  folders: readonly TreeItem[],
  documents: readonly TreeItem[],
): DropPlan | null {
  if (target.kind === "root") {
    return { parentId: null, sortOrder: null };
  }
  if (target.id === dragged.id) {
    return null;
  }

  if (target.zone === "inside") {
    if (target.kind !== "folder") {
      return null;
    }
    if (dragged.kind === "folder" && isSameOrDescendant(folders, dragged.id, target.id)) {
      return null;
    }
    return { parentId: target.id, sortOrder: null };
  }

  if (dragged.kind !== target.kind) {
    return null;
  }
  const items = target.kind === "folder" ? folders : documents;
  const targetItem = items.find((item) => item.id === target.id);
  if (!targetItem) {
    return null;
  }
  const parentId = targetItem.parentId;
  if (dragged.kind === "folder" && isSameOrDescendant(folders, dragged.id, parentId)) {
    return null;
  }

  const siblings = items
    .filter((item) => item.parentId === parentId && item.id !== dragged.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const index = siblings.indexOf(targetItem);
  const [before, after] =
    target.zone === "before"
      ? [siblings[index - 1]?.sortOrder ?? null, targetItem.sortOrder]
      : [targetItem.sortOrder, siblings[index + 1]?.sortOrder ?? null];
  return { parentId, sortOrder: sortOrderBetween(before, after) };
}
