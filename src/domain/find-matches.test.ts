import { describe, expect, it } from "vitest";
import { findMatches } from "./find-matches";

describe("findMatches", () => {
  it.each([
    ["no match", "The quick brown fox", "cat", []],
    ["empty query", "The quick brown fox", "", []],
    ["empty text", "", "fox", []],
    [
      "every match",
      "a cat, a cat",
      "cat",
      [
        { from: 2, to: 5 },
        { from: 9, to: 12 },
      ],
    ],
    [
      "ignores case",
      "Fox fox FOX",
      "fOx",
      [
        { from: 0, to: 3 },
        { from: 4, to: 7 },
        { from: 8, to: 11 },
      ],
    ],
    [
      "matches do not overlap",
      "aaaa",
      "aa",
      [
        { from: 0, to: 2 },
        { from: 2, to: 4 },
      ],
    ],
    ["special characters are literal", "1+1=2 and (a.b)*", "(a.b)*", [{ from: 10, to: 16 }]],
    ["a dot matches only a dot", "abc a.c", "a.c", [{ from: 4, to: 7 }]],
    [
      "accented letters ignore case",
      "Été été",
      "ÉTÉ",
      [
        { from: 0, to: 3 },
        { from: 4, to: 7 },
      ],
    ],
    // 🌅 is two UTF-16 code units, so "sun" starts at 3.
    [
      "emoji",
      "🌅 sun 🌅",
      "🌅",
      [
        { from: 0, to: 2 },
        { from: 7, to: 9 },
      ],
    ],
    ["text after emoji", "🌅 sun", "sun", [{ from: 3, to: 6 }]],
    [
      "CJK",
      "私は学生です。学生",
      "学生",
      [
        { from: 2, to: 4 },
        { from: 7, to: 9 },
      ],
    ],
  ])("%s", (_name, text, query, expected) => {
    expect(findMatches(text, query)).toEqual(expected);
  });
});
