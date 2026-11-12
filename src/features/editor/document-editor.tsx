import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { countWords } from "@/domain/word-count";
import { createAutosaver } from "./autosaver";
import { BubbleToolbar } from "./bubble-toolbar";
import { DocumentTitle } from "./document-title";
import { createEditorExtensions } from "./editor-extensions";
import { flushWordCount, trackDocumentOpened, trackEdit } from "./session-tracker";
import { SlashMenu } from "./slash-menu";
import { useWordCountStore } from "./word-count-store";

const SELECTION_COUNT_DELAY_MS = 100;

type DocumentEditorProps = {
  documentId: string;
  initialContent: JSONContent;
};

/** The Tiptap editor for one document. Mount it with `key={documentId}`. */
export function DocumentEditor({ documentId, initialContent }: DocumentEditorProps) {
  const [autosaver] = useState(() => createAutosaver(documentId));
  const selectionTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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
    onSelectionUpdate: ({ editor }) => {
      // Counting waits for the selection to settle, e.g. during a drag.
      clearTimeout(selectionTimer.current);
      selectionTimer.current = setTimeout(() => {
        const { from, to, empty } = editor.state.selection;
        useWordCountStore.setState({
          selectionWords: empty ? null : countWords(editor.state.doc.textBetween(from, to, "\n")),
        });
      }, SELECTION_COUNT_DELAY_MS);
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
      clearTimeout(selectionTimer.current);
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
