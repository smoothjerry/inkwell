/**
 * Writing sessions (DESIGN_SPEC §6.2). Pure functions over immutable values;
 * all times are UTC milliseconds and "local" means the machine's time zone.
 */

/** A gap between edits counts as active writing time only below this. */
export const ACTIVE_GAP_MS = 60_000;

const NOISE_ACTIVE_MS = 30_000;

export type SessionDoc = {
  documentId: string;
  /** The document's word count before its first edit in this session. */
  startWords: number;
  endWords: number;
};

export type Session = {
  id: string;
  /** 'YYYY-MM-DD' in local time at session start. A session never spans two dates. */
  localDate: string;
  startedAt: number;
  /** null while the session is active. */
  endedAt: number | null;
  lastActivityAt: number;
  activeMs: number;
  docs: SessionDoc[];
};

export type Activity = {
  documentId: string;
  at: number;
  /** The document's last known word count, used as its start if this is its first edit. */
  currentWords: number;
};

export type SessionOptions = {
  /** A session ends when there has been no edit for this long. */
  idleMs: number;
  newId: () => string;
};

export function localDateOf(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 23:59:59.999 local time on the day of `timestamp`. */
export function endOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

/** Net new words: per document, never below zero, so deleting cannot subtract. */
export function sessionWords(session: Session): number {
  return session.docs.reduce((sum, doc) => sum + Math.max(0, doc.endWords - doc.startWords), 0);
}

/** Words per minute of active time, or null when active time is under a minute. */
export function wordsPerMinute(words: number, activeMs: number): number | null {
  return activeMs < 60_000 ? null : words / (activeMs / 60_000);
}

/** A session with no words and under 30 s of activity is deleted when it closes. */
export function isNoise(session: Session): boolean {
  return sessionWords(session) === 0 && session.activeMs < NOISE_ACTIVE_MS;
}

/**
 * Returns the session as ended if, at time `now`, it has been idle for
 * `idleMs` or the local date has changed; otherwise null (still active).
 *
 * An idle session ends at its last edit. A session cut by midnight ends at
 * 23:59:59.999 of its own day.
 */
export function expireSession(session: Session, now: number, idleMs: number): Session | null {
  if (now - session.lastActivityAt >= idleMs) {
    return { ...session, endedAt: session.lastActivityAt };
  }
  if (localDateOf(now) !== session.localDate) {
    return { ...session, endedAt: endOfLocalDay(session.startedAt) };
  }
  return null;
}

/**
 * Records an edit. If the active session has expired (or there is none), a
 * new one starts; the expired one is returned as `ended` so it can be closed.
 */
export function recordActivity(
  active: Session | null,
  activity: Activity,
  options: SessionOptions,
): { ended: Session | null; active: Session } {
  const { documentId, at, currentWords } = activity;
  const ended = active ? expireSession(active, at, options.idleMs) : null;

  if (!active || ended) {
    return {
      ended,
      active: {
        id: options.newId(),
        localDate: localDateOf(at),
        startedAt: at,
        endedAt: null,
        lastActivityAt: at,
        activeMs: 0,
        docs: [{ documentId, startWords: currentWords, endWords: currentWords }],
      },
    };
  }

  const gap = at - active.lastActivityAt;
  const isKnown = active.docs.some((doc) => doc.documentId === documentId);
  return {
    ended: null,
    active: {
      ...active,
      lastActivityAt: at,
      activeMs: active.activeMs + (gap < ACTIVE_GAP_MS ? gap : 0),
      docs: isKnown
        ? active.docs
        : [...active.docs, { documentId, startWords: currentWords, endWords: currentWords }],
    },
  };
}

/** Records a document's new word count. Documents not edited in the session are ignored. */
export function recordWordCount(session: Session, documentId: string, words: number): Session {
  return {
    ...session,
    docs: session.docs.map((doc) =>
      doc.documentId === documentId ? { ...doc, endWords: words } : doc,
    ),
  };
}
