/**
 * Rich formatting rules (DESIGN_SPEC §7.11): the named colour palettes,
 * block indent steps, and per-selection font sizes. Pure functions.
 */

import { isFontSize, MAX_FONT_SIZE, MIN_FONT_SIZE } from "./document-style";

/** Text colours, stored by name and drawn from theme tokens. Null is the default colour. */
export const TEXT_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "gray",
] as const;

export type TextColor = (typeof TEXT_COLORS)[number];

/** Highlight colours, stored by name. Null is no highlight. */
export const HIGHLIGHTS = ["yellow", "green", "blue", "pink", "purple"] as const;

export type Highlight = (typeof HIGHLIGHTS)[number];

/** The highlight ⌘⇧H applies. */
export const DEFAULT_HIGHLIGHT: Highlight = "yellow";

export function isTextColor(value: unknown): value is TextColor {
  return TEXT_COLORS.includes(value as TextColor);
}

export function isHighlight(value: unknown): value is Highlight {
  return HIGHLIGHTS.includes(value as Highlight);
}

/** A paragraph's block indent, in steps of `INDENT_STEP_IN` inches. */
export const MAX_INDENT = 5;
export const INDENT_STEP_IN = 0.5;

/** The indent one step in (`1`) or out (`-1`) from `indent`, kept within 0–5. */
export function stepIndent(indent: unknown, direction: 1 | -1): number {
  const current =
    typeof indent === "number" && Number.isInteger(indent) && indent >= 0 && indent <= MAX_INDENT
      ? indent
      : 0;
  return Math.min(MAX_INDENT, Math.max(0, current + direction));
}

/** The sizes ⌘⇧. and ⌘⇧, step through, in points. */
export const FONT_SIZE_STEPS = [
  MIN_FONT_SIZE,
  9,
  10,
  11,
  12,
  13,
  14,
  16,
  18,
  20,
  24,
  28,
  32,
  36,
  48,
  60,
  MAX_FONT_SIZE,
] as const;

/**
 * The next size up (`1`) or down (`-1`) from `size` on the step list. A size
 * between steps goes to the nearest step in that direction; the ends stay put.
 */
export function stepFontSize(size: number, direction: 1 | -1): number {
  if (direction === 1) {
    return FONT_SIZE_STEPS.find((step) => step > size) ?? MAX_FONT_SIZE;
  }
  return FONT_SIZE_STEPS.findLast((step) => step < size) ?? MIN_FONT_SIZE;
}

/** The size a run of text is drawn at: its own size mark, else the document's. */
export function runFontSize(markSize: unknown, documentSize: number): number {
  return isFontSize(markSize) ? markSize : documentSize;
}

/**
 * The value a selection's font or size mark should hold. Choosing the
 * document's own value removes the mark (null) rather than adding one, so the
 * text keeps following the document style.
 */
export function markValue<T extends string | number>(chosen: T, documentValue: T): T | null {
  return chosen === documentValue ? null : chosen;
}
