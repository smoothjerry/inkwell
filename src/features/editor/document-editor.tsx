import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { createAutosaver } from "./autosaver";
import { BubbleToolbar } from "./bubble-toolbar";
import { DocumentTitle } from "./document-title";
import { createEditorExtensions } from "./editor-extensions";
import { flushWordCount, trackDocumentOpened, trackEdit } from "./session-tracker";
import { SlashMenu } from "./slash-menu";
import { useWordCountStore } from "./word-count-store";

type DocumentEditorProps = {
  documentId: string;
  initialContent: JSONContent;
};

/** The Tiptap editor for one document. Mount it with `key={documentId}`. */
export function DocumentEditor({ documentId, initialContent }: DocumentEditorProps) {
  const [autosaver] = useState(() => createAutosaver(documentId));

  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: initialContent,
    // Typing must not re-render React; menus read state through selectors.
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: { class: "editor-prose", "aria-label": "Document body" },
    },
    onUpdate: ({ editor }) => {
      autosaver.schedule(editor.state.doc);
      trackEdit(documentId, editor.state.doc);
    },
  });

  // Save when the window loses focus and when this document is switched
  // away from. Closing the app is handled once, in app/use-close-flush.ts.
  useEffect(() => {
    const flush = () => void autosaver.flush();
    autosaver.activate();
    window.addEventListener("blur", flush);
    return () => {
      window.removeEventListener("blur", flush);
      autosaver.dispose();
    };
  }, [autosaver]);

  useEffect(() => {
    trackDocumentOpened(documentId, editor.state.doc);
    return () => {
      flushWordCount();
      useWordCountStore.setState({ documentWords: null, selectionWords: null });
    };
  }, [documentId, editor]);

  return (
    <>
      <DocumentTitle documentId={documentId} onEnter={() => editor.commands.focus("start")} />
      <EditorContent editor={editor} />
      <BubbleToolbar editor={editor} />
      <SlashMenu />
    </>
  );
}
