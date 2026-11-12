import { flushAutosaves } from "./autosaver";
import { endActiveSession } from "./session-tracker";

/** Saves unsaved edits and ends the writing session. Call before the app closes. */
export async function flushPendingWork(): Promise<void> {
  await flushAutosaves();
  await endActiveSession();
}
