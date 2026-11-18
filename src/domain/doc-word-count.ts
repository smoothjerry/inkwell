import type { Node } from "@tiptap/pm/model";
import { countWords } from "./word-count";

/**
 * Word counts of top-level blocks, keyed by the block itself. ProseMirror
 * documents are immutable and an edit replaces only the blocks it touches,
 * so every other block is the same object as before and its count is reused.
 * A WeakMap lets a count go once nothing holds its block any more.
 */
const blockCounts = new WeakMap<Node, number>();

/**
 * The document's word count (DESIGN_SPEC §6.1), recounting only the
 * top-level blocks that changed since the last count. The total equals
 * `countWords` on the document's plain text with blocks joined by "\n",
 * because a word never spans two blocks.
 */
export function countDocumentWords(doc: Node): number {
  let total = 0;
  doc.forEach((block) => {
    let words = blockCounts.get(block);
    if (words === undefined) {
      words = countWords(block.textBetween(0, block.content.size, "\n"));
      blockCounts.set(block, words);
    }
    total += words;
  });
  return total;
}
