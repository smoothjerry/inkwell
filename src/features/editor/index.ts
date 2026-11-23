import { lazy } from "react";

export { flushAutosaves, whenSavesSettle } from "./autosaver";
export { useDocumentStyleStore } from "./document-style-store";
export { createEditorExtensions } from "./editor-extensions";
export { useFindStore } from "./find-store";
export { flushPendingWork } from "./flush-pending-work";
export { subscribeToSessionWrites } from "./session-tracker";
export { WordCountStatus } from "./word-count-status";

/** The editor and Tiptap load in their own chunk, fetched as soon as the app starts (§9). */
export const EditorPane = lazy(() =>
  import("./editor-pane").then((module) => ({ default: module.EditorPane })),
);
