/**
 * Turns what the user typed into an FTS5 MATCH expression, or null when
 * there is nothing to search for.
 *
 * Each word becomes a quoted prefix term (`"pap"*`), and all words must
 * match. Quoting makes FTS5 operators and punctuation in the input harmless.
 */
export function toFtsQuery(input: string): string | null {
  const words = input.match(/[\p{L}\p{N}]+/gu);
  if (!words) {
    return null;
  }
  return words.map((word) => `"${word}"*`).join(" ");
}
