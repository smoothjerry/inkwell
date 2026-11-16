import type { JSONContent } from "@tiptap/react";
import { escapeHtml, toHtmlFragment } from "./html";

const PRINT_ROOT_ID = "print-root";

/**
 * PDF export (DESIGN_SPEC §7.6): renders the document into a container that
 * only print styles show (styles/print.css), then opens the system print
 * dialog, where the user chooses "Save as PDF".
 */
export function printDocument(title: string, content: JSONContent) {
  // A container can be left behind if the webview never reports `afterprint`.
  document.getElementById(PRINT_ROOT_ID)?.remove();

  const container = document.createElement("div");
  container.id = PRINT_ROOT_ID;
  container.innerHTML = `<h1>${escapeHtml(title)}</h1>${toHtmlFragment(content)}`;
  document.body.append(container);

  window.addEventListener("afterprint", () => container.remove(), { once: true });
  window.print();
}
