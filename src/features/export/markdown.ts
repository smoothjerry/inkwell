import { MarkdownManager } from "@tiptap/markdown";
import { type JSONContent, resolveExtensions } from "@tiptap/react";
import { createEditorExtensions } from "@/features/editor";

let manager: MarkdownManager | undefined;

/** Built on first use from the editor's own extensions, so both agree on the schema. */
function getManager(): MarkdownManager {
  manager ??= new MarkdownManager({ extensions: resolveExtensions(createEditorExtensions()) });
  return manager;
}

/** Converts a document's Tiptap JSON to Markdown. */
export function toMarkdown(content: JSONContent): string {
  return `${getManager().serialize(content).trim()}\n`;
}

/** Converts Markdown to Tiptap JSON. */
export function fromMarkdown(markdown: string): JSONContent {
  return getManager().parse(markdown);
}
