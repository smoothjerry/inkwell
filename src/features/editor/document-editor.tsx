import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { createAutosaver } from "./autosaver";
import { createEditorExtensions } from "./editor-extensions";

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
    onUpdate: ({ editor }) => autosaver.schedule(editor.state.doc),
  });

  // Never lose text (DESIGN_SPEC §4.3): save when the window loses focus,
  // unloads, or is closed, and when this document is switched away from.
  useEffect(() => {
    const flush = () => void autosaver.flush();
    window.addEventListener("blur", flush);
    window.addEventListener("beforeunload", flush);

    let stopListening: (() => void) | undefined;
    let unmounted = false;
    if (isTauri()) {
      // The window closes only after this handler's promise resolves.
      void getCurrentWindow()
        .onCloseRequested(() => autosaver.flush())
        .then((unlisten) => {
          if (unmounted) {
            unlisten();
          } else {
            stopListening = unlisten;
          }
        });
    }

    return () => {
      unmounted = true;
      window.removeEventListener("blur", flush);
      window.removeEventListener("beforeunload", flush);
      stopListening?.();
      flush();
    };
  }, [autosaver]);

  return <EditorContent editor={editor} />;
}
