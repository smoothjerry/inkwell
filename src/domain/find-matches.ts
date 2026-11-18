/** A match of a find query, as offsets into the searched text (end exclusive). */
export type FindMatch = { from: number; to: number };

/**
 * Every place `query` occurs in `text` (DESIGN_SPEC §7.7, find in document).
 *
 * Matching ignores case and treats every character of the query literally.
 * Matches do not overlap: searching "aa" in "aaaa" finds two. Offsets are
 * UTF-16 code units, the same units as `String#length`, and case-insensitive
 * matching never changes a match's length, so offsets stay exact for any
 * script or emoji.
 */
export function findMatches(text: string, query: string): FindMatch[] {
  if (query === "") {
    return [];
  }
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "giu");
  return Array.from(text.matchAll(pattern), (match) => ({
    from: match.index,
    to: match.index + match[0].length,
  }));
}
