import { describe, expect, it } from "vitest";
import { type DocumentStyleAttrs, resolveDocumentStyle } from "./document-style";

const NONE: DocumentStyleAttrs = { fontId: null, fontSize: null, lineSpacing: null };

describe("resolveDocumentStyle", () => {
  it("uses the setting's font and the defaults when nothing is chosen", () => {
    const style = resolveDocumentStyle(NONE, "geist");
    expect(style.font.id).toBe("geist");
    expect(style.fontSize).toBe(13);
    expect(style.lineSpacing).toBe(1.5);
    expect(style.lineHeight).toBe(1.725);
  });

  it("prefers the document's own values over the setting and defaults", () => {
    const style = resolveDocumentStyle({ fontId: "lora", fontSize: 16, lineSpacing: 2 }, "geist");
    expect(style.font.id).toBe("lora");
    expect(style.fontSize).toBe(16);
    expect(style.lineSpacing).toBe(2);
    expect(style.lineHeight).toBe(2.3);
  });

  it("falls back to the setting for a font no longer in the library", () => {
    expect(resolveDocumentStyle({ ...NONE, fontId: "comic-sans" }, "inter").font.id).toBe("inter");
  });

  it.each([[7], [73], [Number.NaN]])("falls back to the default size for %s pt", (fontSize) => {
    expect(resolveDocumentStyle({ ...NONE, fontSize }, "geist").fontSize).toBe(13);
  });

  it("falls back to the default spacing for a value not on the list", () => {
    expect(resolveDocumentStyle({ ...NONE, lineSpacing: 1.3 }, "geist").lineSpacing).toBe(1.5);
  });

  it("gives single spacing a line height a little taller than the font", () => {
    expect(resolveDocumentStyle({ ...NONE, lineSpacing: 1 }, "geist").lineHeight).toBe(1.15);
  });
});
