import { create } from "zustand";
import type { SlashItem } from "./slash-items";

type SlashMenuState = {
  isOpen: boolean;
  items: SlashItem[];
  selectedIndex: number;
  /** Where the typed "/" is on screen; the menu is placed next to it. */
  anchor: DOMRect | null;
  /** Inserts an item. Set by the slash command while the menu is open. */
  pick: (item: SlashItem) => void;
};

/** State shared between the slash command (ProseMirror) and its menu (React). */
export const useSlashMenuStore = create<SlashMenuState>(() => ({
  isOpen: false,
  items: [],
  selectedIndex: 0,
  anchor: null,
  pick: () => {},
}));
