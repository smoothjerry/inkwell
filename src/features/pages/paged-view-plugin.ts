import { Plugin, PluginKey, Selection, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/** What the paged view draws, from the latest pagination (DESIGN_SPEC §7.10). */
export type PagedLayout = {
  /** Where pages 2 onwards start; see `Pagination.breaks`. */
  breaks: number[];
  /** Each page's used height, in CSS px. */
  pageHeights: number[];
  /** The text block's height, in CSS px. */
  textHeight: number;
  /** The number of the document's first page: after earlier chapters in a book. */
  firstPage: number;
};

export const pagedViewKey = new PluginKey<DecorationSet>("pagedView");

/** A block-level span, so it can sit inside a paragraph as a ProseMirror widget must. */
function block(className: string, height?: number): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = className;
  if (height !== undefined) {
    span.style.height = `${Math.max(0, height)}px`;
  }
  return span;
}

/**
 * The end of one sheet and the start of the next: the blank rest of the
 * page, the bottom margin with the page number, the space between sheets,
 * and the next sheet's top margin. It is not text: the caret passes over it,
 * copying leaves it out, and screen readers do not read it. At the end of
 * the document it closes the last sheet only.
 */
function gapWidget(fill: number, pageNumber: number, isLast: boolean): HTMLElement {
  const gap = block(isLast ? "page-gap page-gap-last" : "page-gap");
  gap.contentEditable = "false";
  gap.setAttribute("aria-hidden", "true");
  gap.append(block("page-gap-fill", fill));
  const band = block("page-gap-band");
  const art = block("page-gap-art");
  const foot = block("page-gap-foot");
  foot.textContent = String(pageNumber);
  art.append(foot);
  if (!isLast) {
    art.append(block("page-gap-between"), block("page-gap-head"));
  }
  band.append(art);
  gap.append(band);
  return gap;
}

function decorations(layout: PagedLayout, docSize: number): Decoration[] {
  const pages = layout.pageHeights.length;
  return layout.pageHeights.map((height, index) => {
    const isLast = index === pages - 1;
    const pos = isLast ? docSize : (layout.breaks[index] ?? docSize);
    const fill = layout.textHeight - height;
    const pageNumber = layout.firstPage + index;
    return Decoration.widget(pos, () => gapWidget(fill, pageNumber, isLast), {
      side: -1,
      ignoreSelection: true,
      key: `page-${pageNumber}-${Math.round(fill)}-${isLast ? "end" : "gap"}`,
    });
  });
}

/**
 * Moves the caret one step left or right past a page gap. Browsers stop the
 * caret at a non-editable element inside a paragraph, so next to a gap the
 * arrow keys are handled here: one character within a paragraph, or to the
 * next text position across a block boundary, as if the gap were a line break.
 */
function stepOverGap(view: EditorView, event: KeyboardEvent): boolean {
  const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
  if (direction === 0 || event.altKey || event.metaKey || event.ctrlKey) {
    return false;
  }
  const { state } = view;
  const { head, anchor } = state.selection;
  const set = pagedViewKey.getState(state);
  const nearGap = set?.find(head - 1, head + 1).length ?? 0;
  if (nearGap === 0) {
    return false;
  }
  const target = Math.min(Math.max(head + direction, 0), state.doc.content.size);
  const found = Selection.findFrom(state.doc.resolve(target), direction, true);
  if (!found) {
    return false;
  }
  const selection = event.shiftKey
    ? TextSelection.create(state.doc, anchor, found.head)
    : TextSelection.create(state.doc, found.head);
  view.dispatch(state.tr.setSelection(selection).scrollIntoView());
  return true;
}

/**
 * Draws the page gaps. A transaction carrying a `PagedLayout` as this
 * plugin's meta replaces them; every other transaction maps them, so they
 * move with the text while typing until the next pagination.
 */
export function createPagedViewPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: pagedViewKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, set) {
        const layout = tr.getMeta(pagedViewKey) as PagedLayout | undefined;
        if (layout) {
          return DecorationSet.create(tr.doc, decorations(layout, tr.doc.content.size));
        }
        return set.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations: (state) => pagedViewKey.getState(state),
      handleKeyDown: stepOverGap,
    },
  });
}
