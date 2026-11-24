import { create } from "zustand";

type LinkDialogState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

/** Whether the Format ▸ Link… dialog is open. */
export const useLinkDialogStore = create<LinkDialogState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
