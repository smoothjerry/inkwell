import { type Editor, useEditorState } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getFindState, setFindQuery, stepFind } from "./find-in-document";
import { useFindStore } from "./find-store";

type FindBarProps = {
  editor: Editor;
};

/**
 * The ⌘F bar over the editor (DESIGN_SPEC §7.7). Enter and ⇧Enter step
 * through the matches without moving the caret; Esc closes the bar and puts
 * the selection on the current match.
 */
export function FindBar({ editor }: FindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const openCount = useFindStore((state) => state.openCount);
  const { count, current } = useEditorState({
    editor,
    selector: ({ editor }) => {
      const find = getFindState(editor.state);
      return { count: find.matches.length, current: find.current };
    },
  });

  // Focus the field when the bar opens, and again on each ⌘F while open.
  // biome-ignore lint/correctness/useExhaustiveDependencies: openCount is the trigger, not an input.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [openCount]);

  // Clear the highlights when the bar goes away, unless the editor went first.
  useEffect(
    () => () => {
      if (!editor.isDestroyed) {
        setFindQuery(editor.view, "");
      }
    },
    [editor],
  );

  function scrollToCurrent() {
    editor.view.dom.querySelector(".find-match-current")?.scrollIntoView({ block: "center" });
  }

  function search(value: string) {
    setQuery(value);
    setFindQuery(editor.view, value);
    scrollToCurrent();
  }

  function step(direction: 1 | -1) {
    stepFind(editor.view, direction);
    scrollToCurrent();
  }

  function close() {
    const find = getFindState(editor.state);
    const match = find.matches[find.current];
    useFindStore.getState().close();
    if (match) {
      editor.chain().focus().setTextSelection(match).scrollIntoView().run();
    } else {
      editor.commands.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
    } else if (event.key === "Escape") {
      // Marks the key as used, so it does not also leave zen mode.
      event.preventDefault();
      close();
    }
  }

  return (
    // The zero-height sticky row keeps the bar over the text without moving it down.
    <div className="sticky top-2 z-20 flex h-0 justify-end">
      <search className="flex h-fit items-center gap-1 rounded-md border bg-background p-1 shadow-sm">
        <input
          ref={inputRef}
          type="search"
          aria-label="Find in document"
          placeholder="Find"
          // A search term is not prose: no macOS autocorrect or completion bubbles.
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-7 w-48 rounded-sm bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          value={query}
          onChange={(event) => search(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <span
          className="min-w-16 px-1 text-right font-mono text-muted-foreground text-xs tabular-nums"
          aria-live="polite"
        >
          {query === "" ? "" : count === 0 ? "No results" : `${current + 1} of ${count}`}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Previous match"
          disabled={count === 0}
          onClick={() => step(-1)}
        >
          <ChevronUp strokeWidth={1.5} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Next match"
          disabled={count === 0}
          onClick={() => step(1)}
        >
          <ChevronDown strokeWidth={1.5} aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Close find" onClick={close}>
          <X strokeWidth={1.5} aria-hidden="true" />
        </Button>
      </search>
    </div>
  );
}
