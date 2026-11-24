import { create } from "zustand";

/** What the main area shows. There is no router (DESIGN_SPEC §3). */
export type View = "editor" | "stats" | "settings";

/** What the Page Counts dialog counts: a book, or a document outside any book. */
export type PageCountsTarget = { bookId: string } | { documentId: string };

type ViewState = {
  view: View;
  /** Zen mode hides the sidebar and status bar. It is not saved between launches. */
  isZen: boolean;
  /** The document the export dialog is open for, or null when it is closed. */
  exportDocumentId: string | null;
  /** What the Page Counts dialog is open for, or null when it is closed (DESIGN_SPEC §7.9). */
  pageCountsTarget: PageCountsTarget | null;
  setView: (view: View) => void;
  setZen: (isZen: boolean) => void;
  setExportDocumentId: (id: string | null) => void;
  setPageCountsTarget: (target: PageCountsTarget | null) => void;
};

export const useViewStore = create<ViewState>((set) => ({
  view: "editor",
  isZen: false,
  exportDocumentId: null,
  pageCountsTarget: null,
  setView: (view) => set({ view }),
  setZen: (isZen) => set({ isZen }),
  setExportDocumentId: (exportDocumentId) => set({ exportDocumentId }),
  setPageCountsTarget: (pageCountsTarget) => set({ pageCountsTarget }),
}));
