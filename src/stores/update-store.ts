import { create } from "zustand";

type UpdateState = {
  /** A token naming the newer build that has replaced the running one, or null. */
  waitingToken: string | null;
  /** The token whose notice was closed; it shows again only for a further build. */
  dismissedToken: string | null;
  setWaiting: (token: string) => void;
  dismiss: (token: string) => void;
};

/** Whether a newer build of Inkwell is installed and waiting (DESIGN_SPEC §7.12). */
export const useUpdateStore = create<UpdateState>((set) => ({
  waitingToken: null,
  dismissedToken: null,
  setWaiting: (waitingToken) => set({ waitingToken }),
  dismiss: (dismissedToken) => set({ dismissedToken }),
}));
