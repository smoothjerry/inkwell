import { flushAutosaves } from "./autosaver";
import { endActiveSession } from "./session-tracker";

/**
 * Saves unsaved edits and ends the writing session. Call before the app
 * closes. Resolves with false if an edit could not be saved.
 */
export async function flushPendingWork(): Promise<boolean> {
  const saved = await flushAutosaves();
  await endActiveSession();
  return saved;
}
