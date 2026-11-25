import type { Editor } from "@tiptap/react";
import { useEffect } from "react";
import { type BookFormat, bookFormatById, textBlockSize } from "@/domain/book-formats";
import { useActiveEditorStore } from "@/features/editor";
import { useLibraryStore } from "@/features/library";
import { useSettingsStore } from "@/stores/settings-store";
import { PX_PER_PT } from "./measure-blocks";
import { pageCountScope } from "./page-count-scope";
import { usePageCountStore } from "./page-count-store";
import { createPagedViewPlugin, type PagedLayout, pagedViewKey } from "./paged-view-plugin";
import { paginate } from "./paginate";

/**
 * Pages are recomputed once typing has paused this long, in ms. With the
 * re-pagination itself, pages are correct within 500 ms of a pause (DESIGN_SPEC §9).
 */
const REPAGINATE_DELAY_MS = 400;

/** Room kept beside a sheet before it is scaled down to fit, in px. */
const SIDE_ROOM_PX = 48;

/** CSS variables the paged view sets, so it can remove them again. */
const COLUMN_VARIABLES = [
  "--page-scale",
  "--page-shrink",
  "--page-width",
  "--page-text-width",
  "--page-top",
  "--page-bottom",
  "--page-side",
];
const TEXT_VARIABLES = ["--book-font-size", "--book-line-height"];

/** The paged view's page for the caret: 1 plus the page gaps before it. */
function caretPage(editor: Editor): { page: number; count: number } | null {
  const set = pagedViewKey.getState(editor.state);
  if (!set) {
    return null;
  }
  // `find` is not in document order. The widget at the very end closes the
  // last sheet; it does not start a page.
  const end = editor.state.doc.content.size;
  const gaps = set.find().map((decoration) => decoration.from);
  if (gaps.length === 0) {
    return null;
  }
  const head = editor.state.selection.head;
  const before = gaps.filter((pos) => pos < end && pos <= head).length;
  return { page: before + 1, count: gaps.length };
}

/** Runs `callback` in a task of its own after the next frame is drawn; returns a cancel function. */
function afterNextFrame(callback: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const frame = requestAnimationFrame(() => {
    timer = setTimeout(callback, 0);
  });
  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };
}

/**
 * Turns the open editor into pages of `format` until the returned function
 * is called: book typography, the sheet column, the page gaps, and
 * re-pagination once typing pauses. Never paginates on a keystroke.
 *
 * Switching typography relays out the whole document, so each step gets a
 * frame of its own to keep tasks short (DESIGN_SPEC §9): after the setting's
 * own render, the typography and the scale, read and written together so the
 * browser lays out once; after that, the plugin and the first pagination.
 */
