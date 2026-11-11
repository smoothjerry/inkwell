import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import { createEditorExtensions } from "./editor-extensions";

type DocumentEditorProps = {
  documentId: string;
  initialContent: JSONContent;
};

/** The Tiptap editor for one document. Mount it with `key={documentId}`. */
export function DocumentEditor({ initialContent }: DocumentEditorProps) {
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: initialContent,
    // Typing must not re-render React; menus read state through selectors.
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: "editor-prose", "aria-label": "Document body" },
    },
  });

  return <EditorContent editor={editor} />;
}
