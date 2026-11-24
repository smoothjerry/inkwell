import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { resolveDocumentStyle } from "@/domain/document-style";
import { toHtmlFragment, toStandaloneHtml } from "./html";

/** A one-paragraph document whose text has a single text-style mark. */
function styledText(
  attrs: Record<string, unknown>,
  block: Record<string, unknown> = {},
): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: block,
        content: [{ type: "text", text: "word", marks: [{ type: "textStyle", attrs }] }],
      },
    ],
  };
}

/** A font-family with its quotes removed; browsers differ in whether they keep them. */
const unquoted = (family: string) => family.replaceAll('"', "");

/** The first element matching `selector` in an HTML fragment. */
function first(html: string, selector: string): HTMLElement {
  const template = document.createElement("template");
  template.innerHTML = html;
  const element = template.content.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`No ${selector} in ${html}`);
  }
  return element;
}

describe("toHtmlFragment", () => {
  it("draws text colour and highlight with their print colours", () => {
    const span = first(
      toHtmlFragment(styledText({ textColor: "red", highlight: "yellow" })),
      "span",
    );
    expect(span.style.color).toBe("rgb(220, 38, 38)");
    expect(span.style.backgroundColor).toBe("rgb(254, 240, 138)");
  });

  it("names a font with its generic fallback for an HTML file", () => {
    const span = first(toHtmlFragment(styledText({ fontId: "lora" })), "span");
    expect(unquoted(span.style.fontFamily)).toBe("Lora, serif");
  });

  it("keeps the bundled family for the printed PDF", () => {
    const span = first(toHtmlFragment(styledText({ fontId: "lora" }), "bundled"), "span");
    expect(unquoted(span.style.fontFamily)).toBe("Lora Variable, serif");
  });

  it("keeps the size in points", () => {
    const span = first(toHtmlFragment(styledText({ fontSize: 18 })), "span");
    expect(span.style.fontSize).toBe("18pt");
  });

  it("keeps underline, alignment, and indent", () => {
    const html = toHtmlFragment({
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "center", indent: 2 },
          content: [{ type: "text", text: "word", marks: [{ type: "underline" }] }],
        },
      ],
    });
    const paragraph = first(html, "p");
    expect(paragraph.style.textAlign).toBe("center");
    expect(paragraph.style.marginLeft).toBe("1in");
    expect(paragraph.querySelector("u")?.textContent).toBe("word");
  });
});

describe("toStandaloneHtml", () => {
  it("sets the body in the document's font, size, and line spacing", () => {
    const style = resolveDocumentStyle({ fontId: "lora", fontSize: 12, lineSpacing: 2 }, "geist");
    const html = toStandaloneHtml("Title", styledText({}), style);
    expect(html).toContain(
      'body { font-family: "Lora", serif; font-size: 12pt; line-height: 2.3; }',
    );
  });
});
