/**
 * Page packing for the pagination engine (DESIGN_SPEC §7.9). Pure functions.
 *
 * The engine measures each text block of a document (paragraph, heading,
 * code block) in the format's typography: its line count, line height, and
 * the space above it. This file fills pages with those lines. Every document
 * starts on a new page, so a book's chapters are packed one at a time.
 */

/** A measured text block. Lengths are in CSS px. */
export type MeasuredBlock = {
  /** Space between this block and the one before; dropped at the top of a page. */
  gapBefore: number;
  lineHeight: number;
  /** At least 1. */
  lines: number;
  /** Headings stay on the same page as the start of the block after them. */
  keepWithNext: boolean;
  /** Whether its lines may be split across pages. Headings may not. */
  splittable: boolean;
};

/** Where a page starts: a block, and the first of its lines on this page. */
export type PageStart = { block: number; line: number };

/**
 * Widow and orphan control: a block split across pages leaves at least this
 * many lines at the bottom of one page and carries at least this many to the next.
 */
export const MIN_SPLIT_LINES = 2;

/** Lines that fit in `space`, allowing for rounding in the measured heights. */
function linesThatFit(space: number, lineHeight: number): number {
  return Math.max(0, Math.floor(space / lineHeight + 1e-6));
}

/**
 * Fills pages of `pageHeight` with `blocks` and returns where each page
 * starts. There is always at least one page. Rules: a heading moves to the
 * next page unless the start of the block after it fits with it; a split
 * leaves at least `MIN_SPLIT_LINES` lines on each side, or the block moves
 * whole to the next page. A block that cannot fit even on an empty page is
 * split wherever it must be.
 */
export function packPages(blocks: readonly MeasuredBlock[], pageHeight: number): PageStart[] {
  const pages: PageStart[] = [{ block: 0, line: 0 }];
  let used = 0;

  const startPage = (block: number, line: number) => {
    pages.push({ block, line });
    used = 0;
  };

  for (const [index, block] of blocks.entries()) {
    const gap = () => (used === 0 ? 0 : block.gapBefore);

    if (block.keepWithNext && used > 0) {
      const next = blocks[index + 1];
      const needed =
        block.gapBefore +
        block.lines * block.lineHeight +
        (next ? next.gapBefore + Math.min(next.lines, MIN_SPLIT_LINES) * next.lineHeight : 0);
      if (used + needed > pageHeight + 1e-6) {
        startPage(index, 0);
      }
    }

    let line = 0;
    while (line < block.lines) {
      const remaining = block.lines - line;
      const room = linesThatFit(pageHeight - used - gap(), block.lineHeight);
      if (remaining <= room) {
        used += gap() + remaining * block.lineHeight;
        break;
      }
      let take = 0;
      if (block.splittable) {
        take = Math.min(room, remaining - MIN_SPLIT_LINES);
        if (take < MIN_SPLIT_LINES) {
          take = 0;
        }
      }
      if (take === 0 && used === 0) {
        // Not even an empty page holds the block within the rules.
        take = Math.max(1, room);
      }
      line += take;
      startPage(index, line);
    }
  }
  return pages;
}
