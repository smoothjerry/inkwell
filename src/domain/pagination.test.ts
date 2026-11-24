import { describe, expect, it } from "vitest";
import { type MeasuredBlock, packPages } from "./pagination";

// Pages 10 lines tall, every line 10 px.
const PAGE = 100;

function paragraph(lines: number, gapBefore = 0): MeasuredBlock {
  return { gapBefore, lineHeight: 10, lines, keepWithNext: false, splittable: true };
}

function heading(gapBefore = 0): MeasuredBlock {
  return { gapBefore, lineHeight: 20, lines: 1, keepWithNext: true, splittable: false };
}

describe("packPages", () => {
  it("gives an empty document one page", () => {
    expect(packPages([], PAGE)).toEqual([{ block: 0, line: 0 }]);
  });

  it("keeps blocks that fit on one page", () => {
    expect(packPages([paragraph(4), paragraph(6)], PAGE)).toHaveLength(1);
  });

  it("splits a paragraph across pages where it runs out of room", () => {
    // 6 lines, then 8: 4 fit on page 1, 4 carry over.
    expect(packPages([paragraph(6), paragraph(8)], PAGE)).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 4 },
    ]);
  });

  it("carries at least two lines to the next page (no widow)", () => {
    // 5 lines, then 6: 5 would fit, leaving 1; take 4 so 2 carry over.
    expect(packPages([paragraph(5), paragraph(6)], PAGE)).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 4 },
    ]);
  });

  it("leaves at least two lines at the bottom (no orphan), or moves the paragraph", () => {
    // 9 lines, then 5: only 1 would fit, so the paragraph moves whole.
    expect(packPages([paragraph(9), paragraph(5)], PAGE)).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 0 },
    ]);
  });

  it("moves a three-line paragraph whole when only two lines fit", () => {
    // Splitting 2 + 1 would leave a widow, and 1 + 2 an orphan.
    expect(packPages([paragraph(8), paragraph(3)], PAGE)).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 0 },
    ]);
  });

  it("drops the space above a block at the top of a page", () => {
    // The second paragraph starts page 2; its 50 px gap is not counted there.
    const pages = packPages([paragraph(10), paragraph(10, 50)], PAGE);
    expect(pages).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 0 },
    ]);
  });

  it("counts the space between blocks", () => {
    // 6 lines + 20 px gap leaves room for 2 lines of the next paragraph.
    expect(packPages([paragraph(6), paragraph(4, 20)], PAGE)).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 2 },
    ]);
  });

  it("keeps a heading with the start of the next paragraph", () => {
    // 7 lines, a 20 px heading, then a paragraph: only the heading would fit.
    expect(packPages([paragraph(7), heading(), paragraph(5)], PAGE)).toEqual([
      { block: 0, line: 0 },
      { block: 1, line: 0 },
    ]);
  });

  it("leaves a heading where it is when two lines of the next paragraph fit too", () => {
    expect(packPages([paragraph(6), heading(), paragraph(5)], PAGE)).toEqual([
      { block: 0, line: 0 },
      { block: 2, line: 2 },
    ]);
  });

  it("splits a block taller than a page wherever it must", () => {
    const pages = packPages([paragraph(25)], PAGE);
    expect(pages).toEqual([
      { block: 0, line: 0 },
      { block: 0, line: 10 },
      { block: 0, line: 20 },
    ]);
  });

  it("splits a too-tall unsplittable block rather than loop", () => {
    const tall: MeasuredBlock = { ...paragraph(15), splittable: false };
    expect(packPages([tall], PAGE)).toHaveLength(2);
  });
});
