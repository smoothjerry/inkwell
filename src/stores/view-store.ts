import { create } from "zustand";

/** What the main area shows. There is no router (DESIGN_SPEC §3). */
export type View = "editor" | "stats" | "settings";

type ViewState = {
  view: View;
  setView: (view: View) => void;
};

export const useViewStore = create<ViewState>((set) => ({
  view: "editor",
  setView: (view) => set({ view }),
}));
