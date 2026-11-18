import { create } from "zustand";

type FindState = {
  isOpen: boolean;
  /** Goes up each time find is opened, so an open bar refocuses its field. */
  openCount: number;
  open: () => void;
  close: () => void;
};

/** Whether the ⌘F find bar is open. */
export const useFindStore = create<FindState>((set) => ({
  isOpen: false,
  openCount: 0,
  open: () => set((state) => ({ isOpen: true, openCount: state.openCount + 1 })),
  close: () => set({ isOpen: false }),
}));
