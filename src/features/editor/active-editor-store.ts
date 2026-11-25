import type { Editor } from "@tiptap/react";
import { create } from "zustand";

type ActiveEditorState = {
  /** The open document's editor, or null when none is open. */
  editor: Editor | null;
  /** The open document's id, with its editor. */
  documentId: string | null;
};

/**
 * The open editor, for features that add to it from outside, such as the
 * paged view (DESIGN_SPEC §7.10). Set by DocumentEditor. Type-only Tiptap
 * import, so the store stays in the startup bundle without Tiptap.
 */
export const useActiveEditorStore = create<ActiveEditorState>(() => ({
  editor: null,
  documentId: null,
}));
