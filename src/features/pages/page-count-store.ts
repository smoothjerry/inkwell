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
};

export const usePageCountStore = create<PageCountState>(() => ({ status: null }));
