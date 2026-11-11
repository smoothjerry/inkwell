import { cn } from "@/lib/utils";
import { useSlashMenuStore } from "./slash-menu-store";

const MENU_HEIGHT = 320;
const GAP = 6;

/** The popup list for the slash command. Keyboard handling is in slash-command.ts. */
export function SlashMenu() {
  const { isOpen, items, selectedIndex, anchor, pick } = useSlashMenuStore();

  if (!isOpen || !anchor) {
    return null;
  }

  // Open below the "/" unless there is no room; then open above it.
  const fitsBelow = anchor.bottom + GAP + MENU_HEIGHT <= window.innerHeight;
  const position = fitsBelow
    ? { top: anchor.bottom + GAP }
    : { bottom: window.innerHeight - anchor.top + GAP };

  return (
    <div
      role="listbox"
      aria-label="Insert block"
      className="fixed z-50 w-56 overflow-y-auto rounded-lg border bg-popover p-1 text-[13px] shadow-overlay"
      style={{ left: anchor.left, maxHeight: MENU_HEIGHT, ...position }}
    >
      {items.length === 0 && <p className="px-2 py-1.5 text-muted-foreground">No matches</p>}

      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          ref={
            index === selectedIndex ? (node) => node?.scrollIntoView({ block: "nearest" }) : null
          }
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left outline-none",
            index === selectedIndex && "bg-accent",
          )}
          // Keep focus in the editor.
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => useSlashMenuStore.setState({ selectedIndex: index })}
          onClick={() => pick(item)}
        >
          <item.Icon
            className="size-4 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {item.title}
        </button>
      ))}
    </div>
  );
}