function attachPagedView(editor: Editor, format: BookFormat, firstPage: number): () => void {
  const dom = editor.view.dom as HTMLElement;
  const column = dom.closest<HTMLElement>(".editor-column");
  const scroller = dom.closest<HTMLElement>(".editor-scroll");
  const block = textBlockSize(format);
  const pageWidth = format.trim.width * PX_PER_PT;
  const textHeight = block.height * PX_PER_PT;

  // Narrow windows show the sheets scaled down rather than cut off. A
  // transform, not CSS zoom: zoom would re-wrap the text, and pages on screen
  // must match the engine's, measured at full size. A transform leaves layout
  // as it is, so the space below the scaled column is taken back with
  // --page-shrink. The width is first read before the typography changes,
  // while layout is still valid.
  const fitToWidth = () => {
    if (!column || !scroller) {
      return;
    }
    const scale = Math.min(1, (scroller.clientWidth - SIDE_ROOM_PX) / (pageWidth + 2));
    if (scale < 1) {
      column.dataset.scaled = "true";
      column.style.setProperty("--page-scale", String(Math.max(scale, 0.3)));
      if (isStarted) {
        column.style.setProperty("--page-shrink", `${(1 - scale) * column.offsetHeight}px`);
      }
    } else if (column.dataset.scaled) {
      delete column.dataset.scaled;
    }
  };

  const applyTypography = () => {
    fitToWidth();
    dom.classList.add("book-text");
    dom.style.setProperty("--book-font-size", `${format.fontSize * PX_PER_PT}px`);
    dom.style.setProperty("--book-line-height", `${format.lineHeight * PX_PER_PT}px`);
    if (column) {
      column.dataset.paged = "true";
      column.style.setProperty("--page-width", `${pageWidth}px`);
      column.style.setProperty("--page-text-width", `${block.width * PX_PER_PT}px`);
      column.style.setProperty("--page-top", `${format.margins.top * PX_PER_PT}px`);
      column.style.setProperty("--page-bottom", `${format.margins.bottom * PX_PER_PT}px`);
      column.style.setProperty("--page-side", `${format.margins.sides * PX_PER_PT}px`);
    }
  };
  const observer = new ResizeObserver(fitToWidth);

  let run = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const showCaretPage = () => {
    usePageCountStore.setState({ pagedPage: caretPage(editor) });
  };

  const repaginate = async () => {
    run += 1;
    const thisRun = run;
    const doc = editor.state.doc;
    try {
      const pagination = await paginate(doc, format);
      if (thisRun !== run || editor.isDestroyed) {
        return;
      }
      if (editor.state.doc !== doc) {
        // Typing went on while it ran; its positions no longer fit.
        schedule();
        return;
      }
      const layout: PagedLayout = {
        breaks: pagination.breaks,
        pageHeights: pagination.pageHeights,
        textHeight,
        firstPage,
      };
      editor.view.dispatch(
        editor.state.tr.setMeta(pagedViewKey, layout).setMeta("addToHistory", false),
      );
      showCaretPage();
    } catch (error) {
      console.error("Pagination failed:", error);
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void repaginate(), REPAGINATE_DELAY_MS);
  };

  // The last step: once the new typography has been laid out and drawn.
  let isStarted = false;
  const start = () => {
    isStarted = true;
    editor.registerPlugin(createPagedViewPlugin());
    if (scroller) {
      observer.observe(scroller);
    }
    if (column) {
      // Its height changes as text is typed; the space below follows.
      observer.observe(column);
    }
    editor.on("update", schedule);
    editor.on("selectionUpdate", showCaretPage);
    void repaginate();
  };
  const cancelSteps = afterNextFrame(() => {
    applyTypography();
    cancelNextStep = afterNextFrame(start);
  });
  let cancelNextStep = () => {};

  return () => {
    run += 1;
    cancelSteps();
    cancelNextStep();
    clearTimeout(timer);
    observer.disconnect();
    editor.off("update", schedule);
    editor.off("selectionUpdate", showCaretPage);
    if (isStarted && !editor.isDestroyed) {
      editor.unregisterPlugin(pagedViewKey);
    }
    dom.classList.remove("book-text");
    for (const name of TEXT_VARIABLES) {
      dom.style.removeProperty(name);
    }
    if (column) {
      delete column.dataset.paged;
      delete column.dataset.scaled;
      for (const name of COLUMN_VARIABLES) {
        column.style.removeProperty(name);
      }
    }
    usePageCountStore.setState({ pagedPage: null });
  };
}

/**
 * The paged view (DESIGN_SPEC §7.10), mounted while the `pagedView` setting
 * is on. It renders nothing itself: it turns the open editor into pages of
 * the document's format, its book's or the default, numbered on from the
 * book's earlier chapters. Loaded lazily, with the engine.
 */
export function PagedView() {
  const editor = useActiveEditorStore((state) => state.editor);
  const documentId = useActiveEditorStore((state) => state.documentId);
  const folders = useLibraryStore((state) => state.folders);
  const documents = useLibraryStore((state) => state.documents);
  const defaultFormat = useSettingsStore((state) => state.defaultBookFormat);
  const firstPage = usePageCountStore((state) => state.status?.range?.first ?? 1);

  const scope =
    documentId === null ? null : pageCountScope({ documentId }, folders, documents, defaultFormat);
  const formatId = scope?.formatId ?? defaultFormat;

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }
    return attachPagedView(editor, bookFormatById(formatId), firstPage);
  }, [editor, formatId, firstPage]);

  return null;
}
