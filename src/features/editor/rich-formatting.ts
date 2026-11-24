import { TextStyle } from "@tiptap/extension-text-style";
import { type Editor, Extension } from "@tiptap/react";
import { isFontSize, resolveDocumentStyle } from "@/domain/document-style";
import { type FontId, fontById, fontFamilyCss, toFontId } from "@/domain/fonts";
import {
  DEFAULT_HIGHLIGHT,
  type Highlight,
  isHighlight,
  isTextColor,
  markValue,
  runFontSize,
  stepFontSize,
  stepIndent,
  type TextColor,
} from "@/domain/rich-formatting";
import { useSettingsStore } from "@/stores/settings-store";
import { getDocumentStyle, setDocumentStyle } from "./document-style";

/**
 * Rich formatting (DESIGN_SPEC §7.11). Colour, highlight, font, and size are
 * attributes of Tiptap's text-style mark; indent is an attribute of
 * paragraphs and headings. Colours are stored by name and drawn by
 * editor.css from theme tokens, so they read well in both themes.
 */
export const RichFormatting = Extension.create({
  name: "richFormatting",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          textColor: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-color"),
            renderHTML: (attrs) =>
              isTextColor(attrs.textColor) ? { "data-color": attrs.textColor } : {},
          },
          highlight: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-highlight"),
            renderHTML: (attrs) =>
              isHighlight(attrs.highlight) ? { "data-highlight": attrs.highlight } : {},
          },
          fontId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-font"),
            renderHTML: (attrs) => {
              // A font no longer in the library falls back to the document's.
              const fontId = toFontId(attrs.fontId);
              return fontId === null
                ? {}
                : { "data-font": fontId, style: `font-family: ${fontFamilyCss(fontById(fontId))}` };
            },
          },
          fontSize: {
            default: null,
            parseHTML: (element) => Number(element.getAttribute("data-size")) || null,
            renderHTML: (attrs) =>
              isFontSize(attrs.fontSize)
                ? { "data-size": attrs.fontSize, style: `font-size: ${attrs.fontSize}pt` }
                : {},
          },
        },
      },
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => Number(element.getAttribute("data-indent")) || 0,
            renderHTML: (attrs) => (attrs.indent > 0 ? { "data-indent": attrs.indent } : {}),
          },
        },
      },
    ];
  },
});

/**
 * Tiptap's text-style mark, also reading back the colour and highlight spans
 * drawn above. Tiptap reads only spans with a `style`, and these have none,
 * so without this they would be lost on copy and paste.
 */
export const RichTextStyle = TextStyle.extend({
  parseHTML() {
    return [
      ...(this.parent?.() ?? []),
      { tag: "span[data-color]", consuming: false },
      { tag: "span[data-highlight]", consuming: false },
    ];
  },
});

/** Sets text-style attributes on the selection, dropping the mark once it is empty. */
function setTextStyle(editor: Editor, attrs: Record<string, unknown>) {
  editor.chain().focus().setMark("textStyle", attrs).removeEmptyTextStyle().run();
}

export function setTextColor(editor: Editor, textColor: TextColor | null) {
  setTextStyle(editor, { textColor });
}

export function setHighlight(editor: Editor, highlight: Highlight | null) {
  setTextStyle(editor, { highlight });
}

/** ⌘⇧H: removes the selection's highlight, or adds the default one. */
export function toggleHighlight(editor: Editor) {
  const current = editor.getAttributes("textStyle").highlight;
  setHighlight(editor, isHighlight(current) ? null : DEFAULT_HIGHLIGHT);
}

function documentStyle(editor: Editor) {
  return resolveDocumentStyle(getDocumentStyle(editor), useSettingsStore.getState().editorFont);
}

/** Sets the selection's font. The document's own font removes the mark. */
export function setSelectionFont(editor: Editor, fontId: FontId | null) {
  const documentFont = documentStyle(editor).font.id;
  setTextStyle(editor, { fontId: fontId === null ? null : markValue(fontId, documentFont) });
}

