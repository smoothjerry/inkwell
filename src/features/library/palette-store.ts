import { create } from "zustand";

type PaletteState = {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
};

/** Whether the ⌘K command palette is open. */
export const usePaletteStore = create<PaletteState>((set) => ({
  isOpen: false,
  setOpen: (isOpen) => set({ isOpen }),
}));
