import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/react";
import { useSettingsStore } from "@/stores/settings-store";

const sentences = new Intl.Segmenter(undefined, { granularity: "sentence" });

/**
 * Text more than this many sentences or paragraphs from the caret gets no
 * decoration and shows the faintest, most blurred style.
 */
const NEAR_LEVELS = 3;

type Range = { from: number; to: number };
type Block = { pos: number; node: ProseMirrorNode };

/** The document's text blocks, in order, with the position before each. */
function textBlocks(doc: ProseMirrorNode): Block[] {
  const blocks: Block[] = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      blocks.push({ pos, node });
      return false;
    }
    return true;
  });
  return blocks;
}

/**
 * The sentences of a text block as document ranges. Code has no sentences,
 * so a code block is one range; an empty block has none.
 */
function sentenceRanges({ pos, node }: Block): Range[] {
  const start = pos + 1;
  if (node.content.size === 0) {
    return [];
  }
  if (node.type.spec.code) {
    return [{ from: start, to: start + node.content.size }];
  }
  // Inline nodes that are not text (a line break) count as one character, so
  // an offset in this string is an offset in the block.
  const text = node.textBetween(0, node.content.size, undefined, "\n");
  return Array.from(sentences.segment(text), (segment) => ({
    from: start + segment.index,
    to: start + segment.index + segment.segment.length,
  }));
}

/**
 * Dimming (DESIGN_SPEC §7.4): while the `dimMode` setting is `sentence` or
 * `paragraph`, the editor gets the class `is-dimming`, which blurs all text
 * almost out of sight. The sentence or paragraph around the caret is wrapped
 * in `dim-level-0`, which keeps it sharp, and the nearest ones on either side
 * in `dim-level-1` to `dim-level-3`, each more blurred than the last. A list
 * item's marker takes its first line's level. Styles are in styles/editor.css.
 */
export const FocusDimming = Extension.create({
  name: "focusDimming",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          attributes: () => ({
            class: useSettingsStore.getState().dimMode === "off" ? "" : "is-dimming",
          }),

          decorations: (state) => {
            const mode = useSettingsStore.getState().dimMode;
            if (mode === "off") {
              return null;
            }
            const { $head } = state.selection;
            if (!$head.parent.isTextblock) {
              return null;
            }
            const blocks = textBlocks(state.doc);
            const current = blocks.findIndex((block) => block.pos === $head.before());
            const nearby = blocks.slice(
              Math.max(0, current - NEAR_LEVELS),
              current + NEAR_LEVELS + 1,
            );

            // Each unit is a sentence or a whole paragraph, with the block it is in.
            const units = nearby.flatMap((block) => {
              const ranges = sentenceRanges(block);
              if (mode === "paragraph" && ranges.length > 0) {
                const first = ranges[0] as Range;
                const last = ranges[ranges.length - 1] as Range;
                return [{ block, range: { from: first.from, to: last.to } }];
              }
              return ranges.map((range) => ({ block, range }));
            });
            const focus = units.findIndex(
              ({ range }) => $head.pos >= range.from && $head.pos <= range.to,
            );
            if (focus === -1) {
              return null; // An empty block: everything stays faint.
            }

            const decorations: Decoration[] = [];
            const markerLevels = new Map<Block, number>();
            units.forEach(({ block, range }, index) => {
              const level = Math.abs(index - focus);
              if (level > NEAR_LEVELS) {
                return;
              }
              decorations.push(
                Decoration.inline(range.from, range.to, { class: `dim-level-${level}` }),
              );
              markerLevels.set(block, Math.min(level, markerLevels.get(block) ?? level));
            });

            // A list item's marker sits outside its text, so it gets its own class.
            for (const [block, level] of markerLevels) {
              const $block = state.doc.resolve(block.pos);
              const item = $block.parent;
              const isListItem = item.type.name === "listItem" || item.type.name === "taskItem";
              if (isListItem && item.firstChild === block.node && $block.depth > 0) {
                decorations.push(
                  Decoration.node($block.before(), $block.after(), {
                    class: `dim-marker-${level}`,
                  }),
                );
              }
            }
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
