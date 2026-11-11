import type { Folder } from "@/lib/db";

export type MoveTarget = {
  /** Folder id, or null for the top level of the library. */
  id: string | null;
  label: string;
};

/**
 * Places an item can be moved to, labelled by path ("Drafts / Chapter 1").
 * Pass `excludeId` when moving a folder, to leave out it and its descendants.
 */
export function moveTargets(folders: Folder[], excludeId?: string): MoveTarget[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));

  function ancestors(folder: Folder): Folder[] {
    const chain = [folder];
    let parent = folder.parentId ? byId.get(folder.parentId) : undefined;
    while (parent && !chain.includes(parent)) {
      chain.unshift(parent);
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return chain;
  }

  const targets = folders
    .map((folder) => ancestors(folder))
    .filter((chain) => !chain.some((folder) => folder.id === excludeId))
    .map((chain) => ({
      id: chain.at(-1)?.id ?? null,
      label: chain.map((folder) => folder.name).join(" / "),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return [{ id: null, label: "Library (top level)" }, ...targets];
}
