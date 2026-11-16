import type { ResolvedPos } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/react";
import { useSettingsStore } from "@/stores/settings-store";

const sentences = new Intl.Segmenter(undefined, { granularity: "sentence" });

/** Document positions of the sentence around the caret, within its text block. */
function sentenceRange($head: ResolvedPos): { from: number; to: number } {
  const block = $head.parent;
  // Inline nodes that are not text (a line break) count as one character, so
  // an offset in this string is an offset in the block.
  const text = block.textBetween(0, block.content.size, undefined, "\n");
  const blockStart = $head.start();

  let range = { from: blockStart, to: $head.end() };
  for (const segment of sentences.segment(text)) {
    range = {
      from: blockStart + segment.index,
      to: blockStart + segment.index + segment.segment.length,
    };
    if ($head.parentOffset < segment.index + segment.segment.length) {
      break;
    }
  }
  return range;
}

/**
 * Dimming (DESIGN_SPEC §7.4): while the `dimMode` setting is `sentence` or
 * `paragraph`, the editor gets the class `is-dimming`, which fades all text,
 * and the sentence or paragraph around the caret is wrapped in
 * `editor-focus`, which restores it. Styles are in styles/editor.css.
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
            // Code has no sentences; treat a code block as one paragraph.
            const range =
              mode === "paragraph" || $head.parent.type.spec.code
                ? { from: $head.start(), to: $head.end() }
                : sentenceRange($head);
            if (range.from >= range.to) {
              return null;
            }
            return DecorationSet.create(state.doc, [
              Decoration.inline(range.from, range.to, { class: "editor-focus" }),
            ]);
          },
        },
      }),
    ];
  },
});
