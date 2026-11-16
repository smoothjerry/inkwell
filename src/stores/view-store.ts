import { create } from "zustand";

/** What the main area shows. There is no router (DESIGN_SPEC §3). */
export type View = "editor" | "stats" | "settings";

type ViewState = {
  view: View;
  /** Zen mode hides the sidebar and status bar. It is not saved between launches. */
  isZen: boolean;
  /** The document the export dialog is open for, or null when it is closed. */
  exportDocumentId: string | null;
  setView: (view: View) => void;
  setZen: (isZen: boolean) => void;
  setExportDocumentId: (id: string | null) => void;
};

export const useViewStore = create<ViewState>((set) => ({
  view: "editor",
  isZen: false,
  exportDocumentId: null,
  setView: (view) => set({ view }),
  setZen: (isZen) => set({ isZen }),
  setExportDocumentId: (exportDocumentId) => set({ exportDocumentId }),
}));
