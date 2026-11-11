import { getDb } from "./client";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Permanently deletes everything in the trash. */
export async function emptyTrash(): Promise<void> {
  const db = await getDb();
  // Documents first: deleting a folder would detach its documents, not delete them.
  await db.execute("DELETE FROM documents WHERE deleted_at IS NOT NULL");
  await db.execute("DELETE FROM folders WHERE deleted_at IS NOT NULL");
}

/** Permanently deletes items that have been in the trash for more than 30 days. */
export async function purgeExpiredTrash(): Promise<void> {
  const db = await getDb();
  const cutoff = Date.now() - RETENTION_MS;
  await db.execute("DELETE FROM documents WHERE deleted_at < $1", [cutoff]);
  await db.execute("DELETE FROM folders WHERE deleted_at < $1", [cutoff]);
}
