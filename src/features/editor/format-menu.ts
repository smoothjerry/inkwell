/**
 * Routes the native Format menu to the open editor. Kept free of Tiptap so
 * the app shell can import it without loading the editor chunk (§9).
 */

let handler: ((action: string) => void) | null = null;

/** Called by the open editor; returns a function that unregisters it. */
export function setFormatMenuHandler(next: (action: string) => void): () => void {
  handler = next;
  return () => {
    if (handler === next) {
      handler = null;
    }
  };
}

/** Runs a Format menu action (its id without the `format-` prefix) on the open editor, if any. */
export function runFormatMenuAction(action: string) {
  handler?.(action);
}
