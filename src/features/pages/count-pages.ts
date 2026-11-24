import type { JSONContent } from "@tiptap/react";
import type { BookFormat } from "@/domain/book-formats";
import { type PageRange, pageRanges } from "@/domain/pagination";
import { getDocumentContent, listDocumentVersions } from "@/lib/db";
import { paginateDocument } from "./paginate";

const EMPTY: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

/** A scope's page count in one format. */
export type PageCount = {
  total: number;
  /** Each chapter's pages within the book, in reading order. */
  ranges: PageRange[];
};

async function loadContent(documentId: string): Promise<JSONContent> {
  const raw = await getDocumentContent(documentId);
  if (raw === null) {
    return EMPTY;
  }
  try {
    return JSON.parse(raw) as JSONContent;
  } catch {
    return EMPTY;
  }
}

/**
 * Counts the pages of `chapterIds` in `format` (DESIGN_SPEC §7.9). Chapters
 * are paginated one after another, each in short slices; a chapter that has
 * not changed since it was last counted in this format is not read at all.
 * Loaded with `import()`, so the engine stays out of the startup bundle.
 */
export async function countPages(
  chapterIds: readonly string[],
  format: BookFormat,
): Promise<PageCount> {
  const versions = await listDocumentVersions(chapterIds);
  const counts: number[] = [];
  for (const id of chapterIds) {
    const pagination = await paginateDocument(
      id,
      versions.get(id) ?? 0,
      () => loadContent(id),
      format,
    );
    counts.push(pagination.count);
  }
  const ranges = pageRanges(counts);
  return { total: ranges.at(-1)?.last ?? 0, ranges };
}
