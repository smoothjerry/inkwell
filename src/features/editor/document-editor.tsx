import { EditorContent, type JSONContent, useEditor, useEditorState } from "@tiptap/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { resolveDocumentStyle } from "@/domain/document-style";
import { fontFamilyCss } from "@/domain/fonts";
import { countWords } from "@/domain/word-count";
import { useSettingsStore } from "@/stores/settings-store";
import { createAutosaver } from "./autosaver";
import { BubbleToolbar } from "./bubble-toolbar";
import { getDocumentStyle } from "./document-style";
import { DocumentStyleDialog } from "./document-style-dialog";
import { DocumentTitle } from "./document-title";
import { createEditorExtensions } from "./editor-extensions";
import { FindBar } from "./find-bar";
import { useFindStore } from "./find-store";
import { runFormatAction } from "./format-actions";
import { setFormatMenuHandler } from "./format-menu";
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

  // The dimming plugin reads the setting when the editor redraws, so a
  // change of setting has to trigger a redraw.
  const dimMode = useSettingsStore((state) => state.dimMode);
  // biome-ignore lint/correctness/useExhaustiveDependencies: dimMode is the trigger, not an input.
  useEffect(() => {
    editor.view.dispatch(editor.state.tr);
  }, [editor, dimMode]);

  // The native Format menu acts on this editor while it is open.
  useEffect(() => setFormatMenuHandler((action) => runFormatAction(editor, action)), [editor]);

  const isFindOpen = useFindStore((state) => state.isOpen);

  // The document's own style, else the editorFont setting and the defaults.
  // The selector's result is compared by value, so typing does not re-render.
  const styleAttrs = useEditorState({ editor, selector: ({ editor }) => getDocumentStyle(editor) });
  const editorFont = useSettingsStore((state) => state.editorFont);
  const style = resolveDocumentStyle(styleAttrs, editorFont);
  const styleCss: CSSProperties = {
    fontFamily: fontFamilyCss(style.font),
    fontSize: `${style.fontSize}pt`,
    lineHeight: style.lineHeight,
  };

  return (
    <>
      {isFindOpen && <FindBar editor={editor} />}
      <div style={styleCss}>
        <DocumentTitle documentId={documentId} onEnter={() => editor.commands.focus("start")} />
        <EditorContent editor={editor} />
      </div>
      <BubbleToolbar editor={editor} />
      <SlashMenu />
      <DocumentStyleDialog editor={editor} />
    </>
  );
}
