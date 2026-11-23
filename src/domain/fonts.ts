/**
 * The bundled font library (DESIGN_SPEC §7.11). Pure data: the faces are
 * loaded by styles/fonts.css, and each licence is listed in docs/FONTS.md.
 */

export const FONT_GROUPS = ["Serif", "Sans", "Mono", "Typewriter", "Handwriting"] as const;

export type FontGroup = (typeof FONT_GROUPS)[number];

export type Font = {
  id: string;
  name: string;
  group: FontGroup;
  /** The family name its @font-face rules declare. */
  family: string;
  fallback: "serif" | "sans-serif" | "monospace" | "cursive";
};

export const FONTS = [
  {
    id: "newsreader",
    name: "Newsreader",
    group: "Serif",
    family: "Newsreader Variable",
    fallback: "serif",
  },
  {
    id: "eb-garamond",
    name: "EB Garamond",
    group: "Serif",
    family: "EB Garamond Variable",
    fallback: "serif",
  },
  {
    id: "libre-baskerville",
    name: "Libre Baskerville",
    group: "Serif",
    family: "Libre Baskerville Variable",
    fallback: "serif",
  },
  {
    id: "crimson-pro",
    name: "Crimson Pro",
    group: "Serif",
    family: "Crimson Pro Variable",
    fallback: "serif",
  },
  {
    id: "literata",
    name: "Literata",
    group: "Serif",
    family: "Literata Variable",
    fallback: "serif",
  },
  { id: "lora", name: "Lora", group: "Serif", family: "Lora Variable", fallback: "serif" },
  {
    id: "source-serif-4",
    name: "Source Serif 4",
    group: "Serif",
    family: "Source Serif 4 Variable",
    fallback: "serif",
  },
  {
    id: "cormorant-garamond",
    name: "Cormorant Garamond",
    group: "Serif",
    family: "Cormorant Garamond Variable",
    fallback: "serif",
  },
  { id: "geist", name: "Geist", group: "Sans", family: "Geist", fallback: "sans-serif" },
  { id: "inter", name: "Inter", group: "Sans", family: "Inter Variable", fallback: "sans-serif" },
  {
    id: "ibm-plex-sans",
    name: "IBM Plex Sans",
    group: "Sans",
    family: "IBM Plex Sans Variable",
    fallback: "sans-serif",
  },
  {
    id: "work-sans",
    name: "Work Sans",
    group: "Sans",
    family: "Work Sans Variable",
    fallback: "sans-serif",
  },
  {
    id: "atkinson-hyperlegible",
    name: "Atkinson Hyperlegible",
    group: "Sans",
    family: "Atkinson Hyperlegible",
    fallback: "sans-serif",
  },
  {
    id: "geist-mono",
    name: "Geist Mono",
    group: "Mono",
    family: "Geist Mono",
    fallback: "monospace",
  },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    group: "Mono",
    family: "JetBrains Mono Variable",
    fallback: "monospace",
  },
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    group: "Mono",
    family: "IBM Plex Mono",
    fallback: "monospace",
  },
  {
    id: "courier-prime",
    name: "Courier Prime",
    group: "Typewriter",
    family: "Courier Prime",
    fallback: "monospace",
  },
  {
    id: "cutive-mono",
    name: "Cutive Mono",
    group: "Typewriter",
    family: "Cutive Mono",
    fallback: "monospace",
  },
  {
    id: "caveat",
    name: "Caveat",
    group: "Handwriting",
    family: "Caveat Variable",
    fallback: "cursive",
  },
  {
    id: "patrick-hand",
    name: "Patrick Hand",
    group: "Handwriting",
    family: "Patrick Hand",
    fallback: "cursive",
  },
] as const satisfies readonly Font[];

export type FontId = (typeof FONTS)[number]["id"];

export const DEFAULT_FONT_ID: FontId = "geist";

/** `editorFont` values from before the library (spec §5). */
const LEGACY_FONT_IDS: Record<string, FontId> = {
  sans: "geist",
  serif: "newsreader",
  mono: "geist-mono",
};

/**
 * The library id for a stored value: a library id as is, an old
 * `sans|serif|mono` value mapped to its font, anything else null.
 */
export function toFontId(value: unknown): FontId | null {
  if (typeof value !== "string") {
    return null;
  }
  if (FONTS.some((font) => font.id === value)) {
    return value as FontId;
  }
  return LEGACY_FONT_IDS[value] ?? null;
}

/** The font with this id. */
export function fontById(id: FontId): Font {
  return FONTS.find((font) => font.id === id) as Font;
}

/** A CSS `font-family` value: the font, then its generic fallback. */
export function fontFamilyCss(font: Font): string {
  return `"${font.family}", ${font.fallback}`;
}
