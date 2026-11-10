import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "./use-theme";

/** Empty application shell: sidebar, editor canvas, and status bar regions. */
export function App() {
  useTheme();

  return (
    <div className="grid h-full grid-cols-[var(--sidebar-width)_1fr] grid-rows-[1fr_var(--status-bar-height)]">
      <aside className="flex flex-col border-r bg-subtle" aria-label="Library">
        {/* Clears the macOS traffic lights and lets the window be dragged. */}
        <div className="h-10 shrink-0" data-tauri-drag-region />
      </aside>

      <main className="flex flex-col bg-background">
        <div className="h-10 shrink-0" data-tauri-drag-region />
      </main>

      <footer className="col-span-2 flex items-center justify-end border-t bg-background px-2">
        <ThemeToggle />
      </footer>
    </div>
  );
}
