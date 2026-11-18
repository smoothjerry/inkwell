/**
 * Sort modes for the library sidebar (DESIGN_SPEC §7.2). Pure functions.
 */

export const LIBRARY_SORTS = ["manual", "updated", "title"] as const;

export type LibrarySort = (typeof LIBRARY_SORTS)[number];

type Sortable = { id: string; sortOrder: number; updatedAt: number };

// Case-insensitive and natural: "chapter 2" comes before "Chapter 10".
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * A sorted copy of `items`. `manual` follows `sortOrder` (drag-and-drop),
 * `updated` puts the most recently updated first, and `title` sorts by
 * `labelOf`. Ties fall back to the label and then the id, so the order is
 * stable from one render to the next.
 */
export function sortLibraryItems<T extends Sortable>(
  items: readonly T[],
  mode: LibrarySort,
  labelOf: (item: T) => string,
): T[] {
  const byLabel = (a: T, b: T) =>
    collator.compare(labelOf(a), labelOf(b)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const primary: Record<LibrarySort, (a: T, b: T) => number> = {
    manual: (a, b) => a.sortOrder - b.sortOrder,
    updated: (a, b) => b.updatedAt - a.updatedAt,
    title: () => 0,
  };
  return [...items].sort((a, b) => primary[mode](a, b) || byLabel(a, b));
}
