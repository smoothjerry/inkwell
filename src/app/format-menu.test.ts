import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FONT_GROUPS, FONTS } from "@/domain/fonts";
import { HIGHLIGHTS, TEXT_COLORS } from "@/domain/rich-formatting";

// The native Format menu lists the colours and fonts in Rust. These checks
// keep src-tauri/src/menu.rs in step with the TypeScript lists.
// Vitest runs from the repository root.
const menu = readFileSync("src-tauri/src/menu.rs", "utf8");

/** The `("id", "Label")` pairs inside the Rust constant named `name`. */
function rustPairs(name: string): [string, string][] {
  const start = menu.indexOf(`const ${name}:`);
  const end = menu.indexOf("];", start);
  return [...menu.slice(start, end).matchAll(/\("([^"]+)", "([^"]+)"\)/g)].map((match) => [
    String(match[1]),
    String(match[2]),
  ]);
}

/** The group names in FONT_GROUPS, in order. */
function rustFontGroups(): string[] {
  const start = menu.indexOf("const FONT_GROUPS:");
  const end = menu.indexOf("\n];", start);
  return [...menu.slice(start, end).matchAll(/^ {8}"([^"]+)",$/gm)].map((match) =>
    String(match[1]),
  );
}

describe("native Format menu", () => {
  it("lists the text colours and highlights", () => {
    expect(rustPairs("TEXT_COLORS").map(([id]) => id)).toEqual([...TEXT_COLORS]);
    expect(rustPairs("HIGHLIGHTS").map(([id]) => id)).toEqual([...HIGHLIGHTS]);
  });

  it("lists every font, by group, with its name", () => {
    expect(rustFontGroups()).toEqual([...FONT_GROUPS]);
    const library = FONT_GROUPS.flatMap((group) =>
      FONTS.filter((font) => font.group === group).map((font) => [font.id, font.name]),
    );
    expect(rustPairs("FONT_GROUPS")).toEqual(library);
  });
});
