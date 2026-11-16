import { getDb } from "./client";

/** Mark the start and end of a matched word inside `SearchResult.snippet`. */
export const MATCH_START = "\u0002";
export const MATCH_END = "\u0003";

export type SearchResult = {
  id: string;
  title: string;
  /** A stretch of the body text around the match, with matches marked. */
  snippet: string;
};

/**
 * Full-text search over document titles and body text, best match first.
 * `ftsQuery` is an FTS5 MATCH expression; build it with `toFtsQuery`.
 * Documents in the trash are left out.
 */
export async function searchDocuments(ftsQuery: string, limit: number): Promise<SearchResult[]> {
  const db = await getDb();
  return db.select<SearchResult[]>(
    `SELECT d.id, d.title,
            snippet(documents_fts, 1, char(2), char(3), '…', 12) AS snippet
     FROM documents_fts
     JOIN documents d ON d.rowid = documents_fts.rowid
     WHERE documents_fts MATCH $1 AND d.deleted_at IS NULL
     ORDER BY bm25(documents_fts, 5.0, 1.0)
     LIMIT $2`,
    [ftsQuery, limit],
  );
}
