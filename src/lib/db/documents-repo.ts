import { v7 as uuidv7 } from "uuid";
import { getDb } from "./client";
import type { DocumentSummary } from "./types";

// SQLite has no boolean type; `pinned` comes back as 0 or 1.
type DocumentRow = Omit<DocumentSummary, "pinned"> & { pinned: number };

const COLUMNS = `
  d.id, d.folder_id AS folderId, d.title, d.word_count AS wordCount, d.pinned,
  d.sort_order AS sortOrder, d.created_at AS createdAt, d.updated_at AS updatedAt,
  d.deleted_at AS deletedAt`;

const EMPTY_CONTENT = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

const NEXT_SORT_ORDER =
  "(SELECT COALESCE(MAX(sort_order), 0) + 1 FROM documents WHERE folder_id IS $2)";

function toSummary(row: DocumentRow): DocumentSummary {
  return { ...row, pinned: row.pinned === 1 };
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const db = await getDb();
  const rows = await db.select<DocumentRow[]>(
    `SELECT ${COLUMNS} FROM documents d WHERE d.deleted_at IS NULL ORDER BY d.sort_order, d.title`,
  );
  return rows.map(toSummary);
}

/**
 * Trashed documents that were trashed directly. Documents trashed along with
 * their folder are left out: they come back when the folder is restored.
 */
export async function listTrashedDocuments(): Promise<DocumentSummary[]> {
  const db = await getDb();
  const rows = await db.select<DocumentRow[]>(
    `SELECT ${COLUMNS} FROM documents d
     LEFT JOIN folders f ON f.id = d.folder_id
     WHERE d.deleted_at IS NOT NULL
       AND (f.id IS NULL OR f.deleted_at IS NULL OR f.deleted_at <> d.deleted_at)
     ORDER BY d.deleted_at DESC`,
  );
  return rows.map(toSummary);
}

export async function createDocument(folderId: string | null): Promise<string> {
  const db = await getDb();
  const id = uuidv7();
  await db.execute(
    `INSERT INTO documents (id, folder_id, content, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, ${NEXT_SORT_ORDER}, $4, $4)`,
    [id, folderId, EMPTY_CONTENT, Date.now()],
  );
  return id;
}

export async function renameDocument(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE documents SET title = $2, updated_at = $3 WHERE id = $1", [
    id,
    title,
    Date.now(),
  ]);
}

export async function moveDocument(id: string, folderId: string | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE documents SET folder_id = $2, sort_order = ${NEXT_SORT_ORDER}, updated_at = $3
     WHERE id = $1`,
    [id, folderId, Date.now()],
  );
}

export async function setDocumentPinned(id: string, pinned: boolean): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE documents SET pinned = $2, updated_at = $3 WHERE id = $1", [
    id,
    pinned ? 1 : 0,
    Date.now(),
  ]);
}

export async function trashDocument(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE documents SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL",
    [id, Date.now()],
  );
}

/** Restores a document. If its folder is still in the trash, it moves to the top level. */
export async function restoreDocument(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE documents SET
       deleted_at = NULL,
       updated_at = $2,
       folder_id = (SELECT f.id FROM folders f
                    WHERE f.id = documents.folder_id AND f.deleted_at IS NULL)
     WHERE id = $1`,
    [id, Date.now()],
  );
}
