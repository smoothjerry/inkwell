import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { toast } from "sonner";
import { countDocumentWords } from "@/domain/doc-word-count";
import { saveDocumentContent } from "@/lib/db";

const IDLE_MS = 500;
const MAX_WAIT_MS = 5000;

// All saves run one after another, so a later save can never land first.
let queue: Promise<void> = Promise.resolve();

// Flush functions of the autosavers that are currently in use.
const live = new Set<() => Promise<void>>();

const saveListeners = new Set<(documentId: string) => void>();

/** Calls `listener` with a document's id after each save of it, so page counts can follow. */
export function subscribeToSaves(listener: (documentId: string) => void): () => void {
  saveListeners.add(listener);
  return () => saveListeners.delete(listener);
}

// How many saves have failed since launch, so a flush can tell whether its saves did.
let failedSaves = 0;

/**
 * Saves every pending edit now. Resolves when all of them are written, with
 * false if any save failed (it has already shown the save-error toast).
 */
export async function flushAutosaves(): Promise<boolean> {
  const failedBefore = failedSaves;
  await Promise.all([...live].map((flush) => flush()));
  return failedSaves === failedBefore;
}

/** Resolves when every save requested so far has finished. */
export function whenSavesSettle(): Promise<void> {
  return queue;
}

async function save(documentId: string, doc: ProseMirrorNode): Promise<void> {
  const plainText = doc.textBetween(0, doc.content.size, "\n");
  await saveDocumentContent(
    documentId,
    JSON.stringify(doc.toJSON()),
    plainText,
    countDocumentWords(doc),
  );
  for (const listener of saveListeners) {
    listener(documentId);
  }
}

/**
 * Debounced saving for one document (DESIGN_SPEC §4.2): saves 500 ms after
 * the last edit, and at least every 5 s while edits keep coming.
 *
 * It holds the ProseMirror document, which is immutable, so a save does not
 * depend on the editor still being mounted.
 */
export function createAutosaver(documentId: string) {
  let pending: ProseMirrorNode | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let maxTimer: ReturnType<typeof setTimeout> | undefined;

  /** Saves any pending edit now. Resolves when it is written. */
  function flush(): Promise<void> {
    clearTimeout(idleTimer);
    clearTimeout(maxTimer);
    idleTimer = undefined;
    maxTimer = undefined;

    const doc = pending;
    pending = null;
    if (doc) {
      queue = queue
        .then(() => save(documentId, doc))
        .catch((error: unknown) => {
          failedSaves += 1;
          console.error(error);
          toast.error("Could not save the document.");
        });
    }
    return queue;
  }

  function schedule(doc: ProseMirrorNode) {
    pending = doc;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(flush, IDLE_MS);
    maxTimer ??= setTimeout(flush, MAX_WAIT_MS);
  }

  /** Includes this autosaver in `flushAutosaves`. */
  function activate() {
    live.add(flush);
  }

  /** Saves any pending edit and leaves `flushAutosaves`. */
  function dispose() {
    live.delete(flush);
    void flush();
  }

  return { schedule, flush, activate, dispose };
}
