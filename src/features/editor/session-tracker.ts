import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { v7 as uuidv7 } from "uuid";
import {
  endOfLocalDay,
  expireSession,
  isNoise,
  recordActivity,
  recordWordCount,
  type Session,
  sessionWords,
} from "@/domain/sessions";
import { countWords } from "@/domain/word-count";
import { deleteSession, saveSession, saveSessionDoc } from "@/lib/db";
import { useWordCountStore } from "./word-count-store";

/**
 * Connects editor edits to the session rules in `domain/sessions` and stores
 * the result (DESIGN_SPEC §4.2, §6.2). There is one active session at most,
 * so this is module state. Timers run only while a session is active.
 */

const IDLE_MS = 10 * 60_000;
const COUNT_DELAY_MS = 300;
const options = { idleMs: IDLE_MS, newId: uuidv7 };

let active: Session | null = null;
/** The latest edit whose words have not been counted yet. */
let uncounted: { documentId: string; doc: ProseMirrorNode } | null = null;
/** Last known word count per document, used as a document's start count. */
const knownCounts = new Map<string, number>();

let idleTimer: ReturnType<typeof setTimeout> | undefined;
let midnightTimer: ReturnType<typeof setTimeout> | undefined;
let countTimer: ReturnType<typeof setTimeout> | undefined;

// Database writes run in order, one at a time.
let writes: Promise<void> = Promise.resolve();

function write(task: () => Promise<void>) {
  writes = writes.then(task).catch((error: unknown) => console.error(error));
}

function plainText(doc: ProseMirrorNode): string {
  return doc.textBetween(0, doc.content.size, "\n");
}

function saveActive(session: Session, documentId: string) {
  const doc = session.docs.find((entry) => entry.documentId === documentId);
  write(async () => {
    await saveSession({ ...session, words: sessionWords(session) });
    if (doc) {
      await saveSessionDoc(session.id, doc.documentId, doc.startWords, doc.endWords);
    }
  });
}

function close(ended: Session) {
  write(() =>
    isNoise(ended)
      ? deleteSession(ended.id)
      : saveSession({ ...ended, words: sessionWords(ended) }),
  );
}

function clearSessionTimers() {
  clearTimeout(idleTimer);
  clearTimeout(midnightTimer);
  idleTimer = undefined;
  midnightTimer = undefined;
}

/** Ends the active session if it has gone idle or the date has changed. */
function checkExpiry() {
  flushWordCount();
  const ended = active ? expireSession(active, Date.now(), IDLE_MS) : null;
  if (ended) {
    close(ended);
    active = null;
    clearSessionTimers();
  }
}

/** Counts the latest edit now, without waiting for the debounce. */
export function flushWordCount() {
  clearTimeout(countTimer);
  countTimer = undefined;
  if (!uncounted) {
    return;
  }
  const { documentId, doc } = uncounted;
  uncounted = null;

  const words = countWords(plainText(doc));
  knownCounts.set(documentId, words);
  useWordCountStore.setState({ documentWords: words });
  if (active) {
    active = recordWordCount(active, documentId, words);
    saveActive(active, documentId);
  }
}

/** Call when a document is opened, so its starting word count is known. */
export function trackDocumentOpened(documentId: string, doc: ProseMirrorNode) {
  const words = countWords(plainText(doc));
  knownCounts.set(documentId, words);
  useWordCountStore.setState({ documentWords: words, selectionWords: null });
}

/** Call on every content-changing edit. Cheap: counting is deferred. */
export function trackEdit(documentId: string, doc: ProseMirrorNode) {
  const now = Date.now();
  const previous = active;
  const result = recordActivity(
    previous,
    { documentId, at: now, currentWords: knownCounts.get(documentId) ?? 0 },
    options,
  );
  active = result.active;

  if (result.ended) {
    close(result.ended);
  }
  const isNewSession = active.id !== previous?.id;
  const isNewDocument = !previous?.docs.some((entry) => entry.documentId === documentId);
  if (isNewSession || isNewDocument) {
    saveActive(active, documentId);
  }
  if (isNewSession) {
    clearTimeout(midnightTimer);
    midnightTimer = setTimeout(checkExpiry, endOfLocalDay(now) + 1 - now);
  }
  clearTimeout(idleTimer);
  idleTimer = setTimeout(checkExpiry, IDLE_MS);

  uncounted = { documentId, doc };
  clearTimeout(countTimer);
  countTimer = setTimeout(flushWordCount, COUNT_DELAY_MS);
}

/** Ends the active session now (app close). Resolves when it is stored. */
export function endActiveSession(): Promise<void> {
  flushWordCount();
  if (active) {
    close({ ...active, endedAt: Date.now() });
    active = null;
    clearSessionTimers();
  }
  return writes;
}
