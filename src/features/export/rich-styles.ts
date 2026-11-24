import { fontById, toFontId } from "@/domain/fonts";
import {
  INDENT_STEP_IN,
  isHighlight,
  isTextColor,
  PRINT_HIGHLIGHTS,
  PRINT_TEXT_COLORS,
} from "@/domain/rich-formatting";

/**
 * How exported text names its fonts: the bundled family, for the PDF that is
 * printed inside the app, or the font's own name with a generic fallback, for
 * an HTML file read on a computer that may not have it.
 */
export type ExportFonts = "bundled" | "named";

/** A CSS font-family that names the font as people know it, then its generic fallback. */
export function namedFontFamily(fontId: unknown): string | null {
  const id = toFontId(fontId);
  if (id === null) {
    return null;
  }
  const font = fontById(id);
  return `"${font.name}", ${font.fallback}`;
}

/**
 * Turns the editor's rich-formatting attributes into inline styles
 * (DESIGN_SPEC §7.11). In the app, editor.css draws `data-color`,
 * `data-highlight`, and `data-indent` from theme tokens; an export has no such
 * stylesheet, so each element carries its own print colour and margin.
 */
export function inlineRichStyles(html: string, fonts: ExportFonts): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  const root = template.content;

  for (const element of root.querySelectorAll<HTMLElement>("[data-color]")) {
    const name = element.dataset.color;
    if (isTextColor(name)) {
      element.style.color = PRINT_TEXT_COLORS[name];
    }
  }
  for (const element of root.querySelectorAll<HTMLElement>("[data-highlight]")) {
    const name = element.dataset.highlight;
    if (isHighlight(name)) {
      element.style.backgroundColor = PRINT_HIGHLIGHTS[name];
    }
  }
  for (const element of root.querySelectorAll<HTMLElement>("[data-indent]")) {
    const steps = Number(element.dataset.indent);
    if (steps > 0) {
      element.style.marginLeft = `${steps * INDENT_STEP_IN}in`;
    }
  }
  if (fonts === "named") {
    for (const element of root.querySelectorAll<HTMLElement>("[data-font]")) {
      const family = namedFontFamily(element.dataset.font);
      if (family !== null) {
        element.style.fontFamily = family;
      }
    }
  }
  return template.innerHTML;
}
