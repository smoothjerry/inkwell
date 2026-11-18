import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { FileText, Folder } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { type DropTarget, dropZone, planDrop, type TreeItem } from "@/domain/library-order";
import { useSettingsStore } from "@/stores/settings-store";
import { type DraggedItem, useDragStore } from "./drag-store";
import { useLibraryStore } from "./library-store";

/** What a droppable row says about itself. */
export type DropRowData = { kind: TreeItem["kind"]; id: string };

function treeItems() {
  const { folders, documents } = useLibraryStore.getState();
  return {
    folders: folders.map(
      (folder): TreeItem => ({
        kind: "folder",
        id: folder.id,
        parentId: folder.parentId,
        sortOrder: folder.sortOrder,
      }),
    ),
    documents: documents.map(
      (doc): TreeItem => ({
        kind: "document",
        id: doc.id,
        parentId: doc.folderId,
        sortOrder: doc.sortOrder,
      }),
    ),
  };
}

/**
 * The drop target under the pointer, or null when there is none or it is not
 * allowed. Off the rows but inside `root` means the top level.
 */
function targetFor(
  event: DragMoveEvent | DragOverEvent | DragEndEvent,
  root: HTMLElement | null,
): DropTarget | null {
  const dragged = event.active.data.current as DraggedItem | undefined;
  if (!dragged) {
    return null;
  }
  const start = event.activatorEvent as PointerEvent;
  const x = start.clientX + event.delta.x;
  const y = start.clientY + event.delta.y;
  let target: DropTarget;
  if (event.over) {
    const row = event.over.data.current as DropRowData;
    const ratio = (y - event.over.rect.top) / event.over.rect.height;
    // Outside manual sort, a position between rows would not hold, so rows
    // only take drops into folders.
    const isManual = useSettingsStore.getState().librarySort === "manual";
    const zone = isManual ? dropZone(dragged.kind, row.kind, ratio) : "inside";
    target = { kind: row.kind, id: row.id, zone };
  } else {
    const box = root?.getBoundingClientRect();
    if (!box || x < box.left || x > box.right || y < box.top || y > box.bottom) {
      return null;
    }
    target = { kind: "root" };
  }
  const { folders, documents } = treeItems();
  return planDrop(dragged, target, folders, documents) ? target : null;
}

function sameTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === null || b === null || a.kind === "root" || b.kind === "root") {
    return a?.kind === b?.kind;
  }
  return a.kind === b.kind && a.id === b.id && a.zone === b.zone;
}

/**
 * Drag-and-drop for the library tree (DESIGN_SPEC §7.2). Rows opt in with
 * `useTreeRowDnd`. A drag starts after the pointer moves 4 px, so clicks and
 * double-clicks on rows still work.
 */
type LibraryDragContextProps = {
  children: ReactNode;
  /** The library area; dropping in it but not on a row moves to the top level. */
  rootRef: RefObject<HTMLElement | null>;
};

export function LibraryDragContext({ children, rootRef }: LibraryDragContextProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const active = useDragStore((state) => state.active);

  function handleDragStart(event: DragStartEvent) {
    useDragStore.getState().setActive((event.active.data.current as DraggedItem) ?? null);
  }

  // Both events matter: a move event still reports the row the pointer was
  // over before it moved, and the over event follows once that is updated.
  function updateTarget(event: DragMoveEvent | DragOverEvent) {
    const target = targetFor(event, rootRef.current);
    const drag = useDragStore.getState();
    if (!sameTarget(drag.target, target)) {
      drag.setTarget(target);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const target = targetFor(event, rootRef.current);
    const dragged = event.active.data.current as DraggedItem | undefined;
    useDragStore.getState().setActive(null);
    if (!target || !dragged) {
      return;
    }
    const { folders, documents } = treeItems();
    const plan = planDrop(dragged, target, folders, documents);
    if (!plan) {
      return;
    }
    const library = useLibraryStore.getState();
    if (dragged.kind === "folder") {
      void library.moveFolder(dragged.id, plan.parentId, plan.sortOrder);
    } else {
      void library.moveDocument(dragged.id, plan.parentId, plan.sortOrder);
    }
  }

  const Icon = active?.kind === "folder" ? Folder : FileText;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={updateTarget}
      onDragOver={updateTarget}
      onDragEnd={handleDragEnd}
      onDragCancel={() => useDragStore.getState().setActive(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className="flex h-7 w-56 items-center gap-1.5 rounded-md border bg-background px-2 shadow-sm">
            <Icon
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="truncate">{active.label}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
