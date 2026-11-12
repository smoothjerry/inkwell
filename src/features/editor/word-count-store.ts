import { create } from "zustand";

type WordCountState = {
  /** Words in the open document, or null when no document is open. */
  documentWords: number | null;
  /** Words in the current selection, or null when nothing is selected. */
  selectionWords: number | null;
};

export const useWordCountStore = create<WordCountState>(() => ({
  documentWords: null,
  selectionWords: null,
}));
