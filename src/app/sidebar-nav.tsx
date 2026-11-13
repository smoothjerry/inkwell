import { ChartNoAxesColumn, type LucideIcon, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewStore, type View } from "@/stores/view-store";

const LINKS: { view: View; label: string; Icon: LucideIcon }[] = [
  { view: "stats", label: "Stats", Icon: ChartNoAxesColumn },
  { view: "settings", label: "Settings", Icon: Settings },
];

/** Sidebar links to the app's non-editor views. Clicking the open one returns to the editor. */
export function SidebarNav() {
  const current = useViewStore((state) => state.view);
  const setView = useViewStore((state) => state.setView);

  return (
    <nav aria-label="Views" className="shrink-0 border-t px-2 py-1.5">
      {LINKS.map(({ view, label, Icon }) => (
        <button
          key={view}
          type="button"
          aria-current={current === view ? "page" : undefined}
          className={cn(
            "flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-left text-muted-foreground outline-none hover:bg-border/60 focus-visible:ring-2 focus-visible:ring-ring",
            current === view && "bg-border text-foreground hover:bg-border",
          )}
          onClick={() => setView(current === view ? "editor" : view)}
        >
          <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}
