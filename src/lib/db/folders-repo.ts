import { v7 as uuidv7 } from "uuid";
import { getDb } from "./client";
import type { Folder } from "./types";

const COLUMNS = `
  f.id, f.parent_id AS parentId, f.name, f.sort_order AS sortOrder,
  f.created_at AS createdAt, f.updated_at AS updatedAt, f.deleted_at AS deletedAt`;

// The folder with id $1 and all of its descendants.
const SUBTREE = `
  WITH RECURSIVE subtree(id) AS (
    SELECT id FROM folders WHERE id = $1
    UNION ALL
    SELECT f.id FROM folders f JOIN subtree s ON f.parent_id = s.id
  )`;

const NEXT_SORT_ORDER =
  "(SELECT COALESCE(MAX(sort_order), 0) + 1 FROM folders WHERE parent_id IS $2)";

export async function listFolders(): Promise<Folder[]> {
  const db = await getDb();
  return db.select<Folder[]>(
    `SELECT ${COLUMNS} FROM folders f WHERE f.deleted_at IS NULL ORDER BY f.sort_order, f.name`,
  );
}

/**
 * Trashed folders that were trashed directly. Folders trashed along with a
 * parent are left out: they come back when the parent is restored.
 */
export async function listTrashedFolders(): Promise<Folder[]> {
  const db = await getDb();
  return db.select<Folder[]>(
    `SELECT ${COLUMNS} FROM folders f
     LEFT JOIN folders p ON p.id = f.parent_id
     WHERE f.deleted_at IS NOT NULL
       AND (p.id IS NULL OR p.deleted_at IS NULL OR p.deleted_at <> f.deleted_at)
     ORDER BY f.deleted_at DESC`,
  );
}

export async function createFolder(name: string, parentId: string | null): Promise<string> {
  const db = await getDb();
  const id = uuidv7();
  await db.execute(
    `INSERT INTO folders (id, parent_id, name, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, ${NEXT_SORT_ORDER}, $4, $4)`,
    [id, parentId, name, Date.now()],
  );
  return id;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE folders SET name = $2, updated_at = $3 WHERE id = $1", [
    id,
    name,
    Date.now(),
  ]);
}

/** Moves a folder. Moving it into itself or one of its descendants does nothing. */
export async function moveFolder(id: string, parentId: string | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    `${SUBTREE}
     UPDATE folders SET parent_id = $2, sort_order = ${NEXT_SORT_ORDER}, updated_at = $3
     WHERE id = $1 AND ($2 IS NULL OR $2 NOT IN (SELECT id FROM subtree))`,
    [id, parentId, Date.now()],
  );
}

/**
 * Moves a folder, its subfolders, and their documents to the trash. They all
 * get the same `deleted_at`, which is how `restoreFolder` finds them again.
 */
export async function trashFolder(id: string): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    `${SUBTREE}
     UPDATE documents SET deleted_at = $2, updated_at = $2
     WHERE deleted_at IS NULL AND folder_id IN (SELECT id FROM subtree)`,
    [id, now],
  );
  await db.execute(
    `${SUBTREE}
     UPDATE folders SET deleted_at = $2, updated_at = $2
     WHERE deleted_at IS NULL AND id IN (SELECT id FROM subtree)`,
    [id, now],
  );
}

/**
 * Restores a folder and everything that was trashed with it. If its parent
 * is still in the trash, the folder moves to the top level.
 */
export async function restoreFolder(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<{ deletedAt: number | null }[]>(
    "SELECT deleted_at AS deletedAt FROM folders WHERE id = $1",
    [id],
  );
  const deletedAt = rows[0]?.deletedAt;
  if (deletedAt == null) {
    return;
  }

  const now = Date.now();
  await db.execute(
    `${SUBTREE}
     UPDATE documents SET deleted_at = NULL, updated_at = $3
     WHERE deleted_at = $2 AND folder_id IN (SELECT id FROM subtree)`,
    [id, deletedAt, now],
  );
  await db.execute(
    `${SUBTREE}
     UPDATE folders SET deleted_at = NULL, updated_at = $3
     WHERE deleted_at = $2 AND id IN (SELECT id FROM subtree)`,
    [id, deletedAt, now],
  );
  await db.execute(
    `UPDATE folders SET parent_id = NULL
     WHERE id = $1 AND parent_id IN (SELECT id FROM folders WHERE deleted_at IS NOT NULL)`,
    [id],
  );
}
