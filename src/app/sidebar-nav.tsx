import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewStore } from "@/stores/view-store";

/** Sidebar links to the app's non-editor views. */
export function SidebarNav() {
  const view = useViewStore((state) => state.view);
  const setView = useViewStore((state) => state.setView);

  return (
    <nav aria-label="Views" className="shrink-0 border-t px-2 py-1.5">
      <button
        type="button"
        aria-current={view === "settings" ? "page" : undefined}
        className={cn(
          "flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-left text-muted-foreground outline-none hover:bg-border/60 focus-visible:ring-2 focus-visible:ring-ring",
          view === "settings" && "bg-border text-foreground hover:bg-border",
        )}
        onClick={() => setView(view === "settings" ? "editor" : "settings")}
      >
        <Settings className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
        Settings
      </button>
    </nav>
  );
}
