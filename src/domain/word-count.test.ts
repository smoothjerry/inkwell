import { describe, expect, it } from "vitest";
import { countWords } from "./word-count";

describe("countWords", () => {
  it.each([
    ["English", "The quick brown fox jumps over the lazy dog", 9],
    ["punctuation", "Hello, world! (Really?) Yes; no: maybe.", 6],
    ["contractions", "Don't stop; it's what we’ve got", 6],
    // Each part of a hyphenated compound is a word.
    ["hyphenation", "a well-known state-of-the-art idea", 8],
    // A URL splits at its punctuation: https, example.com, path, q, 1.
    ["URLs", "See https://example.com/path?q=1 now", 7],
    ["emoji", "Good morning 🌅 team 👋🏽", 3],
    ["CJK", "私は学生です", 4],
    ["empty document", "", 0],
  ])("%s", (_name, text, expected) => {
    expect(countWords(text)).toBe(expected);
  });
});
