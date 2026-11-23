import { type Editor, Extension } from "@tiptap/react";
import type { DocumentStyleAttrs } from "@/domain/document-style";

/**
 * Document style (DESIGN_SPEC §7.11): a document's own font, size, and line
 * spacing, stored as attributes of its document node so they are saved,
 * exported, and undone with its content. Null means "not chosen". They are
 * resolved in domain/document-style.ts and applied in document-editor.tsx.
 */
export const DocumentStyle = Extension.create({
  name: "documentStyle",

  addGlobalAttributes() {
    return [
      {
        types: ["doc"],
        attributes: {
          fontId: { default: null, rendered: false },
          fontSize: { default: null, rendered: false },
          lineSpacing: { default: null, rendered: false },
        },
      },
    ];
  },
});

/** The document's stored style attributes. */
export function getDocumentStyle(editor: Editor): DocumentStyleAttrs {
  const { fontId, fontSize, lineSpacing } = editor.state.doc.attrs;
  return { fontId, fontSize, lineSpacing } as DocumentStyleAttrs;
}

/** Changes some of the document's style as one undoable step. */
export function setDocumentStyle(editor: Editor, changes: Partial<DocumentStyleAttrs>) {
  const { tr } = editor.state;
  for (const [name, value] of Object.entries(changes)) {
    tr.setDocAttribute(name, value);
  }
  editor.view.dispatch(tr);
}
