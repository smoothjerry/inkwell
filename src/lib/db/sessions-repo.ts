import { getDb } from "./client";

export type SessionRecord = {
  id: string;
  localDate: string;
  startedAt: number;
  /** null while the session is active. */
  endedAt: number | null;
  activeMs: number;
  words: number;
};

/** Inserts a session, or updates its end time, active time, and words. */
export async function saveSession(session: SessionRecord): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO sessions (id, local_date, started_at, ended_at, active_ms, words)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       ended_at = excluded.ended_at, active_ms = excluded.active_ms, words = excluded.words`,
    [
      session.id,
      session.localDate,
      session.startedAt,
      session.endedAt,
      session.activeMs,
      session.words,
    ],
  );
}

/** Inserts a document's counts for a session, or updates its end count. */
export async function saveSessionDoc(
  sessionId: string,
  documentId: string,
  startWords: number,
  endWords: number,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO session_docs (session_id, document_id, start_words, end_words)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id, document_id) DO UPDATE SET end_words = excluded.end_words`,
    [sessionId, documentId, startWords, endWords],
  );
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM sessions WHERE id = $1", [id]);
}

/**
 * Closes sessions left open by a crash or a forced quit. Their last edit time
 * is unknown, so they end after their recorded active time; ones with no
 * words and under 30 s of activity are deleted, as on a normal close.
 */
export async function closeStaleSessions(): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM sessions WHERE ended_at IS NULL AND words = 0 AND active_ms < 30000",
  );
  await db.execute("UPDATE sessions SET ended_at = started_at + active_ms WHERE ended_at IS NULL");
}
