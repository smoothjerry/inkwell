import type { JSONContent } from "@tiptap/react";
import type { ResolvedDocumentStyle } from "@/domain/document-style";
import { fontFamilyCss } from "@/domain/fonts";
import { escapeHtml, toHtmlFragment } from "./html";

const PRINT_ROOT_ID = "print-root";

/**
 * PDF export (DESIGN_SPEC §7.6, §7.11): renders the document, in its own
 * font, size, and line spacing, into a container that only print styles show
 * (styles/print.css), then opens the system print dialog, where the user
 * chooses "Save as PDF".
 */
export function printDocument(title: string, content: JSONContent, style: ResolvedDocumentStyle) {
  // A container can be left behind if the webview never reports `afterprint`.
  document.getElementById(PRINT_ROOT_ID)?.remove();

  const container = document.createElement("div");
  container.id = PRINT_ROOT_ID;
  // Printed inside the app, so the bundled fonts are there to use.
  container.innerHTML = `<h1>${escapeHtml(title)}</h1>${toHtmlFragment(content, "bundled")}`;
  container.style.fontFamily = fontFamilyCss(style.font);
  container.style.fontSize = `${style.fontSize}pt`;
  container.style.lineHeight = String(style.lineHeight);
  document.body.append(container);

  window.addEventListener("afterprint", () => container.remove(), { once: true });
  window.print();
}
