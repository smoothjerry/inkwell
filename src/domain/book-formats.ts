/**
 * Print formats for books and page counts (DESIGN_SPEC §7.9). Pure data. All
 * sizes are in points (1/72 in), the unit the pagination engine lays pages
 * out in; the presets are written in the units the trade uses, inches or mm.
 */

import type { FontId } from "./fonts";

const POINTS_PER_INCH = 72;
const MM_PER_INCH = 25.4;

/** Inches to points. */
function inches(value: number): number {
  return value * POINTS_PER_INCH;
}

/** Millimetres to points. */
function mm(value: number): number {
  return (value / MM_PER_INCH) * POINTS_PER_INCH;
}

export type BookFormat = {
  id: string;
  name: string;
  /** Page size, in points. */
  trim: { width: number; height: number };
  /** In points. Margins are the same on both sides in v1: no mirrored inside margin. */
  margins: { top: number; bottom: number; sides: number };
  font: FontId;
  /** Type size, in points. */
  fontSize: number;
  /** Baseline to baseline, in points. */
  lineHeight: number;
};

/**
 * The presets, in the order the menus list them. The type sizes are starting
 * values, to be tuned by comparing with real books.
 */
export const BOOK_FORMATS = [
  {
    id: "mass-market",
    name: "Mass-market paperback",
    trim: { width: inches(4.25), height: inches(6.87) },
    margins: { top: inches(0.5), bottom: inches(0.6), sides: inches(0.5) },
    font: "newsreader",
    fontSize: 10,
    lineHeight: 12.5,
  },
  {
    id: "trade-5.5x8.5",
    name: "Trade paperback 5.5 × 8.5",
    trim: { width: inches(5.5), height: inches(8.5) },
    margins: { top: inches(0.75), bottom: inches(0.75), sides: inches(0.625) },
    font: "newsreader",
    fontSize: 11,
    lineHeight: 14,
  },
  {
    id: "trade-6x9",
    name: "Trade paperback 6 × 9",
    trim: { width: inches(6), height: inches(9) },
    margins: { top: inches(0.75), bottom: inches(0.75), sides: inches(0.75) },
    font: "newsreader",
    fontSize: 11.5,
    lineHeight: 15,
  },
  {
    id: "hardcover-6.14x9.21",
    name: "Hardcover 6.14 × 9.21",
    trim: { width: inches(6.14), height: inches(9.21) },
    margins: { top: inches(0.75), bottom: inches(0.75), sides: inches(0.75) },
    font: "newsreader",
    fontSize: 11.5,
    lineHeight: 15,
  },
  {
    id: "uk-b-format",
    name: "UK B-format paperback",
    trim: { width: mm(129), height: mm(198) },
    margins: { top: mm(15), bottom: mm(17), sides: mm(14) },
    font: "newsreader",
    fontSize: 10.5,
    lineHeight: 13.5,
  },
  {
    id: "a5",
    name: "A5",
    trim: { width: mm(148), height: mm(210) },
    margins: { top: mm(18), bottom: mm(20), sides: mm(16) },
    font: "newsreader",
    fontSize: 11,
    lineHeight: 14,
  },
  {
    id: "manuscript",
    name: "Standard manuscript",
    trim: { width: inches(8.5), height: inches(11) },
    margins: { top: inches(1), bottom: inches(1), sides: inches(1) },
    font: "newsreader",
    fontSize: 12,
    // Double-spaced, as manuscripts are submitted.
    lineHeight: 24,
  },
] as const satisfies readonly BookFormat[];

export type BookFormatId = (typeof BOOK_FORMATS)[number]["id"];

/** The `defaultBookFormat` setting's default: used by documents outside any book. */
export const DEFAULT_BOOK_FORMAT_ID: BookFormatId = "trade-6x9";

export function isBookFormatId(value: unknown): value is BookFormatId {
  return BOOK_FORMATS.some((format) => format.id === value);
}

/** The format with this id. */
export function bookFormatById(id: BookFormatId): BookFormat {
  return BOOK_FORMATS.find((format) => format.id === id) as BookFormat;
}

/** The area inside the margins, in points: the box the pagination engine fills. */
export function textBlockSize(format: BookFormat): { width: number; height: number } {
  return {
    width: format.trim.width - 2 * format.margins.sides,
    height: format.trim.height - format.margins.top - format.margins.bottom,
  };
}
