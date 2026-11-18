import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useCallback } from "react";
import type { DropZone } from "@/domain/library-order";
import { type DraggedItem, useDragStore } from "./drag-store";
import type { DropRowData } from "./library-drag-context";

/**
 * Makes a tree row both draggable and a drop target. Spread `listeners` on
 * the row and attach `ref` to it. `zone` is where a dragged item would land
 * on this row (for drawing an indicator), or null.
 *
 * Only the pointer listeners are used: the row keeps its own button role and
 * focus, and keyboard users move items with the "Move to" menu instead.
 */
export function useTreeRowDnd(item: DraggedItem, enabled = true) {
  const dndId = `${item.kind}:${item.id}`;
  const draggable = useDraggable({ id: dndId, data: item, disabled: !enabled });
  const droppable = useDroppable({
    id: dndId,
    data: { kind: item.kind, id: item.id } satisfies DropRowData,
    disabled: !enabled,
  });
  const zone = useDragStore((state): DropZone | null =>
    state.target && state.target.kind === item.kind && state.target.id === item.id
      ? state.target.zone
      : null,
  );

  const { setNodeRef: setDragRef } = draggable;
  const { setNodeRef: setDropRef } = droppable;
  const ref = useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  return { ref, listeners: draggable.listeners, isDragging: draggable.isDragging, zone };
}
