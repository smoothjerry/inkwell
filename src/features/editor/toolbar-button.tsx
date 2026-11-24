import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ToolbarButtonProps = {
  label: string;
  Icon: LucideIcon;
  /** Shown as `aria-pressed`; leave out for a button that is not a toggle. */
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

/** An icon button in the formatting toolbar. */
export function ToolbarButton({ label, Icon, isActive, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={isActive}
      disabled={disabled}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
        isActive && "bg-accent text-foreground",
      )}
      // Keep the document's selection and focus when the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
