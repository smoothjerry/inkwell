import { create } from "zustand";
import type { DropTarget, TreeItem } from "@/domain/library-order";

/** What a row carries while it is dragged. */
export type DraggedItem = TreeItem & { label: string };

type DragState = {
  /** The row being dragged, or null when nothing is. */
  active: DraggedItem | null;
  /** Where it would land if dropped now; null when the drop is not allowed. */
  target: DropTarget | null;
  setActive: (active: DraggedItem | null) => void;
  setTarget: (target: DropTarget | null) => void;
};

/** Library drag-and-drop state, read by rows to draw drop indicators. */
export const useDragStore = create<DragState>((set) => ({
  active: null,
  target: null,
  setActive: (active) => set({ active, target: null }),
  setTarget: (target) => set({ target }),
}));
