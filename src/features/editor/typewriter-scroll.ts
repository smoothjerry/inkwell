import { Plugin } from "@tiptap/pm/state";
import { Extension } from "@tiptap/react";
import { useSettingsStore } from "@/stores/settings-store";

/** Where the caret line sits, as a fraction of the scroll area's height. */
const CARET_POSITION = 0.45;
const TOLERANCE_PX = 2;

/**
 * Typewriter scrolling (DESIGN_SPEC §7.4): while the `typewriterMode` setting
 * is on, scrolls so the caret line stays at about 45% of the editor's height.
 * It does nothing while a range is selected.
 */
export const TypewriterScroll = Extension.create({
  name: "typewriterScroll",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        view: () => ({
          update: (view, previousState) => {
            const { selection, doc } = view.state;
            const moved = !previousState.selection.eq(selection) || !previousState.doc.eq(doc);
            if (
              !moved ||
              !selection.empty ||
              !view.hasFocus() ||
              !useSettingsStore.getState().typewriterMode
            ) {
              return;
            }

            const scroller = view.dom.closest<HTMLElement>(".editor-scroll");
            if (!scroller) {
              return;
            }
            const caretTop = view.coordsAtPos(selection.head).top;
            const bounds = scroller.getBoundingClientRect();
            const offset = caretTop - (bounds.top + bounds.height * CARET_POSITION);
            if (Math.abs(offset) > TOLERANCE_PX) {
              const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              scroller.scrollBy({ top: offset, behavior: reduceMotion ? "auto" : "smooth" });
            }
          },
        }),
      }),
    ];
  },
});