/** Sets the selection's size in points. The document's own size removes the mark. */
export function setSelectionSize(editor: Editor, size: number | null) {
  const documentSize = documentStyle(editor).fontSize;
  setTextStyle(editor, { fontSize: size === null ? null : markValue(size, documentSize) });
}

/** ⌘⇧. and ⌘⇧,: steps the size where the selection starts. */
export function stepSelectionSize(editor: Editor, direction: 1 | -1) {
  const current = runFontSize(
    editor.getAttributes("textStyle").fontSize,
    documentStyle(editor).fontSize,
  );
  setSelectionSize(editor, stepFontSize(current, direction));
}

/**
 * ⌘] and ⌘[: in a list, nests or un-nests the item (as Tab and Shift+Tab
 * do); otherwise steps the block indent of the selected paragraphs and headings.
 */
export function indent(editor: Editor, direction: 1 | -1) {
  for (const item of ["listItem", "taskItem"]) {
    if (editor.isActive(item)) {
      const chain = editor.chain().focus();
      (direction === 1 ? chain.sinkListItem(item) : chain.liftListItem(item)).run();
      return;
    }
  }
  const { from, to } = editor.state.selection;
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === "paragraph" || node.type.name === "heading") {
          tr.setNodeAttribute(pos, "indent", stepIndent(node.attrs.indent, direction));
        }
      });
      return true;
    })
    .run();
}

/** The paragraph styles of the toolbar and Format ▸ Paragraph Style. */
export const PARAGRAPH_STYLES = ["body", "h1", "h2", "h3", "quote", "code"] as const;

export type ParagraphStyle = (typeof PARAGRAPH_STYLES)[number];

export const PARAGRAPH_STYLE_LABELS: Record<ParagraphStyle, string> = {
  body: "Body",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  quote: "Quote",
  code: "Code",
};

/** The paragraph style where the selection is. */
export function getParagraphStyle(editor: Editor): ParagraphStyle {
  if (editor.isActive("codeBlock")) {
    return "code";
  }
  for (const level of [1, 2, 3] as const) {
    if (editor.isActive("heading", { level })) {
      return `h${level}`;
    }
  }
  return editor.isActive("blockquote") ? "quote" : "body";
}

/**
 * Gives the selected blocks a paragraph style. Quote wraps them, or unwraps
 * them if they are already quoted; the other styles also take them out of a quote.
 */
export function setParagraphStyle(editor: Editor, style: ParagraphStyle) {
  const chain = editor.chain().focus();
  if (style === "quote") {
    // Like ⌘⇧B in Tiptap, choosing Quote again takes the text out of it.
    if (editor.isActive("blockquote")) {
      chain.unsetBlockquote().run();
    } else {
      chain.setParagraph().setBlockquote().run();
    }
    return;
  }
  if (editor.isActive("blockquote")) {
    chain.unsetBlockquote();
  }
  if (style === "body") {
    chain.setParagraph().run();
  } else if (style === "code") {
    chain.setCodeBlock().run();
  } else {
    chain.setHeading({ level: Number(style.slice(1)) as 1 | 2 | 3 }).run();
  }
}

/**
 * The toolbar's font picker: with text selected it marks the selection;
 * with nothing selected it sets the document's own font (DESIGN_SPEC §7.11).
 */
export function chooseFont(editor: Editor, fontId: FontId) {
  if (editor.state.selection.empty) {
    setDocumentStyle(editor, { fontId });
    editor.commands.focus();
  } else {
    setSelectionFont(editor, fontId);
  }
}

/** The toolbar's size picker, which works as `chooseFont` does. */
export function chooseFontSize(editor: Editor, fontSize: number) {
  if (editor.state.selection.empty) {
    setDocumentStyle(editor, { fontSize });
    editor.commands.focus();
  } else {
    setSelectionSize(editor, fontSize);
  }
}
