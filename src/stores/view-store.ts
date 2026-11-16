import { create } from "zustand";

/** What the main area shows. There is no router (DESIGN_SPEC §3). */
export type View = "editor" | "stats" | "settings";

type ViewState = {
  view: View;
  /** Zen mode hides the sidebar and status bar. It is not saved between launches. */
  isZen: boolean;
  setView: (view: View) => void;
  setZen: (isZen: boolean) => void;
};

export const useViewStore = create<ViewState>((set) => ({
  view: "editor",
  isZen: false,
  setView: (view) => set({ view }),
  setZen: (isZen) => set({ isZen }),
}));
