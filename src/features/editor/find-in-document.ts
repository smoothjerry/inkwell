import type { Node } from "@tiptap/pm/model";
import { type EditorState, Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { Extension } from "@tiptap/react";
import { type FindMatch, findMatches } from "@/domain/find-matches";

type FindState = {
  query: string;
  /** Matches as document positions, in document order. */
  matches: FindMatch[];
  /** Index of the current match in `matches`; 0 when there are none. */
  current: number;
};

type FindMeta = { query: string } | { step: 1 | -1 };

const findKey = new PluginKey<FindState>("findInDocument");

const EMPTY: FindState = { query: "", matches: [], current: 0 };

/** Searches each text block. A match never spans two blocks. */
function search(doc: Node, query: string): FindMatch[] {
  if (query === "") {
    return [];
  }
  const matches: FindMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) {
      return true;
    }
    // A non-text inline node (a line break) becomes one character, so an
    // offset in this string is an offset in the block.
    const text = node.textBetween(0, node.content.size, undefined, "￼");
    for (const match of findMatches(text, query)) {
      matches.push({ from: pos + 1 + match.from, to: pos + 1 + match.to });
    }
    return false;
  });
  return matches;
}

/** The first match at or after `pos`, or the first match when none is. */
function indexFrom(matches: FindMatch[], pos: number): number {
  const index = matches.findIndex((match) => match.from >= pos);
  return index === -1 ? 0 : index;
}

/**
 * Find in document (DESIGN_SPEC §7.7). Every match of the query gets the
 * class `find-match`, and the current one also `find-match-current`. Styles
 * are in styles/editor.css. Use the functions below to drive it.
 */
export const FindInDocument = Extension.create({
  name: "findInDocument",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: () => EMPTY,
          apply: (tr, previous, _oldState, newState) => {
            const meta = tr.getMeta(findKey) as FindMeta | undefined;
            if (meta && "query" in meta) {
              const matches = search(newState.doc, meta.query);
              return {
                query: meta.query,
                matches,
                current: indexFrom(matches, newState.selection.from),
              };
            }
            if (meta && "step" in meta) {
              const count = previous.matches.length;
              return count === 0
                ? previous
                : { ...previous, current: (previous.current + meta.step + count) % count };
            }
            if (tr.docChanged && previous.query !== "") {
              // Stay on the match that was current, or the next one after it.
              const anchor = previous.matches[previous.current];
              const matches = search(newState.doc, previous.query);
              const current = anchor ? indexFrom(matches, tr.mapping.map(anchor.from)) : 0;
              return { ...previous, matches, current };
            }
            return previous;
          },
        },
        props: {
          decorations: (state) => {
            const find = findKey.getState(state);
            if (!find || find.matches.length === 0) {
              return null;
            }
            return DecorationSet.create(
              state.doc,
              find.matches.map((match, index) =>
                Decoration.inline(match.from, match.to, {
                  class: index === find.current ? "find-match find-match-current" : "find-match",
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});

/** The current query, its matches, and which one is current. */
export function getFindState(state: EditorState): FindState {
  return findKey.getState(state) ?? EMPTY;
}

/** Searches for `query`, starting from the match at or after the caret. "" clears it. */
export function setFindQuery(view: EditorView, query: string) {
  view.dispatch(view.state.tr.setMeta(findKey, { query } satisfies FindMeta));
}

/** Moves to the next (1) or previous (-1) match, wrapping around. */
export function stepFind(view: EditorView, step: 1 | -1) {
  view.dispatch(view.state.tr.setMeta(findKey, { step } satisfies FindMeta));
}
