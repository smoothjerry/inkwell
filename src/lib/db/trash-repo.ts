import { getDb } from "./client";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Permanently deletes everything in the trash. */
export async function emptyTrash(): Promise<void> {
  const db = await getDb();
  // Documents first: deleting a folder would detach its documents, not delete them.
  await db.execute("DELETE FROM documents WHERE deleted_at IS NOT NULL");
  await db.execute("DELETE FROM folders WHERE deleted_at IS NOT NULL");
}

/** Permanently deletes one document, if it is in the trash. */
export async function deleteDocumentForever(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM documents WHERE id = $1 AND deleted_at IS NOT NULL", [id]);
}

/**
 * Permanently deletes a trashed folder and everything trashed with it: the
 * same items `restoreFolder` would bring back. Items inside it that were
 * trashed on their own, earlier, are kept: they move to the top level, where
 * they stay in the trash as separate items.
 */
export async function deleteFolderForever(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<{ deletedAt: number | null }[]>(
    "SELECT deleted_at AS deletedAt FROM folders WHERE id = $1",
    [id],
  );
  const deletedAt = rows[0]?.deletedAt;
  if (deletedAt == null) {
    return;
  }

  // The folder and the subfolders trashed in the same batch.
  const batch = await db.select<{ id: string }[]>(
    `WITH RECURSIVE batch(id) AS (
       SELECT id FROM folders WHERE id = $1
       UNION ALL
       SELECT f.id FROM folders f JOIN batch b ON f.parent_id = b.id WHERE f.deleted_at = $2
     )
     SELECT id FROM batch`,
    [id, deletedAt],
  );
  const ids = JSON.stringify(batch.map((row) => row.id));
  const inBatch = "(SELECT value FROM json_each($1))";

  await db.execute(`DELETE FROM documents WHERE deleted_at = $2 AND folder_id IN ${inBatch}`, [
    ids,
    deletedAt,
  ]);
  // Deleting a folder would detach its other documents and delete its other
  // subfolders, so move those out first.
  await db.execute(`UPDATE documents SET folder_id = NULL WHERE folder_id IN ${inBatch}`, [ids]);
  await db.execute(
    `UPDATE folders SET parent_id = NULL
     WHERE parent_id IN ${inBatch} AND id NOT IN ${inBatch}`,
    [ids],
  );
  await db.execute(`DELETE FROM folders WHERE id IN ${inBatch}`, [ids]);
}

/** Permanently deletes items that have been in the trash for more than 30 days. */
export async function purgeExpiredTrash(): Promise<void> {
  const db = await getDb();
  const cutoff = Date.now() - RETENTION_MS;
  await db.execute("DELETE FROM documents WHERE deleted_at < $1", [cutoff]);
  await db.execute("DELETE FROM folders WHERE deleted_at < $1", [cutoff]);
}
