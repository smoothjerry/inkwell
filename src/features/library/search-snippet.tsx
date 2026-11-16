import { MATCH_END, MATCH_START } from "@/lib/db";

type SearchSnippetProps = {
  /** Body text with matched words wrapped in MATCH_START … MATCH_END. */
  snippet: string;
};

/** A search result's text excerpt, with the matched words emphasized. */
export function SearchSnippet({ snippet }: SearchSnippetProps) {
  // Splitting on the start marker leaves "matched<END>rest" in every part but the first.
  const [lead = "", ...parts] = snippet.split(MATCH_START);

  return (
    <span className="truncate text-[12px] text-muted-foreground">
      {lead}
      {parts.map((part, index) => {
        const [matched = "", rest = ""] = part.split(MATCH_END);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: parts of one fixed string.
          <span key={index}>
            <mark className="bg-transparent font-medium text-foreground">{matched}</mark>
            {rest}
          </span>
        );
      })}
    </span>
  );
}
