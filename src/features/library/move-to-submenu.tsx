import { FolderInput } from "lucide-react";
import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import type { MoveTarget } from "./move-targets";

type MoveToSubmenuProps = {
  targets: MoveTarget[];
  /** Where the item is now; that target is shown disabled. */
  currentId: string | null;
  /** False for a target the item may not go into; it is shown disabled. */
  isAllowed?: (targetId: string | null) => boolean;
  onMove: (targetId: string | null) => void;
};

export function MoveToSubmenu({ targets, currentId, isAllowed, onMove }: MoveToSubmenuProps) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <FolderInput strokeWidth={1.5} aria-hidden="true" />
        Move to
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="max-h-72 overflow-y-auto">
        {targets.map((target) => (
          <ContextMenuItem
            key={target.id ?? "root"}
            disabled={target.id === currentId || isAllowed?.(target.id) === false}
            onSelect={() => onMove(target.id)}
          >
            {target.label}
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}
