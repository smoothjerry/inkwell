import { usePageCountStore } from "./page-count-store";

/** "pp. 41–52", or "p. 7" for a one-page chapter. */
function pagesLabel(first: number, last: number): string {
  return first === last ? `p. ${first}` : `pp. ${first}–${last}`;
}

/**
 * Status-bar page count (DESIGN_SPEC §7.9): the book's count and the open
 * chapter's range, or a document's own count outside a book. Always an
 * estimate; the tooltip says why.
 */
export function PageCountStatus() {
  const status = usePageCountStore((state) => state.status);
  const pagedPage = usePageCountStore((state) => state.pagedPage);
  if (status === null) {
    return null;
  }
  const pages = `≈ ${status.total.toLocaleString()} ${status.total === 1 ? "page" : "pages"}`;
  // In the paged view: the caret's page, numbered as in the book (DESIGN_SPEC §7.10).
  const pageLabel =
    pagedPage === null
      ? null
      : `Page ${((status.range?.first ?? 1) - 1 + pagedPage.page).toLocaleString()} of ≈ ${status.total.toLocaleString()}`;
  return (
    <p
      // A hairline keeps it apart from the word count that follows.
      className="border-r px-1.5 pr-2.5 font-mono text-[12px] text-muted-foreground tabular-nums"
      title={`Estimated for ${status.formatName}. Front matter, chapter openings, hyphenation, and a typesetter's choices all change a printed book's length.`}
    >
      {pageLabel ??
        (status.range ? `${pages} · ${pagesLabel(status.range.first, status.range.last)}` : pages)}
    </p>
  );
}
