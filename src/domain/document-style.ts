/**
 * A document's own font, size, and line spacing (DESIGN_SPEC §7.11). Pure
 * functions. The values are stored as attributes of the document node; any
 * that is null, or no longer valid, falls back.
 */

import { type Font, type FontId, fontById, toFontId } from "./fonts";

export const LINE_SPACINGS = [1, 1.15, 1.5, 2] as const;

export type LineSpacing = (typeof LINE_SPACINGS)[number];

/** Sizes in points. */
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 72;
export const DEFAULT_FONT_SIZE = 13;
export const DEFAULT_LINE_SPACING: LineSpacing = 1.5;

/**
 * CSS line-height for line spacing 1.0. Like a word processor's "single"
 * spacing, single-spaced lines are a little taller than the font size.
 */
const SINGLE_LINE_HEIGHT = 1.15;

/** The style attributes as stored on a document; null means "not chosen". */
export type DocumentStyleAttrs = {
  fontId: string | null;
  fontSize: number | null;
  lineSpacing: number | null;
};

export type ResolvedDocumentStyle = {
  font: Font;
  /** In points. */
  fontSize: number;
  lineSpacing: LineSpacing;
  /** The CSS line-height for `lineSpacing`. */
  lineHeight: number;
};

export function isFontSize(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= MIN_FONT_SIZE &&
    value <= MAX_FONT_SIZE
  );
}

export function isLineSpacing(value: unknown): value is LineSpacing {
  return LINE_SPACINGS.includes(value as LineSpacing);
}

/**
 * The style a document's text is drawn with. The document's own values win
 * over the `editorFont` setting and the defaults. A font id that is no longer
 * in the library falls back to the setting.
 */
export function resolveDocumentStyle(
  attrs: DocumentStyleAttrs,
  editorFont: FontId,
): ResolvedDocumentStyle {
  const fontId = toFontId(attrs.fontId) ?? editorFont;
  const lineSpacing = isLineSpacing(attrs.lineSpacing) ? attrs.lineSpacing : DEFAULT_LINE_SPACING;
  return {
    font: fontById(fontId),
    fontSize: isFontSize(attrs.fontSize) ? attrs.fontSize : DEFAULT_FONT_SIZE,
    lineSpacing,
    lineHeight: Math.round(lineSpacing * SINGLE_LINE_HEIGHT * 1000) / 1000,
  };
}
