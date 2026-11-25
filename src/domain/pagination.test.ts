import { describe, expect, it } from "vitest";
import { type MeasuredBlock, packPages, pageRanges } from "./pagination";

// Pages 10 lines tall, every line 10 px.
const PAGE = 100;

/** Where each page starts, without the heights. */
function starts(blocks: MeasuredBlock[]) {
  return packPages(blocks, PAGE).map(({ block, line }) => ({ block, line }));
}

function paragraph(lines: number, gapBefore = 0): MeasuredBlock {
  return { gapBefore, lineHeight: 10, lines, keepWithNext: false, splittable: true };
}

function heading(gapBefore = 0): MeasuredBlock {
  return { gapBefore, lineHeight: 20, lines: 1, keepWithNext: true, splittable: false };
}

describe("packPages", () => {
  it("gives an empty document one page", () => {
    expect(starts([])).toEqual([{ block: 0, line: 0 }]);
  });

  it("keeps blocks that fit on one page", () => {
    expect(starts([paragraph(4), paragraph(6)])).toHaveLength(1);
  });

  it("splits a paragraph across pages where it runs out of room", () => {
    // 6 lines, then 8: 4 fit on page 1, 4 carry over.
    expect(starts([paragraph(6), paragraph(8)])).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 4 },
    ]);
  });

  it("carries at least two lines to the next page (no widow)", () => {
    // 5 lines, then 6: 5 would fit, leaving 1; take 4 so 2 carry over.
    expect(starts([paragraph(5), paragraph(6)])).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 4 },
    ]);
  });

  it("leaves at least two lines at the bottom (no orphan), or moves the paragraph", () => {
    // 9 lines, then 5: only 1 would fit, so the paragraph moves whole.
    expect(starts([paragraph(9), paragraph(5)])).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 0 },
    ]);
  });

  it("moves a three-line paragraph whole when only two lines fit", () => {
    // Splitting 2 + 1 would leave a widow, and 1 + 2 an orphan.
    expect(starts([paragraph(8), paragraph(3)])).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 0 },
    ]);
  });

  it("drops the space above a block at the top of a page", () => {
    // The second paragraph starts page 2; its 50 px gap is not counted there.
    const pages = starts([paragraph(10), paragraph(10, 50)]);
    expect(pages).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 0 },
    ]);
  });

  it("counts the space between blocks", () => {
    // 6 lines + 20 px gap leaves room for 2 lines of the next paragraph.
    expect(starts([paragraph(6), paragraph(4, 20)])).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 2 },
    ]);
  });

  it("keeps a heading with the start of the next paragraph", () => {
    // 7 lines, a 20 px heading, then a paragraph: only the heading would fit.
    expect(starts([paragraph(7), heading(), paragraph(5)])).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 0 },
    ]);
  });

  it("leaves a heading where it is when two lines of the next paragraph fit too", () => {
    expect(starts([paragraph(6), heading(), paragraph(5)])).toEqual([
      { block: 0, line: 0 },
      { block: 2, line: 2 },
    ]);
  });

  it("splits a block taller than a page wherever it must", () => {
    const pages = starts([paragraph(25)]);
    expect(pages).toEqual([
      { block: 0, line: 0 },
      { block: 0, line: 10 },
      { block: 0, line: 20 },
    ]);
  });

  it("splits a too-tall unsplittable block rather than loop", () => {
    const tall: MeasuredBlock = { ...paragraph(15), splittable: false };
    expect(starts([tall])).toHaveLength(2);
  });
});

describe("pageRanges", () => {
  it("numbers each chapter's pages after the chapters before it", () => {
    expect(pageRanges([12, 30, 8])).toEqual([
      { first: 1, last: 12 },
      { first: 13, last: 42 },
      { first: 43, last: 50 },
    ]);
  });

  it("gives a one-page chapter a single page", () => {
    expect(pageRanges([1, 1])).toEqual([
      { first: 1, last: 1 },
      { first: 2, last: 2 },
    ]);
  });

  it("gives a book with no chapters no ranges", () => {
    expect(pageRanges([])).toEqual([]);
  });
});

describe("page heights", () => {
  it("records what each page's content uses", () => {
    // 6 lines, then 8: page 1 holds 6 + 4 lines, page 2 the last 4.
    expect(packPages([paragraph(6), paragraph(8)], PAGE).map((page) => page.height)).toEqual([
      100, 40,
    ]);
  });

  it("leaves room unused when a paragraph moves whole to the next page", () => {
    // 9 lines, then a paragraph that cannot split: page 1 uses 90 px.
    expect(packPages([paragraph(9), paragraph(5)], PAGE).map((page) => page.height)).toEqual([
      90, 50,
    ]);
  });

  it("counts the space between blocks, but not at the top of a page", () => {
    expect(packPages([paragraph(4), paragraph(2, 20)], PAGE)[0]?.height).toBe(80);
  });
});
