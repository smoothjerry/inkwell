import { describe, expect, it } from "vitest";
import { resolveDocumentStyle } from "@/domain/document-style";
import { blockStyle, documentDefaults, runStyle } from "./docx";

/** The marks of a run: each a name, with its attributes if it has any. */
const marks = (...entries: [string, Record<string, unknown>?][]) =>
  new Map<string, Record<string, unknown> | undefined>(
    entries.map(([name, attrs]) => [name, attrs]),
  );

describe("runStyle", () => {
  it("keeps bold, italic, strike, and underline", () => {
    const style = runStyle(marks(["bold"], ["italic"], ["strike"], ["underline"]));
    expect(style).toMatchObject({ bold: true, italics: true, strike: true, underline: {} });
  });

  it("leaves plain text unstyled", () => {
    expect(runStyle(marks())).toMatchObject({
      bold: false,
      underline: undefined,
      color: undefined,
      shading: undefined,
      font: undefined,
      size: undefined,
    });
  });

  it("gives text colour and highlight their print colours", () => {
    const style = runStyle(marks(["textStyle", { textColor: "red", highlight: "yellow" }]));
    expect(style.color).toBe("DC2626");
    expect(style.shading).toEqual({ type: "clear", color: "auto", fill: "FEF08A" });
  });

  it("names the font and gives the size in half-points", () => {
    const style = runStyle(marks(["textStyle", { fontId: "lora", fontSize: 18 }]));
    expect(style.font).toBe("Lora");
    expect(style.size).toBe(36);
  });

  it("ignores colours, fonts, and sizes it does not know", () => {
    const style = runStyle(
      marks(["textStyle", { textColor: "#123456", fontId: "comic-sans", fontSize: 200 }]),
    );
    expect(style).toMatchObject({ color: undefined, font: undefined, size: undefined });
  });

  it("keeps code in the monospace font", () => {
    expect(runStyle(marks(["code"], ["textStyle", { fontId: "lora" }])).font).toBe("Courier New");
  });
});

describe("blockStyle", () => {
  it("maps alignment, with justify as Word's both", () => {
    expect(blockStyle({ textAlign: "center" }).alignment).toBe("center");
    expect(blockStyle({ textAlign: "right" }).alignment).toBe("right");
    expect(blockStyle({ textAlign: "justify" }).alignment).toBe("both");
    expect(blockStyle({ textAlign: null }).alignment).toBeUndefined();
  });

  it("gives each indent step half an inch", () => {
    expect(blockStyle({ indent: 2 }).indent).toBe(1440);
    expect(blockStyle({ indent: 0 }).indent).toBe(0);
    expect(blockStyle().indent).toBe(0);
  });
});

describe("documentDefaults", () => {
  it("uses the document's font, size, and line spacing", () => {
    const style = resolveDocumentStyle({ fontId: "lora", fontSize: 12, lineSpacing: 2 }, "geist");
    expect(documentDefaults(style)).toEqual({
      run: { font: "Lora", size: 24 },
      paragraph: { spacing: { line: 480 } },
    });
  });

  it("makes single spacing Word's single", () => {
    const style = resolveDocumentStyle({ fontId: null, fontSize: null, lineSpacing: 1 }, "geist");
    expect(documentDefaults(style).paragraph.spacing.line).toBe(240);
  });
});
