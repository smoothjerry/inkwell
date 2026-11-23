import { describe, expect, it } from "vitest";
import { FONT_GROUPS, FONTS, fontById, fontFamilyCss, toFontId } from "./fonts";

describe("toFontId", () => {
  it.each([
    ["sans", "geist"],
    ["serif", "newsreader"],
    ["mono", "geist-mono"],
  ])("maps the old value %s to %s", (old, id) => {
    expect(toFontId(old)).toBe(id);
  });

  it("keeps a library id", () => {
    expect(toFontId("eb-garamond")).toBe("eb-garamond");
  });

  it.each([["comic-sans"], [""], [null], [3]])("rejects %j", (value) => {
    expect(toFontId(value)).toBeNull();
  });
});

describe("FONTS", () => {
  it("has unique ids", () => {
    expect(new Set(FONTS.map((font) => font.id)).size).toBe(FONTS.length);
  });

  it("has a font in every group", () => {
    for (const group of FONT_GROUPS) {
      expect(FONTS.some((font) => font.group === group)).toBe(true);
    }
  });
});

describe("fontFamilyCss", () => {
  it("names the family, then its generic fallback", () => {
    expect(fontFamilyCss(fontById("lora"))).toBe('"Lora Variable", serif');
  });
});
