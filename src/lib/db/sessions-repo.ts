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

/** Net words written per local date, summed over that date's sessions. */
export async function listDailyWords(): Promise<{ localDate: string; words: number }[]> {
  const db = await getDb();
  return db.select<{ localDate: string; words: number }[]>(
    `SELECT local_date AS localDate, SUM(words) AS words
     FROM sessions GROUP BY local_date ORDER BY local_date`,
  );
}

export type SessionTotals = {
  /** Net words over all sessions. */
  lifetimeWords: number;
  /** The most words in a single session. */
  longestSessionWords: number;
  /** Number of sessions with at least one word. */
  sessionsWithWords: number;
};

export async function getSessionTotals(): Promise<SessionTotals> {
  const db = await getDb();
  const rows = await db.select<SessionTotals[]>(
    `SELECT COALESCE(SUM(words), 0) AS lifetimeWords,
            COALESCE(MAX(words), 0) AS longestSessionWords,
            COUNT(CASE WHEN words > 0 THEN 1 END) AS sessionsWithWords
     FROM sessions`,
  );
  return rows[0] ?? { lifetimeWords: 0, longestSessionWords: 0, sessionsWithWords: 0 };
}

export type RecentSession = SessionRecord & {
  /** Titles of the documents edited in the session. */
  documentTitles: string[];
};

// Unit separator: cannot appear in a title typed by a user.
const TITLE_SEPARATOR = "\u001f";

/** The most recent sessions, newest first, with the documents they touched. */
export async function listRecentSessions(limit: number): Promise<RecentSession[]> {
  const db = await getDb();
  const rows = await db.select<(SessionRecord & { titles: string | null })[]>(
    `SELECT s.id, s.local_date AS localDate, s.started_at AS startedAt, s.ended_at AS endedAt,
            s.active_ms AS activeMs, s.words,
            (SELECT group_concat(d.title, char(31))
             FROM session_docs sd JOIN documents d ON d.id = sd.document_id
             WHERE sd.session_id = s.id) AS titles
     FROM sessions s ORDER BY s.started_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map(({ titles, ...session }) => ({
    ...session,
    documentTitles: titles ? titles.split(TITLE_SEPARATOR) : [],
  }));
}
