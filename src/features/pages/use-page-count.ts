import { useEffect } from "react";
import { bookFormatById } from "@/domain/book-formats";
import { subscribeToSaves } from "@/features/editor";
import { useLibraryStore } from "@/features/library";
import { useSettingsStore } from "@/stores/settings-store";
import { pageCountScope } from "./page-count-scope";
import { usePageCountStore } from "./page-count-store";

/** How long changes must settle before counting starts, in ms. */
const RECOUNT_DELAY_MS = 300;

/**
 * Keeps the status bar's page count current (DESIGN_SPEC §7.9): the open
 * document's book, or the document itself outside a book. It recounts after
 * a save of one of its chapters, a document switch, a library change (a
 * chapter moved, renamed, or added; a book's format), and a change of the
 * default format, never on a keystroke. A newer count makes an older,
 * unfinished one irrelevant.
 */
export function usePageCount() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let run = 0;
    let chapterIds: string[] = [];

    async function count() {
      run += 1;
      const thisRun = run;
      const { selectedDocumentId, folders, documents } = useLibraryStore.getState();
      const { defaultBookFormat } = useSettingsStore.getState();
      const scope =
        selectedDocumentId === null
          ? null
          : pageCountScope(
              { documentId: selectedDocumentId },
              folders,
              documents,
              defaultBookFormat,
            );
      chapterIds = scope?.chapterIds ?? [];
      if (!scope || selectedDocumentId === null) {
        usePageCountStore.setState({ status: null });
        return;
      }
      try {
        const { countPages } = await import("./count-pages");
        const format = bookFormatById(scope.formatId);
        const count = await countPages(scope.chapterIds, format);
        if (thisRun !== run) {
          return;
        }
        const index = scope.chapterIds.indexOf(selectedDocumentId);
        usePageCountStore.setState({
          status: {
            total: count.total,
            range: scope.isBook ? (count.ranges[index] ?? null) : null,
            formatName: format.name,
          },
        });
      } catch (error) {
        console.error("Page count failed:", error);
      }
    }

    const recount = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void count(), RECOUNT_DELAY_MS);
    };

    const stopLibrary = useLibraryStore.subscribe((state, previous) => {
      if (state.selectedDocumentId !== previous.selectedDocumentId) {
        // Never show the previous document's count against this one.
        usePageCountStore.setState({ status: null });
      }
      if (
        state.selectedDocumentId !== previous.selectedDocumentId ||
        state.folders !== previous.folders ||
        state.documents !== previous.documents
      ) {
        recount();
      }
    });
    const stopSettings = useSettingsStore.subscribe((state, previous) => {
      if (state.defaultBookFormat !== previous.defaultBookFormat) {
        recount();
      }
    });
    const stopSaves = subscribeToSaves((documentId) => {
      if (chapterIds.includes(documentId)) {
        recount();
      }
    });
    recount();

    return () => {
      clearTimeout(timer);
      run += 1;
      stopLibrary();
      stopSettings();
      stopSaves();
    };
  }, []);
}
