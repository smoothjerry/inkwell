import type { JSONContent } from "@tiptap/react";
import type {
  IParagraphOptions,
  IRunOptions,
  ParagraphChild,
  Paragraph as ParagraphType,
} from "docx";
import { isFontSize, type ResolvedDocumentStyle } from "@/domain/document-style";
import { fontById, toFontId } from "@/domain/fonts";
import {
  isHighlight,
  isTextColor,
  PRINT_HIGHLIGHTS,
  PRINT_TEXT_COLORS,
} from "@/domain/rich-formatting";

type Docx = typeof import("docx");

const MONO_FONT = "Courier New";
const NUMBERED = "numbered";
const INDENT_STEP = 720; // Twentieths of a point: half an inch.

/** Word's line spacing unit: 240 is single spacing. */
const SINGLE_LINE = 240;

type Marks = Map<string, Record<string, unknown> | undefined>;

/** A hex colour as Word wants it: no `#`. */
function wordColor(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

/**
 * A text run's formatting from its marks (DESIGN_SPEC §7.11). Fonts are named,
 * not embedded, so Word substitutes any that is not installed.
 */
export function runStyle(marks: Marks): IRunOptions {
  const textStyle = marks.get("textStyle") ?? {};
  const fontId = toFontId(textStyle.fontId);
  const { textColor, highlight, fontSize } = textStyle;
  return {
    bold: marks.has("bold"),
    italics: marks.has("italic"),
    strike: marks.has("strike"),
    underline: marks.has("underline") ? {} : undefined,
    color: isTextColor(textColor) ? wordColor(PRINT_TEXT_COLORS[textColor]) : undefined,
    shading: isHighlight(highlight)
      ? { type: "clear", color: "auto", fill: wordColor(PRINT_HIGHLIGHTS[highlight]) }
      : undefined,
    font: marks.has("code") ? MONO_FONT : fontId === null ? undefined : fontById(fontId).name,
    // Word measures in half-points.
    size: isFontSize(fontSize) ? fontSize * 2 : undefined,
  };
}

const ALIGNMENTS: Record<string, IParagraphOptions["alignment"]> = {
  center: "center",
  right: "right",
  justify: "both",
};

/** A paragraph's or heading's alignment, and its block indent in twips. */
export function blockStyle(attrs: Record<string, unknown> = {}): {
  alignment: IParagraphOptions["alignment"];
  indent: number;
} {
  const steps = Number(attrs.indent);
  return {
    alignment: ALIGNMENTS[String(attrs.textAlign)],
    indent: Number.isInteger(steps) && steps > 0 ? steps * INDENT_STEP : 0,
  };
}

/** The document's own font, size, and line spacing, as Word's defaults for all text. */
export function documentDefaults(style: ResolvedDocumentStyle) {
  return {
    run: { font: style.font.name, size: style.fontSize * 2 },
    paragraph: { spacing: { line: Math.round(style.lineSpacing * SINGLE_LINE) } },
  };
}

type BlockContext = {
  /** Nesting depth inside lists. */
  level: number;
  list: "bullet" | "ordered" | "task" | null;
  /** Each ordered list needs its own numbering instance so it restarts at 1. */
  listInstance: number;
  isChecked: boolean;
  isQuote: boolean;
};

/**
 * Converts a document to a Word file (DESIGN_SPEC §7.6, §7.11): headings,
 * lists, quotes, code blocks, links, and rich formatting, in the document's
 * own font, size, and line spacing. The `docx` library is large, so it is
 * loaded only when this runs.
 */
export async function toDocx(
  title: string,
  content: JSONContent,
  style: ResolvedDocumentStyle,
): Promise<Uint8Array> {
  const docx = await import("docx");
  let listInstances = 0;

  function inline(nodes: JSONContent[] = []): ParagraphChild[] {
    return nodes.map((node) => {
      if (node.type === "hardBreak") {
        return new docx.TextRun({ break: 1 });
      }
      const marks: Marks = new Map((node.marks ?? []).map((mark) => [mark.type, mark.attrs]));
      const link = marks.get("link");
      const run = new docx.TextRun({
        text: node.text ?? "",
        ...runStyle(marks),
        style: link ? "Hyperlink" : undefined,
      });
      return link
        ? new docx.ExternalHyperlink({ link: String(link.href ?? ""), children: [run] })
        : run;
    });
  }

  function paragraph(
    children: ParagraphChild[],
    context: BlockContext,
    attrs?: Record<string, unknown>,
  ): ParagraphType {
    const { level, list } = context;
    const block = blockStyle(attrs);
    const contextIndent =
      list === "task" || (context.isQuote && list === null) ? INDENT_STEP * (level + 1) : 0;
    const left = contextIndent + block.indent;
    return new docx.Paragraph({
      alignment: block.alignment,
      children:
        list === "task"
          ? [new docx.TextRun(context.isChecked ? "☑ " : "☐ "), ...children]
          : children,
      bullet: list === "bullet" ? { level } : undefined,
      numbering:
        list === "ordered"
          ? { reference: NUMBERED, level, instance: context.listInstance }
          : undefined,
      indent: left > 0 ? { left } : undefined,
      border: context.isQuote
        ? { left: { style: docx.BorderStyle.SINGLE, size: 12, color: "D4D4D4", space: 8 } }
        : undefined,
    });
  }

  function blocks(nodes: JSONContent[] = [], context: BlockContext): ParagraphType[] {
    return nodes.flatMap((node): ParagraphType[] => {
      switch (node.type) {
        case "heading": {
          const { alignment, indent } = blockStyle(node.attrs);
          return [
            new docx.Paragraph({
              children: inline(node.content),
              heading: headingLevel(docx, Number(node.attrs?.level ?? 1)),
              alignment,
              indent: indent > 0 ? { left: indent } : undefined,
            }),
          ];
        }
        case "paragraph":
          return [paragraph(inline(node.content), context, node.attrs)];
        case "blockquote":
          return blocks(node.content, { ...context, isQuote: true });
        case "bulletList":
          return blocks(node.content, { ...context, list: "bullet" });
        case "orderedList":
          listInstances += 1;
          return blocks(node.content, {
            ...context,
            list: "ordered",
            listInstance: listInstances,
          });
        case "taskList":
          return blocks(node.content, { ...context, list: "task" });
        case "listItem":
        case "taskItem": {
          // The item's own paragraphs stay at this level; nested lists go one deeper.
          const isChecked = node.attrs?.checked === true;
          return (node.content ?? []).flatMap((child) =>
            child.type?.endsWith("List")
              ? blocks([child], { ...context, level: context.level + 1 })
              : blocks([child], { ...context, isChecked }),
          );
        }
        case "codeBlock":
          return (node.content?.[0]?.text ?? "").split("\n").map(
            (line) =>
              new docx.Paragraph({
                children: [new docx.TextRun({ text: line, font: MONO_FONT, size: 20 })],
                shading: { type: docx.ShadingType.CLEAR, fill: "FAFAFA" },
              }),
          );
        case "horizontalRule":
          return [new docx.Paragraph({ thematicBreak: true })];
        default:
          return [];
      }
    });
  }

  const document = new docx.Document({
    title,
    styles: { default: { document: documentDefaults(style) } },
    numbering: {
      config: [
        {
          reference: NUMBERED,
          levels: [0, 1, 2, 3, 4, 5].map((level) => ({
            level,
            format: docx.LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: docx.AlignmentType.START,
            style: {
              paragraph: { indent: { left: INDENT_STEP * (level + 1), hanging: 360 } },
            },
          })),
        },
      ],
    },
    sections: [
      {
        children: [
          new docx.Paragraph({ text: title, heading: docx.HeadingLevel.TITLE }),
          ...blocks(content.content, {
            level: 0,
            list: null,
            listInstance: 0,
            isChecked: false,
            isQuote: false,
          }),
        ],
      },
    ],
  });

  return new Uint8Array(await (await docx.Packer.toBlob(document)).arrayBuffer());
}

/** The document title is the Word "Title"; H1–H3 in the text become Headings 1–3. */
function headingLevel(docx: Docx, level: number) {
  const levels = [
    docx.HeadingLevel.HEADING_1,
    docx.HeadingLevel.HEADING_2,
    docx.HeadingLevel.HEADING_3,
  ];
  return levels[level - 1] ?? docx.HeadingLevel.HEADING_3;
}
