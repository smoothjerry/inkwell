import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BOOK_FORMATS, type BookFormatId } from "@/domain/book-formats";
import { useLibraryStore } from "@/features/library";
import { useSettingsStore } from "@/stores/settings-store";
import { useViewStore } from "@/stores/view-store";
import type { PageCount } from "./count-pages";
import { pageCountScope } from "./page-count-scope";

/**
 * Book ▸ Page Counts… and the palette's Page Counts… (DESIGN_SPEC §7.9): the
 * book, and the open chapter, in every format, so formats can be compared.
 * Formats are counted one after another and fill in as they finish.
 */
export function PageCountsDialog() {
  const target = useViewStore((state) => state.pageCountsTarget);
  const setTarget = useViewStore((state) => state.setPageCountsTarget);
  const folders = useLibraryStore((state) => state.folders);
  const documents = useLibraryStore((state) => state.documents);
  const openDocumentId = useLibraryStore((state) => state.selectedDocumentId);
  const defaultFormat = useSettingsStore((state) => state.defaultBookFormat);
  const [counts, setCounts] = useState<Partial<Record<BookFormatId, PageCount>>>({});

  const scope = target ? pageCountScope(target, folders, documents, defaultFormat) : null;
  const chapterIndex =
    scope?.isBook && openDocumentId !== null ? scope.chapterIds.indexOf(openDocumentId) : -1;
  const chapterKey = scope?.chapterIds.join(",") ?? "";

  // biome-ignore lint/correctness/useExhaustiveDependencies: chapterKey stands for the scope's chapters.
  useEffect(() => {
    setCounts({});
    if (!scope) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const { countPages } = await import("./count-pages");
      for (const format of BOOK_FORMATS) {
        const count = await countPages(scope.chapterIds, format);
        if (cancelled) {
          return;
        }
        setCounts((previous) => ({ ...previous, [format.id]: count }));
      }
    })().catch((error: unknown) => console.error("Page counts failed:", error));
    return () => {
      cancelled = true;
    };
  }, [chapterKey]);

  return (
    <Dialog open={scope !== null} onOpenChange={(open) => !open && setTarget(null)}>
      <DialogContent className="max-w-md text-[13px]">
        <DialogHeader>
          <DialogTitle>Page Counts: {scope?.title}</DialogTitle>
          <DialogDescription>
            Estimates. Front matter, chapter openings, hyphenation, and a typesetter's choices all
            change a printed book's length.
          </DialogDescription>
        </DialogHeader>
        <table className="w-full tabular-nums">
          <thead className="text-left text-[12px] text-muted-foreground">
            <tr>
              <th className="pb-2 font-normal">Format</th>
              <th className="pb-2 text-right font-normal">{scope?.isBook ? "Book" : "Document"}</th>
              {chapterIndex !== -1 && <th className="pb-2 text-right font-normal">This chapter</th>}
            </tr>
          </thead>
          <tbody>
            {BOOK_FORMATS.map((format) => {
              const count = counts[format.id];
              const range = count?.ranges[chapterIndex];
              return (
                <tr key={format.id} className="border-t">
                  <td className="py-1.5">
                    {format.name}
                    {format.id === scope?.formatId && (
                      <span className="text-muted-foreground">
                        {scope.isBook ? " (this book)" : " (default)"}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right">
                    {count ? `≈ ${count.total.toLocaleString()}` : "…"}
                  </td>
                  {chapterIndex !== -1 && (
                    <td className="py-1.5 text-right">
                      {range
                        ? range.first === range.last
                          ? `p. ${range.first}`
                          : `pp. ${range.first}–${range.last}`
                        : "…"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
