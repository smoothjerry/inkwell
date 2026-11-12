import { useWordCountStore } from "./word-count-store";

// Average adult silent reading speed for English prose.
const WORDS_PER_MINUTE = 238;

function words(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "word" : "words"}`;
}

/**
 * Status-bar text: the open document's word count and reading time, or the
 * selection's word count while text is selected.
 */
export function WordCountStatus() {
  const documentWords = useWordCountStore((state) => state.documentWords);
  const selectionWords = useWordCountStore((state) => state.selectionWords);

  if (documentWords === null) {
    return null;
  }

  const minutes = Math.max(1, Math.round(documentWords / WORDS_PER_MINUTE));

  return (
    <p className="px-1.5 font-mono text-[12px] text-muted-foreground tabular-nums">
      {selectionWords === null
        ? `${words(documentWords)}${documentWords > 0 ? ` · ${minutes} min read` : ""}`
        : `${selectionWords.toLocaleString()} of ${words(documentWords)} selected`}
    </p>
  );
}
