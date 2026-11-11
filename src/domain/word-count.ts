const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

/** Counts the words in plain text (DESIGN_SPEC §6.1). */
export function countWords(text: string): number {
  let count = 0;
  for (const segment of segmenter.segment(text)) {
    if (segment.isWordLike) {
      count += 1;
    }
  }
  return count;
}
