import type { Editor } from "@tiptap/react";
import { resolveDocumentStyle } from "@/domain/document-style";
import { type FontId, toFontId } from "@/domain/fonts";
import {
  commonValue,
  type Highlight,
  isHighlight,
  isTextColor,
  runFontSize,
  type TextColor,
} from "@/domain/rich-formatting";
import { getDocumentStyle } from "./document-style";
import { getParagraphStyle, type ParagraphStyle } from "./rich-formatting";

export const ALIGNMENTS = ["left", "center", "right", "justify"] as const;

export type Alignment = (typeof ALIGNMENTS)[number];

export type ListKind = "bullet" | "numbered" | "task";

/** What the toolbar shows for the current selection (DESIGN_SPEC §7.11). */
export type ToolbarState = {
  canUndo: boolean;
  canRedo: boolean;
  paragraphStyle: ParagraphStyle;
  /** Null when the selection mixes fonts. */
  fontId: FontId | null;
  /** In points; null when the selection mixes sizes. */
  fontSize: number | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  /** Null for the default colour, or when the selection mixes colours. */
  textColor: TextColor | null;
  highlight: Highlight | null;
  link: boolean;
  alignment: Alignment;
  list: ListKind | null;
};

/** The text-style attributes of every run of text in the selection, or at the caret. */
function selectedTextStyles(editor: Editor): Record<string, unknown>[] {
  const { from, to, empty } = editor.state.selection;
  if (empty) {
    return [editor.getAttributes("textStyle")];
  }
  const styles: Record<string, unknown>[] = [];
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (node.isText) {
      const mark = node.marks.find((candidate) => candidate.type.name === "textStyle");
      styles.push(mark?.attrs ?? {});
    }
  });
  return styles;
}

/**
 * Reads the selection's formatting for the toolbar. Used as a
 * `useEditorState` selector; its result is compared by value, so the
 * toolbar redraws only when what it shows changes.
 */
export function getToolbarState(editor: Editor, editorFont: FontId): ToolbarState {
  const documentStyle = resolveDocumentStyle(getDocumentStyle(editor), editorFont);
  const styles = selectedTextStyles(editor);
  const alignment = ALIGNMENTS.find((value) => editor.isActive({ textAlign: value })) ?? "left";
  const list: ListKind | null = editor.isActive("taskList")
    ? "task"
    : editor.isActive("orderedList")
      ? "numbered"
      : editor.isActive("bulletList")
        ? "bullet"
        : null;

  const textColor = commonValue(styles.map((style) => style.textColor ?? null));
  const highlight = commonValue(styles.map((style) => style.highlight ?? null));

  return {
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    paragraphStyle: getParagraphStyle(editor),
    fontId: commonValue(
      styles.map((style) => toFontId(style.fontId) ?? (documentStyle.font.id as FontId)),
    ),
    fontSize: commonValue(
      styles.map((style) => runFontSize(style.fontSize, documentStyle.fontSize)),
    ),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    textColor: isTextColor(textColor) ? textColor : null,
    highlight: isHighlight(highlight) ? highlight : null,
    link: editor.isActive("link"),
    alignment,
    list,
  };
}

/**
 * The toolbar's groups, left to right (DESIGN_SPEC §7.11). When the window is
 * narrow, groups move into the ⋯ menu from the right.
 */
export const TOOLBAR_GROUPS = [
  "history",
  "style",
  "font",
  "size",
  "marks",
  "colors",
  "link",
  "align",
  "lists",
  "indent",
] as const;

export type ToolbarGroup = (typeof TOOLBAR_GROUPS)[number];
