import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
} from "@/stores/settings-store";

/** How far one arrow key press moves the edge, in px. */
const KEY_STEP = 10;

function clampWidth(width: number): number {
  return Math.round(Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, width)));
}

type SidebarResizerProps = {
  width: number;
  /** Called on every move while dragging, for a live preview. */
  onResize: (width: number) => void;
  /** Called once with the final width: at the end of a drag, or on a key press. */
  onCommit: (width: number) => void;
};

/**
 * The draggable edge between the sidebar and the editor (DESIGN_SPEC §7.1).
 * Place it at the left edge of a positioned element next to the sidebar.
 */
export function SidebarResizer({ width, onResize, onCommit }: SidebarResizerProps) {
  const drag = useRef<{ startX: number; startWidth: number; width: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    // Stops the drag from selecting text.
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, startWidth: width, width };
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) {
      return;
    }
    current.width = clampWidth(current.startWidth + event.clientX - current.startX);
    onResize(current.width);
  }

  function endDrag() {
    const current = drag.current;
    if (!current) {
      return;
    }
    drag.current = null;
    setIsDragging(false);
    onCommit(current.width);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = {
      ArrowLeft: width - KEY_STEP,
      ArrowRight: width + KEY_STEP,
      Home: SIDEBAR_WIDTH_MIN,
      End: SIDEBAR_WIDTH_MAX,
    }[event.key];
    if (next !== undefined) {
      event.preventDefault();
      onCommit(clampWidth(next));
    }
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable separator is the ARIA pattern for a resize handle; <hr> cannot take focus or keys.
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuenow={width}
      aria-valuemin={SIDEBAR_WIDTH_MIN}
      aria-valuemax={SIDEBAR_WIDTH_MAX}
      tabIndex={0}
      className={cn(
        "absolute inset-y-0 left-0 z-10 w-1.5 -translate-x-1/2 cursor-col-resize touch-none outline-none transition-colors hover:bg-ring/40 focus-visible:bg-ring",
        isDragging && "bg-ring/60",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onCommit(SIDEBAR_WIDTH_DEFAULT)}
      onKeyDown={handleKeyDown}
    />
  );
}
