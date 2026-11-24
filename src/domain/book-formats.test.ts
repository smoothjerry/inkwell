import { describe, expect, it } from "vitest";
import {
  BOOK_FORMATS,
  bookFormatById,
  DEFAULT_BOOK_FORMAT_ID,
  isBookFormatId,
  textBlockSize,
} from "./book-formats";

describe("textBlockSize", () => {
  it("takes the margins off a format given in inches", () => {
    // 6 × 9 in with 0.75 in margins: 4.5 × 7.5 in.
    expect(textBlockSize(bookFormatById("trade-6x9"))).toEqual({ width: 324, height: 540 });
  });

  it("takes the margins off a format given in millimetres", () => {
    // 148 × 210 mm with 16 mm sides, 18 mm top, 20 mm bottom: 116 × 172 mm.
    const block = textBlockSize(bookFormatById("a5"));
    expect(block.width).toBeCloseTo((116 / 25.4) * 72, 6);
    expect(block.height).toBeCloseTo((172 / 25.4) * 72, 6);
  });

  it("uses a different top and bottom margin where the format has them", () => {
    // 6.87 in tall, 0.5 in top, 0.6 in bottom: 5.77 in.
    expect(textBlockSize(bookFormatById("mass-market")).height).toBeCloseTo(5.77 * 72, 6);
  });

  it("leaves room on every page of every format", () => {
    for (const format of BOOK_FORMATS) {
      const block = textBlockSize(format);
      expect(block.width).toBeGreaterThan(0);
      expect(block.height).toBeGreaterThan(format.lineHeight);
    }
  });
});

describe("the presets", () => {
  it("have unique ids", () => {
    const ids = BOOK_FORMATS.map((format) => format.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all use Newsreader, with lines taller than the type", () => {
    for (const format of BOOK_FORMATS) {
      expect(format.font).toBe("newsreader");
      expect(format.lineHeight).toBeGreaterThan(format.fontSize);
    }
  });

  it("double-space the standard manuscript", () => {
    const manuscript = bookFormatById("manuscript");
    expect(manuscript.lineHeight).toBe(manuscript.fontSize * 2);
  });
});

describe("isBookFormatId", () => {
  it("accepts every preset, including the default", () => {
    for (const format of BOOK_FORMATS) {
      expect(isBookFormatId(format.id)).toBe(true);
    }
    expect(isBookFormatId(DEFAULT_BOOK_FORMAT_ID)).toBe(true);
  });

  it.each([["letter"], [""], [null], [6]])("rejects %j", (value) => {
    expect(isBookFormatId(value)).toBe(false);
  });
});
