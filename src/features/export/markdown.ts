import { MarkdownManager } from "@tiptap/markdown";
import { type JSONContent, resolveExtensions } from "@tiptap/react";
import { createEditorExtensions } from "@/features/editor";

let manager: MarkdownManager | undefined;

/** Built on first use from the editor's own extensions, so both agree on the schema. */
function getManager(): MarkdownManager {
  manager ??= new MarkdownManager({ extensions: resolveExtensions(createEditorExtensions()) });
  return manager;
}

/**
 * Marks Markdown cannot express (DESIGN_SPEC §7.11). Left in, underline would
 * come out as `<u>` HTML; the text-style mark holds colour, highlight, font,
 * and size. Alignment and indent are block attributes Markdown ignores.
 */
const DROPPED_MARKS = new Set(["underline", "textStyle"]);

/** The document without the marks Markdown keeps out, so it holds text and structure only. */
function withoutRichFormatting(node: JSONContent): JSONContent {
  const marks = node.marks?.filter((mark) => !DROPPED_MARKS.has(mark.type));
  return {
    ...node,
    ...(node.marks && { marks }),
    ...(node.content && { content: node.content.map(withoutRichFormatting) }),
  };
}

/** Converts a document's Tiptap JSON to Markdown. */
export function toMarkdown(content: JSONContent): string {
  return `${getManager().serialize(withoutRichFormatting(content)).trim()}\n`;
}

/** Converts Markdown to Tiptap JSON. */
export function fromMarkdown(markdown: string): JSONContent {
  return getManager().parse(markdown);
}
