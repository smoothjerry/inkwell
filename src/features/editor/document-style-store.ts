import { create } from "zustand";

type DocumentStyleDialogState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

/** Whether the Format ▸ Document Style… dialog is open. */
export const useDocumentStyleStore = create<DocumentStyleDialogState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
