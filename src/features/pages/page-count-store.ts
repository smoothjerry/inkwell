import { create } from "zustand";
import type { PageRange } from "@/domain/pagination";

/** What the status bar shows about pages (DESIGN_SPEC §7.9). */
export type PageCountStatus = {
  /** The book's pages, or the document's outside a book. */
  total: number;
  /** The open chapter's pages within its book; null outside a book. */
  range: PageRange | null;
  formatName: string;
};

type PageCountState = {
  /** Null while counting, or when no document is open. */
  status: PageCountStatus | null;
  /**
   * In the paged view, the page holding the caret, counted within the open
   * document from 1, and the document's own page count (DESIGN_SPEC §7.10).
   */
  pagedPage: { page: number; count: number } | null;
};

export const usePageCountStore = create<PageCountState>(() => ({ status: null, pagedPage: null }));
