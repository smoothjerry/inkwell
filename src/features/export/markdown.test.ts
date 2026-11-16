import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { fromMarkdown, toMarkdown } from "./markdown";

const MARKDOWN = `# Heading one

## Heading two

### Heading three

A paragraph with **bold**, *italic*, ~~strike~~, \`inline code\` and a [link](https://example.com).

- First bullet
- Second bullet
  - Nested bullet

1. First step
2. Second step

- [ ] Open task
- [x] Done task

> A quoted line.

\`\`\`ts
const x = 1;
\`\`\`

---

Last paragraph.
`;

/** The types of a document's top-level blocks, in order. */
function blockTypes(content: JSONContent): string[] {
  return (content.content ?? []).map((node) =>
    node.type === "heading" ? `heading${node.attrs?.level}` : (node.type ?? ""),
  );
}

/** Every mark type used anywhere in the document. */
function markTypes(node: JSONContent, found = new Set<string>()): Set<string> {
  for (const mark of node.marks ?? []) {
    found.add(mark.type);
  }
  for (const child of node.content ?? []) {
    markTypes(child, found);
  }
  return found;
}

describe("Markdown round trip", () => {
  it("imports every block type and mark", () => {
    const content = fromMarkdown(MARKDOWN);

    expect(blockTypes(content)).toEqual([
      "heading1",
      "heading2",
      "heading3",
      "paragraph",
      "bulletList",
      "orderedList",
      "taskList",
      "blockquote",
      "codeBlock",
      "horizontalRule",
      "paragraph",
    ]);
    expect([...markTypes(content)].sort()).toEqual(["bold", "code", "italic", "link", "strike"]);
  });

  it("exports back to the same Markdown", () => {
    expect(toMarkdown(fromMarkdown(MARKDOWN))).toBe(MARKDOWN);
  });

  it("keeps the document structure through export and import", () => {
    const content = fromMarkdown(MARKDOWN);

    expect(fromMarkdown(toMarkdown(content))).toEqual(content);
  });
});
