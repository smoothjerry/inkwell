import { generateHTML, generateText, type JSONContent } from "@tiptap/react";
import { createEditorExtensions } from "@/features/editor";

// Small, self-contained styles for an exported HTML file.
const STYLES = `
body { max-width: 68ch; margin: 3rem auto; padding: 0 1.5rem; color: #0a0a0a; background: #fff;
  font: 17px/1.7 system-ui, -apple-system, "Segoe UI", sans-serif; }
h1, h2, h3 { line-height: 1.25; letter-spacing: -0.02em; margin: 1.5em 0 0.5em; }
h1 { font-size: 1.75em; } h2 { font-size: 1.375em; } h3 { font-size: 1.125em; }
p, ul, ol, blockquote, pre { margin: 0.75em 0; }
blockquote { margin-left: 0; padding-left: 1em; border-left: 2px solid #d4d4d4; color: #666; }
code { font: 0.875em ui-monospace, "SF Mono", Menlo, monospace; background: #fafafa;
  border: 1px solid #eaeaea; border-radius: 4px; padding: 0.15em 0.35em; }
pre { background: #fafafa; border: 1px solid #eaeaea; border-radius: 8px; padding: 0.9em 1em; overflow-x: auto; }
pre code { background: none; border: 0; padding: 0; }
hr { border: 0; border-top: 1px solid #d4d4d4; margin: 2em 0; }
ul[data-type="taskList"] { list-style: none; padding-left: 0; }
ul[data-type="taskList"] li { display: flex; gap: 0.6em; }
ul[data-type="taskList"] li > div > p { margin: 0; }
a { color: inherit; }
`;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The document body as an HTML fragment. */
export function toHtmlFragment(content: JSONContent): string {
  return generateHTML(content, createEditorExtensions());
}

/** A complete HTML file: the title as a heading, then the body, with embedded styles. */
export function toStandaloneHtml(title: string, content: JSONContent): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${toHtmlFragment(content)}
</body>
</html>
`;
}

/** The document body as plain text, with a blank line between blocks. */
export function toPlainText(content: JSONContent): string {
  return `${generateText(content, createEditorExtensions(), { blockSeparator: "\n\n" }).trim()}\n`;
}
