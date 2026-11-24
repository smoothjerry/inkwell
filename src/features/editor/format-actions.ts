import type { Editor } from "@tiptap/react";
import { toFontId } from "@/domain/fonts";
import { isHighlight, isTextColor } from "@/domain/rich-formatting";
import { useLinkDialogStore } from "./link-dialog-store";
import {
  indent,
  type ParagraphStyle,
  setHighlight,
  setParagraphStyle,
  setSelectionFont,
  setSelectionSize,
  setTextColor,
  stepSelectionSize,
  toggleHighlight,
} from "./rich-formatting";

/**
 * Runs a native Format menu action on `editor` (DESIGN_SPEC §7.11). The ids
 * match src-tauri/src/menu.rs, without their `format-` prefix. Actions apply
 * only while the document body has focus, so a shortcut typed in the title or
 * a dialog does nothing.
 */
export function runFormatAction(editor: Editor, action: string) {
  if (editor.isFocused) {
    applyFormatAction(editor, action);
  }
}

/** Applies a formatting action whatever has focus; the toolbar's menus use this. */
export function applyFormatAction(editor: Editor, action: string) {
  const chain = () => editor.chain().focus();

  switch (action) {
    case "undo":
      chain().undo().run();
      return;
    case "redo":
      chain().redo().run();
      return;
    case "bold":
      chain().toggleBold().run();
      return;
    case "italic":
      chain().toggleItalic().run();
      return;
    case "underline":
      chain().toggleUnderline().run();
      return;
    case "strike":
      chain().toggleStrike().run();
      return;
    case "highlight":
      toggleHighlight(editor);
      return;
    case "style-body":
    case "style-h1":
    case "style-h2":
    case "style-h3":
    case "style-quote":
    case "style-code":
      setParagraphStyle(editor, action.slice("style-".length) as ParagraphStyle);
      return;
    case "list-bullet":
      chain().toggleBulletList().run();
      return;
    case "list-numbered":
      chain().toggleOrderedList().run();
      return;
    case "list-task":
      chain().toggleTaskList().run();
      return;
    case "link":
      useLinkDialogStore.getState().open();
      return;
    case "align-left":
      // Left is the default, so it is stored as no alignment.
      chain().unsetTextAlign().run();
      return;
    case "align-center":
    case "align-right":
    case "align-justify":
      chain().setTextAlign(action.slice("align-".length)).run();
      return;
    case "indent":
      indent(editor, 1);
      return;
    case "outdent":
      indent(editor, -1);
      return;
    case "size-bigger":
      stepSelectionSize(editor, 1);
      return;
    case "size-smaller":
      stepSelectionSize(editor, -1);
      return;
    case "size-document":
      setSelectionSize(editor, null);
      return;
    case "font-document":
      setSelectionFont(editor, null);
      return;
    case "color-default":
      setTextColor(editor, null);
      return;
    case "highlight-none":
      setHighlight(editor, null);
      return;
  }

  const [kind, ...rest] = action.split("-");
  const value = rest.join("-");
  if (kind === "color" && isTextColor(value)) {
    setTextColor(editor, value);
  } else if (kind === "highlight" && isHighlight(value)) {
    setHighlight(editor, value);
  } else if (kind === "font") {
    const fontId = toFontId(value);
    if (fontId !== null) {
      setSelectionFont(editor, fontId);
    }
  }
}
